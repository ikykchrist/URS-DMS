import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  RequirementChangeTypeValue,
  RequirementNodeStatusValue,
  RequirementNodeTypeValue,
  RequirementTargetType,
  RequirementTemplateStatusValue,
  RequirementValidationSeverityValue,
  RequirementValidationTypeValue,
} from "@/modules/root/root.requirement.types";

export interface RequirementTemplateRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.JsonValue;
  status: RequirementTemplateStatusValue;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdByUser: { firstName: string; lastName: string } | null;
  updatedByUser: { firstName: string; lastName: string } | null;
  _count: { nodes: number; assignments: number };
  validationCount: number;
}

const templateSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  category: true,
  metadata: true,
  status: true,
  version: true,
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
} satisfies Prisma.RequirementTemplateSelect;

async function attachValidationCounts<T extends Omit<RequirementTemplateRow, "validationCount">>(
  rows: T[],
): Promise<RequirementTemplateRow[]> {
  if (rows.length === 0) return [];
  const counts = await prisma.requirementNode.findMany({
    where: { templateId: { in: rows.map((row) => row.id) }, deletedAt: null },
    select: {
      templateId: true,
      _count: { select: { validations: { where: { deletedAt: null } } } },
    },
  });
  const byTemplate = new Map<string, number>();
  for (const count of counts) {
    byTemplate.set(
      count.templateId,
      (byTemplate.get(count.templateId) ?? 0) + count._count.validations,
    );
  }
  return rows.map((row) => ({ ...row, validationCount: byTemplate.get(row.id) ?? 0 }));
}

export async function listTemplates(
  where: Prisma.RequirementTemplateWhereInput,
  page: number,
  pageSize: number,
  includeArchived: boolean,
): Promise<{ items: RequirementTemplateRow[]; total: number }> {
  const scoped: Prisma.RequirementTemplateWhereInput = includeArchived
    ? where
    : { ...where, deletedAt: null };
  const [rows, total] = await Promise.all([
    prisma.requirementTemplate.findMany({
      where: scoped,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: templateSelect,
    }),
    prisma.requirementTemplate.count({ where: scoped }),
  ]);
  return {
    items: await attachValidationCounts(
      rows as unknown as Array<Omit<RequirementTemplateRow, "validationCount">>,
    ),
    total,
  };
}

export async function findTemplateById(
  id: string,
  includeArchived = false,
): Promise<RequirementTemplateRow | null> {
  const row = await prisma.requirementTemplate.findFirst({
    where: includeArchived ? { id } : { id, deletedAt: null },
    select: templateSelect,
  });
  if (!row) return null;
  return (
    (
      await attachValidationCounts([
        row as unknown as Omit<RequirementTemplateRow, "validationCount">,
      ])
    )[0] ?? null
  );
}

export async function findTemplateByCode(
  code: string,
): Promise<{ id: string; name: string; code: string } | null> {
  return prisma.requirementTemplate.findUnique({
    where: { code },
    select: { id: true, name: true, code: true },
  });
}

export async function findLiveTemplateByName(
  name: string,
): Promise<{ id: string; name: string } | null> {
  return prisma.requirementTemplate.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, deletedAt: null },
    select: { id: true, name: true },
  });
}

export interface RequirementValidationRow {
  id: string;
  nodeId: string;
  type: RequirementValidationTypeValue;
  config: Prisma.JsonValue;
  message: string | null;
  severity: RequirementValidationSeverityValue;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RequirementNodeRow {
  id: string;
  templateId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  helpText: string | null;
  type: RequirementNodeTypeValue;
  metadata: Prisma.JsonValue;
  isRequired: boolean;
  allowMultiple: boolean;
  sortOrder: number;
  level: number;
  status: RequirementNodeStatusValue;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  validations: RequirementValidationRow[];
}

const nodeSelect = (includeArchived: boolean) =>
  ({
    id: true,
    templateId: true,
    parentId: true,
    code: true,
    name: true,
    description: true,
    helpText: true,
    type: true,
    metadata: true,
    isRequired: true,
    allowMultiple: true,
    sortOrder: true,
    level: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    validations: {
      where: includeArchived ? {} : { deletedAt: null },
      orderBy: [{ sortOrder: "asc" as const }, { type: "asc" as const }],
      select: {
        id: true,
        nodeId: true,
        type: true,
        config: true,
        message: true,
        severity: true,
        enabled: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    },
  }) satisfies Prisma.RequirementNodeSelect;

export async function listTemplateNodes(
  templateId: string,
  includeArchived = false,
): Promise<RequirementNodeRow[]> {
  const rows = await prisma.requirementNode.findMany({
    where: includeArchived ? { templateId } : { templateId, deletedAt: null },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: nodeSelect(includeArchived),
  });
  return rows as unknown as RequirementNodeRow[];
}

export async function findNodeById(
  templateId: string,
  nodeId: string,
  includeArchived = false,
): Promise<RequirementNodeRow | null> {
  const row = await prisma.requirementNode.findFirst({
    where: includeArchived
      ? { id: nodeId, templateId }
      : { id: nodeId, templateId, deletedAt: null },
    select: nodeSelect(includeArchived),
  });
  return row as unknown as RequirementNodeRow | null;
}

export async function findNodeByCode(
  templateId: string,
  code: string,
): Promise<{ id: string; code: string } | null> {
  return prisma.requirementNode.findUnique({
    where: { templateId_code: { templateId, code } },
    select: { id: true, code: true },
  });
}

export async function countLiveSiblingName(
  templateId: string,
  parentId: string | null,
  name: string,
  excludeId?: string,
): Promise<number> {
  return prisma.requirementNode.count({
    where: {
      templateId,
      parentId,
      name: { equals: name, mode: "insensitive" },
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function nextSiblingOrder(
  templateId: string,
  parentId: string | null,
): Promise<number> {
  const aggregate = await prisma.requirementNode.aggregate({
    where: { templateId, parentId, deletedAt: null },
    _max: { sortOrder: true },
  });
  return (aggregate._max.sortOrder ?? -1) + 1;
}

export interface RequirementAssignmentRow {
  id: string;
  templateId: string;
  targetType: RequirementTargetType;
  targetId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const assignmentSelect = {
  id: true,
  templateId: true,
  targetType: true,
  targetId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.RequirementAssignmentSelect;

export async function listAssignments(
  where: Prisma.RequirementAssignmentWhereInput,
  includeArchived = false,
): Promise<RequirementAssignmentRow[]> {
  const rows = await prisma.requirementAssignment.findMany({
    where: includeArchived ? where : { ...where, deletedAt: null },
    orderBy: [{ createdAt: "desc" }],
    select: assignmentSelect,
  });
  return rows as unknown as RequirementAssignmentRow[];
}

export async function findAssignmentById(
  id: string,
  includeArchived = false,
): Promise<RequirementAssignmentRow | null> {
  const row = await prisma.requirementAssignment.findFirst({
    where: includeArchived ? { id } : { id, deletedAt: null },
    select: assignmentSelect,
  });
  return row as unknown as RequirementAssignmentRow | null;
}

export async function findAssignmentByTarget(
  targetType: RequirementTargetType,
  targetId: string | null,
  includeArchived = false,
): Promise<RequirementAssignmentRow | null> {
  const row = await prisma.requirementAssignment.findFirst({
    where: includeArchived ? { targetType, targetId } : { targetType, targetId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: assignmentSelect,
  });
  return row as unknown as RequirementAssignmentRow | null;
}

export interface RequirementVersionRow {
  id: string;
  templateId: string;
  version: number;
  changeType: RequirementChangeTypeValue;
  data: Prisma.JsonValue;
  changeNote: string | null;
  changedById: string | null;
  changedBy: { firstName: string; lastName: string } | null;
  createdAt: Date;
}

export async function listVersions(templateId: string): Promise<RequirementVersionRow[]> {
  const rows = await prisma.requirementVersion.findMany({
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
  });
  return rows as unknown as RequirementVersionRow[];
}

export async function findVersion(
  templateId: string,
  version: number,
): Promise<{ version: number; data: Prisma.JsonValue } | null> {
  return prisma.requirementVersion.findUnique({
    where: { templateId_version: { templateId, version } },
    select: { version: true, data: true },
  });
}

export interface RequirementHistoryRow {
  id: string;
  templateId: string;
  action: RequirementChangeTypeValue;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  versionFrom: number | null;
  versionTo: number | null;
  actorId: string | null;
  actor: { firstName: string; lastName: string } | null;
  createdAt: Date;
}

export async function listHistory(
  where: Prisma.RequirementHistoryWhereInput,
  page: number,
  pageSize: number,
): Promise<{ items: RequirementHistoryRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.requirementHistory.findMany({
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
    prisma.requirementHistory.count({ where }),
  ]);
  return { items: rows as unknown as RequirementHistoryRow[], total };
}

export async function appendVersion(
  tx: Prisma.TransactionClient,
  data: {
    templateId: string;
    version: number;
    changeType: RequirementChangeTypeValue;
    snapshot: Prisma.InputJsonValue;
    changeNote: string | null;
    actorId: string | null;
  },
): Promise<void> {
  await tx.requirementVersion.create({
    data: {
      templateId: data.templateId,
      version: data.version,
      changeType: data.changeType,
      data: data.snapshot,
      changeNote: data.changeNote,
      changedById: data.actorId,
    },
  });
}

export async function appendHistory(
  tx: Prisma.TransactionClient,
  data: {
    templateId: string;
    action: RequirementChangeTypeValue;
    oldValue: Prisma.JsonValue | null;
    newValue: Prisma.JsonValue | null;
    versionFrom: number | null;
    versionTo: number | null;
    actorId: string | null;
  },
): Promise<void> {
  await tx.requirementHistory.create({
    data: {
      templateId: data.templateId,
      action: data.action,
      oldValue: (data.oldValue ?? null) as
        | Prisma.NullableJsonNullValueInput
        | Prisma.InputJsonValue,
      newValue: (data.newValue ?? null) as
        | Prisma.NullableJsonNullValueInput
        | Prisma.InputJsonValue,
      versionFrom: data.versionFrom,
      versionTo: data.versionTo,
      actorId: data.actorId,
    },
  });
}

export interface AccreditationCycleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export async function listCycles(
  where: Prisma.AccreditationCycleWhereInput,
  page: number,
  pageSize: number,
  includeArchived: boolean,
): Promise<{ items: AccreditationCycleRow[]; total: number }> {
  const scoped = includeArchived ? where : { ...where, deletedAt: null };
  const [items, total] = await Promise.all([
    prisma.accreditationCycle.findMany({
      where: scoped,
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    }),
    prisma.accreditationCycle.count({ where: scoped }),
  ]);
  return { items: items as AccreditationCycleRow[], total };
}
