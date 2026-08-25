import { prisma } from "@/lib/prisma";
import type { Prisma, UserStatus } from "@prisma/client";
import type { UserDetail, UserListItem } from "@/modules/users/users.types";

// =============================================================================
// URS-DMS — users repository (data access only)
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
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  profilePhotoKey: true,
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function toListItem(u: UserRow): UserListItem {
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
    role: u.role.name,
    departmentId: u.departmentId,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
  };
}

function toDetail(u: UserRow): UserDetail {
  return { ...toListItem(u), updatedAt: u.updatedAt, deletedAt: u.deletedAt, profilePhotoKey: u.profilePhotoKey };
}

export async function findById(id: string): Promise<UserDetail | null> {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: userSelect,
  });
  return user ? toDetail(user) : null;
}

export async function findByEmail(email: string): Promise<UserDetail | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    select: userSelect,
  });
  return user ? toDetail(user) : null;
}

export async function findByEmployeeId(employeeId: string): Promise<UserDetail | null> {
  const user = await prisma.user.findFirst({
    where: { employeeId, deletedAt: null },
    select: userSelect,
  });
  return user ? toDetail(user) : null;
}

export async function list(query: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: UserStatus;
  roleId?: string;
}): Promise<{
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where: Prisma.UserWhereInput = { deletedAt: null };

  if (query.status) where.status = query.status;
  if (query.roleId) where.roleId = query.roleId;
  if (query.q) {
    where.OR = [
      { email: { contains: query.q, mode: "insensitive" } },
      { employeeId: { contains: query.q, mode: "insensitive" } },
      { firstName: { contains: query.q, mode: "insensitive" } },
      { lastName: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items: rows.map(toListItem), total, page, pageSize };
}

export interface CreateArgs {
  data: {
    employeeId: string;
    email: string;
    password: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    suffix?: string | null;
    roleId: string;
    departmentId?: string | null;
  };
  passwordHash: string;
}

export async function create(args: CreateArgs): Promise<UserDetail> {
  const user = await prisma.user.create({
    data: {
      employeeId: args.data.employeeId,
      email: args.data.email.toLowerCase(),
      passwordHash: args.passwordHash,
      firstName: args.data.firstName,
      middleName: args.data.middleName ?? null,
      lastName: args.data.lastName,
      suffix: args.data.suffix ?? null,
      roleId: args.data.roleId,
      departmentId: args.data.departmentId ?? null,
      status: "ACTIVE",
    },
    select: userSelect,
  });
  return toDetail(user);
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

export async function update(args: UpdateArgs): Promise<UserDetail> {
  const user = await prisma.user.update({
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
  return toDetail(user);
}

export async function changeStatus(id: string, status: UserStatus): Promise<UserDetail> {
  const user = await prisma.user.update({
    where: { id },
    data: { status },
    select: userSelect,
  });
  return toDetail(user);
}

export async function updatePasswordHash(id: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { passwordHash, failedAttempts: 0, lockedUntil: null, status: "ACTIVE" },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function softDelete(id: string): Promise<UserDetail> {
  const user = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
    select: userSelect,
  });
  return toDetail(user);
}
