import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { type AaccupAreaDetail, type AaccupAreaListItem } from "@/modules/aaccup/aaccup.types";

// =============================================================================
// URS-DMS — AACCUP repository
// =============================================================================

const AREA_WITH_RELATIONS_INCLUDE = {
  department: { select: { id: true, name: true } },
  accreditationCycle: { select: { id: true, name: true } },
  createdByUser: { select: { firstName: true, lastName: true } },
  updatedByUser: { select: { firstName: true, lastName: true } },
} satisfies Prisma.AaccupAreaInclude;

type AreaWithRelations = Prisma.AaccupAreaGetPayload<{
  include: typeof AREA_WITH_RELATIONS_INCLUDE;
}>;

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function toListItem(row: AreaWithRelations): AaccupAreaListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? "",
    accreditationCycleId: row.accreditationCycleId,
    accreditationCycleName: row.accreditationCycle?.name ?? null,
    areaSet: row.areaSet,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDetail(row: AreaWithRelations): AaccupAreaDetail {
  return {
    ...toListItem(row),
    deletedAt: row.deletedAt,
    createdByName: row.createdByUser
      ? fullName(row.createdByUser.firstName, row.createdByUser.lastName)
      : "",
    updatedByName: row.updatedByUser
      ? fullName(row.updatedByUser.firstName, row.updatedByUser.lastName)
      : null,
  };
}

export async function list(
  where: Prisma.AaccupAreaWhereInput,
  page: number,
  pageSize: number,
  sortField: string = "name",
  sortOrder: "asc" | "desc" = "asc",
): Promise<{ items: AaccupAreaListItem[]; total: number; page: number; pageSize: number }> {
  const [rows, total] = await Promise.all([
    prisma.aaccupArea.findMany({
      where,
      include: AREA_WITH_RELATIONS_INCLUDE,
      orderBy: { [sortField]: sortOrder } as Prisma.AaccupAreaOrderByWithRelationInput,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aaccupArea.count({ where }),
  ]);
  return {
    items: rows.map(toListItem),
    total,
    page,
    pageSize,
  };
}

export async function findById(
  id: string,
  includeDeleted = false,
): Promise<AaccupAreaDetail | null> {
  const row = await prisma.aaccupArea.findFirst({
    where: includeDeleted ? { id } : { id, deletedAt: null },
    include: AREA_WITH_RELATIONS_INCLUDE,
  });
  return row ? toDetail(row) : null;
}

export interface CreateArgs {
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  accreditationCycleId: string | null;
  areaSet: "AACCUP" | "ISO" | "CERT";
  createdBy: string;
  status?: "ACTIVE" | "INACTIVE";
}

export async function create(args: CreateArgs): Promise<AaccupAreaDetail> {
  const row = await prisma.aaccupArea.create({
    data: {
      code: args.code,
      name: args.name,
      description: args.description,
      departmentId: args.departmentId,
      accreditationCycleId: args.accreditationCycleId,
      areaSet: args.areaSet,
      status: args.status ?? "ACTIVE",
      createdBy: args.createdBy,
    },
    include: AREA_WITH_RELATIONS_INCLUDE,
  });
  return toDetail(row);
}

export interface UpdateArgs {
  id: string;
  data: {
    code?: string;
    name?: string;
    description?: string | null;
    departmentId?: string;
    accreditationCycleId?: string | null;
    areaSet?: "AACCUP" | "ISO" | "CERT";
    status?: "ACTIVE" | "INACTIVE";
    updatedBy?: string;
  };
}

export async function update(args: UpdateArgs): Promise<AaccupAreaDetail> {
  const row = await prisma.aaccupArea.update({
    where: { id: args.id },
    data: {
      ...(args.data.code !== undefined ? { code: args.data.code } : {}),
      ...(args.data.name !== undefined ? { name: args.data.name } : {}),
      ...(args.data.description !== undefined ? { description: args.data.description } : {}),
      ...(args.data.departmentId !== undefined ? { departmentId: args.data.departmentId } : {}),
      ...(args.data.accreditationCycleId !== undefined
        ? { accreditationCycleId: args.data.accreditationCycleId }
        : {}),
      ...(args.data.areaSet !== undefined ? { areaSet: args.data.areaSet } : {}),
      ...(args.data.status !== undefined ? { status: args.data.status } : {}),
      ...(args.data.updatedBy !== undefined ? { updatedBy: args.data.updatedBy } : {}),
      updatedAt: new Date(),
    },
    include: AREA_WITH_RELATIONS_INCLUDE,
  });
  return toDetail(row);
}

export async function archive(id: string, updatedBy: string): Promise<AaccupAreaDetail> {
  const row = await prisma.aaccupArea.update({
    where: { id },
    data: { deletedAt: new Date(), updatedAt: new Date(), updatedBy },
    include: AREA_WITH_RELATIONS_INCLUDE,
  });
  return toDetail(row);
}

export async function restore(id: string, updatedBy: string): Promise<AaccupAreaDetail> {
  const row = await prisma.aaccupArea.update({
    where: { id },
    data: { deletedAt: null, updatedAt: new Date(), updatedBy },
    include: AREA_WITH_RELATIONS_INCLUDE,
  });
  return toDetail(row);
}
