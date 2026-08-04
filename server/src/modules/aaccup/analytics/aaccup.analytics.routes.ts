import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateParams, validateQuery } from "@/middlewares/validate";
import {
  areaIdParamSchema,
  departmentIdParamSchema,
  overviewAnalyticsQuerySchema,
  requirementIdParamSchema,
} from "@/modules/aaccup/analytics/aaccup.analytics.validator";
import {
  areaAnalyticsHandler,
  departmentAnalyticsHandler,
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

// GET /aaccup/analytics/overview?departmentId=...&areaId=...&areaStatus=...
//      &minCompliance=0..100&maxCompliance=0..100&q=...
aaccupAnalyticsRouter.get(
  "/overview",
  requirePermission("aaccup.analytics.read"),
  validateQuery(overviewAnalyticsQuerySchema),
  asyncHandler(overviewAnalyticsHandler),
);

// GET /aaccup/analytics/department/:id
aaccupAnalyticsRouter.get(
  "/department/:id",
  requirePermission("aaccup.analytics.read"),
  validateParams(departmentIdParamSchema),
  asyncHandler(departmentAnalyticsHandler),
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
