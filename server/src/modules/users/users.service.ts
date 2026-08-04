import * as repo from "@/modules/users/users.repository";
import { hashPassword } from "@/modules/auth/auth.password";
import {
  EmailTakenError,
  EmployeeIdTakenError,
  NotFoundError,
  ForbiddenError,
} from "@/utils/errors";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import type { UserStatus } from "@prisma/client";
import type { CreateUserInput, UpdateUserInput } from "@/modules/users/users.validator";
import type { UserDetail, UserListItem } from "@/modules/users/users.types";

// =============================================================================
// URS-DMS — users service
// =============================================================================

export interface ListResult {
  items: UserListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function listUsers(query: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: UserStatus;
  roleId?: string;
}): Promise<ListResult> {
  const r = await repo.list(query);
  return {
    items: r.items,
    meta: {
      page: r.page,
      pageSize: r.pageSize,
      total: r.total,
      totalPages: Math.max(1, Math.ceil(r.total / r.pageSize)),
    },
  };
}

export async function getUser(id: string): Promise<UserDetail> {
  const u = await repo.findById(id);
  if (!u) throw new NotFoundError("User not found");
  return u;
}

export async function createUser(
  data: CreateUserInput,
  actorId: string,
  ipAddress: string,
  userAgent: string,
): Promise<UserDetail> {
  const existingEmail = await repo.findByEmail(data.email);
  if (existingEmail) throw new EmailTakenError();

  const existingEmployeeId = await repo.findByEmployeeId(data.employeeId);
  if (existingEmployeeId) throw new EmployeeIdTakenError();

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) throw new NotFoundError("Role not found");

  const passwordHash = await hashPassword(data.password);
  const created = await repo.create({ data, passwordHash });

  await writeAudit({
    action: AUDIT_ACTIONS.USER_CREATED,
    userId: actorId,
    entity: "user",
    entityId: created.id,
    newValue: { email: created.email, employeeId: created.employeeId, roleId: created.roleId },
    ipAddress,
    userAgent,
  });

  return created;
}

export async function updateUser(
  id: string,
  data: UpdateUserInput,
  actorId: string,
  ipAddress: string,
  userAgent: string,
): Promise<UserDetail> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("User not found");

  if (data.email && data.email !== existing.email) {
    const conflict = await repo.findByEmail(data.email);
    if (conflict && conflict.id !== id) throw new EmailTakenError();
  }

  if (data.roleId) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw new NotFoundError("Role not found");
  }

  const updated = await repo.update({ id, data });

  await writeAudit({
    action: AUDIT_ACTIONS.USER_UPDATED,
    userId: actorId,
    entity: "user",
    entityId: id,
    oldValue: {
      email: existing.email,
      firstName: existing.firstName,
      lastName: existing.lastName,
      roleId: existing.roleId,
    },
    newValue: data,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function changeUserStatus(
  id: string,
  status: UserStatus,
  actorId: string,
  ipAddress: string,
  userAgent: string,
): Promise<UserDetail> {
  if (status === "LOCKED") {
    throw new ForbiddenError("Status LOCKED is managed automatically by the system");
  }

  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("User not found");

  const updated = await repo.changeStatus(id, status);

  if (status === "INACTIVE" || status === "SUSPENDED") {
    await repo.revokeAllSessions(id);
  }

  await writeAudit({
    action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
    userId: actorId,
    entity: "user",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function resetUserPassword(
  id: string,
  newPassword: string,
  actorId: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("User not found");

  const passwordHash = await hashPassword(newPassword);
  await repo.updatePasswordHash(id, passwordHash);
  await repo.revokeAllSessions(id);

  await writeAudit({
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    userId: actorId,
    entity: "user",
    entityId: id,
    ipAddress,
    userAgent,
  });
}

export async function deleteUser(
  id: string,
  actorId: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("User not found");

  if (existing.id === actorId) {
    throw new ForbiddenError("You cannot delete your own account");
  }

  await repo.softDelete(id);
  await repo.revokeAllSessions(id);

  await writeAudit({
    action: AUDIT_ACTIONS.USER_DELETED,
    userId: actorId,
    entity: "user",
    entityId: id,
    ipAddress,
    userAgent,
  });
}
