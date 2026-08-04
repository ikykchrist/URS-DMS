import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/admin/roles/roles.service";
import type {
  AdminListRolesQuery,
  CreateAdminRoleBody,
  UpdateAdminRoleBody,
  UpdateRolePermissionsBody,
} from "@/modules/admin/roles/roles.validator";

// =============================================================================
// URS-DMS — Admin · Roles controller (thin)
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

export async function listRolesHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminListRolesQuery;
  const result = await service.listRoles(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getRoleHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const role = await service.getRole(id, toActor(req));
  sendSuccess(res, role);
}

export async function createRoleHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateAdminRoleBody;
  const role = await service.createRole(input, toActor(req));
  sendCreated(res, role);
}

export async function updateRoleHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateAdminRoleBody;
  const role = await service.updateRole(id, input, toActor(req));
  sendSuccess(res, role);
}

export async function archiveRoleHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const role = await service.archiveRole(id, toActor(req));
  sendSuccess(res, role);
}

export async function restoreRoleHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const role = await service.restoreRole(id, toActor(req));
  sendSuccess(res, role);
}

export async function updateRolePermissionsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateRolePermissionsBody;
  const role = await service.updateRolePermissions(id, input, toActor(req));
  sendSuccess(res, role);
}
