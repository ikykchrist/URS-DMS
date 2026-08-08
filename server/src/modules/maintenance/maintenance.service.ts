import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import {
  deleteObject,
  listObjectKeys,
  objectExists,
  statObject,
  storageHealth,
} from "@/lib/storage";
import {
  acquireLock,
  assertLockNotBusy,
  startJob,
  finishJob,
  failJob,
  listJobs,
  getLockStatus,
  newJobId,
  type JobCounts,
} from "@/modules/maintenance/maintenance.jobs";

// =============================================================================
// URS-DMS — storage maintenance service (Sprint 8.3)
// -----------------------------------------------------------------------------
// SAFETY MODEL (docs/engineering/storage.md, DECISIONS D-017/D-018):
//   * Physical MinIO objects are deleted ONLY when no DocumentVersion row
//     references them — copies, Requested-Documents deliveries and
//     replace-version history all share immutable version objects, so a
//     single deleted File row NEVER authorizes object deletion by itself.
//   * AACCUP submission snapshots reference documents via a RESTRICT FK —
//     documents with submissions are never physically removed.
//   * All destructive operations run under a database-backed lock with
//     expiry (crashed workers cannot block maintenance) and are idempotent /
//     retry-safe ("object not found" during authorized cleanup is success).
//   * Orphan cleanup is two-stage: SCAN → CANDIDATE → 7-day grace → VERIFY →
//     DELETE. Objects are never deleted based on filenames.
//   * Audit: ONE maintenance event per job run (never per item), with a job
//     id and counts, so user-visible audit trails are not flooded.
// =============================================================================

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const ORPHAN_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const SCAN_OBJECT_LIMIT = 100_000;
const BATCH_SIZE = 200;

export interface MaintenanceContext {
  triggerSource: string;
  triggeredBy?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

function ctxId(ctx: MaintenanceContext): string | null {
  return ctx.triggeredBy ?? null;
}

// -----------------------------------------------------------------------------
// Recycle Bin retention cleanup
// -----------------------------------------------------------------------------
export async function runRecycleCleanup(
  dryRun: boolean,
  ctx: MaintenanceContext,
): Promise<{ jobId: string; dryRun: boolean }> {
  const lock = await acquireLock("RECYCLE_CLEANUP", newJobId());
  assertLockNotBusy("RECYCLE_CLEANUP", lock);
  const job = await startJob({
    jobType: "RECYCLE_CLEANUP",
    triggerSource: ctx.triggerSource,
    triggeredBy: ctxId(ctx),
    dryRun,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.RECYCLE_CLEANUP_STARTED,
    userId: ctxId(ctx) ?? undefined,
    entity: "maintenance",
    entityId: job.jobId,
    newValue: { dryRun, triggerSource: ctx.triggerSource },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  const counts: JobCounts = { totalScanned: 0, eligibleCount: 0, removedCount: 0, failedCount: 0, bytesReclaimed: 0 };
  const cutoff = new Date(Date.now() - RETENTION_MS);

  try {
    // 1. Expired folders (subtree via DB cascade; child documents are
    //    unfiled — folderId SET NULL — and handled by the document sweep).
    let folderCursor = 0;
    for (;;) {
      const folders = await prisma.folder.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: { id: true, name: true, ownerId: true },
        orderBy: { id: "asc" },
        skip: folderCursor,
        take: BATCH_SIZE,
      });
      if (folders.length === 0) break;
      counts.totalScanned += folders.length;
      counts.eligibleCount += folders.length;
      if (!dryRun) {
        for (const folder of folders) {
          try {
            await notifyCleanup(folder.ownerId ?? "", folder.name, "folder");
            await prisma.folder.delete({ where: { id: folder.id } });
            counts.removedCount += 1;
          } catch (err) {
            counts.failedCount += 1;
            console.error("[maintenance] folder cleanup failed", folder.id, err);
          }
        }
      }
      folderCursor += folders.length;
      if (folders.length < BATCH_SIZE) break;
    }

    // 2. Expired documents (snapshot-guarded, reference-counted objects).
    let docCursor = 0;
    for (;;) {
      const docs = await prisma.document.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: { id: true, title: true, ownerId: true },
        orderBy: { id: "asc" },
        skip: docCursor,
        take: BATCH_SIZE,
      });
      if (docs.length === 0) break;
      counts.totalScanned += docs.length;
      counts.eligibleCount += docs.length;
      if (!dryRun) {
        for (const doc of docs) {
          try {
            const snapshotRefs = await prisma.aaccupSubmission.count({ where: { documentId: doc.id } });
            if (snapshotRefs > 0) {
              counts.failedCount += 1;
              continue; // snapshot-guarded: never physically removed
            }
            const reclaimed = await deleteDocumentWithObjects(doc.id);
            await notifyCleanup(doc.ownerId, doc.title, "file");
            counts.removedCount += 1;
            counts.bytesReclaimed += reclaimed;
          } catch (err) {
            counts.failedCount += 1;
            console.error("[maintenance] document cleanup failed", doc.id, err);
          }
        }
      }
      docCursor += docs.length;
      if (docs.length < BATCH_SIZE) break;
    }

    await finishJob(job.id, counts);
    await writeAudit({
      action: AUDIT_ACTIONS.RECYCLE_CLEANUP_COMPLETED,
      userId: ctxId(ctx) ?? undefined,
      entity: "maintenance",
      entityId: job.jobId,
      newValue: { ...counts, dryRun },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown maintenance error";
    await failJob(job.id, message);
    await writeAudit({
      action: AUDIT_ACTIONS.RECYCLE_CLEANUP_FAILED,
      userId: ctxId(ctx) ?? undefined,
      entity: "maintenance",
      entityId: job.jobId,
      newValue: { error: message },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw err;
  } finally {
    await lock.release();
  }

  return { jobId: job.jobId, dryRun };
}

/**
 * Physically removes a document ONLY when it has no submission snapshots and
 * deletes each MinIO object only when zero DocumentVersion rows reference it
 * (shared immutable blobs from copies/deliveries survive). Returns reclaimed
 * bytes. "Object not found" during authorized deletion is treated as success.
 */
async function deleteDocumentWithObjects(documentId: string): Promise<number> {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    select: { objectKey: true, sizeBytes: true },
  });
  let reclaimed = 0;
  for (const version of versions) {
    const otherRefs = await prisma.documentVersion.count({
      where: { objectKey: version.objectKey, documentId: { not: documentId } },
    });
    if (otherRefs === 0) {
      try {
        await deleteObject(version.objectKey);
        reclaimed += Number(version.sizeBytes ?? 0n);
      } catch {
        // best-effort; a failed object deletion is retried by the orphan sweep
      }
    }
  }
  await prisma.document.delete({ where: { id: documentId } });
  return reclaimed;
}

async function notifyCleanup(ownerId: string, name: string, kind: string): Promise<void> {
  if (!ownerId) return;
  try {
    await prisma.notification.create({
      data: {
        userId: ownerId,
        type: "RECYCLE_BIN_CLEANUP",
        title: "Recycle Bin cleanup",
        message: `"${name}" (${kind}) was permanently removed after 30 days in the Recycle Bin.`,
        priority: "LOW",
      },
    });
  } catch {
    // notifications must never break the sweep
  }
}

// -----------------------------------------------------------------------------
// Orphan scan (two-stage detection)
// -----------------------------------------------------------------------------
export async function runOrphanScan(
  dryRun: boolean,
  ctx: MaintenanceContext,
): Promise<{ jobId: string; dryRun: boolean }> {
  const lock = await acquireLock("ORPHAN_SCAN", newJobId());
  assertLockNotBusy("ORPHAN_SCAN", lock);
  const job = await startJob({
    jobType: "ORPHAN_SCAN",
    triggerSource: ctx.triggerSource,
    triggeredBy: ctxId(ctx),
    dryRun,
  });

  const counts: JobCounts = { totalScanned: 0, eligibleCount: 0, removedCount: 0, failedCount: 0, bytesReclaimed: 0 };
  const report = { missingObjects: 0, candidates: 0 };

  try {
    // Reference set: EVERY objectKey in DocumentVersion — including versions
    // of soft-deleted documents (they may be restored), copies and
    // Requested-Documents deliveries. Only keys outside this set can be
    // orphaned.
    const referenced = new Set<string>();
    let cursor = 0;
    for (;;) {
      const keys = await prisma.documentVersion.findMany({
        where: { objectKey: { not: "" } },
        select: { objectKey: true },
        distinct: ["objectKey"],
        orderBy: { objectKey: "asc" },
        skip: cursor,
        take: 2000,
      });
      if (keys.length === 0) break;
      for (const k of keys) referenced.add(k.objectKey);
      cursor += keys.length;
    }

    // List MinIO objects (paginated internally, capped).
    const objectKeys = await listObjectKeys(SCAN_OBJECT_LIMIT);
    counts.totalScanned = objectKeys.length;

    for (const objectKey of objectKeys) {
      if (referenced.has(objectKey)) continue;
      const existing = await prisma.maintenanceOrphanCandidate.findUnique({
        where: { objectKey },
        select: { id: true, status: true, firstSeenAt: true },
      });
      if (existing) {
        if (existing.status === "CANDIDATE") {
          counts.eligibleCount += 1;
          if (!dryRun) {
            await prisma.maintenanceOrphanCandidate.update({
              where: { id: existing.id },
              data: { lastSeenAt: new Date() },
            });
          }
        }
        continue;
      }
      report.candidates += 1;
      counts.eligibleCount += 1;
      if (!dryRun) {
        let sizeBytes = 0n;
        try {
          const stat = await statObject(objectKey);
          sizeBytes = BigInt(stat.size);
        } catch {
          sizeBytes = 0n;
        }
        await prisma.maintenanceOrphanCandidate.create({
          data: { objectKey, sizeBytes },
        });
      }
    }

    // Integrity pass: database references whose MinIO object is missing.
    // Reported, NEVER silently deleted.
    for (const objectKey of referenced) {
      const exists = await objectExists(objectKey);
      if (!exists) {
        report.missingObjects += 1;
      }
    }

    await finishJob(job.id, { ...counts, batchCursor: { missingObjects: report.missingObjects, candidates: report.candidates } });
    await writeAudit({
      action: AUDIT_ACTIONS.STORAGE_SCAN_COMPLETED,
      userId: ctxId(ctx) ?? undefined,
      entity: "maintenance",
      entityId: job.jobId,
      newValue: { ...counts, missingObjects: report.missingObjects, candidates: report.candidates, dryRun },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown maintenance error";
    await failJob(job.id, message);
    throw err;
  } finally {
    await lock.release();
  }

  return { jobId: job.jobId, dryRun };
}

// -----------------------------------------------------------------------------
// Orphan cleanup (SCAN → CANDIDATE → 7-day grace → VERIFY → DELETE)
// -----------------------------------------------------------------------------
export async function runOrphanCleanup(
  dryRun: boolean,
  ctx: MaintenanceContext,
): Promise<{ jobId: string; dryRun: boolean }> {
  const lock = await acquireLock("ORPHAN_CLEANUP", newJobId());
  assertLockNotBusy("ORPHAN_CLEANUP", lock);
  const job = await startJob({
    jobType: "ORPHAN_CLEANUP",
    triggerSource: ctx.triggerSource,
    triggeredBy: ctxId(ctx),
    dryRun,
  });

  const counts: JobCounts = { totalScanned: 0, eligibleCount: 0, removedCount: 0, failedCount: 0, bytesReclaimed: 0 };
  const graceCutoff = new Date(Date.now() - ORPHAN_GRACE_MS);

  try {
    const candidates = await prisma.maintenanceOrphanCandidate.findMany({
      where: { status: "CANDIDATE", firstSeenAt: { lte: graceCutoff } },
      orderBy: { firstSeenAt: "asc" },
      take: 1000,
    });
    counts.totalScanned = candidates.length;
    counts.eligibleCount = candidates.length;

    for (const candidate of candidates) {
      if (dryRun) continue;
      try {
        // RE-VERIFY: a new copy/delivery may now reference this object.
        const refs = await prisma.documentVersion.count({
          where: { objectKey: candidate.objectKey },
        });
        if (refs > 0) {
          await prisma.maintenanceOrphanCandidate.update({
            where: { id: candidate.id },
            data: { status: "RE_REFERENCED" },
          });
          counts.failedCount += 1;
          continue;
        }
        const exists = await objectExists(candidate.objectKey);
        if (!exists) {
          // Already gone — idempotent success.
          await prisma.maintenanceOrphanCandidate.update({
            where: { id: candidate.id },
            data: { status: "REMOVED", removedAt: new Date(), removedByJobId: job.jobId },
          });
          counts.removedCount += 1;
          continue;
        }
        await deleteObject(candidate.objectKey);
        await prisma.maintenanceOrphanCandidate.update({
          where: { id: candidate.id },
          data: { status: "REMOVED", removedAt: new Date(), removedByJobId: job.jobId },
        });
        counts.removedCount += 1;
        counts.bytesReclaimed += Number(candidate.sizeBytes ?? 0n);
      } catch (err) {
        counts.failedCount += 1;
        console.error("[maintenance] orphan cleanup failed", candidate.objectKey, err);
      }
    }

    await finishJob(job.id, counts);
    await writeAudit({
      action: AUDIT_ACTIONS.ORPHAN_CLEANUP_COMPLETED,
      userId: ctxId(ctx) ?? undefined,
      entity: "maintenance",
      entityId: job.jobId,
      newValue: { ...counts, dryRun },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown maintenance error";
    await failJob(job.id, message);
    await writeAudit({
      action: AUDIT_ACTIONS.ORPHAN_CLEANUP_FAILED,
      userId: ctxId(ctx) ?? undefined,
      entity: "maintenance",
      entityId: job.jobId,
      newValue: { error: message },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw err;
  } finally {
    await lock.release();
  }

  return { jobId: job.jobId, dryRun };
}

// -----------------------------------------------------------------------------
// Consistency check (READ-ONLY)
// -----------------------------------------------------------------------------
export async function runConsistencyCheck(ctx: MaintenanceContext): Promise<Record<string, unknown>> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const [activeDocs, activeFolders, versionRows, objectRefs, recycleAwaiting, recycleExpired, candidates, jobsFailed, jobsPending, health] =
    await Promise.all([
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.folder.count({ where: { deletedAt: null } }),
      prisma.documentVersion.count(),
      prisma.documentVersion.findMany({ select: { objectKey: true }, distinct: ["objectKey"] }),
      prisma.document.count({ where: { deletedAt: { gte: cutoff } } }),
      prisma.document.count({ where: { deletedAt: { lt: cutoff } } }),
      prisma.maintenanceOrphanCandidate.count(),
      prisma.maintenanceJob.count({ where: { status: "FAILED" } }),
      prisma.maintenanceJob.count({ where: { status: "PENDING" } }),
      storageHealth(),
    ]);

  // Integrity probe: how many DB-referenced objects are MISSING in MinIO?
  // Reported for investigation; never silently deleted.
  let missingObjects = 0;
  const probeLimit = 2000;
  for (const ref of objectRefs.slice(0, probeLimit)) {
    const exists = await objectExists(ref.objectKey);
    if (!exists) missingObjects += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    database: {
      activeFiles: activeDocs,
      activeFolders,
      storedObjectReferences: objectRefs.length,
      versionRows,
      recycleBinAwaitingExpiration: recycleAwaiting,
      recycleBinExpired: recycleExpired,
      missingObjects,
      missingObjectsProbeCapped: objectRefs.length > probeLimit,
    },
    maintenance: {
      failedJobs: jobsFailed,
      pendingJobs: jobsPending,
      orphanCandidates: candidates,
    },
    storage: await getStorageStats(),
    minio: health,
  };
  await writeAudit({
    action: AUDIT_ACTIONS.STORAGE_CHECK_COMPLETED,
    userId: ctxId(ctx) ?? undefined,
    entity: "maintenance",
    entityId: newJobId(),
    newValue: { activeFiles: activeDocs, storedObjectReferences: objectRefs.length, recycleExpired, missingObjects },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
  return report;
}

// -----------------------------------------------------------------------------
// Storage statistics (verified real data; capacity is null when untrustworthy)
// -----------------------------------------------------------------------------
export async function getStorageStats(): Promise<Record<string, unknown>> {
  const [sizeAgg, objectAgg, activeFiles, recycleAgg, candidateAgg, health] = await Promise.all([
    prisma.documentVersion.aggregate({ _sum: { sizeBytes: true } }),
    prisma.documentVersion.findMany({ select: { objectKey: true }, distinct: ["objectKey"] }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.documentVersion.findMany({
      where: { document: { deletedAt: { not: null } } },
      select: { sizeBytes: true },
    }),
    prisma.maintenanceOrphanCandidate.aggregate({ _sum: { sizeBytes: true }, _count: { _all: true } }),
    storageHealth(),
  ]);
  const used = Number(sizeAgg._sum.sizeBytes ?? 0n);
  const recycleBytes = recycleAgg.reduce((sum, row) => sum + Number(row.sizeBytes ?? 0n), 0);
  return {
    objectStorageUsedBytes: String(used),
    storedObjectCount: objectAgg.length,
    activeFileCount: activeFiles,
    recycleBinStorageBytes: String(recycleBytes),
    pendingOrphanStorageBytes: String(Number(candidateAgg._sum.sizeBytes ?? 0n)),
    pendingOrphanCount: candidateAgg._count._all,
    // Server filesystem capacity cannot be trusted from this layer — never
    // fabricated. Object storage used != physical disk used.
    availableCapacityBytes: null,
    totalCapacityBytes: null,
    minio: health,
  };
}

// -----------------------------------------------------------------------------
// Maintenance status (jobs + locks + candidates summary)
// -----------------------------------------------------------------------------
export async function getMaintenanceStatus(): Promise<Record<string, unknown>> {
  const [jobs, locks, candidates, orphanReady] = await Promise.all([
    listJobs({ limit: 10 }),
    getLockStatus(),
    prisma.maintenanceOrphanCandidate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.maintenanceOrphanCandidate.count({
      where: { status: "CANDIDATE", firstSeenAt: { lte: new Date(Date.now() - ORPHAN_GRACE_MS) } },
    }),
  ]);
  const candidateCounts: Record<string, number> = {};
  for (const row of candidates) {
    candidateCounts[row.status] = row._count._all;
  }
  return {
    jobs,
    locks,
    orphanCandidates: candidateCounts,
    orphanReadyForCleanup: orphanReady,
    stats: await getStorageStats(),
  };
}

export async function listOrphanCandidates(limit: number): Promise<Array<Record<string, unknown>>> {
  const rows = await prisma.maintenanceOrphanCandidate.findMany({
    orderBy: { firstSeenAt: "desc" },
    take: Math.min(limit, 500),
  });
  return rows.map((row) => ({
    objectKey: row.objectKey,
    status: row.status,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    sizeBytes: row.sizeBytes ? row.sizeBytes.toString() : "0",
    removedAt: row.removedAt ? row.removedAt.toISOString() : null,
  }));
}
