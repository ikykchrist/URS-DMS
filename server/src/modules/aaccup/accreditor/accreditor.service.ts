import { AUDIT_ACTIONS } from "@/config/constants";
import { presignDownload } from "@/lib/storage";
import { writeAudit } from "@/modules/audit/audit.service";
import { getConvertedPreview } from "@/modules/documents/documents.service";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { isInlinePreviewType } from "@/utils/previewFrameHeaders";
import * as areas from "../aaccup.repository";
import * as submissions from "../submissions/aaccup.submissions.repository";
import type { AreasQuery, EvidenceQuery } from "./accreditor.validator";

function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listViewerAreas({ areaSet, page, pageSize }: AreasQuery) {
  const { items, total } = await areas.list({ areaSet, status: "ACTIVE", deletedAt: null }, page, pageSize);
  return { items, meta: pageMeta(page, pageSize, total) };
}

export async function listApprovedEvidence({ areaId, page, pageSize }: EvidenceQuery) {
  const { items, total } = await submissions.listApprovedEvidence(areaId, page, pageSize);
  return { items, meta: pageMeta(page, pageSize, total) };
}

export async function previewApprovedEvidence(
  id: string,
  actor: { userId: string; ipAddress?: string; userAgent?: string },
) {
  const evidence = await submissions.findApprovedEvidence(id);
  if (!evidence) throw new NotFoundError("Approved accreditation evidence not found");
  const version = await submissions.findEvidenceVersion(evidence);
  if (!version) throw new NotFoundError("The approved file version is unavailable");

  const { filename, mimeType, objectKey } = version;
  const converted = await getConvertedPreview(objectKey, filename, mimeType);
  if (!converted && !isInlinePreviewType(mimeType)) {
    throw new BadRequestError("A preview is unavailable for this file type");
  }
  const { url } = converted ?? await presignDownload(objectKey, { inline: true });
  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_PREVIEWED,
    ...actor,
    entity: "document",
    entityId: evidence.documentId,
    newValue: { submissionId: id, versionId: version.id },
  });
  return { url, filename: converted?.filename ?? filename, mimeType: converted?.mimeType ?? mimeType };
}
