import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/aaccup/tasks/aaccup.tasks.service";
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from "@/modules/aaccup/tasks/aaccup.tasks.validator";

// =============================================================================
// URS-DMS — AACCUP task controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listTasksHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListTasksQuery;
  const result = await service.listTasks(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function listTaskAssigneesHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listTaskAssignees(toActor(req));
  sendSuccess(res, result);
}

export async function listTaskRequirementTemplatesHandler(req: Request, res: Response): Promise<void> {
  const { areaId } = req.query as { areaId: string };
  const result = await service.listTaskRequirementTemplates(areaId, toActor(req));
  sendSuccess(res, result);
}

export async function getTaskHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const task = await service.getTask(id, toActor(req));
  sendSuccess(res, task);
}

export async function createTaskHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateTaskInput;
  const task = await service.createTask(input, toActor(req));
  sendCreated(res, task);
}

export async function updateTaskHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateTaskInput;
  const task = await service.updateTask(id, input, toActor(req));
  sendSuccess(res, task);
}

export async function archiveTaskHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const task = await service.archiveTask(id, toActor(req));
  sendSuccess(res, task);
}

export async function restoreTaskHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const task = await service.restoreTask(id, toActor(req));
  sendSuccess(res, task);
}
