import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  taskIdParamSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  taskRequirementTemplatesQuerySchema,
} from "@/modules/aaccup/tasks/aaccup.tasks.validator";
import {
  archiveTaskHandler,
  createTaskHandler,
  getTaskHandler,
  listTaskAssigneesHandler,
  listTaskRequirementTemplatesHandler,
  listTasksHandler,
  restoreTaskHandler,
  updateTaskHandler,
} from "@/modules/aaccup/tasks/aaccup.tasks.controller";

// =============================================================================
// URS-DMS — AACCUP task routes
// Mounted under /aaccup in aaccup.routes.ts. The parent authenticates, so
// task routes gate via the existing manager/read codes: mutations require
// aaccup.manage (admins + QAOs), reads require aaccup.read (managers hold it).
// PATCH /aaccup/tasks/:id is the exception: authorization (manager OR task
// assignee) is enforced inside the service so assigned users can move their
// own task status forward.
// =============================================================================

export const aaccupTasksRouter: Router = Router();

// GET /aaccup/tasks
aaccupTasksRouter.get(
  "/",
  requirePermission("aaccup.read"),
  validateQuery(listTasksQuerySchema),
  asyncHandler(listTasksHandler),
);

// GET /aaccup/tasks/assignees — assignee picker for the Create Task modal
aaccupTasksRouter.get(
  "/assignees",
  requirePermission("aaccup.read"),
  asyncHandler(listTaskAssigneesHandler),
);

aaccupTasksRouter.get(
  "/requirement-templates",
  requirePermission("aaccup.read"),
  validateQuery(taskRequirementTemplatesQuerySchema),
  asyncHandler(listTaskRequirementTemplatesHandler),
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
