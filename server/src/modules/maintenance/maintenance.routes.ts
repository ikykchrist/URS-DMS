import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody } from "@/middlewares/validate";
import { sendSuccess } from "@/utils/apiResponse";
import { BadRequestError } from "@/utils/errors";
import { z } from "zod";
import {
  getMaintenanceStatus,
  getStorageStats,
  listOrphanCandidates,
  runConsistencyCheck,
  runOrphanCleanup,
  runOrphanScan,
  runRecycleCleanup,
  type MaintenanceContext,
} from "@/modules/maintenance/maintenance.service";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";

// =============================================================================
// URS-DMS Ã¢â‚¬â€ Root storage maintenance routes (Sprint 8.3)
// Mounted under /root (parent applies authenticate + requireRole("ROOT")).
// Destructive operations require `confirm: true`; dry-run is supported and
// deletes nothing. Read-only checks are available under root.access.
// =============================================================================

export const maintenanceRouter: Router = Router();

const scanBody = z.object({
  dryRun: z.boolean().optional(),
});
const cleanupBody = z.object({
  dryRun: z.boolean().optional(),
  confirm: z.boolean(),
});
const orphanListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

function toContext(req: Parameters<Parameters<typeof asyncHandler>[0]>[0]): MaintenanceContext {
  return {
    triggerSource: "MANUAL",
    triggeredBy: req.auth?.userId ?? null,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

maintenanceRouter.get(
  "/status",
  requirePermission("root.access"),
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await getMaintenanceStatus());
  }),
);

maintenanceRouter.get(
  "/storage",
  requirePermission("root.access"),
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await getStorageStats());
  }),
);

maintenanceRouter.get(
  "/check",
  requirePermission("root.access"),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await runConsistencyCheck(toContext(req)));
  }),
);

maintenanceRouter.get(
  "/orphans",
  requirePermission("root.access"),
  asyncHandler(async (req, res) => {
    const parsed = orphanListQuery.safeParse(req.query);
    const limit = parsed.success ? parsed.data.limit : 100;
    sendSuccess(res, await listOrphanCandidates(limit));
  }),
);

maintenanceRouter.post(
  "/scan",
  requirePermission("root.access"),
  validateBody(scanBody),
  asyncHandler(async (req, res) => {
    const body = scanBody.parse(req.body ?? {});
    await writeAudit({
      action: AUDIT_ACTIONS.MANUAL_MAINTENANCE_TRIGGERED,
      userId: req.auth!.userId,
      entity: "maintenance",
      newValue: { action: "orphan-scan", dryRun: Boolean(body.dryRun) },
      ipAddress: req.context.ipAddress,
      userAgent: req.context.userAgent,
    });
    sendSuccess(res, await runOrphanScan(Boolean(body.dryRun), toContext(req)));
  }),
);

maintenanceRouter.post(
  "/cleanup-recycle",
  requirePermission("root.access"),
  validateBody(cleanupBody),
  asyncHandler(async (req, res) => {
    const body = cleanupBody.parse(req.body ?? {});
    if (!body.confirm && !body.dryRun) {
      throw new BadRequestError("Manual destructive cleanup requires confirmation");
    }
    await writeAudit({
      action: AUDIT_ACTIONS.MANUAL_MAINTENANCE_TRIGGERED,
      userId: req.auth!.userId,
      entity: "maintenance",
      newValue: { action: "recycle-cleanup", dryRun: Boolean(body.dryRun) },
      ipAddress: req.context.ipAddress,
      userAgent: req.context.userAgent,
    });
    sendSuccess(res, await runRecycleCleanup(Boolean(body.dryRun), toContext(req)));
  }),
);

maintenanceRouter.post(
  "/cleanup-orphans",
  requirePermission("root.access"),
  validateBody(cleanupBody),
  asyncHandler(async (req, res) => {
    const body = cleanupBody.parse(req.body ?? {});
    if (!body.confirm && !body.dryRun) {
      throw new BadRequestError("Manual destructive cleanup requires confirmation");
    }
    await writeAudit({
      action: AUDIT_ACTIONS.MANUAL_MAINTENANCE_TRIGGERED,
      userId: req.auth!.userId,
      entity: "maintenance",
      newValue: { action: "orphan-cleanup", dryRun: Boolean(body.dryRun) },
      ipAddress: req.context.ipAddress,
      userAgent: req.context.userAgent,
    });
    sendSuccess(res, await runOrphanCleanup(Boolean(body.dryRun), toContext(req)));
  }),
);
