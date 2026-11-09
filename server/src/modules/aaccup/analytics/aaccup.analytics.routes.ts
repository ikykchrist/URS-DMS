import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateParams, validateQuery } from "@/middlewares/validate";
import {
  areaIdParamSchema,
  programIdParamSchema,
  overviewAnalyticsQuerySchema,
  requirementIdParamSchema,
} from "@/modules/aaccup/analytics/aaccup.analytics.validator";
import {
  areaAnalyticsHandler,
  programAnalyticsHandler,
  overviewAnalyticsHandler,
  requirementAnalyticsHandler,
} from "@/modules/aaccup/analytics/aaccup.analytics.controller";

// =============================================================================
// URS-DMS — AACCUP analytics routes
// Mounted under /aaccup in aaccup.routes.ts. The parent authenticates, so
// these routes need only gate via the granular aaccup.analytics.read code.
// All endpoints are read-only (no audit entries — per sprint spec).
// =============================================================================

export const aaccupAnalyticsRouter: Router = Router();

// GET /aaccup/analytics/overview?programId=...&areaId=...&areaStatus=...
//      &minCompliance=0..100&maxCompliance=0..100&q=...
aaccupAnalyticsRouter.get(
  "/overview",
  requirePermission("aaccup.analytics.read"),
  validateQuery(overviewAnalyticsQuerySchema),
  asyncHandler(overviewAnalyticsHandler),
);

// GET /aaccup/analytics/program/:id
aaccupAnalyticsRouter.get(
  "/program/:id",
  requirePermission("aaccup.analytics.read"),
  validateParams(programIdParamSchema),
  asyncHandler(programAnalyticsHandler),
);

// GET /aaccup/analytics/area/:id
aaccupAnalyticsRouter.get(
  "/area/:id",
  requirePermission("aaccup.analytics.read"),
  validateParams(areaIdParamSchema),
  asyncHandler(areaAnalyticsHandler),
);

// GET /aaccup/analytics/requirements/:id
aaccupAnalyticsRouter.get(
  "/requirements/:id",
  requirePermission("aaccup.analytics.read"),
  validateParams(requirementIdParamSchema),
  asyncHandler(requirementAnalyticsHandler),
);
