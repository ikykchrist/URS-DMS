import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  type FolderDetail,
  type FolderListItem,
  type FolderWithRelations,
  folderSelect,
} from "@/modules/folders/folders.types";

// =============================================================================
// URS-DMS â€” folders repository
// =============================================================================

function toListItem(f: FolderWithRelations): FolderListItem {
  return {
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    departmentId: f.departmentId,
    ownerId: f.ownerId,
    color: f.color,
    icon: f.icon,
    documentCount: f.documents.length,
    childCount: f.children.length,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

function toDetail(f: FolderWithRelations): FolderDetail {
  return {
    ...toListItem(f),
    deletedAt: f.deletedAt,
    parent: f.parent ? { id: f.parent.id, name: f.parent.name } : null,
  };
}

export async function list(
  where: Prisma.FolderWhereInput,
): Promise<FolderListItem[]> {
  const rows = await prisma.folder.findMany({
    where,
    select: folderSelect,
    orderBy: { name: "asc" },
  });
  return rows.map(toListItem);
}

export async function findById(id: string, includeDeleted = false): Promise<FolderDetail | null> {
  const row = await prisma.folder.findFirst({
    where: includeDeleted ? { id } : { id, deletedAt: null },
    select: folderSelect,
  });
  return row ? toDetail(row) : null;
}

export interface CreateArgs {
  name: string;
  parentId: string | null;
  departmentId: string | null;
  ownerId: string;
  color?: string | null;
  icon?: string | null;
}

export async function create(args: CreateArgs): Promise<FolderDetail> {
  const row = await prisma.folder.create({
    data: {
      name: args.name,
      parentId: args.parentId,
      departmentId: args.departmentId,
      ownerId: args.ownerId,
      color: args.color,
      icon: args.icon,
    },
    select: folderSelect,
  });
  return toDetail(row);
}

// â”€â”€ Personal repository lifecycle additions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** List the owner's deleted folders (recycle bin). */
export async function listDeleted(ownerId: string): Promise<FolderDetail[]> {
  const rows = await prisma.folder.findMany({
    where: { ownerId, deletedAt: { not: null } },
    select: folderSelect,
    orderBy: { deletedAt: "desc" },
  });
  return rows.map(toDetail);
}

/** Permanently delete a folder and its subtree (DB cascade handles children). */
export async function permanentDelete(id: string): Promise<void> {
  await prisma.folder.delete({ where: { id } });
}

/** Depth of a folder (root-level folder = depth 1). */
export async function depthOf(folderId: string): Promise<number> {
  let depth = 0;
  let cursor: string | null = folderId;
  let guard = 0;
  while (cursor && guard++ < 50) {
    depth += 1;
    const parent = await prisma.folder.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    }) as { parentId: string | null } | null;
    cursor = parent?.parentId ?? null;
  }
  return depth;
}

/**
 * Deep-copy a folder subtree (folders + active current files) under a new
 * parent, preserving ownership. Deleted items are excluded. Returns the id of
 * the copied root folder.
 *
 * `onProgress` is invoked after each folder/file row with (processed, total)
 * so large copies can report progress through a persisted job (rule 9).
 */
export async function copySubtree(
  args: {
    sourceId: string;
    newParentId: string | null;
    ownerId: string;
    repositoryId: string | null;
    total?: number;
    onProgress?: (processed: number, total: number) => void;
  },
): Promise<string> {
  const visited = new Set<string>();
  const idMap = new Map<string, string>();
  let processed = 0;

  async function copyFolder(folderId: string, targetParentId: string | null): Promise<void> {
    if (visited.has(folderId)) return;
    visited.add(folderId);
    const source = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, name: true, departmentId: true, ownerId: true },
    });
    if (!source) return;
    const copied = await prisma.folder.create({
      data: {
        name: source.name,
        parentId: targetParentId,
        departmentId: source.departmentId,
        ownerId: args.ownerId,
        repositoryId: args.repositoryId,
      },
    });
    idMap.set(source.id, copied.id);
    processed += 1;
    args.onProgress?.(processed, args.total ?? processed);

    // Copy active files of this folder (fresh records referencing the same
    // immutable version objects â€" version blobs are never rewritten, so a
    // shared reference is safe; GC must never delete a key still referenced
    // by any version row).
    const files = await prisma.document.findMany({
      where: { folderId: source.id, deletedAt: null },
      select: { id: true },
    });
    for (const file of files) {
      const current = await prisma.document.findUnique({
        where: { id: file.id },
        select: {
          title: true,
          description: true,
          classification: true,
          metadata: true,
          currentVersion: {
            select: {
              objectKey: true,
              filename: true,
              mimeType: true,
              sizeBytes: true,
              checksum: true,
            },
          },
        },
      });
      if (!current?.currentVersion) continue;
      const newDoc = await prisma.document.create({
        data: {
          title: current.title,
          description: current.description,
          classification: current.classification,
          metadata: current.metadata as Prisma.InputJsonValue | undefined,
          ownerId: args.ownerId,
          folderId: copied.id,
          repositoryId: args.repositoryId,
        },
      });
      const newVersion = await prisma.documentVersion.create({
        data: {
          documentId: newDoc.id,
          versionNumber: 1,
          objectKey: current.currentVersion.objectKey,
          filename: current.currentVersion.filename,
          mimeType: current.currentVersion.mimeType,
          sizeBytes: current.currentVersion.sizeBytes,
          checksum: current.currentVersion.checksum,
          changeNote: "Copied file",
          uploadedById: args.ownerId,
        },
      });
      await prisma.document.update({
        where: { id: newDoc.id },
        data: { currentVersionId: newVersion.id },
      });
      processed += 1;
      args.onProgress?.(processed, args.total ?? processed);
    }

    const children = await prisma.folder.findMany({
      where: { parentId: source.id, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) {
      await copyFolder(child.id, copied.id);
    }
  };

  await copyFolder(args.sourceId, args.newParentId);
  const newRootId = idMap.get(args.sourceId);
  if (!newRootId) throw new Error("Folder copy failed");
  return newRootId;
}

/**
 * Merge-mode copy: copy the ACTIVE children (folders + files) of a source
 * folder INTO an existing destination folder (rule 8 "merge").
 */
export async function copyChildrenInto(
  sourceId: string,
  targetFolderId: string,
  ownerId: string,
  repositoryId: string | null,
  onProgress?: (processed: number, total: number) => void,
): Promise<void> {
  const items = await prisma.folder.findMany({
    where: { id: sourceId, deletedAt: null },
    select: { children: { where: { deletedAt: null }, select: { id: true } } },
  });
  const childFolderIds = items[0]?.children.map((c) => c.id) ?? [];
  const total = await countSubtreeItems(sourceId);

  let processed = 0;
  const tick = () => {
    processed += 1;
    onProgress?.(processed, total);
  };

  // Copy direct files of the source into the target.
  const files = await prisma.document.findMany({
    where: { folderId: sourceId, deletedAt: null },
    select: { id: true },
  });
  for (const file of files) {
    const current = await prisma.document.findUnique({
      where: { id: file.id },
      select: {
        title: true,
        description: true,
        classification: true,
        metadata: true,
        currentVersion: {
          select: {
            objectKey: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            checksum: true,
          },
        },
      },
    });
    if (!current?.currentVersion) continue;
    const newDoc = await prisma.document.create({
      data: {
        title: current.title,
        description: current.description,
        classification: current.classification,
        metadata: current.metadata as Prisma.InputJsonValue | undefined,
        ownerId,
        folderId: targetFolderId,
        repositoryId,
      },
    });
    const newVersion = await prisma.documentVersion.create({
      data: {
        documentId: newDoc.id,
        versionNumber: 1,
        objectKey: current.currentVersion.objectKey,
        filename: current.currentVersion.filename,
        mimeType: current.currentVersion.mimeType,
        sizeBytes: current.currentVersion.sizeBytes,
        checksum: current.currentVersion.checksum,
        changeNote: "Copied file",
        uploadedById: ownerId,
      },
    });
    await prisma.document.update({ where: { id: newDoc.id }, data: { currentVersionId: newVersion.id } });
    tick();
  }

  // Recursively copy each child folder subtree into the target.
  for (const childId of childFolderIds) {
    await copySubtree({
      sourceId: childId,
      newParentId: targetFolderId,
      ownerId,
      repositoryId,
      onProgress: (p, t) => onProgress?.(p + processed, Math.max(total, t + processed)),
    });
  }
}

/**
 * Count ACTIVE folders + documents inside a subtree (used for the large-copy
 * threshold and progress totals). Bounded by the depth limit (≤ 5).
 */
export async function countSubtreeItems(folderId: string): Promise<number> {
  const folderIds: string[] = [];
  const stack = [folderId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    folderIds.push(current);
    const children = await prisma.folder.findMany({
      where: { parentId: current, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) stack.push(child.id);
  }
  const [folderCount, documentCount] = await Promise.all([
    prisma.folder.count({ where: { id: { in: folderIds } } }),
    prisma.document.count({ where: { folderId: { in: folderIds }, deletedAt: null } }),
  ]);
  return folderCount + documentCount;
}

/**
 * Recursive folder information (rule 12): file count, subfolder count, total
 * recursive size. Computed with two aggregate queries — no per-render full
 * tree walk.
 */
export async function getFolderInfo(folderId: string): Promise<{
  folderId: string;
  documentCount: number;
  childCount: number;
  recursiveDocumentCount: number;
  recursiveSizeBytes: string;
  depth: number;
}> {
  const [folder, depth] = await Promise.all([
    prisma.folder.findUnique({ where: { id: folderId }, select: { id: true } }),
    depthOf(folderId),
  ]);
  if (!folder) throw new Error("Folder not found");

  const folderIds: string[] = [];
  const stack = [folderId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    folderIds.push(current);
    const children = await prisma.folder.findMany({
      where: { parentId: current, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) stack.push(child.id);
  }

  const [childCount, recursiveDocumentCount, sizeAggregate] = await Promise.all([
    prisma.folder.count({ where: { parentId: folderId, deletedAt: null } }),
    prisma.document.count({ where: { folderId: { in: folderIds }, deletedAt: null } }),
    prisma.documentVersion.aggregate({
      where: { document: { folderId: { in: folderIds }, deletedAt: null } },
      _sum: { sizeBytes: true },
    }),
  ]);

  return {
    folderId,
    documentCount: recursiveDocumentCount,
    childCount,
    recursiveDocumentCount,
    recursiveSizeBytes: (sizeAggregate._sum.sizeBytes ?? BigInt(0)).toString(),
    depth,
  };
}

/**
 * Find an ACTIVE folder with the same name directly inside a parent
 * (case-insensitive) — the conflict surface for copy/restore (rule 8).
 * `excludeId` skips the folder itself (a folder is never its own conflict).
 */
export async function findSameNameFolder(
  parentId: string | null,
  name: string,
  ownerId: string,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  return prisma.folder.findFirst({
    where: {
      parentId,
      ownerId,
      deletedAt: null,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
}

/** Next available "Name (n)" sibling name (case-insensitive). */
export async function uniqueFolderName(
  parentId: string | null,
  base: string,
  ownerId: string,
): Promise<string> {
  let n = 1;
  while (true) {
    const candidate = `${base} (${n})`;
    const clash = await prisma.folder.findFirst({
      where: { parentId, ownerId, deletedAt: null, name: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    n += 1;
  }
}

export interface UpdateArgs {
  id: string;
  data: {
    name?: string;
    parentId?: string | null;
    departmentId?: string | null;
    color?: string | null;
    icon?: string | null;
  };
}

export async function update(args: UpdateArgs): Promise<FolderDetail> {
  const row = await prisma.folder.update({
    where: { id: args.id },
    data: {
      ...(args.data.name !== undefined ? { name: args.data.name } : {}),
      ...(args.data.parentId !== undefined ? { parentId: args.data.parentId } : {}),
      ...(args.data.departmentId !== undefined ? { departmentId: args.data.departmentId } : {}),
      ...(args.data.color !== undefined ? { color: args.data.color } : {}),
      ...(args.data.icon !== undefined ? { icon: args.data.icon } : {}),
    },
    select: folderSelect,
  });
  return toDetail(row);
}

export async function softDelete(id: string): Promise<FolderDetail> {
  // Cascade soft-delete children first (schema's onDelete:Cascade is for HARD
  // deletes; for soft delete we must traverse children ourselves).
  await cascadeSoftDelete(id);
  const row = await prisma.folder.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: folderSelect,
  });
  return toDetail(row);
}

async function cascadeSoftDelete(folderId: string): Promise<void> {
  const visited = new Set<string>();
  const stack = [folderId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const children = await prisma.folder.findMany({
      where: { parentId: current, deletedAt: null },
      select: { id: true },
    });
    for (const c of children) stack.push(c.id);

    if (current !== folderId) {
      await prisma.folder.update({
        where: { id: current },
        data: { deletedAt: new Date() },
      });
    }
  }
}

export async function restore(id: string): Promise<FolderDetail> {
  // Restore the folder AND any descendants that were deleted as part of the
  // same cascade (we restore by setting deletedAt = null for this id and
  // any descendant whose deletedAt is >= the folder's deletedAt). For
  // simplicity we restore the whole subtree.
  await cascadeRestore(id);
  const row = await prisma.folder.update({
    where: { id },
    data: { deletedAt: null },
    select: folderSelect,
  });
  return toDetail(row);
}

async function cascadeRestore(folderId: string): Promise<void> {
  const visited = new Set<string>();
  const stack = [folderId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const children = await prisma.folder.findMany({
      where: { parentId: current },
      select: { id: true },
    });
    for (const c of children) stack.push(c.id);

    if (current !== folderId) {
      await prisma.folder.update({
        where: { id: current },
        data: { deletedAt: null },
      });
    }
  }
}

// Descendant lookup â€” used by the service to prevent moving a folder into
// its own subtree (circular parent chain).
export async function isDescendantOf(
  candidateId: string,
  ancestorId: string,
): Promise<boolean> {
  let current: string | null = candidateId;
  const visited = new Set<string>();
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    if (current === ancestorId) return true;
    const row: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = row?.parentId ?? null;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Sprint 7.4.3 â€” Folder Builder resolution
// -----------------------------------------------------------------------------
// Read-side integration with the Root Folder Builder (Sprint 7.4.3): the
// Document Repository's upload-destination structure is driven by the folder
// template ASSIGNED to the user's org unit, falling back up the chain
// DEPARTMENT â†’ COLLEGE â†’ UNIVERSITY. These queries read the folder_builder
// tables directly (root.folderBuilder.repository stays root-internal).

export interface UserOrgContext {
  departmentId: string | null;
  collegeId: string | null;
}

export async function findUserOrgContext(
  userId: string,
): Promise<UserOrgContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      departmentId: true,
      departments: { select: { id: true, collegeId: true } },
    },
  });
  if (!user) return null;
  const department = user.departments[0] ?? null;
  return {
    departmentId: department?.id ?? user.departmentId ?? null,
    collegeId: department?.collegeId ?? null,
  };
}

export type AssignmentTargetScope =
  | { type: "DEPARTMENT"; id: string | null }
  | { type: "COLLEGE"; id: string | null }
  | { type: "UNIVERSITY"; id: null };

export async function findFolderTemplateAssignment(
  targets: AssignmentTargetScope[],
): Promise<{ id: string; templateId: string; targetType: string; targetId: string | null } | null> {
  for (const t of targets) {
    const assignment = await prisma.folderAssignment.findFirst({
      where: {
        targetType: t.type,
        targetId: t.id,
        deletedAt: null,
        template: { deletedAt: null, status: "ACTIVE" },
      },
      select: { id: true, templateId: true, targetType: true, targetId: true },
    });
    if (assignment) return assignment;
  }
  return null;
}

export async function findTemplateBrief(templateId: string): Promise<{
  id: string;
  name: string;
  code: string;
  icon: string | null;
  color: string | null;
} | null> {
  return prisma.folderTemplate.findFirst({
    where: { id: templateId, deletedAt: null },
    select: { id: true, name: true, code: true, icon: true, color: true },
  });
}

export interface FolderTemplateNodeRow {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  level: number;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
}

export async function listFolderTemplateNodes(
  templateId: string,
): Promise<FolderTemplateNodeRow[]> {
  return prisma.folderNode.findMany({
    where: {
      templateId,
      deletedAt: null,
      visibility: "VISIBLE",
      status: "ACTIVE",
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parentId: true,
      name: true,
      description: true,
      level: true,
      sortOrder: true,
      icon: true,
      color: true,
      visibility: true,
      status: true,
    },
  });
}
