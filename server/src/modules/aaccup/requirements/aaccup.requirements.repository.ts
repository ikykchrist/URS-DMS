import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  AaccupRequirementDetail,
  AaccupRequirementListItem,
} from "@/modules/aaccup/requirements/aaccup.requirements.types";

// =============================================================================
// URS-DMS — AACCUP requirement repository
// =============================================================================

const REQUIREMENT_INCLUDE = {
  area: { select: { id: true, code: true, name: true } },
  createdByUser: { select: { firstName: true, lastName: true } },
  updatedByUser: { select: { firstName: true, lastName: true } },
  sourceNode: {
    select: {
      id: true,
      templateId: true,
      type: true,
      validations: {
        where: { deletedAt: null, enabled: true },
        orderBy: [{ sortOrder: "asc" as const }, { type: "asc" as const }],
        select: {
          id: true,
          type: true,
          config: true,
          message: true,
          severity: true,
        },
      },
    },
  },
} satisfies Prisma.AaccupRequirementInclude;

type RequirementWithRelations = Prisma.AaccupRequirementGetPayload<{
  include: typeof REQUIREMENT_INCLUDE;
}>;

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function toListItem(row: RequirementWithRelations): AaccupRequirementListItem {
  return {
    id: row.id,
    areaId: row.areaId,
    areaCode: row.area?.code ?? "",
    areaName: row.area?.name ?? "",
    title: row.title,
    description: row.description,
    documentCode: row.documentCode,
    category: row.category,
    priority: row.priority,
    isRequired: row.isRequired,
    status: row.status,
    displayOrder: row.displayOrder,
    sourceNodeId: row.sourceNodeId,
    sourceAssignmentId: row.sourceAssignmentId,
    sourceTemplateId: row.sourceNode?.templateId ?? null,
    sourceTemplateVersion: row.sourceTemplateVersion,
    nodeType: row.sourceNode?.type ?? null,
    validations:
      row.sourceNode?.validations.map((validation) => ({
        id: validation.id,
        type: validation.type,
        config: validation.config,
        message: validation.message,
        severity: validation.severity,
      })) ?? [],
    createdBy: row.createdBy,
    createdByName: row.createdByUser
      ? fullName(row.createdByUser.firstName, row.createdByUser.lastName)
      : "",
    updatedBy: row.updatedBy,
    updatedByName: row.updatedByUser
      ? fullName(row.updatedByUser.firstName, row.updatedByUser.lastName)
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDetail(row: RequirementWithRelations): AaccupRequirementDetail {
  return { ...toListItem(row), deletedAt: row.deletedAt };
}

export async function list(
  where: Prisma.AaccupRequirementWhereInput,
  page: number,
  pageSize: number,
  sortField: string,
  sortOrder: "asc" | "desc",
): Promise<{ items: AaccupRequirementListItem[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.aaccupRequirement.findMany({
      where,
      include: REQUIREMENT_INCLUDE,
      orderBy: {
        [sortField]: sortOrder,
      } as Prisma.AaccupRequirementOrderByWithRelationInput,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aaccupRequirement.count({ where }),
  ]);

  return { items: rows.map(toListItem), total };
}

export async function findById(
  id: string,
  includeDeleted = false,
): Promise<AaccupRequirementDetail | null> {
  const row = await prisma.aaccupRequirement.findFirst({
    where: includeDeleted ? { id } : { id, deletedAt: null },
    include: REQUIREMENT_INCLUDE,
  });
  return row ? toDetail(row) : null;
}

export interface CreateRequirementArgs {
  areaId: string;
  title: string;
  description: string | null;
  documentCode: string;
  category: string | null;
  priority: string | null;
  isRequired: boolean;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
  createdBy: string;
}

export async function create(args: CreateRequirementArgs): Promise<AaccupRequirementDetail> {
  const row = await prisma.aaccupRequirement.create({
    data: {
      areaId: args.areaId,
      title: args.title,
      description: args.description,
      documentCode: args.documentCode,
      category: args.category,
      priority: args.priority,
      isRequired: args.isRequired,
      status: args.status,
      displayOrder: args.displayOrder,
      createdBy: args.createdBy,
    },
    include: REQUIREMENT_INCLUDE,
  });
  return toDetail(row);
}

export interface UpdateRequirementArgs {
  id: string;
  data: {
    areaId?: string;
    title?: string;
    description?: string | null;
    documentCode?: string;
    category?: string | null;
    priority?: string | null;
    isRequired?: boolean;
    status?: "ACTIVE" | "INACTIVE";
    displayOrder?: number;
    updatedBy?: string;
  };
}

export async function update(args: UpdateRequirementArgs): Promise<AaccupRequirementDetail> {
  const row = await prisma.aaccupRequirement.update({
    where: { id: args.id },
    data: {
      ...(args.data.areaId !== undefined ? { areaId: args.data.areaId } : {}),
      ...(args.data.title !== undefined ? { title: args.data.title } : {}),
      ...(args.data.description !== undefined ? { description: args.data.description } : {}),
      ...(args.data.documentCode !== undefined ? { documentCode: args.data.documentCode } : {}),
      ...(args.data.category !== undefined ? { category: args.data.category } : {}),
      ...(args.data.priority !== undefined ? { priority: args.data.priority } : {}),
      ...(args.data.isRequired !== undefined ? { isRequired: args.data.isRequired } : {}),
      ...(args.data.status !== undefined ? { status: args.data.status } : {}),
      ...(args.data.displayOrder !== undefined ? { displayOrder: args.data.displayOrder } : {}),
      ...(args.data.updatedBy !== undefined ? { updatedBy: args.data.updatedBy } : {}),
      updatedAt: new Date(),
    },
    include: REQUIREMENT_INCLUDE,
  });
  return toDetail(row);
}

export async function archive(id: string, updatedBy: string): Promise<AaccupRequirementDetail> {
  const row = await prisma.aaccupRequirement.update({
    where: { id },
    data: { deletedAt: new Date(), updatedAt: new Date(), updatedBy },
    include: REQUIREMENT_INCLUDE,
  });
  return toDetail(row);
}

export async function restore(id: string, updatedBy: string): Promise<AaccupRequirementDetail> {
  const row = await prisma.aaccupRequirement.update({
    where: { id },
    data: { deletedAt: null, updatedAt: new Date(), updatedBy },
    include: REQUIREMENT_INCLUDE,
  });
  return toDetail(row);
}
