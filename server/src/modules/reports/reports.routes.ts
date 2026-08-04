import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { validateQuery } from "@/middlewares/validate";
import { reportFilterSchema } from "@/modules/reports/reports.validator";
import {
  aaccupListHandler,
  auditListHandler,
  departmentsListHandler,
  documentsListHandler,
  reportExportHandler,
  requestsListHandler,
  storageListHandler,
  usersListHandler,
} from "@/modules/reports/reports.controller";

// =============================================================================
// URS-DMS — Reporting Engine routes (Sprint 6.4)
// Mounted under /api/v1/reports. Every route requires authentication.
//
//   GET /reports/<type>           → reports.read    (JSON envelope)
//   GET /reports/<type>?format=.. → (same as above — ?format=json is the
//                                   default list view; ?format=csv|pdf is
//                                   ignored without reports.export)
//
// `format=csv` and `format=pdf` only take effect behind a separate export
// endpoint that additionally requires `reports.export`:
//
//   GET /reports/export/<type>?format=csv|json|pdf  → reports.export
//
// Ordering matters: `/export/:type` is registered BEFORE `/:type` so the
// literal "export" segment is never swallowed by the path-param router
// (matches the audit module's convention).
//
// Read-only endpoints — no audit entries are written (consistent with the
// dashboard / analytics read-only convention).
// =============================================================================

export const reportsRouter: Router = Router();

reportsRouter.use(authenticate);

// GET /reports/export/:type?format=csv|json|pdf
// Requires the elevated reports.export permission.
reportsRouter.get(
  "/export/:type",
  requirePermission("reports.export"),
  validateQuery(reportFilterSchema),
  asyncHandler(reportExportHandler),
);

// GET /reports/documents
reportsRouter.get(
  "/documents",
  requirePermission("reports.read"),
  validateQuery(reportFilterSchema),
  asyncHandler(documentsListHandler),
);

// GET /reports/requests
reportsRouter.get(
  "/requests",
  requirePermission("reports.read"),
  validateQuery(reportFilterSchema),
  asyncHandler(requestsListHandler),
);

// GET /reports/aaccup
reportsRouter.get(
  "/aaccup",
  requirePermission("reports.read"),
  validateQuery(reportFilterSchema),
  asyncHandler(aaccupListHandler),
);

// GET /reports/departments
reportsRouter.get(
  "/departments",
  requirePermission("reports.read"),
  validateQuery(reportFilterSchema),
  asyncHandler(departmentsListHandler),
);

// GET /reports/users
reportsRouter.get(
  "/users",
  requirePermission("reports.read"),
  validateQuery(reportFilterSchema),
  asyncHandler(usersListHandler),
);

// GET /reports/storage
reportsRouter.get(
  "/storage",
  requirePermission("reports.read"),
  validateQuery(reportFilterSchema),
  asyncHandler(storageListHandler),
);

// GET /reports/audit
reportsRouter.get(
  "/audit",
  requirePermission("reports.read"),
  validateQuery(reportFilterSchema),
  asyncHandler(auditListHandler),
);
