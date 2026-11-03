import { AUDIT_ACTIONS } from "@/config/constants";
import { randomUUID } from "node:crypto";
import { presignUpload, presignDownload, statObject } from "@/lib/storage";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import type { AttachmentUploadInput } from "./bugReports.validator";
import { writeAudit } from "@/modules/audit/audit.service";
import * as repo from "@/modules/bugReports/bugReports.repository";
import type { CreateBugReportInput, ListBugReportsQuery } from "@/modules/bugReports/bugReports.validator";

export interface Actor {
  id: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createBugReport(input: CreateBugReportInput, actor: Actor) {
  if (input.attachment) {
    const prefix = `documents/bug-reports-${actor.id}/`;
    const suffix = input.attachment.filename.replace(/[^A-Za-z0-9._-]+/g, "_");
    const rest = input.attachment.objectKey.slice(prefix.length);
    if (!input.attachment.objectKey.startsWith(prefix) || !/^[0-9a-f-]{36}\/[^/]+$/.test(rest) || !rest.endsWith(`/${suffix}`)) {
      throw new BadRequestError("Invalid report attachment.");
    }
    const stat = await statObject(input.attachment.objectKey);
    if (stat.size < 1 || stat.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(stat.contentType)) {
      throw new BadRequestError("Attachment must be a PNG, JPG, WebP or PDF up to 5 MB.");
    }
  }
  const report = await repo.create({
    reporterId: actor.id,
    tab: input.tab,
    description: input.description,
    attachmentKey: input.attachment?.objectKey,
    attachmentName: input.attachment?.filename,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.BUG_REPORT_CREATED,
    userId: actor.id,
    entity: "bug_report",
    entityId: report.id,
    newValue: { tab: report.tab, hasAttachment: Boolean(report.attachmentKey) },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return report;
}

export async function prepareAttachment(input: AttachmentUploadInput, actor: Actor) {
  return presignUpload(`bug-reports-${actor.id}`, randomUUID(), input.filename, input.mimeType, input.sizeBytes);
}

// Called only after the same administrator/root guard as report listing.
export async function downloadAttachment(id: string) {
  const report = await repo.findById(id);
  if (!report?.attachmentKey) throw new NotFoundError("Report attachment not found.");
  return presignDownload(report.attachmentKey);
}

export async function listBugReports(query: ListBugReportsQuery) {
  const [items, total] = await repo.list((query.page - 1) * query.pageSize, query.pageSize);
  return { items, total, page: query.page, pageSize: query.pageSize };
}
