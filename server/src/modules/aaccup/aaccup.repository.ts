import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { type AaccupAreaDetail, type AaccupAreaListItem } from "@/modules/aaccup/aaccup.types";

export function listSetupPrograms() {
  return prisma.program.findMany({
    where: { deletedAt: null, campus: { deletedAt: null }, college: { deletedAt: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, campusId: true, collegeId: true,
      campus: { select: { name: true } }, college: { select: { name: true, campusId: true } } },
  });
}

export async function areaTemplateSetup(areaId: string, areaSet: "AACCUP" | "ISO" | "CERT") {
  const [templates, assignment] = await Promise.all([
    prisma.requirementTemplate.findMany({ where: { areaSet, status: "ACTIVE", deletedAt: null },
      orderBy: { name: "asc" }, select: { id: true, name: true, code: true, version: true } }),
    prisma.requirementAssignment.findFirst({ where: { targetType: "AACCUP_AREA", targetId: areaId, deletedAt: null },
      select: { templateId: true } }),
  ]);
  return { templates, templateId: assignment?.templateId ?? null };
}

// =============================================================================
// URS-DMS — AACCUP repository
// =============================================================================

const AREA_WITH_RELATIONS_INCLUDE = {
  campus: { select: { id: true, name: true } },
  college: { select: { id: true, name: true } },
  program: { select: { id: true, name: true } },
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
    campusId: row.campusId,
    campusName: row.campus?.name ?? null,
    collegeId: row.collegeId,
    collegeName: row.college?.name ?? null,
    programId: row.programId,
    programName: row.program?.name ?? null,
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
  campusId: string;
  collegeId: string;
  programId: string;
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
      campusId: args.campusId,
      collegeId: args.collegeId,
      programId: args.programId,
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
    campusId?: string;
    collegeId?: string;
    programId?: string;
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
      ...(args.data.campusId !== undefined ? { campusId: args.data.campusId } : {}),
      ...(args.data.collegeId !== undefined ? { collegeId: args.data.collegeId } : {}),
      ...(args.data.programId !== undefined ? { programId: args.data.programId } : {}),
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
