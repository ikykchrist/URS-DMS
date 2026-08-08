// =============================================================================
// URS-DMS — Maintenance worker (BullMQ, Sprint 8.5)
// Handles scheduled recycle-bin cleanup and orphan scan. The database-backed
// lock from maintenance.jobs.ts prevents concurrent execution across instances.
// =============================================================================

import type { Job } from "bullmq";
import {
  runRecycleCleanup,
  runOrphanScan,
  runOrphanCleanup,
  type MaintenanceContext,
} from "@/modules/maintenance/maintenance.service";

export interface MaintenanceJobData {
  action: "recycle-cleanup" | "orphan-scan" | "orphan-cleanup";
  dryRun: boolean;
  triggerSource: string;
  triggeredBy?: string | null;
}

export async function processMaintenanceJob(job: Job<MaintenanceJobData>): Promise<void> {
  const { action, dryRun, triggerSource, triggeredBy } = job.data;

  const ctx: MaintenanceContext = {
    triggerSource,
    triggeredBy,
    ipAddress: undefined,
    userAgent: undefined,
  };

  switch (action) {
    case "recycle-cleanup":
      await runRecycleCleanup(dryRun, ctx);
      break;
    case "orphan-scan":
      await runOrphanScan(dryRun, ctx);
      break;
    case "orphan-cleanup":
      await runOrphanCleanup(dryRun, ctx);
      break;
    default:
      throw new Error(`Unknown maintenance action: ${action}`);
  }
}
