import { presignDownload, presignUpload, statObject, getObjectStream } from "@/lib/storage";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import {
  bindWorkflowInstance,
  evaluateWorkflowAction,
  recordWorkflowAction,
  scopesForDocument,
} from "@/modules/workflow/workflow.engine";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/documents/documents.repository";
import type { Prisma } from "@prisma/client";
import type { ListDocumentsQuery } from "@/modules/documents/documents.validator";
import type {
  AddVersionInput,
  CreateDocumentInput,
  ShareDocumentInput,
  UpdateDocumentInput,
} from "@/modules/documents/documents.validator";
import type {
  DocumentDetail,
  DocumentListItem,
  DocumentVersionView,
} from "@/modules/documents/documents.types";
import type { DocumentStatus } from "@prisma/client";

// =============================================================================
// URS-DMS — documents service
// RBAC model:
//   - "managers" = users holding documents.delete (admins + QAOs).
//   - otherwise: owner OR active share OR folder/department scope.
// No `if (role === "admin")` anywhere — every check routes through permissions.
// =============================================================================

// Sprint 7.4.5 — document status → workflow action adapter (glue convention,
// not workflow data: the action names themselves are authored by ROOT).
const DOCUMENT_STATUS_ACTIONS: Record<DocumentStatus, string> = {
  DRAFT: "RESET_TO_DRAFT",
  UNDER_REVIEW: "SUBMIT_FOR_REVIEW",
  APPROVED: "APPROVE",
  PUBLISHED: "PUBLISH",
  ARCHIVED: "ARCHIVE",
};

export interface ListResult {
  items: DocumentListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface DocumentWithVersionUrl {
  document: DocumentDetail;
  upload: {
    url: string;
    objectKey: string;
    headers: Record<string, string>;
    expiresInSeconds: number;
  };
}

export interface DownloadResult {
  url: string;
  objectKey: string;
  expiresInSeconds: number;
  filename: string;
  sizeBytes: string;
  mimeType: string;
}

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

const SHARE_PERMISSIONS = ["READ", "WRITE", "OWNER"] as const;
type SharePermissionValue = (typeof SHARE_PERMISSIONS)[number];

function isManager(actor: Actor): boolean {
  return actor.permissions.includes("documents.delete");
}

function canReadWrite(actor: Actor, ownerId: string): boolean {
  if (actor.id === ownerId) return true;
  if (isManager(actor)) return true;
  return actor.permissions.includes("documents.update");
}

async function assertCanRead(actor: Actor, doc: { ownerId: string; id: string }): Promise<void> {
  if (canReadWrite(actor, doc.ownerId)) return;
  const share = await repo.findActiveShare(doc.id, actor.id);
  if (share) return;
  throw new ForbiddenError("You do not have access to this document");
}

async function assertCanWrite(actor: Actor, doc: { ownerId: string; id: string }): Promise<void> {
  if (actor.id === doc.ownerId) return;
  if (isManager(actor)) return;
  const share = await repo.findActiveShare(doc.id, actor.id);
  if (share && (share.permission === "WRITE" || share.permission === "OWNER")) return;
  if (actor.permissions.includes("documents.update")) return;
  throw new ForbiddenError("You cannot modify this document");
}

async function assertCanManage(actor: Actor, doc: { ownerId: string; id: string }): Promise<void> {
  if (actor.id === doc.ownerId) return;
  if (isManager(actor)) return;
  throw new ForbiddenError("Only the owner or a manager can perform this action");
}

// -----------------------------------------------------------------------------
// listDocuments
// -----------------------------------------------------------------------------
export async function listDocuments(query: ListDocumentsQuery, actor: Actor): Promise<ListResult> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where: Prisma.DocumentWhereInput = { deletedAt: null };

  if (query.status) where.status = query.status;
  if (query.classification) where.classification = query.classification;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.folderId) where.folderId = query.folderId;
  if (query.ownerId) where.ownerId = query.ownerId;
  if (query.uploadedById) {
    where.versions = { some: { uploadedById: query.uploadedById } };
  }
  if (query.tag) where.tags = { some: { tag: query.tag } };

  // Scope: managers see everything; everyone else sees owned + shared.
  if (!isManager(actor)) {
    where.OR = [{ ownerId: actor.id }, { shares: { some: { userId: actor.id } } }];
  }

  if (query.q) {
    const qFilter: Prisma.DocumentWhereInput = {
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { versions: { some: { filename: { contains: query.q, mode: "insensitive" } } } },
      ],
    };
    if (where.OR) {
      where.AND = [{ OR: where.OR }, qFilter];
      delete where.OR;
    } else {
      where.OR = qFilter.OR;
    }
  }

  const sortField = query.sort ?? "updatedAt";
  const sortOrder = query.order ?? "desc";
  const orderBy: Prisma.DocumentOrderByWithRelationInput = { [sortField]: sortOrder };

  const r = await repo.list(where, page, pageSize, orderBy);
  return {
    items: r.items,
    meta: {
      page: r.page,
      pageSize: r.pageSize,
      total: r.total,
      totalPages: Math.max(1, Math.ceil(r.total / r.pageSize)),
    },
  };
}

// -----------------------------------------------------------------------------
// getDocument
// -----------------------------------------------------------------------------
export async function getDocument(id: string, actor: Actor): Promise<DocumentDetail> {
  const doc = await repo.findById(id);
  if (!doc) throw new NotFoundError("Document not found");
  await assertCanRead(actor, doc);
  return doc;
}

// -----------------------------------------------------------------------------
// createDocument
// -----------------------------------------------------------------------------
export async function createDocument(
  input: CreateDocumentInput,
  actor: Actor,
): Promise<DocumentWithVersionUrl> {
  let created: DocumentDetail | undefined;
  await prisma.$transaction(async (tx) => {
    created = await repo.create(
      {
        ownerId: actor.id,
        departmentId: input.departmentId ?? null,
        folderId: input.folderId ?? null,
        title: input.title,
        description: input.description ?? null,
        classification: input.classification,
        retentionUntil: input.retentionUntil ?? null,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | null,
      },
      tx,
    );

    // Sprint 7.4.5 — bind a published workflow instance (if one is assigned
    // to the document's folder/department scope) inside the same transaction.
    // No assignment → legacy flow unchanged.
    const scopes = await scopesForDocument(created.id, tx);
    await bindWorkflowInstance({
      entityType: "DOCUMENT",
      entityId: created.id,
      scopes,
      actor,
      tx,
    });
  });
  if (!created) throw new BadRequestError("Document creation failed");

  if (input.tags && input.tags.length > 0) {
    await repo.setTags(created.id, input.tags);
  }

  const versionNumber = 1;
  // The object key embeds the (future) versionId. Because we have not yet
  // created the version row, we mint a placeholder using the documentId +
  // versionNumber. The first actual upload must use exactly this key.
  // NOTE: the controller/handler that finalizes the upload should persist
  //       a DocumentVersion row with this same objectKey.
  const objectKey = `documents/${created.id}/v${versionNumber}/initial`;
  const upload = await presignUpload(
    created.id,
    `v${versionNumber}`,
    "initial",
    "application/octet-stream",
    0,
  );

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_CREATED,
    userId: actor.id,
    entity: "document",
    entityId: created.id,
    newValue: {
      title: created.title,
      classification: created.classification,
      ownerId: created.ownerId,
      hasInitialVersion: false,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  const refreshed = await repo.findById(created.id);
  return {
    document: refreshed ?? created,
    upload: {
      url: upload.url,
      objectKey,
      headers: upload.headers,
      expiresInSeconds: upload.expiresInSeconds,
    },
  };
}

// -----------------------------------------------------------------------------
// updateDocument
// -----------------------------------------------------------------------------
export async function updateDocument(
  id: string,
  input: UpdateDocumentInput,
  actor: Actor,
): Promise<DocumentDetail> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Document not found");
  await assertCanWrite(actor, existing);

  const statusChanged =
    input.status !== undefined && input.status !== existing.status;
  let updated: DocumentDetail | undefined;
  let evaluation: Awaited<ReturnType<typeof evaluateWorkflowAction>> = null;
  await prisma.$transaction(async (tx) => {
    // Sprint 7.4.5 — workflow gate on status transitions: if a published
    // workflow controls this document, the status change must be an allowed
    // action from the current step (legacy fallback when no instance is
    // bound). Non-status edits skip the gate entirely.
    if (statusChanged) {
      evaluation = await evaluateWorkflowAction(
        "DOCUMENT",
        id,
        DOCUMENT_STATUS_ACTIONS[input.status as DocumentStatus],
        actor,
        tx,
      );
    }
    updated = await repo.update(
      {
        id,
        data: {
          title: input.title,
          description: input.description,
          classification: input.classification,
          status: input.status,
          folderId: input.folderId,
          departmentId: input.departmentId,
          retentionUntil: input.retentionUntil,
          metadata:
            input.metadata === undefined
              ? undefined
              : ((input.metadata ?? null) as Prisma.InputJsonValue | null),
        },
      },
      tx,
    );
    if (evaluation) {
      await recordWorkflowAction(tx, evaluation, actor, undefined);
    }
  });
  if (!updated) throw new BadRequestError("Document update failed");

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_UPDATED,
    userId: actor.id,
    entity: "document",
    entityId: id,
    oldValue: {
      title: existing.title,
      status: existing.status,
      classification: existing.classification,
      folderId: existing.folderId,
      departmentId: existing.departmentId,
    },
    newValue: {
      title: updated.title,
      status: updated.status,
      classification: updated.classification,
      folderId: updated.folderId,
      departmentId: updated.departmentId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// softDeleteDocument
// -----------------------------------------------------------------------------
export async function softDeleteDocument(id: string, actor: Actor): Promise<void> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Document not found");
  await assertCanManage(actor, existing);

  await repo.softDelete(id);

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_DELETED,
    userId: actor.id,
    entity: "document",
    entityId: id,
    oldValue: { title: existing.title, ownerId: existing.ownerId },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  // NOTE: physical MinIO object cleanup is intentionally deferred — soft-deleted
  // documents may be restored. A scheduled job should purge objects once the
  // document row is permanently destroyed (out of Sprint 3 scope).
}

// -----------------------------------------------------------------------------
// restoreDocument
// -----------------------------------------------------------------------------
export async function restoreDocument(id: string, actor: Actor): Promise<DocumentDetail> {
  const existing = await repo.findByIdIncludingDeleted(id);
  if (!existing) throw new NotFoundError("Document not found");
  if (!isManager(actor)) {
    throw new ForbiddenError("Only managers can restore deleted documents");
  }

  const restored = await repo.restore(id);

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_RESTORED,
    userId: actor.id,
    entity: "document",
    entityId: id,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return restored;
}

// -----------------------------------------------------------------------------
// getDownloadUrl
// -----------------------------------------------------------------------------
export async function getDownloadUrl(
  id: string,
  actor: Actor,
  versionId?: string,
): Promise<DownloadResult> {
  const doc = await repo.findById(id);
  if (!doc) throw new NotFoundError("Document not found");
  await assertCanRead(actor, doc);

  let version:
    | DocumentVersionView
    | { id: string; objectKey: string; filename: string; mimeType: string; sizeBytes: string }
    | undefined;
  if (versionId) {
    version = doc.versions.find((v) => v.id === versionId);
    if (!version) throw new NotFoundError("Version not found");
  } else {
    const current = doc.versions[0];
    if (!current) throw new NotFoundError("Document has no versions");
    version = current;
  }

  const dl = await presignDownload(version.objectKey);

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
    userId: actor.id,
    entity: "document",
    entityId: id,
    newValue: { versionId: version.id, objectKey: version.objectKey },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return {
    url: dl.url,
    objectKey: dl.objectKey,
    expiresInSeconds: dl.expiresInSeconds,
    filename: version.filename,
    sizeBytes: version.sizeBytes,
    mimeType: version.mimeType,
  };
}

// -----------------------------------------------------------------------------
// getPreviewUrl — same as download, distinct audit context omitted on purpose
// (preview is a read of the latest version rendered inline).
// -----------------------------------------------------------------------------
export async function getPreviewUrl(id: string, actor: Actor): Promise<DownloadResult> {
  return getDownloadUrl(id, actor);
}

// -----------------------------------------------------------------------------
// addVersion
// -----------------------------------------------------------------------------
export async function addVersion(
  documentId: string,
  input: AddVersionInput,
  actor: Actor,
): Promise<{
  document: DocumentDetail;
  upload: {
    url: string;
    objectKey: string;
    headers: Record<string, string>;
    expiresInSeconds: number;
  };
}> {
  const doc = await repo.findById(documentId);
  if (!doc) throw new NotFoundError("Document not found");
  await assertCanWrite(actor, doc);

  // ── Dedupe: reject if a version with this checksum already exists for this
  // document. Avoids storing identical bytes twice under different version
  // numbers. Checked BEFORE creating the version row so we don't leave
  // orphaned rows on the rejection path.
  const existingVersion = await repo.findVersionByChecksum(documentId, input.checksum);
  if (existingVersion) {
    throw new ConflictError("A version with this checksum already exists for this document", {
      existingVersionId: existingVersion.id,
      versionNumber: existingVersion.versionNumber,
    });
  }

  const versionNumber = await repo.nextVersionNumber(documentId);
  // Obtain the canonical, sanitized object key from the storage adapter before
  // persisting the version. This keeps filenames with spaces or punctuation
  // consistent across the database, presigned URL and later verification.
  const upload = await presignUpload(
    documentId,
    `v${versionNumber}`,
    input.filename,
    input.mimeType,
    Number(input.sizeBytes),
  );
  const objectKey = upload.objectKey;

  const created = await repo.createVersion({
    documentId,
    versionNumber,
    objectKey,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksum: input.checksum,
    changeNote: input.changeNote ?? null,
    uploadedById: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_VERSION_ADDED,
    userId: actor.id,
    entity: "document",
    entityId: documentId,
    newValue: {
      versionId: created.id,
      versionNumber,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes.toString(),
      checksum: input.checksum,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  const refreshed = await repo.findById(documentId);
  if (!refreshed) throw new NotFoundError("Document not found after version add");
  return {
    document: refreshed,
    upload: {
      url: upload.url,
      objectKey,
      headers: upload.headers,
      expiresInSeconds: upload.expiresInSeconds,
    },
  };
}

// -----------------------------------------------------------------------------
// listVersions
// -----------------------------------------------------------------------------
export async function listVersions(
  documentId: string,
  actor: Actor,
): Promise<DocumentVersionView[]> {
  const doc = await repo.findById(documentId);
  if (!doc) throw new NotFoundError("Document not found");
  await assertCanRead(actor, doc);
  return doc.versions;
}

// -----------------------------------------------------------------------------
// verifyUpload — called by the controller after the client completes the
// presigned PUT to MinIO. ETags are MD5/multipart identifiers, not SHA-256, so
// verification streams the stored object through Node's SHA-256 hasher. The
// version becomes current only after both size and digest checks succeed.
// -----------------------------------------------------------------------------
export async function verifyUpload(
  documentId: string,
  versionId: string,
  actor: Actor,
): Promise<void> {
  const doc = await repo.findById(documentId);
  if (!doc) throw new NotFoundError("Document not found");
  await assertCanWrite(actor, doc);

  const version = await repo.findVersionById(versionId);
  if (!version || version.documentId !== documentId) {
    throw new NotFoundError("Version not found");
  }

  let storedSize = 0;
  try {
    const stat = await statObject(version.objectKey);
    storedSize = stat.size;
  } catch {
    // Object not yet uploaded (client hasn't completed the PUT) or storage
    // is unavailable. Surface as a 400 — caller behavior: client should retry
    // the upload then call verify again.
    throw new BadRequestError(
      "Object is not yet available in storage — complete the upload before verifying",
    );
  }

  const hash = createHash("sha256");
  const stream = await getObjectStream(version.objectKey);
  for await (const chunk of stream) hash.update(chunk as Buffer);
  const actualChecksum = hash.digest("hex");
  if (
    storedSize !== Number(version.sizeBytes) ||
    actualChecksum !== version.checksum.toLowerCase()
  ) {
    await repo.deleteVersion(versionId);
    if (doc.currentVersionId === versionId) {
      await repo.update({ id: documentId, data: { currentVersionId: null } });
    }
    throw new BadRequestError(
      "Uploaded file size or checksum does not match the declared values - version rolled back",
      {
        expectedChecksum: version.checksum,
        actualChecksum,
        expectedSize: version.sizeBytes.toString(),
        actualSize: storedSize,
      },
    );
  }

  await repo.update({ id: documentId, data: { currentVersionId: versionId } });

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_VERSION_ADDED,
    userId: actor.id,
    entity: "document",
    entityId: documentId,
    newValue: { versionId, verified: true, checksum: actualChecksum },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

// -----------------------------------------------------------------------------
// shareDocument
// -----------------------------------------------------------------------------
export async function shareDocument(
  id: string,
  input: ShareDocumentInput,
  actor: Actor,
): Promise<void> {
  const doc = await repo.findById(id);
  if (!doc) throw new NotFoundError("Document not found");
  await assertCanManage(actor, doc);

  if (input.userId === doc.ownerId) {
    throw new BadRequestError("Cannot share a document with its owner");
  }

  if (input.expiresAt && input.expiresAt < new Date()) {
    throw new BadRequestError("Expiry date must be in the future");
  }

  await repo.upsertShare({
    documentId: id,
    userId: input.userId,
    permission: input.permission,
    expiresAt: input.expiresAt ?? null,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_SHARED,
    userId: actor.id,
    entity: "document",
    entityId: id,
    newValue: {
      sharedWith: input.userId,
      permission: input.permission,
      expiresAt: input.expiresAt,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

// -----------------------------------------------------------------------------
// unshareDocument
// -----------------------------------------------------------------------------
export async function unshareDocument(id: string, userId: string, actor: Actor): Promise<void> {
  const doc = await repo.findById(id);
  if (!doc) throw new NotFoundError("Document not found");
  await assertCanManage(actor, doc);

  const removed = await repo.deleteShare(id, userId);
  if (!removed) throw new NotFoundError("Share not found");

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_UNSHARED,
    userId: actor.id,
    entity: "document",
    entityId: id,
    oldValue: { sharedWith: userId },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

// Re-exports for callers that import types from the service module
export { SHARE_PERMISSIONS, type SharePermissionValue };
