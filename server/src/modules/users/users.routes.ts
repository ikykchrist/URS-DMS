import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  changeUserStatusSchema,
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateSelfSchema,
  updateUserSchema,
  userIdParamSchema,
} from "@/modules/users/users.validator";
import {
  changeStatusHandler,
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  listUsersHandler,
  resetPasswordHandler,
  updateSelfHandler,
  updateUserHandler,
} from "@/modules/users/users.controller";

// =============================================================================
// URS-DMS — users routes
// All routes require authentication. Mutations require the appropriate
// permission. No `if (role === "admin")` anywhere.
// =============================================================================

export const usersRouter: Router = Router();

usersRouter.use(authenticate);

// Sprint 8.1 — self-service profile edit. Registered BEFORE /:id so "me" is
// never treated as a user id. Operates on the authenticated identity only.
usersRouter.patch(
  "/me",
  requirePermission("users.self.update"),
  validateBody(updateSelfSchema),
  asyncHandler(updateSelfHandler),
);

usersRouter.get(
  "/",
  requirePermission("users.read"),
  validateQuery(listUsersQuerySchema),
  asyncHandler(listUsersHandler),
);

usersRouter.post(
  "/",
  requirePermission("users.create"),
  validateBody(createUserSchema),
  asyncHandler(createUserHandler),
);

usersRouter.get(
  "/:id",
  requirePermission("users.read"),
  validateParams(userIdParamSchema),
  asyncHandler(getUserHandler),
);

usersRouter.patch(
  "/:id",
  requirePermission("users.update"),
  validateParams(userIdParamSchema),
  validateBody(updateUserSchema),
  asyncHandler(updateUserHandler),
);

usersRouter.patch(
  "/:id/status",
  requirePermission("users.update"),
  validateParams(userIdParamSchema),
  validateBody(changeUserStatusSchema),
  asyncHandler(changeStatusHandler),
);

usersRouter.post(
  "/:id/reset-password",
  requirePermission("users.update"),
  validateParams(userIdParamSchema),
  validateBody(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);

usersRouter.delete(
  "/:id",
  requirePermission("users.delete"),
  validateParams(userIdParamSchema),
  asyncHandler(deleteUserHandler),
);
