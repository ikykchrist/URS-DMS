// =============================================================================
// URS-DMS — Folder copy worker (BullMQ, Sprint 8.5)
// Replaces the in-process fire-and-forget IIFE in folders.service.ts.
// Tracks progress via repository_copy_jobs table; survives restarts.
// =============================================================================

import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit/audit.service";
import { AUDIT_ACTIONS } from "@/config/constants";
import { ConflictError } from "@/utils/errors";
import * as repo from "@/modules/folders/folders.repository";

export interface FolderCopyJobData {
  jobRecordId: string;
  sourceFolderId: string;
  targetParentId: string | null;
  conflictMode: "merge" | "keep_both" | "cancel";
  totalItems: number;
  actorId: string;
  repositoryId: string;
}

export async function processFolderCopyJob(job: Job<FolderCopyJobData>): Promise<void> {
  const { jobRecordId, sourceFolderId, targetParentId, conflictMode, totalItems, actorId, repositoryId } =
    job.data;

  await prisma.repositoryCopyJob.update({
    where: { id: jobRecordId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const source = await repo.findById(sourceFolderId);
  if (!source) throw new Error(`Source folder ${sourceFolderId} no longer exists`);

  const conflict = await repo.findSameNameFolder(targetParentId, source.name, actorId, sourceFolderId);
  let resultFolderId: string | null = null;

  if (conflict && conflict.id !== sourceFolderId && conflictMode === "merge") {
    await repo.copyChildrenInto(sourceFolderId, conflict.id, actorId, repositoryId, async (processed) => {
      const pct = Math.round((processed / totalItems) * 100);
      await job.updateProgress(pct);
      await prisma.repositoryCopyJob.update({
        where: { id: jobRecordId },
        data: { processedItems: processed },
      });
    });
    resultFolderId = conflict.id;
  } else {
    let usedName = source.name;
    if (conflict && conflict.id !== sourceFolderId) {
      if (conflictMode === "cancel") throw new ConflictError(`Folder "${source.name}" already exists`);
      usedName = await repo.uniqueFolderName(targetParentId, source.name, actorId);
    }
    let throttled = 0;
    resultFolderId = await repo.copySubtree({
      sourceId: sourceFolderId,
      newParentId: targetParentId,
      ownerId: actorId,
      repositoryId,
      total: totalItems,
      onProgress: async (processed) => {
        throttled += 1;
        if (throttled % 25 === 0 || processed === totalItems) {
          const pct = Math.round((processed / totalItems) * 100);
          await job.updateProgress(pct);
          await prisma.repositoryCopyJob.update({
            where: { id: jobRecordId },
            data: { processedItems: processed },
          });
        }
      },
    });
    if (usedName !== source.name) {
      await repo.update({ id: resultFolderId, data: { name: usedName } });
    }
  }

  await prisma.repositoryCopyJob.update({
    where: { id: jobRecordId },
    data: { status: "COMPLETED", processedItems: totalItems, resultFolderId, completedAt: new Date() },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FOLDER_COPIED,
    userId: actorId,
    entity: "folder",
    entityId: resultFolderId ?? jobRecordId,
    newValue: { source: sourceFolderId, targetParentId, mode: "bullmq_job", conflictMode },
  });
}
