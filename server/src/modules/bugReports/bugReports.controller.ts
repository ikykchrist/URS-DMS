import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/bugReports/bugReports.service";
import type { CreateBugReportInput, ListBugReportsQuery } from "@/modules/bugReports/bugReports.validator";
import type { AttachmentUploadInput } from "./bugReports.validator";

function actor(req: Request): service.Actor {
  return { id: req.auth!.userId, ipAddress: req.context.ipAddress, userAgent: req.context.userAgent };
}

export async function prepareAttachmentHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.prepareAttachment(req.body as AttachmentUploadInput, actor(req)));
}

export async function downloadAttachmentHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.downloadAttachment(req.params.id!));
}

export async function createBugReportHandler(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createBugReport(req.body as CreateBugReportInput, actor(req)));
}

export async function listBugReportsHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listBugReports(req.query as unknown as ListBugReportsQuery);
  sendSuccess(res, result.items, 200, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
  });
}
