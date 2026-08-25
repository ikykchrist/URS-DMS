import type { Request, Response } from "express";
import * as service from "@/modules/users/users.service";
import { sendCreated, sendNoContent, sendSuccess } from "@/utils/apiResponse";

// =============================================================================
// URS-DMS — users controller (thin)
// =============================================================================

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as Parameters<typeof service.listUsers>[0];
  const result = await service.listUsers(q);
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getUserHandler(req: Request, res: Response): Promise<void> {
  const id = (req.params as { id: string }).id;
  const user = await service.getUser(id);
  sendSuccess(res, user);
}

export async function createUserHandler(req: Request, res: Response): Promise<void> {
  const data = req.body as Parameters<typeof service.createUser>[0];
  const created = await service.createUser(
    data,
    req.auth!.userId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendCreated(res, created);
}

// Sprint 8.1 — self-service profile edit (PATCH /users/me)
export async function updateSelfHandler(req: Request, res: Response): Promise<void> {
  const data = req.body as Parameters<typeof service.updateSelf>[1];
  const user = await service.updateSelf(
    req.auth!.userId,
    data,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, { user });
}

export async function profilePhotoPresignHandler(req: Request, res: Response): Promise<void> {
  const result = await service.presignOwnProfilePhoto(req.auth!.userId, req.body);
  sendSuccess(res, result);
}

export async function profilePhotoFinalizeHandler(req: Request, res: Response): Promise<void> {
  const result = await service.finalizeOwnProfilePhoto(req.auth!.userId, req.body);
  sendSuccess(res, result);
}

export async function profilePhotoHandler(req: Request, res: Response): Promise<void> {
  const result = await service.getOwnProfilePhoto(req.auth!.userId);
  sendSuccess(res, result);
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const id = (req.params as { id: string }).id;
  const data = req.body as Parameters<typeof service.updateUser>[1];
  const updated = await service.updateUser(
    id,
    data,
    req.auth!.userId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, updated);
}

export async function changeStatusHandler(req: Request, res: Response): Promise<void> {
  const id = (req.params as { id: string }).id;
  const { status } = req.body as { status: "ACTIVE" | "INACTIVE" | "SUSPENDED" };
  const updated = await service.changeUserStatus(
    id,
    status,
    req.auth!.userId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, updated);
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const id = (req.params as { id: string }).id;
  const { newPassword } = req.body as { newPassword: string };
  await service.resetUserPassword(
    id,
    newPassword,
    req.auth!.userId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendNoContent(res);
}

export async function deleteUserHandler(req: Request, res: Response): Promise<void> {
  const id = (req.params as { id: string }).id;
  await service.deleteUser(id, req.auth!.userId, req.context.ipAddress, req.context.userAgent);
  sendNoContent(res);
}
