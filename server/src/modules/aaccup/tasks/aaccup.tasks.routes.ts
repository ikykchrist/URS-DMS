import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  taskIdParamSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from "@/modules/aaccup/tasks/aaccup.tasks.validator";
import {
  archiveTaskHandler,
  createTaskHandler,
  getTaskHandler,
  listTasksHandler,
  restoreTaskHandler,
  updateTaskHandler,
} from "@/modules/aaccup/tasks/aaccup.tasks.controller";

// =============================================================================
// URS-DMS — AACCUP task routes
// Mounted under /aaccup in aaccup.routes.ts. The parent authenticates, so
// task routes gate via the existing manager/read codes: mutations require
// aaccup.manage (admins + QAOs), reads require aaccup.read (managers hold it).
// =============================================================================

export const aaccupTasksRouter: Router = Router();

// GET /aaccup/tasks
aaccupTasksRouter.get(
  "/",
  requirePermission("aaccup.read"),
  validateQuery(listTasksQuerySchema),
  asyncHandler(listTasksHandler),
);

// POST /aaccup/tasks
aaccupTasksRouter.post(
  "/",
  requirePermission("aaccup.manage"),
  validateBody(createTaskSchema),
  asyncHandler(createTaskHandler),
);

// GET /aaccup/tasks/:id
aaccupTasksRouter.get(
  "/:id",
  requirePermission("aaccup.read"),
  validateParams(taskIdParamSchema),
  asyncHandler(getTaskHandler),
);

// PATCH /aaccup/tasks/:id
aaccupTasksRouter.patch(
  "/:id",
  requirePermission("aaccup.manage"),
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  asyncHandler(updateTaskHandler),
);

// DELETE /aaccup/tasks/:id  (soft delete = archive)
aaccupTasksRouter.delete(
  "/:id",
  requirePermission("aaccup.manage"),
  validateParams(taskIdParamSchema),
  asyncHandler(archiveTaskHandler),
);

// POST /aaccup/tasks/:id/restore
aaccupTasksRouter.post(
  "/:id/restore",
  requirePermission("aaccup.manage"),
  validateParams(taskIdParamSchema),
  asyncHandler(restoreTaskHandler),
);