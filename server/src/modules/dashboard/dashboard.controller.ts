import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/dashboard/dashboard.service";

// =============================================================================
// URS-DMS — dashboard controller (thin)
// Read-only endpoints; no audit entries per dashboard spec.
// Personal repository figures are owner-scoped unless the actor holds
// platform-wide access (ROOT). Platform-wide values belong to the Root
// Console; the administrator dashboard shows only the authenticated
// administrator's repository.
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
  };
}

export async function overviewHandler(req: Request, res: Response): Promise<void> {
  const data = await service.getOverview(toActor(req));
  sendSuccess(res, data);
}

export async function documentsHandler(req: Request, res: Response): Promise<void> {
  const data = await service.getDocumentStats(toActor(req));
  sendSuccess(res, data);
}

export async function usersHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getUserStats();
  sendSuccess(res, data);
}

export async function requestsHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getRequestStats();
  sendSuccess(res, data);
}

export async function aaccupHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getAaccupStats();
  sendSuccess(res, data);
}

export async function storageHandler(req: Request, res: Response): Promise<void> {
  const data = await service.getStorageStats(toActor(req));
  sendSuccess(res, data);
}
