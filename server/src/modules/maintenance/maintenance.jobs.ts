import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { BadRequestError } from "@/utils/errors";
import type { Prisma } from "@prisma/client";

// =============================================================================
// URS-DMS — maintenance lock + job persistence (Sprint 8.3)
// -----------------------------------------------------------------------------
// Database-backed distributed lock with EXPIRY: a crashed worker can never
// permanently block maintenance (the lock auto-expires). No Redis required —
// works identically across multiple server instances.
// =============================================================================

const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes, refreshed by long jobs
const HEARTBEAT_MS = 60 * 1000;

export function newJobId(): string {
  return `MNT-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

export interface MaintenanceLockHandle {
  jobType: string;
  workerId: string;
  release: () => Promise<void>;
  heartbeat: () => Promise<void>;
}

/**
 * Acquires the lock for a job type. Returns null when another worker holds a
 * live lock (concurrent duplicate execution is prevented). The lock expires
 * automatically so crashed workers cannot block maintenance forever.
 */
export async function acquireLock(jobType: string, workerId: string): Promise<MaintenanceLockHandle | null> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

  try {
    // Upsert with an expiry guard: stale locks (crashed worker) are replaced.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceLock.findUnique({ where: { jobType } });
      if (existing && existing.lockExpiresAt > now) {
        throw new LockBusyError(jobType);
      }
      await tx.maintenanceLock.upsert({
        where: { jobType },
        create: { jobType, workerId, lockedAt: now, lockExpiresAt: expiresAt },
        update: { workerId, lockedAt: now, lockExpiresAt: expiresAt },
      });
    });
  } catch (err) {
    if (err instanceof LockBusyError) return null;
    throw err;
  }

  let stopped = false;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const refresh = async () => {
    if (stopped) return;
    await prisma.maintenanceLock.updateMany({
      where: { jobType, workerId },
      data: { lockExpiresAt: new Date(Date.now() + LOCK_TTL_MS) },
    });
  };

  heartbeatTimer = setInterval(() => {
    void refresh().catch(() => {
      // heartbeat failure is tolerable; the lock still has TTL left
    });
  }, HEARTBEAT_MS);
  heartbeatTimer.unref?.();

  return {
    jobType,
    workerId,
    release: async () => {
      stopped = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      await prisma.maintenanceLock.deleteMany({ where: { jobType, workerId } });
    },
    heartbeat: refresh,
  };
}

class LockBusyError extends Error {
  constructor(jobType: string) {
    super(`Maintenance lock busy for ${jobType}`);
    this.name = "LockBusyError";
  }
}

/** Thrown when another worker holds the lock for the job type. */
export function assertLockNotBusy(jobType: string, result: MaintenanceLockHandle | null): asserts result is MaintenanceLockHandle {
  if (!result) {
    throw new BadRequestError(
      `Another maintenance run for "${jobType}" is already in progress. Try again later.`,
    );
  }
}

export interface JobInitArgs {
  jobType: string;
  triggerSource: string;
  triggeredBy?: string | null;
  dryRun?: boolean;
}

export interface JobCounts {
  totalScanned: number;
  eligibleCount: number;
  removedCount: number;
  failedCount: number;
  bytesReclaimed: number;
  batchCursor?: Prisma.InputJsonValue | null;
}

export async function startJob(args: JobInitArgs): Promise<{ id: string; jobId: string }> {
  return prisma.maintenanceJob.create({
    data: {
      jobId: newJobId(),
      jobType: args.jobType,
      status: "RUNNING",
      triggerSource: args.triggerSource,
      triggeredBy: args.triggeredBy ?? null,
      dryRun: Boolean(args.dryRun),
      startedAt: new Date(),
    },
    select: { id: true, jobId: true },
  });
}

export async function finishJob(id: string, counts: JobCounts): Promise<void> {
  await prisma.maintenanceJob.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      totalScanned: counts.totalScanned,
      eligibleCount: counts.eligibleCount,
      removedCount: counts.removedCount,
      failedCount: counts.failedCount,
      bytesReclaimed: BigInt(counts.bytesReclaimed),
      batchCursor: counts.batchCursor ?? undefined,
    },
  });
}

export async function failJob(id: string, error: string): Promise<void> {
  await prisma.maintenanceJob.update({
    where: { id },
    data: { status: "FAILED", error, completedAt: new Date() },
  });
}

export async function listJobs(filters?: { jobType?: string; status?: string; limit?: number }) {
  const where: Prisma.MaintenanceJobWhereInput = {};
  if (filters?.jobType) where.jobType = filters.jobType;
  if (filters?.status) where.status = filters.status;
  const rows = await prisma.maintenanceJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 20,
  });
  return rows.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    jobType: row.jobType,
    status: row.status,
    triggerSource: row.triggerSource,
    triggeredBy: row.triggeredBy,
    dryRun: row.dryRun,
    totalScanned: row.totalScanned,
    eligibleCount: row.eligibleCount,
    removedCount: row.removedCount,
    failedCount: row.failedCount,
    bytesReclaimed: row.bytesReclaimed ? row.bytesReclaimed.toString() : "0",
    error: row.error,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getLockStatus(): Promise<Array<{ jobType: string; lockedAt: string; lockExpiresAt: string }>> {
  const rows = await prisma.maintenanceLock.findMany();
  return rows.map((row) => ({
    jobType: row.jobType,
    lockedAt: row.lockedAt.toISOString(),
    lockExpiresAt: row.lockExpiresAt.toISOString(),
  }));
}
