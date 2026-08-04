import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  type FolderDetail,
  type FolderListItem,
  type FolderWithRelations,
  folderSelect,
} from "@/modules/folders/folders.types";

// =============================================================================
// URS-DMS — folders repository
// =============================================================================

function toListItem(f: FolderWithRelations): FolderListItem {
  return {
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    departmentId: f.departmentId,
    ownerId: f.ownerId,
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
}

export async function create(args: CreateArgs): Promise<FolderDetail> {
  const row = await prisma.folder.create({
    data: {
      name: args.name,
      parentId: args.parentId,
      departmentId: args.departmentId,
      ownerId: args.ownerId,
    },
    select: folderSelect,
  });
  return toDetail(row);
}

export interface UpdateArgs {
  id: string;
  data: {
    name?: string;
    parentId?: string | null;
    departmentId?: string | null;
  };
}

export async function update(args: UpdateArgs): Promise<FolderDetail> {
  const row = await prisma.folder.update({
    where: { id: args.id },
    data: {
      ...(args.data.name !== undefined ? { name: args.data.name } : {}),
      ...(args.data.parentId !== undefined ? { parentId: args.data.parentId } : {}),
      ...(args.data.departmentId !== undefined ? { departmentId: args.data.departmentId } : {}),
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

// Descendant lookup — used by the service to prevent moving a folder into
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
// Sprint 7.4.3 — Folder Builder resolution
// -----------------------------------------------------------------------------
// Read-side integration with the Root Folder Builder (Sprint 7.4.3): the
// Document Repository's upload-destination structure is driven by the folder
// template ASSIGNED to the user's org unit, falling back up the chain
// DEPARTMENT → COLLEGE → UNIVERSITY. These queries read the folder_builder
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
