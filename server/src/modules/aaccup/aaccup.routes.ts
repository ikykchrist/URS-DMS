import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  areaIdParamSchema,
  createAreaSchema,
  listAreasQuerySchema,
  updateAreaSchema,
} from "@/modules/aaccup/aaccup.validator";
import {
  archiveAreaHandler,
  createAreaHandler,
  getAreaHandler,
  listAreasHandler,
  restoreAreaHandler,
  updateAreaHandler,
} from "@/modules/aaccup/aaccup.controller";
import { aaccupRequirementsRouter } from "@/modules/aaccup/requirements/aaccup.requirements.routes";
import { aaccupSubmissionsRouter } from "@/modules/aaccup/submissions/aaccup.submissions.routes";
import { aaccupAnalyticsRouter } from "@/modules/aaccup/analytics/aaccup.analytics.routes";

// =============================================================================
// URS-DMS — AACCUP routes
// All routes require authentication. Permission gating uses the granular
// aaccup.* codes (aaccup.read, aaccup.create, aaccup.update, aaccup.archive,
// aaccup.restore). The legacy aaccup.manage code is retained on QAO for
// backward compatibility.
// =============================================================================

export const aaccupRouter: Router = Router();

aaccupRouter.use(authenticate);

// GET /aaccup/areas
aaccupRouter.get(
  "/areas",
  requirePermission("aaccup.read"),
  validateQuery(listAreasQuerySchema),
  asyncHandler(listAreasHandler),
);

// POST /aaccup/areas
aaccupRouter.post(
  "/areas",
  requirePermission("aaccup.create"),
  validateBody(createAreaSchema),
  asyncHandler(createAreaHandler),
);

// GET /aaccup/areas/:id
aaccupRouter.get(
  "/areas/:id",
  requirePermission("aaccup.read"),
  validateParams(areaIdParamSchema),
  asyncHandler(getAreaHandler),
);

// PATCH /aaccup/areas/:id
aaccupRouter.patch(
  "/areas/:id",
  requirePermission("aaccup.update"),
  validateParams(areaIdParamSchema),
  validateBody(updateAreaSchema),
  asyncHandler(updateAreaHandler),
);

// DELETE /aaccup/areas/:id  (soft delete = "archive")
aaccupRouter.delete(
  "/areas/:id",
  requirePermission("aaccup.archive"),
  validateParams(areaIdParamSchema),
  asyncHandler(archiveAreaHandler),
);

// POST /aaccup/areas/:id/restore
aaccupRouter.post(
  "/areas/:id/restore",
  requirePermission("aaccup.restore"),
  validateParams(areaIdParamSchema),
  asyncHandler(restoreAreaHandler),
);

// AACCUP requirements (Sprint 5.2). The parent authenticator above applies to
// all sub-routers; requirement routes gate via granular aaccup.requirement.* codes.
aaccupRouter.use("/requirements", aaccupRequirementsRouter);

// AACCUP document submissions (Sprint 5.3). Gates via aaccup.submission.* codes.
aaccupRouter.use("/submissions", aaccupSubmissionsRouter);

// AACCUP compliance analytics (Sprint 5.4). Read-only; gates via
// aaccup.analytics.read. No audit entries per spec.
aaccupRouter.use("/analytics", aaccupAnalyticsRouter);
