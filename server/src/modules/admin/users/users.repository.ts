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
//   2. `includeArchived` is honoured separately from the soft-delete filter
//      so archived users can be listed + restored via the admin surface.
//   3. The `mustChangePassword` column added in Sprint 7.2 is read + written
//      here.
//
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
  campusId: true,
  campus: { select: { name: true } },
  collegeId: true,
  college: { select: { name: true } },
  programId: true,
  program: { select: { name: true } },
  mustChangePassword: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  profilePhotoKey: true,
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function toView(u: UserRow): AdminUserListItem {
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
    campusId: u.campusId,
    campusName: u.campus?.name ?? null,
    collegeId: u.collegeId,
    collegeName: u.college?.name ?? null,
    programId: u.programId,
    programName: u.program?.name ?? null,
    mustChangePassword: u.mustChangePassword,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    deletedAt: u.deletedAt,
    avatarSeed: u.id,
    profilePhotoKey: u.profilePhotoKey,
    photoUrl: null,
  };
}

export interface ListArgs {
  q?: string;
  page: number;
  pageSize: number;
  includeArchived: boolean;
  roleId?: string;
  collegeId?: string;
  campusId?: string;
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
  if (args.campusId) where.campusId = args.campusId;
  if (args.collegeId) where.collegeId = args.collegeId;
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

  return { items: rows.map((r) => toView(r)), total };
}

export async function findById(id: string, includeArchived = false): Promise<AdminUserDetail | null> {
  const row = await prisma.user.findFirst({
    where: { id, ...(includeArchived ? {} : { deletedAt: null }) },
    select: userSelect,
  });
  if (!row) return null;
  return toView(row);
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
  campusId?: string | null;
  collegeId?: string | null;
  programId?: string | null;
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
      campusId: args.campusId ?? null,
      collegeId: args.collegeId ?? null,
      programId: args.programId ?? null,
      mustChangePassword: args.mustChangePassword,
      status: "ACTIVE",
    },
    select: userSelect,
  });
  return toView(row);
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
    campusId?: string | null;
    collegeId?: string | null;
    programId?: string | null;
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
      ...(args.data.campusId !== undefined ? { campusId: args.data.campusId } : {}),
      ...(args.data.collegeId !== undefined ? { collegeId: args.data.collegeId } : {}),
      ...(args.data.programId !== undefined ? { programId: args.data.programId } : {}),
    },
    select: userSelect,
  });
  return toView(row);
}

export async function changeStatus(id: string, status: UserStatus): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id },
    data: { status },
    select: userSelect,
  });
  return toView(row);
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
  return toView(row);
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
  return toView(row);
}

export async function archive(id: string): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
    select: userSelect,
  });
  return toView(row);
}

export async function restore(id: string): Promise<AdminUserDetail> {
  const row = await prisma.user.update({
    where: { id },
    data: { deletedAt: null, status: "ACTIVE" },
    select: userSelect,
  });
  return toView(row);
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
