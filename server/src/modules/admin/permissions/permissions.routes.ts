import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { listPermissionsHandler } from "@/modules/admin/permissions/permissions.controller";

// =============================================================================
// URS-DMS — Admin · Permissions routes (Sprint 7.2)
// -----------------------------------------------------------------------------
// Mounted under /api/v1/admin/permissions. All routes require authentication
// (admin.routes.ts mounts `authenticate` once for the whole tree). The only
// endpoint in this group is the permission catalog read; permission
// *assignment* lives on PATCH /admin/roles/:id/permissions (see the roles
// router) so a single audit action covers each role's binding change.
// =============================================================================

export const adminPermissionsRouter: Router = Router();

// GET /admin/permissions
adminPermissionsRouter.get(
  "/",
  requirePermission("permission.read"),
  asyncHandler(listPermissionsHandler),
);
