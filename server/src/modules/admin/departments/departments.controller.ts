import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/admin/departments/departments.service";
import type {
  CreateDepartmentBody,
  DepartmentListQuery,
  UpdateDepartmentBody,
} from "@/modules/admin/departments/departments.validator";

// =============================================================================
// URS-DMS — Admin · Departments controller (thin)
// =============================================================================
// Controllers stay thin: they build an `Actor` from `req.auth` + `req.context`
// and delegate to the service. No business logic, no Prisma access.
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listDepartmentsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as DepartmentListQuery;
  const result = await service.listDepartments(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getDepartmentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const dept = await service.getDepartment(id, toActor(req));
  sendSuccess(res, dept);
}

export async function createDepartmentHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateDepartmentBody;
  const dept = await service.createDepartment(input, toActor(req));
  sendCreated(res, dept);
}

export async function updateDepartmentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateDepartmentBody;
  const dept = await service.updateDepartment(id, input, toActor(req));
  sendSuccess(res, dept);
}

export async function archiveDepartmentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const dept = await service.archiveDepartment(id, toActor(req));
  sendSuccess(res, dept);
}

export async function restoreDepartmentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const dept = await service.restoreDepartment(id, toActor(req));
  sendSuccess(res, dept);
}
