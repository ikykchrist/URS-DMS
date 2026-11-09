import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { requireRole } from "@/middlewares/authorize";
import { validateBody, validateQuery } from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { createBugReportHandler, listBugReportsHandler } from "@/modules/bugReports/bugReports.controller";
import { createBugReportSchema, listBugReportsQuerySchema } from "@/modules/bugReports/bugReports.validator";
import { attachmentUploadSchema } from "./bugReports.validator";
import { prepareAttachmentHandler, downloadAttachmentHandler } from "./bugReports.controller";

export const bugReportsRouter = Router();

bugReportsRouter.post("/attachments/upload-url", authenticate, validateBody(attachmentUploadSchema), asyncHandler(prepareAttachmentHandler));
bugReportsRouter.get("/:id/attachment", authenticate, requireRole("ADMINISTRATOR", "ROOT"), asyncHandler(downloadAttachmentHandler));

bugReportsRouter.post("/", authenticate, validateBody(createBugReportSchema), asyncHandler(createBugReportHandler));
bugReportsRouter.get("/", authenticate, requireRole("ADMINISTRATOR", "ROOT"), validateQuery(listBugReportsQuerySchema), asyncHandler(listBugReportsHandler));
