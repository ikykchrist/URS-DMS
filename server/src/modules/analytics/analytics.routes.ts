import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { analyticsQueryValidator } from "@/modules/analytics/analytics.validator";
import {
  aaccupHandler,
  requestsHandler,
  storageHandler,
  uploadsHandler,
  usersHandler,
} from "@/modules/analytics/analytics.controller";

// =============================================================================
// URS-DMS — analytics routes (Sprint 6.2)
// Mounted under /api/v1/analytics. Every endpoint requires authentication and
// the analytics.read permission. Read-only — no audit entries.
//
// Shared query contract (validated by analyticsQueryValidator):
//   granularity: "daily" | "weekly" | "monthly" | "yearly"  (default monthly)
//   from:        ISO date string (optional)
//   to:          ISO date string (optional)
//   departmentId: uuid (optional)
//   areaId:       uuid (optional; AACCUP-relevant endpoints only)
// =============================================================================

export const analyticsRouter: Router = Router();

analyticsRouter.use(authenticate);

// GET /analytics/uploads
analyticsRouter.get(
  "/uploads",
  requirePermission("analytics.read"),
  analyticsQueryValidator,
  asyncHandler(uploadsHandler),
);

// GET /analytics/requests
analyticsRouter.get(
  "/requests",
  requirePermission("analytics.read"),
  analyticsQueryValidator,
  asyncHandler(requestsHandler),
);

// GET /analytics/aaccup
analyticsRouter.get(
  "/aaccup",
  requirePermission("analytics.read"),
  analyticsQueryValidator,
  asyncHandler(aaccupHandler),
);

// GET /analytics/users
analyticsRouter.get(
  "/users",
  requirePermission("analytics.read"),
  analyticsQueryValidator,
  asyncHandler(usersHandler),
);

// GET /analytics/storage
analyticsRouter.get(
  "/storage",
  requirePermission("analytics.read"),
  analyticsQueryValidator,
  asyncHandler(storageHandler),
);
