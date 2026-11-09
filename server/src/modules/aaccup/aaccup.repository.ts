import { prisma } from "@/lib/prisma";
import { numberAreas, areaScopeKey } from "./aaccup.numbering";
import type { Prisma } from "@prisma/client";
import { type AaccupAreaDetail, type AaccupAreaListItem } from "@/modules/aaccup/aaccup.types";

export function listSetupOrganization() {
  return prisma.campus.findMany({
    where: { deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, colleges: {
      where: { deletedAt: null }, orderBy: { name: "asc" },
      select: { id: true, name: true, programs: {
        where: { deletedAt: null }, orderBy: { name: "asc" },
        select: { id: true, name: true, campusId: true },
      } },
    } },
  });
}

export function listSetupPrograms() {
  return prisma.program.findMany({
    where: { deletedAt: null, campus: { deletedAt: null }, college: { deletedAt: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, campusId: true, collegeId: true,
      campus: { select: { name: true } }, college: { select: { name: true, campusId: true } } },
  });
}

export async function areaTemplateSetup(areaId: string, areaSet: "AACCUP" | "ISO" | "CERT") {
  const templates = await prisma.requirementTemplate.findMany({ where: { areaSet, status: "ACTIVE", deletedAt: null },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }], select: { id: true, name: true, code: true, version: true } });
  const assignment = await prisma.requirementAssignment.findFirst({ where: { targetType: "AACCUP_AREA", targetId: areaId, deletedAt: null }, select: { templateId: true } });
  const templateId = assignment?.templateId ?? templates[0]?.id ?? null;
  return { templates, templateId };
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

function toListItem(row: AreaWithRelations, areaNumber: number): AaccupAreaListItem {
  return {
    id: row.id,
    areaNumber,
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
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function numbersFor(rows: AreaWithRelations[]) {
  if (!rows.length) return new Map<string, number>();
  const scopes = [...new Map(rows.map((row) => [areaScopeKey(row), {
    areaSet: row.areaSet, campusId: row.campusId, collegeId: row.collegeId, programId: row.programId,
  }])).values()];
  return numberAreas(await prisma.aaccupArea.findMany({
    where: { OR: scopes },
    select: { id: true, code: true, createdAt: true, areaSet: true, campusId: true, collegeId: true, programId: true },
  }));
}

async function toDetail(row: AreaWithRelations): Promise<AaccupAreaDetail> {
  const numbers = await numbersFor([row]);
  return {
    ...toListItem(row, numbers.get(row.id) ?? 1),
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
  const numbers = await numbersFor(rows);
  return {
    items: rows.map((row) => toListItem(row, numbers.get(row.id) ?? 1)),
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
  programId: string | null;
  accreditationCycleId: string | null;
  areaSet: "AACCUP" | "ISO" | "CERT";
  createdBy: string;
  status?: "ACTIVE" | "INACTIVE";
  dueDate?: Date | null;
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
      dueDate: args.dueDate ?? null,
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
    programId?: string | null;
    accreditationCycleId?: string | null;
    areaSet?: "AACCUP" | "ISO" | "CERT";
    status?: "ACTIVE" | "INACTIVE";
    dueDate?: Date | null;
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
      ...(args.data.dueDate !== undefined ? { dueDate: args.data.dueDate } : {}),
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
