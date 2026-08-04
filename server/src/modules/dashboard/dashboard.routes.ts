import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import {
  aaccupHandler,
  documentsHandler,
  overviewHandler,
  requestsHandler,
  storageHandler,
  usersHandler,
} from "@/modules/dashboard/dashboard.controller";

// =============================================================================
// URS-DMS — dashboard routes
// Mounted under /api/v1/dashboard. Every endpoint requires authentication
// and the dashboard.read permission. Read-only — no audit entries.
// =============================================================================

export const dashboardRouter: Router = Router();

dashboardRouter.use(authenticate);

// GET /dashboard/overview — combined stats across documents, users, requests,
// AACCUP and storage.
dashboardRouter.get(
  "/overview",
  requirePermission("dashboard.read"),
  asyncHandler(overviewHandler),
);

// GET /dashboard/documents
dashboardRouter.get(
  "/documents",
  requirePermission("dashboard.read"),
  asyncHandler(documentsHandler),
);

// GET /dashboard/users
dashboardRouter.get(
  "/users",
  requirePermission("dashboard.read"),
  asyncHandler(usersHandler),
);

// GET /dashboard/requests
dashboardRouter.get(
  "/requests",
  requirePermission("dashboard.read"),
  asyncHandler(requestsHandler),
);

// GET /dashboard/aaccup
dashboardRouter.get(
  "/aaccup",
  requirePermission("dashboard.read"),
  asyncHandler(aaccupHandler),
);

// GET /dashboard/storage
dashboardRouter.get(
  "/storage",
  requirePermission("dashboard.read"),
  asyncHandler(storageHandler),
);
