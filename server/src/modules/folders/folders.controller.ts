import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/folders/folders.service";
import type {
  CreateFolderInput,
  ListFoldersQuery,
  UpdateFolderInput,
} from "@/modules/folders/folders.validator";

// =============================================================================
// URS-DMS â€” folders controller (thin)
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
export async function listDeletedFoldersHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listDeletedFolders(toActor(req));
  sendSuccess(res, result.items);
}

export async function restoreFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const folder = await service.restoreFolder(id, req.body as service.RestoreFolderInput, toActor(req));
  sendSuccess(res, folder);
}

export async function copyFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as service.CopyFolderInput;
  const result = await service.copyFolder(id, body, toActor(req));
  sendCreated(res, result);
}

export async function getFolderInfoHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const info = await service.getFolderInfo(id, toActor(req));
  sendSuccess(res, info);
}

export async function downloadFolderZipHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { filename, stream } = await service.downloadFolderZip(id, toActor(req));
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  stream.pipe(res);
}

export async function listCopyJobsHandler(req: Request, res: Response): Promise<void> {
  const jobs = await service.listCopyJobs(toActor(req));
  sendSuccess(res, jobs);
}

export async function getCopyJobHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const job = await service.getCopyJob(id, toActor(req));
  sendSuccess(res, job);
}

export async function permanentDeleteFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.permanentDeleteFolder(id, toActor(req));
  sendNoContent(res);
}

export async function pinFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.pinFolder(id, toActor(req));
  sendSuccess(res, { pinned: true });
}

export async function unpinFolderHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.unpinFolder(id, toActor(req));
  sendSuccess(res, { pinned: false });
}

export async function listPinnedFoldersHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listPinnedFolders(toActor(req));
  sendSuccess(res, result.items);
}