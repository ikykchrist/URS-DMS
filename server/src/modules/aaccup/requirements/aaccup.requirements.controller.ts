import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/aaccup/requirements/aaccup.requirements.service";
import type {
  CreateRequirementInput,
  ListRequirementsQuery,
  UpdateRequirementInput,
  ValidateRequirementUploadInput,
} from "@/modules/aaccup/requirements/aaccup.requirements.validator";

// =============================================================================
// URS-DMS — AACCUP requirement controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listRequirementsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListRequirementsQuery;
  const result = await service.listRequirements(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getRequirementHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const requirement = await service.getRequirement(id, toActor(req));
  sendSuccess(res, requirement);
}

export async function createRequirementHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateRequirementInput;
  const requirement = await service.createRequirement(input, toActor(req));
  sendCreated(res, requirement);
}

export async function updateRequirementHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateRequirementInput;
  const requirement = await service.updateRequirement(id, input, toActor(req));
  sendSuccess(res, requirement);
}

export async function archiveRequirementHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const requirement = await service.archiveRequirement(id, toActor(req));
  sendSuccess(res, requirement);
}

export async function restoreRequirementHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const requirement = await service.restoreRequirement(id, toActor(req));
  sendSuccess(res, requirement);
}

export async function validateRequirementUploadHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await service.validateUpload(
    id,
    req.body as ValidateRequirementUploadInput,
    toActor(req),
  );
  sendSuccess(res, result);
}
