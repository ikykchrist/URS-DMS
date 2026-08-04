import { prisma } from "@/lib/prisma";
import type { Prisma, UserStatus } from "@prisma/client";
import {
  type AdminUserDetail,
  type AdminUserListItem,
} from "@/modules/admin/users/users.types";

// =============================================================================
// URS-DMS — Admin · Users repository (Sprint 7.2)
// -----------------------------------------------------------------------------
// Pure Prisma data access. The admin surface differs from the legacy
// modules/users repository in three ways:
//   1. College filter is reached via the department → college FK chain
//      (`departmentId IN (SELECT id FROM departments WHERE collegeId = ?)`).
//      The Prisma User model has NO `department` relation (only the reverse
//      `UserDepartment` one-to-many to Department, which models a legacy
//      many-to-many and is NOT the scalar `departmentId` we filter on). So
//      the college filter resolves the matching department ids first, then
//      scopes the user query by `departmentId IN ...`. Single round-trip for
//      the user query, plus one bounded subquery for the department ids — no
//      N+1.
//   2. `includeArchived` is honoured separately from the soft-delete filter
//      so archived users can be listed + restored via the admin surface.
//   3. The `mustChangePassword` column added in Sprint 7.2 is read + written
//      here.
//
// Department / college names are NOT reachable via a Prisma relation on User
// (`User.department` does not exist — see AI_CONTEXT known issue #11, which
// documents that `/audit` exposes `userDepartmentId` not `userDepartment` for
// exactly this reason). Names are resolved in a single batched query against
// Department (with its college FK) per list/detail call, then spliced into the
// view rows. This mirrors the canonical reports.service.ts pattern.
//
// No business rules. RBAC + audit + uniqueness checks live in the service.
// =============================================================================

const userSelect = {
  id: true,
  employeeId: true,
  email: true,
  firstName: true,
  middleName: true,
  lastName: true,
  suffix: true,
  status: true,
  roleId: true,
  role: { select: { name: true } },
  departmentId: true,
  mustChangePassword: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

// Resolved department + college rows for the set of departmentIds present in
// a page of users. Cached per call (single batched query). Keyed by the
// department id. Mirrors reports.service.ts's `nameById` map pattern.
interface DeptInfo {
  departmentName: string;
  collegeId: string | null;
  collegeName: string | null;
}

async function loadDeptInfos(departmentIds: (string | null)[]): Promise<Map<string, DeptInfo>> {
  const uniqueIds = Array.from(
    new Set(departmentIds.filter((id): id is string => id !== null)),
  );
  if (uniqueIds.length === 0) return new Map<string, DeptInfo>();

  const rows = await prisma.department.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      name: true,
      collegeId: true,
      college: { select: { name: true } },
    },
  });

  const map = new Map<string, DeptInfo>();
  for (const r of rows) {
    map.set(r.id, {
      departmentName: r.name,
      collegeId: r.collegeId,
      collegeName: r.college?.name ?? null,
    });
  }
  return map;
}

function toView(u: UserRow, deptInfos: Map<string, DeptInfo>): AdminUserListItem {
  const info = u.departmentId ? (deptInfos.get(u.departmentId) ?? null) : null;
  return {
    id: u.id,
    employeeId: u.employeeId,
    email: u.email,
    firstName: u.firstName,
    middleName: u.middleName,
    lastName: u.lastName,
    suffix: u.suffix,
    status: u.status,
    roleId: u.roleId,
    roleName: u.role.name,
    departmentId: u.departmentId,
    departmentName: info?.departmentName ?? null,
    collegeId: info?.collegeId ?? null,
    collegeName: info?.collegeName ?? null,
    mustChangePassword: u.mustChangePassword,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    deletedAt: u.deletedAt,
  };
}

export interface ListArgs {
  q?: string;
  page: number;
  pageSize: number;
  includeArchived: boolean;
  roleId?: string;
  departmentId?: string;
  collegeId?: string;
  status?: UserStatus;
  createdFrom?: Date;
  createdTo?: Date;
  updatedFrom?: Date;
  updatedTo?: Date;
  sort: "name" | "email" | "employeeId" | "createdAt" | "updatedAt";
  order: "asc" | "desc";
}

export async function list(
  args: ListArgs,
): Promise<{ items: AdminUserListItem[]; total: number }> {
  const where: Prisma.UserWhereInput = {
    deletedAt: args.includeArchived ? undefined : null,
  };
  if (args.roleId) where.roleId = args.roleId;
  if (args.departmentId) where.departmentId = args.departmentId;
  if (args.status) where.status = args.status;
  if (args.createdFrom || args.createdTo) {
    where.createdAt = {};
    if (args.createdFrom) where.createdAt.gte = args.createdFrom;
    if (args.createdTo) where.createdAt.lte = args.createdTo;
  }
  if (args.updatedFrom || args.updatedTo) {
    where.updatedAt = {};
    if (args.updatedFrom) where.updatedAt.gte = args.updatedFrom;
    if (args.updatedTo) where.updatedAt.lte = args.updatedTo;
  }

  // College filter: User has no `department` relation. Resolve the set of
  // department ids belonging to the college first, then scope the user query
  // by `departmentId IN (...)`. An unknown college id yields an empty id set,
  // which we turn into an unsatisfiable `id: { in: [] }` filter so the page is
  // empty rather than unfiltered.
  if (args.collegeId) {
    const deptIds = await prisma.department.findMany({
      where: { collegeId: args.collegeId },
      select: { id: true },
    });
    where.departmentId = { in: deptIds.map((d) => d.id) };
  }

  if (args.q) {
    where.OR = [
      { email: { contains: args.q, mode: "insensitive" } },
      { employeeId: { contains: args.q, mode: "insensitive" } },
      { firstName: { contains: args.q, mode: "insensitive" } },
      { lastName: { contains: args.q, mode: "insensitive" } },
    ];
  }

  // Map the public sort enum to a Prisma orderBy key. `name` is virtual —
  // sort by lastName then firstName to keep ordering deterministic.
  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    args.sort === "name"
      ? [{ lastName: args.order }, { firstName: args.order }]
      : [{ [args.sort]: args.order }];

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy,
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  // Batched department + college name resolution in one round-trip.
  const deptInfos = await loadDeptInfos(rows.map((r) => r.departmentId));
  return { items: rows.map((r) => toView(r, deptInfos)), total };
}

export async function findById(id: string, includeArchived = false): Promise<AdminUserDetail | null> {
  const row = await prisma.user.findFirst({
    where: { id, ...(includeArchived ? {} : { deletedAt: null }) },
    select: userSelect,
  });
  if (!row) return null;
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

// Uniqueness probes — return only the id (the service uses these for
// existence checks only, never as a read view). The check deliberately spans
// archived rows too: an archived user still holds its unique email /
// employeeId, so a fresh create colliding with an archived row is a real
// conflict we surface as 409 (the DB UNIQUE constraint is the ultimate guard).
export async function findByEmail(email: string, excludeId?: string): Promise<{ id: string } | null> {
  const row = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return row ?? null;
}

export async function findByEmployeeId(
  employeeId: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  const row = await prisma.user.findFirst({
    where: { employeeId, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return row ?? null;
}

export interface CreateArgs {
  employeeId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  roleId: string;
  departmentId?: string | null;
  mustChangePassword: boolean;
}

export async function create(args: CreateArgs): Promise<AdminUserDetail> {
  const row = await prisma.user.create({
    data: {
      employeeId: args.employeeId,
      email: args.email.toLowerCase(),
      passwordHash: args.passwordHash,
      firstName: args.firstName,
      middleName: args.middleName ?? null,
      lastName: args.lastName,
      suffix: args.suffix ?? null,
      roleId: args.roleId,
      departmentId: args.departmentId ?? null,
      mustChangePassword: args.mustChangePassword,
      status: "ACTIVE",
    },
    select: userSelect,
  });
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

export interface UpdateArgs {
  id: string;
  data: {
    email?: string;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    suffix?: string | null;
    roleId?: string;
    departmentId?: string | null;
  };
}

export async function update(args: UpdateArgs): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id: args.id },
    data: {
      ...(args.data.email !== undefined ? { email: args.data.email.toLowerCase() } : {}),
      ...(args.data.firstName !== undefined ? { firstName: args.data.firstName } : {}),
      ...(args.data.middleName !== undefined ? { middleName: args.data.middleName } : {}),
      ...(args.data.lastName !== undefined ? { lastName: args.data.lastName } : {}),
      ...(args.data.suffix !== undefined ? { suffix: args.data.suffix } : {}),
      ...(args.data.roleId !== undefined ? { roleId: args.data.roleId } : {}),
      ...(args.data.departmentId !== undefined ? { departmentId: args.data.departmentId } : {}),
    },
    select: userSelect,
  });
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

export async function changeStatus(id: string, status: UserStatus): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id },
    data: { status },
    select: userSelect,
  });
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

export async function updatePasswordHash(
  id: string,
  passwordHash: string,
  mustChangePassword: boolean,
): Promise<AdminUserDetail> {
  // Reset lockout fields when a password is reset/forced. `failedAttempts`
  // clearing matches the legacy users.repository.updatePasswordHash shape
  // (which also flipped status to ACTIVE) — surface stays consistent.
  const row = await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      mustChangePassword,
    },
    select: userSelect,
  });
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

export async function setMustChangePassword(
  id: string,
  mustChangePassword: boolean,
): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id },
    data: { mustChangePassword },
    select: userSelect,
  });
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

export async function archive(id: string): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
    select: userSelect,
  });
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

export async function restore(id: string): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id },
    data: { deletedAt: null, status: "ACTIVE" },
    select: userSelect,
  });
  const deptInfos = await loadDeptInfos([row.departmentId]);
  return toView(row, deptInfos);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Look up the permission codes currently bound to a role. Used by the service
// to enforce the privilege-escalation guard when a role is being assigned to a
// user: the actor must already hold every permission the role transitively
// grants.
export async function loadRolePermissionCodes(roleId: string): Promise<string[]> {
  const rows = await prisma.permission.findMany({
    where: { roles: { some: { roleId } } },
    select: { code: true },
  });
  return rows.map((r) => r.code);
}
