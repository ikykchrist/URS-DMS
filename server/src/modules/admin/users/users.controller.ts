import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/admin/users/users.service";
import type {
  AdminListUsersQuery,
  CreateAdminUserBody,
  ForcePasswordChangeBody,
  ResetPasswordAdminBody,
  UpdateAdminUserBody,
  UpdateStatusBody,
} from "@/modules/admin/users/users.validator";

// =============================================================================
// URS-DMS — Admin · Users controller (thin)
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

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminListUsersQuery;
  const result = await service.listUsers(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getUserHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const user = await service.getUser(id, toActor(req));
  sendSuccess(res, user);
}

export async function createUserHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateAdminUserBody;
  const user = await service.createUser(input, toActor(req));
  sendCreated(res, user);
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateAdminUserBody;
  const user = await service.updateUser(id, input, toActor(req));
  sendSuccess(res, user);
}

export async function archiveUserHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const user = await service.archiveUser(id, toActor(req));
  sendSuccess(res, user);
}

export async function restoreUserHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const user = await service.restoreUser(id, toActor(req));
  sendSuccess(res, user);
}

export async function changeStatusHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateStatusBody;
  const user = await service.changeUserStatus(id, input, toActor(req));
  sendSuccess(res, user);
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as ResetPasswordAdminBody;
  const user = await service.resetUserPassword(id, input, toActor(req));
  sendSuccess(res, user);
}

export async function forcePasswordChangeHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as ForcePasswordChangeBody;
  const user = await service.forcePasswordChange(id, input, toActor(req));
  sendSuccess(res, user);
}
