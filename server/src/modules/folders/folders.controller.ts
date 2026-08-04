import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/folders/folders.service";
import type {
  CreateFolderInput,
  ListFoldersQuery,
  UpdateFolderInput,
} from "@/modules/folders/folders.validator";

// =============================================================================
// URS-DMS — folders controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listFoldersHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListFoldersQuery;
  const result = await service.listFolders(query, toActor(req));
  sendSuccess(res, result.items);
}

export async function resolveMyFolderStructureHandler(req: Request, res: Response): Promise<void> {
  const result = await service.resolveMyFolderStructure(toActor(req));
  sendSuccess(res, result);
}

export async function getFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const folder = await service.getFolder(id, toActor(req));
  sendSuccess(res, folder);
}

export async function createFolderHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateFolderInput;
  const folder = await service.createFolder(input, toActor(req));
  sendCreated(res, folder);
}

export async function updateFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateFolderInput;
  const folder = await service.updateFolder(id, input, toActor(req));
  sendSuccess(res, folder);
}

export async function deleteFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.softDeleteFolder(id, toActor(req));
  sendNoContent(res);
}
