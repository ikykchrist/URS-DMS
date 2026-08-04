import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/admin/settings/settings.service";
import type { UpdateSettingsBody } from "@/modules/admin/settings/settings.validator";

// =============================================================================
// URS-DMS — Admin · System Settings controller (thin)
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

export async function getSettingsHandler(req: Request, res: Response): Promise<void> {
  const settings = await service.getSettings(toActor(req));
  sendSuccess(res, settings);
}

export async function updateSettingsHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateSettingsBody;
  const settings = await service.updateSettings(input, toActor(req));
  sendSuccess(res, settings);
}
