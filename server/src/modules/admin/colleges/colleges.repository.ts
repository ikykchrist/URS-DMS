import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  type CollegeDetail,
  type CollegeListItem,
  type CollegeWithRelations,
  collegeSelect,
} from "@/modules/admin/colleges/colleges.types";

// =============================================================================
// URS-DMS — Admin · Colleges repository (Sprint 7.1)
// -----------------------------------------------------------------------------
// Pure Prisma data access — no business rules. The service layer applies RBAC
// re-checks, audit logging, and (redundant-but-cheap) code-uniqueness checks.
// =============================================================================

function toItem(c: CollegeWithRelations): CollegeListItem {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    description: c.description,
    departmentCount: c._count.departments,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    deletedAt: c.deletedAt,
  };
}

export interface ListArgs {
  q?: string;
  page: number;
  pageSize: number;
  includeArchived: boolean;
}

export async function list(
  args: ListArgs,
): Promise<{ items: CollegeListItem[]; total: number }> {
  const where: Prisma.CollegeWhereInput = {
    deletedAt: args.includeArchived ? undefined : null,
  };
  if (args.q) {
    where.OR = [
      { name: { contains: args.q, mode: "insensitive" } },
      { code: { contains: args.q, mode: "insensitive" } },
      { description: { contains: args.q, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.college.findMany({
      where,
      select: collegeSelect,
      orderBy: { name: "asc" },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    }),
    prisma.college.count({ where }),
  ]);
  return { items: rows.map(toItem), total };
}

export async function findById(
  id: string,
  includeArchived = false,
): Promise<CollegeDetail | null> {
  const row = await prisma.college.findFirst({
    where: { id, ...(includeArchived ? {} : { deletedAt: null }) },
    select: collegeSelect,
  });
  return row ? toItem(row) : null;
}

export interface CreateArgs {
  name: string;
  code: string;
  description: string | null;
}

export async function create(args: CreateArgs): Promise<CollegeDetail> {
  const row = await prisma.college.create({
    data: {
      name: args.name,
      code: args.code,
      description: args.description,
    },
    select: collegeSelect,
  });
  return toItem(row);
}

export interface UpdateArgs {
  id: string;
  data: {
    name?: string;
    description?: string | null;
  };
}

export async function update(args: UpdateArgs): Promise<CollegeDetail> {
  const row = await prisma.college.update({
    where: { id: args.id },
    data: args.data,
    select: collegeSelect,
  });
  return toItem(row);
}

export async function archive(id: string): Promise<CollegeDetail> {
  const row = await prisma.college.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: collegeSelect,
  });
  return toItem(row);
}

export async function restore(id: string): Promise<CollegeDetail> {
  const row = await prisma.college.update({
    where: { id },
    data: { deletedAt: null },
    select: collegeSelect,
  });
  return toItem(row);
}

export async function codeTaken(code: string, excludeId?: string): Promise<boolean> {
  const row = await prisma.college.findFirst({
    where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}
