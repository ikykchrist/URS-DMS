import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  type DocumentDetail,
  type DocumentListItem,
  type DocumentWithRelations,
  documentSelect,
} from "@/modules/documents/documents.types";

// =============================================================================
// URS-DMS — documents repository
// =============================================================================

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** Public list-item mapper for rows selected with `documentSelect`. */
export function toListItemPublic(row: DocumentWithRelations): DocumentListItem {
  return toListItem(row);
}

function toListItem(d: DocumentWithRelations): DocumentListItem {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    status: d.status,
    classification: d.classification,
    ownerId: d.ownerId,
    ownerName: fullName(d.owner.firstName, d.owner.lastName),
    departmentId: d.departmentId,
    departmentName: d.department?.name ?? null,
    folderId: d.folderId,
    currentVersionId: d.currentVersionId,
    currentVersionNumber: d.currentVersion?.versionNumber ?? null,
    currentFilename: d.currentVersion?.filename ?? null,
    currentMimeType: d.currentVersion?.mimeType ?? null,
    currentSizeBytes: d.currentVersion?.sizeBytes.toString() ?? null,
    currentChecksum: d.currentVersion?.checksum ?? null,
    submissionStatus: null,
    retentionUntil: d.retentionUntil,
    metadata: d.metadata,
    tags: d.tags.map((tag) => tag.tag),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    deletedAt: d.deletedAt,
  };
}

function toDetail(d: DocumentWithRelations): DocumentDetail {  return {
    ...toListItem(d),
    shares: d.shares.map((s) => ({
      id: s.id,
      documentId: d.id,
      userId: s.userId,
      userEmail: s.user.email,
      permission: s.permission,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    })),
    versions: d.versions.map((v) => ({
      id: v.id,
      documentId: d.id,
      versionNumber: v.versionNumber,
      objectKey: v.objectKey,
      filename: v.filename,
      mimeType: v.mimeType,
      sizeBytes: v.sizeBytes.toString(),
      checksum: v.checksum,
      changeNote: v.changeNote,
      uploadedById: v.uploadedById,
      uploadedByName: fullName(v.uploadedBy.firstName, v.uploadedBy.lastName),
      uploadedAt: v.uploadedAt,
    })),
    deletedAt: d.deletedAt,
  };
}

export async function list(
  where: Prisma.DocumentWhereInput,
  page: number,
  pageSize: number,
  orderBy: Prisma.DocumentOrderByWithRelationInput = { updatedAt: "desc" },
): Promise<{ items: DocumentListItem[]; total: number; page: number; pageSize: number }> {
  const [rows, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: documentSelect,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);
  return {
    items: rows.map(toListItem),
    total,
    page,
    pageSize,
  };
}

export async function findById(id: string): Promise<DocumentDetail | null> {
  const row = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    select: documentSelect,
  });
  return row ? toDetail(row) : null;
}

export async function findByIdIncludingDeleted(id: string): Promise<DocumentDetail | null> {
  const row = await prisma.document.findFirst({
    where: { id },
    select: documentSelect,
  });
  return row ? toDetail(row) : null;
}

export interface CreateArgs {
  ownerId: string;
  departmentId: string | null;
  folderId: string | null;
  title: string;
  description: string | null;
  classification: string;
  retentionUntil: Date | null;
  metadata: Prisma.InputJsonValue | null;
}

export async function create(
  args: CreateArgs,
  tx?: Prisma.TransactionClient,
): Promise<DocumentDetail> {
  const client = tx ?? prisma;
  const row = await client.document.create({
    data: {
      ownerId: args.ownerId,
      departmentId: args.departmentId,
      folderId: args.folderId,
      title: args.title,
      description: args.description,
      classification: args.classification as Prisma.DocumentCreateInput["classification"],
      retentionUntil: args.retentionUntil,
      metadata: args.metadata ?? undefined,
      status: "DRAFT",
    },
    select: documentSelect,
  });
  return toDetail(row);
}

export interface UpdateArgs {
  id: string;
  data: {
    title?: string;
    description?: string | null;
    classification?: string;
    status?: string;
    folderId?: string | null;
    departmentId?: string | null;
    retentionUntil?: Date | null;
    metadata?: Prisma.InputJsonValue | null;
    currentVersionId?: string | null;
  };
}

export async function update(
  args: UpdateArgs,
  tx?: Prisma.TransactionClient,
): Promise<DocumentDetail> {
  const client = tx ?? prisma;
  const row = await client.document.update({
    where: { id: args.id },
    data: {
      ...(args.data.title !== undefined ? { title: args.data.title } : {}),
      ...(args.data.description !== undefined ? { description: args.data.description } : {}),
      ...(args.data.classification !== undefined
        ? {
            classification: args.data
              .classification as Prisma.DocumentUpdateInput["classification"],
          }
        : {}),
      ...(args.data.status !== undefined
        ? { status: args.data.status as Prisma.DocumentUpdateInput["status"] }
        : {}),
      ...(args.data.folderId !== undefined ? { folderId: args.data.folderId } : {}),
      ...(args.data.departmentId !== undefined ? { departmentId: args.data.departmentId } : {}),
      ...(args.data.retentionUntil !== undefined
        ? { retentionUntil: args.data.retentionUntil }
        : {}),
      ...(args.data.metadata !== undefined
        ? {
            metadata: (args.data.metadata ?? null) as
              | Prisma.NullableJsonNullValueInput
              | Prisma.InputJsonValue,
          }
        : {}),
      ...(args.data.currentVersionId !== undefined
        ? { currentVersionId: args.data.currentVersionId }
        : {}),
    },
    select: documentSelect,
  });
  return toDetail(row);
}

export async function softDelete(id: string): Promise<DocumentDetail> {
  const row = await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: documentSelect,
  });
  return toDetail(row);
}

export async function restore(id: string): Promise<DocumentDetail> {
  const row = await prisma.document.update({
    where: { id },
    data: { deletedAt: null },
    select: documentSelect,
  });
  return toDetail(row);
}

// Version helpers

export async function nextVersionNumber(documentId: string): Promise<number> {
  const last = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  return (last?.versionNumber ?? 0) + 1;
}

export interface CreateVersionArgs {
  documentId: string;
  versionNumber: number;
  objectKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string;
  changeNote: string | null;
  uploadedById: string;
}

export async function createVersion(
  args: CreateVersionArgs,
): Promise<{ id: string; versionNumber: number }> {
  const row = await prisma.documentVersion.create({
    data: {
      documentId: args.documentId,
      versionNumber: args.versionNumber,
      objectKey: args.objectKey,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      checksum: args.checksum,
      changeNote: args.changeNote,
      uploadedById: args.uploadedById,
    },
    select: { id: true, versionNumber: true },
  });
  return row;
}

export async function findVersionById(versionId: string): Promise<{
  id: string;
  documentId: string;
  objectKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: bigint;
  versionNumber: number;
  checksum: string;
  document: { id: string; ownerId: string; deletedAt: Date | null };
} | null> {
  const row = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      documentId: true,
      objectKey: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      versionNumber: true,
      checksum: true,
      document: { select: { id: true, ownerId: true, deletedAt: true } },
    },
  });
  return row;
}

// Used by the service to roll back a version row when an upload's checksum
// fails verification against MinIO's stored object.
export async function deleteVersion(versionId: string): Promise<void> {
  await prisma.documentVersion.delete({ where: { id: versionId } });
}

// Dedupe lookup: returns any existing version for this document with the
// given SHA-256 checksum.
export async function findVersionByChecksum(
  documentId: string,
  checksum: string,
): Promise<{ id: string; versionNumber: number } | null> {
  const row = await prisma.documentVersion.findFirst({
    where: { documentId, checksum },
    select: { id: true, versionNumber: true },
  });
  return row;
}

// Tag helpers

export async function setTags(documentId: string, tags: string[]): Promise<void> {
  await prisma.$transaction([
    prisma.documentTag.deleteMany({ where: { documentId } }),
    ...(tags.length === 0
      ? []
      : [
          prisma.documentTag.createMany({
            data: tags.map((tag) => ({ documentId, tag })),
          }),
        ]),
  ]);
}

// Share helpers

export interface CreateShareArgs {
  documentId: string;
  userId: string;
  permission: string;
  expiresAt: Date | null;
}

export async function upsertShare(args: CreateShareArgs): Promise<{ id: string }> {
  const existing = await prisma.documentShare.findUnique({
    where: { documentId_userId: { documentId: args.documentId, userId: args.userId } },
    select: { id: true },
  });
  if (existing) {
    const row = await prisma.documentShare.update({
      where: { id: existing.id },
      data: {
        permission: args.permission as Prisma.DocumentShareUpdateInput["permission"],
        expiresAt: args.expiresAt,
      },
      select: { id: true },
    });
    return row;
  }
  const row = await prisma.documentShare.create({
    data: {
      documentId: args.documentId,
      userId: args.userId,
      permission: args.permission as Prisma.DocumentShareCreateInput["permission"],
      expiresAt: args.expiresAt,
    },
    select: { id: true },
  });
  return row;
}

export async function deleteShare(documentId: string, userId: string): Promise<boolean> {
  const result = await prisma.documentShare.deleteMany({
    where: { documentId, userId },
  });
  return result.count > 0;
}

export async function findActiveShare(
  documentId: string,
  userId: string,
): Promise<{ permission: string; expiresAt: Date | null } | null> {
  const share = await prisma.documentShare.findFirst({
    where: {
      documentId,
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { permission: true, expiresAt: true },
  });
  return share;
}

// Permission / ownership helper used by the service
export async function getOwnerAndDepartment(
  documentId: string,
): Promise<{ ownerId: string; departmentId: string | null; deletedAt: Date | null } | null> {
  const row = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true, departmentId: true, deletedAt: true },
  });
  return row;
}
