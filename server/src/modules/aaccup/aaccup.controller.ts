import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/aaccup/aaccup.service";
import type {
  CreateAreaInput,
  ListAreasQuery,
  UpdateAreaInput,
} from "@/modules/aaccup/aaccup.validator";

// =============================================================================
// URS-DMS — AACCUP controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listAreasHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListAreasQuery;
  const result = await service.listAreas(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getAreaHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const area = await service.getArea(id, toActor(req));
  sendSuccess(res, area);
}

export async function createAreaHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateAreaInput;
  const area = await service.createArea(input, toActor(req));
  sendCreated(res, area);
}

export async function updateAreaHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateAreaInput;
  const area = await service.updateArea(id, input, toActor(req));
  sendSuccess(res, area);
}

export async function archiveAreaHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const area = await service.archiveArea(id, toActor(req));
  sendSuccess(res, area);
}

export async function restoreAreaHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const area = await service.restoreArea(id, toActor(req));
  sendSuccess(res, area);
}
