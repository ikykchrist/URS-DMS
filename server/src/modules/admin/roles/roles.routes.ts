import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  adminListRolesQuerySchema,
  createAdminRoleSchema,
  roleIdParamSchema,
  updateAdminRoleSchema,
  updateRolePermissionsSchema,
} from "@/modules/admin/roles/roles.validator";
import {
  archiveRoleHandler,
  createRoleHandler,
  getRoleHandler,
  listRolesHandler,
  restoreRoleHandler,
  updateRoleHandler,
  updateRolePermissionsHandler,
} from "@/modules/admin/roles/roles.controller";

// =============================================================================
// URS-DMS — Admin · Roles routes (Sprint 7.2)
// -----------------------------------------------------------------------------
// Mounted under /api/v1/admin/roles. All routes require authentication (the
// shared dispatcher admin.routes.ts mounts `authenticate` once for the whole
// tree, so sub-routers deliberately do NOT re-mount it). Permission gating
// uses the granular role.* codes from permissions.constants.ts:
//   GET    /                        → role.read
//   POST   /                        → role.create
//   GET    /:id                     → role.read
//   PATCH  /:id                     → role.update
//   DELETE /:id                     → role.archive
//   POST   /:id/restore             → role.restore
//   PATCH  /:id/permissions         → role.permission.manage
//
// The "PATCH /:id/permissions" endpoint uses the dedicated
// `role.permission.manage` code (not `role.update`): editing a role's
// description is a low-impact cosmetic change, while editing its permissions
// is a high-impact privilege change, so the spec splits the gates to allow
// least-privilege delegation.
// =============================================================================

export const adminRolesRouter: Router = Router();

// GET /admin/roles
adminRolesRouter.get(
  "/",
  requirePermission("role.read"),
  validateQuery(adminListRolesQuerySchema),
  asyncHandler(listRolesHandler),
);

// POST /admin/roles
adminRolesRouter.post(
  "/",
  requirePermission("role.create"),
  validateBody(createAdminRoleSchema),
  asyncHandler(createRoleHandler),
);

// GET /admin/roles/:id
adminRolesRouter.get(
  "/:id",
  requirePermission("role.read"),
  validateParams(roleIdParamSchema),
  asyncHandler(getRoleHandler),
);

// PATCH /admin/roles/:id (description only — permission binding changes use
// the dedicated /:id/permissions endpoint below)
adminRolesRouter.patch(
  "/:id",
  requirePermission("role.update"),
  validateParams(roleIdParamSchema),
  validateBody(updateAdminRoleSchema),
  asyncHandler(updateRoleHandler),
);

// DELETE /admin/roles/:id  (soft delete = "archive")
adminRolesRouter.delete(
  "/:id",
  requirePermission("role.archive"),
  validateParams(roleIdParamSchema),
  asyncHandler(archiveRoleHandler),
);

// POST /admin/roles/:id/restore
adminRolesRouter.post(
  "/:id/restore",
  requirePermission("role.restore"),
  validateParams(roleIdParamSchema),
  asyncHandler(restoreRoleHandler),
);

// PATCH /admin/roles/:id/permissions — replace the role's permission bindings
adminRolesRouter.patch(
  "/:id/permissions",
  requirePermission("role.permission.manage"),
  validateParams(roleIdParamSchema),
  validateBody(updateRolePermissionsSchema),
  asyncHandler(updateRolePermissionsHandler),
);
