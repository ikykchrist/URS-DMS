import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/utils/errors";
import * as repo from "@/modules/folders/folders.repository";
import type { Prisma } from "@prisma/client";
import type {
  CreateFolderInput,
  ListFoldersQuery,
  UpdateFolderInput,
} from "@/modules/folders/folders.validator";
import type {
  FolderDetail,
  FolderListItem,
  ResolvedFolderNode,
  ResolvedFolderStructure,
} from "@/modules/folders/folders.types";

// =============================================================================
// URS-DMS — folders service
// RBAC model:
//   - "managers" = users holding folders.delete (admins + QAOs).
//   - otherwise: owner OR department-coordinator within matching department.
//   - read access: folders.read permission OR ownership/department match.
// No `if (role === "admin")` anywhere — every check routes through permissions.
// =============================================================================

export interface ListResult {
  items: FolderListItem[];
}

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

function isManager(actor: Actor): boolean {
  return actor.permissions.includes("folders.delete");
}

function canRead(actor: Actor, folder: { ownerId: string | null; departmentId: string | null }): boolean {
  if (folder.ownerId === actor.id) return true;
  if (isManager(actor)) return true;
  return actor.permissions.includes("folders.read");
}

async function assertCanManage(actor: Actor, folder: { id: string; ownerId: string | null }): Promise<void> {
  if (folder.ownerId === actor.id) return;
  if (isManager(actor)) return;
  if (actor.permissions.includes("folders.update")) return;
  throw new ForbiddenError("You cannot modify this folder");
}

// -----------------------------------------------------------------------------
// listFolders
// -----------------------------------------------------------------------------
export async function listFolders(query: ListFoldersQuery, actor: Actor): Promise<ListResult> {
  const where: Prisma.FolderWhereInput = {};
  if (!query.includeDeleted) where.deletedAt = null;
  if (query.parentId !== undefined) where.parentId = query.parentId;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.ownerId) where.ownerId = query.ownerId;

  // Managers see everything; everyone else sees owned + department-scoped.
  if (!isManager(actor)) {
    where.OR = [{ ownerId: actor.id }, { departmentId: { not: null } }];
  }

  return { items: await repo.list(where) };
}

// -----------------------------------------------------------------------------
// getFolder
// -----------------------------------------------------------------------------
export async function getFolder(id: string, actor: Actor): Promise<FolderDetail> {
  const folder = await repo.findById(id);
  if (!folder) throw new NotFoundError("Folder not found");
  if (!canRead(actor, folder)) {
    throw new ForbiddenError("You do not have access to this folder");
  }
  return folder;
}

// -----------------------------------------------------------------------------
// createFolder
// -----------------------------------------------------------------------------
export async function createFolder(
  input: CreateFolderInput,
  actor: Actor,
): Promise<FolderDetail> {
  // Validate parent if specified.
  if (input.parentId) {
    const parent = await repo.findById(input.parentId);
    if (!parent) throw new BadRequestError("Parent folder not found");
  }

  const folder = await repo.create({
    name: input.name,
    parentId: input.parentId ?? null,
    departmentId: input.departmentId ?? null,
    ownerId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FOLDER_CREATED,
    userId: actor.id,
    entity: "folder",
    entityId: folder.id,
    newValue: {
      name: folder.name,
      parentId: folder.parentId,
      departmentId: folder.departmentId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return folder;
}

// -----------------------------------------------------------------------------
// updateFolder
// -----------------------------------------------------------------------------
export async function updateFolder(
  id: string,
  input: UpdateFolderInput,
  actor: Actor,
): Promise<FolderDetail> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Folder not found");
  await assertCanManage(actor, existing);

  // Circular-loop guard: refuse to move folder into its own subtree.
  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === id) {
      throw new BadRequestError("A folder cannot be its own parent");
    }
    const isCycle = await repo.isDescendantOf(input.parentId, id);
    if (isCycle) {
      throw new BadRequestError("Cannot move a folder into its own subtree");
    }
    const parent = await repo.findById(input.parentId);
    if (!parent) throw new BadRequestError("Parent folder not found");
  }

  const updated = await repo.update({
    id,
    data: {
      name: input.name,
      parentId: input.parentId,
      departmentId: input.departmentId,
    },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FOLDER_UPDATED,
    userId: actor.id,
    entity: "folder",
    entityId: id,
    oldValue: {
      name: existing.name,
      parentId: existing.parentId,
      departmentId: existing.departmentId,
    },
    newValue: {
      name: updated.name,
      parentId: updated.parentId,
      departmentId: updated.departmentId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// softDeleteFolder
// -----------------------------------------------------------------------------
export async function softDeleteFolder(id: string, actor: Actor): Promise<void> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Folder not found");

  // Soft delete requires folders.delete permission (managers) OR ownership.
  if (!isManager(actor) && existing.ownerId !== actor.id) {
    throw new ForbiddenError("Only the owner or a manager can delete this folder");
  }

  await repo.softDelete(id);

  await writeAudit({
    action: AUDIT_ACTIONS.FOLDER_DELETED,
    userId: actor.id,
    entity: "folder",
    entityId: id,
    oldValue: { name: existing.name, parentId: existing.parentId },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  // NOTE: documents inside a soft-deleted folder are NOT auto-deleted. They
  // remain visible via their own list scoping and the folderId index.
}

// -----------------------------------------------------------------------------
// resolveMyFolderStructure (Sprint 7.4.3)
// -----------------------------------------------------------------------------
// The Document Repository's upload-destination structure is defined by the
// Folder Builder (Sprint 7.4.3): the folder template ASSIGNED to the user's
// org unit wins, falling back up the chain DEPARTMENT → COLLEGE → UNIVERSITY.
// Only when NO template is assigned anywhere up the chain does the legacy
// flat Folder structure apply (source: "legacy"), preserving pre-7.4.3
// behavior. Read-only; no audit (project convention, AI_CONTEXT §8).

function buildResolvedTree(
  rows: repo.FolderTemplateNodeRow[],
): ResolvedFolderNode[] {
  const byParent = new Map<string | null, ResolvedFolderNode[]>();
  for (const row of rows) {
    const node: ResolvedFolderNode = {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      description: row.description,
      level: row.level,
      sortOrder: row.sortOrder,
      icon: row.icon,
      color: row.color,
      visibility: row.visibility,
      status: row.status,
      children: [],
    };
    const bucket = byParent.get(row.parentId) ?? [];
    bucket.push(node);
    byParent.set(row.parentId, bucket);
  }
  const attach = (parentId: string | null): ResolvedFolderNode[] => {
    const bucket = byParent.get(parentId) ?? [];
    for (const node of bucket) {
      node.children = attach(node.id);
    }
    return bucket;
  };
  return attach(null);
}

export async function resolveMyFolderStructure(actor: Actor): Promise<ResolvedFolderStructure> {
  const context = await repo.findUserOrgContext(actor.id);
  const targets: repo.AssignmentTargetScope[] = [];
  if (context?.departmentId) targets.push({ type: "DEPARTMENT", id: context.departmentId });
  if (context?.collegeId) targets.push({ type: "COLLEGE", id: context.collegeId });
  targets.push({ type: "UNIVERSITY", id: null });

  const assignment = await repo.findFolderTemplateAssignment(targets);
  if (assignment) {
    const template = await repo.findTemplateBrief(assignment.templateId);
    const rows = await repo.listFolderTemplateNodes(assignment.templateId);
    return {
      source: "template",
      template: template
        ? { id: template.id, name: template.name, code: template.code, icon: template.icon, color: template.color }
        : null,
      assignment: { id: assignment.id, targetType: assignment.targetType, targetId: assignment.targetId },
      tree: buildResolvedTree(rows),
      legacyFolders: [],
    };
  }

  // No assignment anywhere up the chain — fall back to the legacy structure.
  const where: Prisma.FolderWhereInput = { deletedAt: null };
  where.OR = [{ ownerId: actor.id }, { departmentId: { not: null } }];
  const legacyFolders = await repo.list(where);
  if (legacyFolders.length === 0) {
    return { source: "none", template: null, assignment: null, tree: [], legacyFolders: [] };
  }
  return { source: "legacy", template: null, assignment: null, tree: [], legacyFolders };
}
