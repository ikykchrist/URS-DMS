import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// =============================================================================
// URS-DMS — Root · Dynamic Folder Builder repository (Sprint 7.4.3)
// -----------------------------------------------------------------------------
// Pure data access for the folder-builder engine. Live-row queries filter
// `deletedAt: null`; restore flows pass `includeDeleted = true`. Version +
// history appends are executed inside the service's `$transaction` so
// `FolderTemplate.version` can never drift from `folder_versions`.
// =============================================================================

export interface FolderTemplateRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  icon: string | null;
  color: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdByUser: { firstName: string; lastName: string } | null;
  updatedByUser: { firstName: string; lastName: string } | null;
  _count?: { nodes: number; assignments: number };
}

const templateSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  category: true,
  status: true,
  version: true,
  icon: true,
  color: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  createdByUser: { select: { firstName: true, lastName: true } },
  updatedByUser: { select: { firstName: true, lastName: true } },
  _count: {
    select: {
      nodes: { where: { deletedAt: null } },
      assignments: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.FolderTemplateSelect;

const LIVE: Prisma.FolderTemplateWhereInput = { deletedAt: null };

export async function listTemplates(
  where: Prisma.FolderTemplateWhereInput,
  page: number,
  pageSize: number,
  includeDeleted = false,
): Promise<{ items: FolderTemplateRow[]; total: number }> {
  const scopedWhere = includeDeleted ? where : { ...LIVE, ...where };
  const [items, total] = await Promise.all([
    prisma.folderTemplate.findMany({
      where: scopedWhere,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: templateSelect,
    }),
    prisma.folderTemplate.count({ where: scopedWhere }),
  ]);
  return { items: items as unknown as FolderTemplateRow[], total };
}

export async function findTemplateById(
  id: string,
  includeDeleted = false,
): Promise<FolderTemplateRow | null> {
  const row = await prisma.folderTemplate.findFirst({
    where: includeDeleted ? { id } : { id, ...LIVE },
    select: templateSelect,
  });
  return row as unknown as FolderTemplateRow | null;
}

export async function findTemplateByCode(
  code: string,
  includeDeleted = false,
): Promise<{ id: string; name: string; code: string } | null> {
  return prisma.folderTemplate.findFirst({
    where: includeDeleted ? { code } : { code, ...LIVE },
    select: { id: true, name: true, code: true },
  });
}

export async function findTemplateByNameLive(
  name: string,
): Promise<{ id: string; name: string } | null> {
  return prisma.folderTemplate.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...LIVE },
    select: { id: true, name: true },
  });
}

export async function createTemplate(data: {
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  status: "ACTIVE" | "INACTIVE";
  icon: string | null;
  color: string | null;
  createdById: string;
}): Promise<FolderTemplateRow> {
  const row = await prisma.folderTemplate.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description,
      category: data.category,
      status: data.status,
      version: 1,
      icon: data.icon,
      color: data.color,
      createdBy: data.createdById,
      updatedBy: data.createdById,
    },
    select: templateSelect,
  });
  return row as unknown as FolderTemplateRow;
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    code: string;
    description: string | null;
    category: string | null;
    status: "ACTIVE" | "INACTIVE";
    icon: string | null;
    color: string | null;
  }>,
  updatedById: string,
): Promise<FolderTemplateRow> {
  const row = await prisma.folderTemplate.update({
    where: { id },
    data: { ...data, updatedBy: updatedById },
    select: templateSelect,
  });
  return row as unknown as FolderTemplateRow;
}

export async function setTemplateDeleted(
  tx: Prisma.TransactionClient,
  id: string,
  deletedAt: Date | null,
  updatedById: string,
): Promise<FolderTemplateRow> {
  const row = await tx.folderTemplate.update({
    where: { id },
    data: { deletedAt, updatedBy: updatedById },
    select: templateSelect,
  });
  return row as unknown as FolderTemplateRow;
}

// -----------------------------------------------------------------------------
// Nodes
// -----------------------------------------------------------------------------

export interface FolderNodeRow {
  id: string;
  templateId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.JsonValue;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
  level: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const nodeSelect = {
  id: true,
  templateId: true,
  parentId: true,
  name: true,
  description: true,
  category: true,
  metadata: true,
  sortOrder: true,
  icon: true,
  color: true,
  visibility: true,
  status: true,
  level: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.FolderNodeSelect;

export async function listTemplateNodes(
  templateId: string,
  includeDeleted = false,
): Promise<FolderNodeRow[]> {
  return prisma.folderNode.findMany({
    where: includeDeleted ? { templateId } : { templateId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: nodeSelect,
  }) as unknown as FolderNodeRow[];
}

export async function findNodeById(
  id: string,
  templateId: string,
  includeDeleted = false,
): Promise<FolderNodeRow | null> {
  return prisma.folderNode.findFirst({
    where: includeDeleted ? { id, templateId } : { id, templateId, deletedAt: null },
    select: nodeSelect,
  }) as unknown as FolderNodeRow | null;
}

export async function listNodeChildren(
  templateId: string,
  parentId: string | null,
  q?: string,
  includeDeleted = false,
): Promise<FolderNodeRow[]> {
  const where: Prisma.FolderNodeWhereInput = { templateId, parentId };
  if (!includeDeleted) where.deletedAt = null;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }
  return prisma.folderNode.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: nodeSelect,
  }) as unknown as FolderNodeRow[];
}

export async function createNode(data: {
  tx: Prisma.TransactionClient;
  templateId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.InputJsonValue | null;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
  level: number;
  createdById: string;
}): Promise<FolderNodeRow> {
  return data.tx.folderNode.create({
    data: {
      templateId: data.templateId,
      parentId: data.parentId,
      name: data.name,
      description: data.description,
      category: data.category,
      metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      sortOrder: data.sortOrder,
      icon: data.icon,
      color: data.color,
      visibility: data.visibility,
      status: data.status,
      level: data.level,
      createdBy: data.createdById,
      updatedBy: data.createdById,
    },
    select: nodeSelect,
  }) as unknown as FolderNodeRow;
}

export async function updateNode(
  tx: Prisma.TransactionClient,
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    category: string | null;
    metadata: Prisma.InputJsonValue | null;
    sortOrder: number;
    icon: string | null;
    color: string | null;
    visibility: "VISIBLE" | "HIDDEN";
    status: "ACTIVE" | "INACTIVE";
  }>,
  updatedById: string,
): Promise<FolderNodeRow> {
  const payload: Prisma.FolderNodeUncheckedUpdateInput = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    ...(data.icon !== undefined ? { icon: data.icon } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    updatedBy: updatedById,
  };
  if (data.metadata !== undefined) {
    payload.metadata = (data.metadata ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  }
  return tx.folderNode.update({
    where: { id },
    data: payload,
    select: nodeSelect,
  }) as unknown as FolderNodeRow;
}

export async function countSiblingName(
  templateId: string,
  parentId: string | null,
  name: string,
  excludeNodeId?: string,
): Promise<number> {
  const where: Prisma.FolderNodeWhereInput = {
    templateId,
    parentId,
    name: { equals: name, mode: "insensitive" },
    deletedAt: null,
  };
  if (excludeNodeId) where.id = { not: excludeNodeId };
  return prisma.folderNode.count({ where });
}

export async function nextSiblingOrder(
  templateId: string,
  parentId: string | null,
): Promise<number> {
  const row = await prisma.folderNode.aggregate({
    where: { templateId, parentId, deletedAt: null },
    _max: { sortOrder: true },
  });
  return (row._max.sortOrder ?? -1) + 1;
}

export async function renumberSiblings(
  tx: Prisma.TransactionClient,
  templateId: string,
  parentId: string | null,
): Promise<void> {
  const rows = await tx.folderNode.findMany({
    where: { templateId, parentId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  for (const [i, row] of rows.entries()) {
    await tx.folderNode.update({
      where: { id: row.id },
      data: { sortOrder: i },
    });
  }
}

// -----------------------------------------------------------------------------
// Assignments
// -----------------------------------------------------------------------------

export interface FolderAssignmentRow {
  id: string;
  templateId: string;
  targetType: "UNIVERSITY" | "COLLEGE" | "DEPARTMENT" | "PROGRAM" | "OFFICE" | "AACCUP_AREA";
  targetId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

const assignmentSelect = {
  id: true,
  templateId: true,
  targetType: true,
  targetId: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.FolderAssignmentSelect;

export async function listAssignments(
  where: Prisma.FolderAssignmentWhereInput,
): Promise<FolderAssignmentRow[]> {
  return prisma.folderAssignment.findMany({
    where: { deletedAt: null, ...where },
    orderBy: [{ createdAt: "desc" }],
    select: assignmentSelect,
  }) as unknown as FolderAssignmentRow[];
}

export async function findAssignmentById(id: string): Promise<FolderAssignmentRow | null> {
  return prisma.folderAssignment.findFirst({
    where: { id, deletedAt: null },
    select: assignmentSelect,
  }) as unknown as FolderAssignmentRow | null;
}

export async function findAssignmentByTarget(
  targetType: FolderAssignmentRow["targetType"],
  targetId: string | null,
  includeDeleted = false,
): Promise<FolderAssignmentRow | null> {
  return prisma.folderAssignment.findFirst({
    where: includeDeleted
      ? { targetType, targetId }
      : { targetType, targetId, deletedAt: null },
    select: assignmentSelect,
  }) as unknown as FolderAssignmentRow | null;
}

export async function createAssignment(data: {
  templateId: string;
  targetType: FolderAssignmentRow["targetType"];
  targetId: string | null;
  createdById: string;
}): Promise<FolderAssignmentRow> {
  return prisma.folderAssignment.create({
    data: {
      templateId: data.templateId,
      targetType: data.targetType,
      targetId: data.targetId,
      createdBy: data.createdById,
    },
    select: assignmentSelect,
  }) as unknown as FolderAssignmentRow;
}

export async function setAssignmentDeleted(id: string): Promise<void> {
  await prisma.folderAssignment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function restoreAssignment(id: string): Promise<void> {
  await prisma.folderAssignment.update({
    where: { id },
    data: { deletedAt: null },
  });
}

export async function listTemplateAssignments(
  templateId: string,
  includeDeleted = false,
): Promise<FolderAssignmentRow[]> {
  return prisma.folderAssignment.findMany({
    where: includeDeleted ? { templateId } : { templateId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }],
    select: assignmentSelect,
  }) as unknown as FolderAssignmentRow[];
}

// -----------------------------------------------------------------------------
// Versions + history
// -----------------------------------------------------------------------------

export interface FolderVersionRow {
  id: string;
  templateId: string;
  version: number;
  changeType: "CREATED" | "UPDATED" | "ASSIGNED" | "ARCHIVED" | "RESTORED" | "ROLLED_BACK";
  data: Prisma.JsonValue;
  changeNote: string | null;
  changedById: string | null;
  changedBy: { firstName: string; lastName: string } | null;
  createdAt: Date;
}

export async function appendVersion(
  tx: Prisma.TransactionClient,
  data: {
    templateId: string;
    version: number;
    changeType: FolderVersionRow["changeType"];
    snapshot: Prisma.InputJsonValue;
    changeNote: string | null;
    changedById: string | null;
  },
): Promise<void> {
  await tx.folderVersion.create({
    data: {
      templateId: data.templateId,
      version: data.version,
      changeType: data.changeType,
      data: data.snapshot,
      changeNote: data.changeNote,
      changedById: data.changedById,
    },
  });
}

export async function listVersions(templateId: string): Promise<FolderVersionRow[]> {
  return prisma.folderVersion.findMany({
    where: { templateId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      templateId: true,
      version: true,
      changeType: true,
      data: true,
      changeNote: true,
      changedById: true,
      changedBy: { select: { firstName: true, lastName: true } },
      createdAt: true,
    },
  }) as unknown as FolderVersionRow[];
}

export async function findVersion(
  templateId: string,
  version: number,
): Promise<{ data: Prisma.JsonValue; version: number } | null> {
  return prisma.folderVersion.findUnique({
    where: { templateId_version: { templateId, version } },
    select: { data: true, version: true },
  });
}

export interface FolderHistoryRow {
  id: string;
  templateId: string;
  action: FolderVersionRow["changeType"];
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  versionFrom: number | null;
  versionTo: number | null;
  actorId: string | null;
  actor: { firstName: string; lastName: string } | null;
  createdAt: Date;
}

export async function appendHistory(
  tx: Prisma.TransactionClient,
  data: {
    templateId: string;
    action: FolderVersionRow["changeType"];
    oldValue: Prisma.JsonValue | null;
    newValue: Prisma.JsonValue | null;
    versionFrom: number | null;
    versionTo: number | null;
    actorId: string | null;
  },
): Promise<void> {
  await tx.folderHistory.create({
    data: {
      templateId: data.templateId,
      action: data.action,
      oldValue: (data.oldValue ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      newValue: (data.newValue ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      versionFrom: data.versionFrom,
      versionTo: data.versionTo,
      actorId: data.actorId,
    },
  });
}

export async function listHistory(
  where: Prisma.FolderHistoryWhereInput,
  page: number,
  pageSize: number,
): Promise<{ items: FolderHistoryRow[]; total: number }> {
  const [items, total] = await Promise.all([
    prisma.folderHistory.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        templateId: true,
        action: true,
        oldValue: true,
        newValue: true,
        versionFrom: true,
        versionTo: true,
        actorId: true,
        actor: { select: { firstName: true, lastName: true } },
        createdAt: true,
      },
    }),
    prisma.folderHistory.count({ where }),
  ]);
  return { items: items as unknown as FolderHistoryRow[], total };
}
