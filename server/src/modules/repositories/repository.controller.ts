import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/repositories/repository.service";
import type {
  GrantEmergencyAccessInput,
  RevokeEmergencyAccessInput,
} from "@/modules/repositories/repository.validator";

// =============================================================================
// URS-DMS — Personal repository controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function getMyRepositoryHandler(req: Request, res: Response): Promise<void> {
  const repository = await service.getMyRepository(toActor(req));
  sendSuccess(res, repository);
}

export async function backfillHandler(req: Request, res: Response): Promise<void> {
  const result = await service.backfill(toActor(req));
  sendSuccess(res, result);
}

export async function grantEmergencyAccessHandler(req: Request, res: Response): Promise<void> {
  const { ownerId } = req.params as { ownerId: string };
  const result = await service.grantEmergencyAccess(ownerId, req.body as GrantEmergencyAccessInput, toActor(req));
  sendSuccess(res, result);
}

export async function revokeEmergencyAccessHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await service.revokeEmergencyAccess(id, req.body as RevokeEmergencyAccessInput, toActor(req));
  sendSuccess(res, result);
}

export async function listEmergencyAccessHandler(req: Request, res: Response): Promise<void> {
  const rows = await service.listEmergencyAccess(toActor(req));
  sendSuccess(res, rows);
}

export async function listRepositoriesHandler(req: Request, res: Response): Promise<void> {
  const { ownerId } = req.params as { ownerId: string };
  const rows = await service.listRepositories(toActor(req), ownerId);
  sendSuccess(res, rows);
}

export async function getStorageSummaryHandler(req: Request, res: Response): Promise<void> {
  const summary = await service.getStorageSummary(toActor(req));
  sendSuccess(res, summary);
}
