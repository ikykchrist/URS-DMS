import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  AaccupSubmissionDetail,
  AaccupSubmissionListItem,
} from "@/modules/aaccup/submissions/aaccup.submissions.types";

// =============================================================================
// URS-DMS — AACCUP submission repository
// =============================================================================

const SUBMISSION_INCLUDE = {
  requirement: {
    select: {
      id: true,
      title: true,
      documentCode: true,
      area: { select: { id: true, code: true, name: true, areaSet: true, campusId: true, collegeId: true, programId: true } },
    },
  },
  document: {
    select: {
      id: true,
      title: true,
      campusId: true,
      collegeId: true,
      programId: true,
      campus: { select: { name: true } },
      college: { select: { name: true } },
      program: { select: { name: true } },
      ownerId: true,
      deletedAt: true,
    },
  },
  task: { select: { id: true, title: true, status: true } },
  submittedByUser: { select: { firstName: true, lastName: true } },
  reviewedByUser: { select: { firstName: true, lastName: true } },
} satisfies Prisma.AaccupSubmissionInclude;

type SubmissionWithRelations = Prisma.AaccupSubmissionGetPayload<{
  include: typeof SUBMISSION_INCLUDE;
}>;

const VIEWER_EVIDENCE_WHERE = {
  status: "APPROVED",
  isCurrent: true,
  deletedAt: null,
  document: { deletedAt: null },
  requirement: {
    deletedAt: null,
    area: { deletedAt: null, status: "ACTIVE", areaSet: { in: ["AACCUP", "ISO"] } },
  },
} satisfies Prisma.AaccupSubmissionWhereInput;

export async function listApprovedEvidence(areaId: string, page: number, pageSize: number) {
  const where = {
    ...VIEWER_EVIDENCE_WHERE,
    requirement: { ...VIEWER_EVIDENCE_WHERE.requirement, areaId },
  };
  const [rows, total] = await Promise.all([
    prisma.aaccupSubmission.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        snapshotFilename: true,
        requirement: { select: { title: true, documentCode: true } },
      },
    }),
    prisma.aaccupSubmission.count({ where }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      filename: row.snapshotFilename ?? row.requirement.title,
      requirementTitle: row.requirement.title,
      requirementCode: row.requirement.documentCode,
    })),
    total,
  };
}

export function findApprovedEvidence(id: string) {
  return prisma.aaccupSubmission.findFirst({
    where: { ...VIEWER_EVIDENCE_WHERE, id },
    select: {
      documentId: true,
      snapshotChecksum: true,
      snapshotSizeBytes: true,
      snapshotFilename: true,
      snapshotMimeType: true,
      submittedAt: true,
    },
  });
}

export async function findEvidenceVersion(evidence: NonNullable<Awaited<ReturnType<typeof findApprovedEvidence>>>) {
  const { documentId, snapshotChecksum, snapshotSizeBytes, snapshotFilename, snapshotMimeType, submittedAt } = evidence;
  // Legacy records without a digest cannot prove which bytes were approved.
  if (!snapshotChecksum || snapshotSizeBytes === null) return null;
  return prisma.documentVersion.findFirst({
    where: {
      documentId,
      checksum: snapshotChecksum,
      sizeBytes: snapshotSizeBytes,
      ...(snapshotFilename ? { filename: snapshotFilename } : {}),
      ...(snapshotMimeType ? { mimeType: snapshotMimeType } : {}),
      uploadedAt: { lte: submittedAt },
    },
    orderBy: { versionNumber: "desc" },
    select: { id: true, filename: true, mimeType: true, objectKey: true },
  });
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function toListItem(row: SubmissionWithRelations): AaccupSubmissionListItem {
  return {
    id: row.id,
    requirementId: row.requirementId,
    requirementTitle: row.requirement?.title ?? "",
    requirementDocumentCode: row.requirement?.documentCode ?? "",
    areaId: row.requirement?.area?.id ?? "",
    areaCode: row.requirement?.area?.code ?? "",
    areaName: row.requirement?.area?.name ?? "",
    areaSet: row.requirement?.area?.areaSet ?? "",
    campusId: row.document?.campusId ?? row.requirement?.area?.campusId ?? null,
    collegeId: row.document?.collegeId ?? row.requirement?.area?.collegeId ?? null,
    programId: row.document?.programId ?? row.requirement?.area?.programId ?? null,
    campusName: row.document?.campus?.name ?? null,
    collegeName: row.document?.college?.name ?? null,
    programName: row.document?.program?.name ?? null,
    taskId: row.taskId,
    taskTitle: row.task?.title ?? null,
    taskStatus: row.task?.status ?? null,
    documentId: row.documentId,
    documentTitle: row.document?.title ?? "",
    submittedById: row.submittedBy,
    submittedByName: row.submittedByUser
      ? fullName(row.submittedByUser.firstName, row.submittedByUser.lastName)
      : "",
    reviewedById: row.reviewedBy,
    reviewedByName: row.reviewedByUser
      ? fullName(row.reviewedByUser.firstName, row.reviewedByUser.lastName)
      : null,
    status: row.status,
    remarks: row.remarks,
    isCurrent: row.isCurrent,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDetail(row: SubmissionWithRelations): AaccupSubmissionDetail {
  return { ...toListItem(row), deletedAt: row.deletedAt };
}

export async function list(
  where: Prisma.AaccupSubmissionWhereInput,
  page: number,
  pageSize: number,
  sortField: string,
  sortOrder: "asc" | "desc",
): Promise<{ items: AaccupSubmissionListItem[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.aaccupSubmission.findMany({
      where,
      include: SUBMISSION_INCLUDE,
      orderBy: {
        [sortField]: sortOrder,
      } as Prisma.AaccupSubmissionOrderByWithRelationInput,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aaccupSubmission.count({ where }),
  ]);
  return { items: rows.map(toListItem), total };
}

export async function findById(
  id: string,
  includeDeleted = false,
): Promise<AaccupSubmissionDetail | null> {
  const row = await prisma.aaccupSubmission.findFirst({
    where: includeDeleted ? { id } : { id, deletedAt: null },
    include: SUBMISSION_INCLUDE,
  });
  return row ? toDetail(row) : null;
}

export async function updateRemarks(
  id: string,
  remarks: string | null,
): Promise<AaccupSubmissionDetail> {
  const row = await prisma.aaccupSubmission.update({
    where: { id },
    data: { remarks, updatedAt: new Date() },
    include: SUBMISSION_INCLUDE,
  });
  return toDetail(row);
}

export async function archive(
  id: string,
): Promise<AaccupSubmissionDetail> {
  const row = await prisma.aaccupSubmission.update({
    where: { id },
    data: { deletedAt: new Date(), isCurrent: false, updatedAt: new Date() },
    include: SUBMISSION_INCLUDE,
  });
  return toDetail(row);
}

export async function restore(
  id: string,
): Promise<AaccupSubmissionDetail> {
  const row = await prisma.aaccupSubmission.update({
    where: { id },
    data: { deletedAt: null, updatedAt: new Date() },
    include: SUBMISSION_INCLUDE,
  });
  return toDetail(row);
}
