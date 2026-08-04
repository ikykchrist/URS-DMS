import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { validateParams, validateQuery } from "@/middlewares/validate";
import {
  auditIdParamSchema,
  exportAuditQuerySchema,
  listAuditQuerySchema,
} from "@/modules/audit/audit.validator";
import {
  exportAuditHandler,
  getAuditHandler,
  listAuditHandler,
} from "@/modules/audit/audit.controller";

// =============================================================================
// URS-DMS — audit center routes (Sprint 6.3)
// Mounted under /api/v1/audit. All routes require authentication.
//   - GET /audit          → audit.read     (any role granted the permission)
//   - GET /audit/:id      → audit.read
//   - GET /audit/export   → audit.export   (administrator-only per the spec)
//
// Ordering matters: `/audit/export` is registered BEFORE `/audit/:id` so the
// path-param router does not steal the literal "export" segment as an id (the
// id validator would reject a non-UUID anyway, but this keeps intent explicit).
// Audit Center reads never themselves emit audit entries (consistent with
// dashboard / analytics read-only convention).
// =============================================================================

export const auditRouter: Router = Router();

auditRouter.use(authenticate);

// GET /audit/export?format=csv|json&...filters
auditRouter.get(
  "/export",
  requirePermission("audit.export"),
  validateQuery(exportAuditQuerySchema),
  asyncHandler(exportAuditHandler),
);

// GET /audit?page=&pageSize=&q=&...filters&sort=
auditRouter.get(
  "/",
  requirePermission("audit.read"),
  validateQuery(listAuditQuerySchema),
  asyncHandler(listAuditHandler),
);

// GET /audit/:id
auditRouter.get(
  "/:id",
  requirePermission("audit.read"),
  validateParams(auditIdParamSchema),
  asyncHandler(getAuditHandler),
);
