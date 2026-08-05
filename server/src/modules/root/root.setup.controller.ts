import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/root/root.setup.service";
import type {
  SendCredentialsInput,
  UpdateSetupStateInput,
  UploadLogoInput,
} from "@/modules/root/root.setup.validator";

// =============================================================================
// URS-DMS — Platform Setup Wizard controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function getSetupHandler(req: Request, res: Response): Promise<void> {
  const state = await service.getSetup(toActor(req));
  sendSuccess(res, state);
}

export async function startSetupHandler(req: Request, res: Response): Promise<void> {
  const state = await service.startSetup(toActor(req));
  sendSuccess(res, state);
}

export async function saveSetupStateHandler(req: Request, res: Response): Promise<void> {
  const state = await service.saveSetupState(req.body as UpdateSetupStateInput, toActor(req));
  sendSuccess(res, state);
}

export async function uploadLogoHandler(req: Request, res: Response): Promise<void> {
  const result = await service.uploadLogo(req.body as UploadLogoInput, toActor(req));
  sendSuccess(res, result);
}

export async function getLogoUrlHandler(req: Request, res: Response): Promise<void> {
  const result = await service.getLogoUrl(toActor(req));
  if (!result) {
    sendSuccess(res, null);
    return;
  }
  sendSuccess(res, result);
}

export async function completeSetupHandler(req: Request, res: Response): Promise<void> {
  const state = await service.completeSetup(toActor(req));
  sendSuccess(res, state);
}

export async function reopenSetupHandler(req: Request, res: Response): Promise<void> {
  const state = await service.reopenSetup(toActor(req));
  sendSuccess(res, state);
}

export async function getSummaryHandler(req: Request, res: Response): Promise<void> {
  const summary = await service.getSummary(toActor(req));
  sendSuccess(res, summary);
}

export async function sendCredentialsHandler(req: Request, res: Response): Promise<void> {
  const result = await service.sendCredentials(req.body as SendCredentialsInput, toActor(req));
  sendSuccess(res, result);
}
