import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "@/utils/apiResponse";
import * as sharing from "@/modules/folders/folderSharing.service";
import type { FolderShareInput, FolderShareUpdateInput, ShareableUsersQuery } from "@/modules/folders/folderSharing.validator";

function context(req: Request) { return { ipAddress: req.context.ipAddress, userAgent: req.context.userAgent }; }

export async function listFolderSharesHandler(req: Request, res: Response) { sendSuccess(res, await sharing.listFolderShares(req.params.id!, req.auth!.userId)); }
export async function shareFolderHandler(req: Request, res: Response) { sendSuccess(res, await sharing.shareFolder(req.params.id!, req.auth!.userId, req.body as FolderShareInput, context(req))); }
export async function updateFolderShareHandler(req: Request, res: Response) { sendSuccess(res, await sharing.updateFolderShare(req.params.id!, req.params.shareId!, req.auth!.userId, (req.body as FolderShareUpdateInput).permission, context(req))); }
export async function removeFolderShareHandler(req: Request, res: Response) { await sharing.removeFolderShare(req.params.id!, req.params.shareId!, req.auth!.userId, context(req)); sendNoContent(res); }
export async function listSharedWithMeHandler(req: Request, res: Response) { sendSuccess(res, await sharing.listSharedWithMe(req.auth!.userId)); }

export async function listShareableUsersHandler(req: Request, res: Response) {
  sendSuccess(res, await sharing.listShareableUsers(req.auth!.userId, (req.query as ShareableUsersQuery).scope));
}
