import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/admin/permissions/permissions.service";

// =============================================================================
// URS-DMS — Admin · Permissions controller (thin)
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

export async function listPermissionsHandler(req: Request, res: Response): Promise<void> {
  const items = await service.listPermissions(toActor(req));
  sendSuccess(res, items);
}
