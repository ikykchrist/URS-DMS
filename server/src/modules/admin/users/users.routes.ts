import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  adminListUsersQuerySchema,
  createAdminUserSchema,
  forcePasswordChangeSchema,
  resetPasswordAdminSchema,
  updateAdminUserSchema,
  updateStatusSchema,
  userIdParamSchema,
} from "@/modules/admin/users/users.validator";
import {
  archiveUserHandler,
  changeStatusHandler,
  createUserHandler,
  forcePasswordChangeHandler,
  getUserHandler,
  listUsersHandler,
  resetPasswordHandler,
  restoreUserHandler,
  updateUserHandler,
} from "@/modules/admin/users/users.controller";

// =============================================================================
// URS-DMS — Admin · Users routes (Sprint 7.2)
// -----------------------------------------------------------------------------
// Mounted under /api/v1/admin/users. All routes require authentication (the
// shared dispatcher admin.routes.ts mounts `authenticate` once for the whole
// tree, so sub-routers deliberately do NOT re-mount it). Permission gating
// uses the granular user.* codes from permissions.constants.ts:
//   GET    /                  → user.read
//   POST   /                  → user.create
//   GET    /:id               → user.read
//   PATCH  /:id               → user.update
//   DELETE /:id               → user.archive
//   POST   /:id/restore       → user.restore
//   PATCH  /:id/status        → user.status.update
//   POST   /:id/reset-password         → user.password.reset
//   POST   /:id/force-password-change   → user.password.reset
//
// The "force-password-change" endpoint reuses the password-reset permission
// gate per the service reasoning (see users.service.ts): the two operations
// overlap almost fully and a distinct permission code would only let an
// operator grant one without the other, which is not a useful split.
// =============================================================================

export const adminUsersRouter: Router = Router();

// GET /admin/users
adminUsersRouter.get(
  "/",
  requirePermission("user.read"),
  validateQuery(adminListUsersQuerySchema),
  asyncHandler(listUsersHandler),
);

// POST /admin/users
adminUsersRouter.post(
  "/",
  requirePermission("user.create"),
  validateBody(createAdminUserSchema),
  asyncHandler(createUserHandler),
);

// GET /admin/users/:id
adminUsersRouter.get(
  "/:id",
  requirePermission("user.read"),
  validateParams(userIdParamSchema),
  asyncHandler(getUserHandler),
);

// PATCH /admin/users/:id
adminUsersRouter.patch(
  "/:id",
  requirePermission("user.update"),
  validateParams(userIdParamSchema),
  validateBody(updateAdminUserSchema),
  asyncHandler(updateUserHandler),
);

// DELETE /admin/users/:id  (soft delete = "archive")
adminUsersRouter.delete(
  "/:id",
  requirePermission("user.archive"),
  validateParams(userIdParamSchema),
  asyncHandler(archiveUserHandler),
);

// POST /admin/users/:id/restore
adminUsersRouter.post(
  "/:id/restore",
  requirePermission("user.restore"),
  validateParams(userIdParamSchema),
  asyncHandler(restoreUserHandler),
);

// PATCH /admin/users/:id/status
adminUsersRouter.patch(
  "/:id/status",
  requirePermission("user.status.update"),
  validateParams(userIdParamSchema),
  validateBody(updateStatusSchema),
  asyncHandler(changeStatusHandler),
);

// POST /admin/users/:id/reset-password
adminUsersRouter.post(
  "/:id/reset-password",
  requirePermission("user.password.reset"),
  validateParams(userIdParamSchema),
  validateBody(resetPasswordAdminSchema),
  asyncHandler(resetPasswordHandler),
);

// POST /admin/users/:id/force-password-change
adminUsersRouter.post(
  "/:id/force-password-change",
  requirePermission("user.password.reset"),
  validateParams(userIdParamSchema),
  validateBody(forcePasswordChangeSchema),
  asyncHandler(forcePasswordChangeHandler),
);
