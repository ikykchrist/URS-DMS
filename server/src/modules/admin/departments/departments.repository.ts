import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  type DepartmentDetail,
  type DepartmentListItem,
  type DepartmentWithRelations,
  departmentSelect,
} from "@/modules/admin/departments/departments.types";

// =============================================================================
// URS-DMS — Admin · Departments repository (Sprint 7.1)
// -----------------------------------------------------------------------------
// Pure Prisma data access — no business rules. The service layer applies RBAC
// re-checks, audit logging, and head/college existence validation.
// =============================================================================

function fullName(u: { firstName: string; lastName: string } | null): string | null {
  return u ? `${u.firstName} ${u.lastName}`.trim() || null : null;
}

function toItem(d: DepartmentWithRelations): DepartmentListItem {
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    headId: d.headId,
    headName: fullName(d.head),
    collegeId: d.collegeId,
    collegeName: d.college?.name ?? null,
    userCount: d._count.users,
    documentCount: d._count.documents,
    folderCount: d._count.folders,
    areaCount: d._count.aaccupAreas,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    deletedAt: d.deletedAt,
  };
}

export interface ListArgs {
  q?: string;
  collegeId?: string;
  page: number;
  pageSize: number;
  includeArchived: boolean;
}

export async function list(
  args: ListArgs,
): Promise<{ items: DepartmentListItem[]; total: number }> {
  const where: Prisma.DepartmentWhereInput = {
    deletedAt: args.includeArchived ? undefined : null,
  };
  if (args.collegeId) where.collegeId = args.collegeId;
  if (args.q) {
    where.OR = [
      { name: { contains: args.q, mode: "insensitive" } },
      { code: { contains: args.q, mode: "insensitive" } },
      { description: { contains: args.q, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.department.findMany({
      where,
      select: departmentSelect,
      orderBy: { name: "asc" },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    }),
    prisma.department.count({ where }),
  ]);
  return { items: rows.map(toItem), total };
}

export async function findById(id: string, includeArchived = false): Promise<DepartmentDetail | null> {
  const row = await prisma.department.findFirst({
    where: { id, ...(includeArchived ? {} : { deletedAt: null }) },
    select: departmentSelect,
  });
  return row ? toItem(row) : null;
}

export interface CreateArgs {
  name: string;
  code: string;
  description: string | null;
  headId: string | null;
  collegeId: string | null;
}

export async function create(args: CreateArgs): Promise<DepartmentDetail> {
  const row = await prisma.department.create({
    data: {
      name: args.name,
      code: args.code,
      description: args.description,
      headId: args.headId,
      collegeId: args.collegeId,
    },
    select: departmentSelect,
  });
  return toItem(row);
}

export interface UpdateArgs {
  id: string;
  data: {
    name?: string;
    description?: string | null;
    headId?: string | null;
    collegeId?: string | null;
  };
}

export async function update(args: UpdateArgs): Promise<DepartmentDetail> {
  const row = await prisma.department.update({
    where: { id: args.id },
    data: args.data,
    select: departmentSelect,
  });
  return toItem(row);
}

export async function archive(id: string): Promise<DepartmentDetail> {
  const row = await prisma.department.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: departmentSelect,
  });
  return toItem(row);
}

export async function restore(id: string): Promise<DepartmentDetail> {
  const row = await prisma.department.update({
    where: { id },
    data: { deletedAt: null },
    select: departmentSelect,
  });
  return toItem(row);
}

export async function codeTaken(code: string, excludeId?: string): Promise<boolean> {
  const row = await prisma.department.findFirst({
    where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}
