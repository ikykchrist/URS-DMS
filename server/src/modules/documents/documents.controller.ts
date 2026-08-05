import type { Request, Response } from "express";
import * as service from "@/modules/documents/documents.service";
import { sendCreated, sendNoContent, sendSuccess } from "@/utils/apiResponse";
import type {
  AddVersionInput,
  CreateDocumentInput,
  ListDocumentsQuery,
  ShareDocumentInput,
  UpdateDocumentInput,
} from "@/modules/documents/documents.validator";

// =============================================================================
// URS-DMS â€” documents controller (thin)
// All handlers expect req.auth (set by authenticate) and req.context (set by
// requestContext). Each handler maps request data into the service actor.
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listDocumentsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListDocumentsQuery;
  const result = await service.listDocuments(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const doc = await service.getDocument(id, toActor(req));
  sendSuccess(res, doc);
}

export async function createDocumentHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateDocumentInput;
  const result = await service.createDocument(input, toActor(req));
  sendCreated(res, result);
}

export async function updateDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateDocumentInput;
  const updated = await service.updateDocument(id, input, toActor(req));
  sendSuccess(res, updated);
}

export async function deleteDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.softDeleteDocument(id, toActor(req));
  sendNoContent(res);
}

export async function restoreDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const document = await service.restoreDocument(id, req.body as service.RestoreDocumentInput, toActor(req));
  sendSuccess(res, document);
}

export async function getDocumentActivityHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const activity = await service.getDocumentActivity(id, toActor(req));
  sendSuccess(res, activity);
}

export async function downloadDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { versionId } = (req.query as { versionId?: string }) ?? {};
  const result = await service.getDownloadUrl(id, toActor(req), versionId);
  sendSuccess(res, result);
}

export async function previewDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await service.getPreviewUrl(id, toActor(req));
  sendSuccess(res, result);
}

export async function addVersionHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as AddVersionInput;
  const result = await service.addVersion(id, input, toActor(req));
  sendCreated(res, result);
}

export async function verifyUploadHandler(req: Request, res: Response): Promise<void> {
  const { id, versionId } = req.params as { id: string; versionId: string };
  await service.verifyUpload(id, versionId, toActor(req));
  sendSuccess(res, { verified: true });
}

export async function listVersionsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const versions = await service.listVersions(id, toActor(req));
  sendSuccess(res, versions);
}

export async function shareDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as ShareDocumentInput;
  await service.shareDocument(id, input, toActor(req));
  sendNoContent(res);
}

export async function unshareDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id, userId } = req.params as { id: string; userId: string };
  await service.unshareDocument(id, userId, toActor(req));
  sendNoContent(res);
}
export async function listDeletedDocumentsHandler(req: Request, res: Response): Promise<void> {
  const items = await service.listDeletedDocuments(toActor(req));
  sendSuccess(res, items);
}

export async function listRequestedDocumentsHandler(req: Request, res: Response): Promise<void> {
  const items = await service.listRequestedDocuments(toActor(req));
  sendSuccess(res, items);
}

export async function copyDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const document = await service.copyDocument(id, req.body as never, toActor(req));
  sendCreated(res, document);
}

export async function permanentDeleteDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.permanentDeleteDocument(id, toActor(req));
  sendNoContent(res);
}

export async function favoriteDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.favoriteDocument(id, toActor(req));
  sendSuccess(res, { favorited: true });
}

export async function unfavoriteDocumentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.unfavoriteDocument(id, toActor(req));
  sendSuccess(res, { favorited: false });
}

export async function listFavoriteDocumentsHandler(req: Request, res: Response): Promise<void> {
  const items = await service.listFavoriteDocuments(toActor(req));
  sendSuccess(res, items);
}

export async function listRecentsHandler(req: Request, res: Response): Promise<void> {
  const items = await service.listRecents(toActor(req));
  sendSuccess(res, items);
}