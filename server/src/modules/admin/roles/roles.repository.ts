import { prisma } from "@/lib/prisma";
import type { Prisma, RoleName } from "@prisma/client";
import { PERMISSION_CODES } from "@/modules/permissions/permissions.constants";
import type {
  AdminRoleDetail,
  AdminRoleListItem,
  AdminRolePermissionItem,
} from "@/modules/admin/roles/roles.types";

// =============================================================================
// URS-DMS — Admin · Roles repository (Sprint 7.2)
// -----------------------------------------------------------------------------
// Pure Prisma data access. No business rules. The role list / detail queries
// bundle `_count` (live users, bound permissions) so the controller never
// issues a second round-trip. The detail query additionally selects the bound
// permissions' code/module/description, again in one include.
// =============================================================================

const roleListSelect = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: {
    select: {
      // Live (non-archived) users only. Archived users are excluded so the
      // "userCount" badge reflects the current active headcount.
      users: { where: { deletedAt: null } },
      permissions: true,
    },
  },
} satisfies Prisma.RoleSelect;

type RoleListRow = Prisma.RoleGetPayload<{ select: typeof roleListSelect }>;

function toListItem(r: RoleListRow): AdminRoleListItem {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r._count.users,
    permissionCount: r._count.permissions,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  };
}

const roleDetailSelect = {
  ...roleListSelect,
  permissions: {
    select: {
      permission: {
        select: { code: true, module: true, description: true },
      },
    },
  },
} satisfies Prisma.RoleSelect;

type RoleDetailRow = Prisma.RoleGetPayload<{ select: typeof roleDetailSelect }>;

function toDetail(r: RoleDetailRow): AdminRoleDetail {
  const permissions: AdminRolePermissionItem[] = r.permissions.map((rp) => ({
    code: rp.permission.code,
    module: rp.permission.module,
    description: rp.permission.description,
  }));
  // Sort by the catalog order so the detail view shows permissions grouped in
  // the canonical order (the catalog is the single source of truth for code
  // ordering — see permissions.constants.ts).
  const order = new Map<string, number>(PERMISSION_CODES.map((c, i) => [c, i]));
  permissions.sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0));

  return {
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r._count.users,
    permissionCount: r._count.permissions,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    permissions,
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
): Promise<{ items: AdminRoleListItem[]; total: number }> {
  const where: Prisma.RoleWhereInput = {
    deletedAt: args.includeArchived ? undefined : null,
  };
  // Free-text search only applies to the description. `name` is a Prisma enum
  // (RoleName) and a contains() filter on an enum column is not supported.
  // Self-documenting: an admin looking for a role by name can filter on the
  // `role` enum value via the user list's `roleId` filter indirectly.
  if (args.q) {
    where.description = { contains: args.q, mode: "insensitive" };
  }

  const [rows, total] = await Promise.all([
    prisma.role.findMany({
      where,
      select: roleListSelect,
      orderBy: { name: "asc" },
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
    }),
    prisma.role.count({ where }),
  ]);

  return { items: rows.map(toListItem), total };
}

export async function findById(
  id: string,
  includeArchived = false,
): Promise<AdminRoleDetail | null> {
  const row = await prisma.role.findFirst({
    where: { id, ...(includeArchived ? {} : { deletedAt: null }) },
    select: roleDetailSelect,
  });
  return row ? toDetail(row) : null;
}

export async function findByName(
  name: RoleName,
): Promise<AdminRoleListItem | null> {
  const row = await prisma.role.findUnique({
    where: { name },
    select: roleListSelect,
  });
  return row ? toListItem(row) : null;
}

export interface CreateArgs {
  name: RoleName;
  description?: string | null;
}

export async function create(args: CreateArgs): Promise<AdminRoleDetail> {
  const row = await prisma.role.create({
    data: {
      name: args.name,
      description: args.description ?? null,
      isSystem: false,
    },
    select: roleDetailSelect,
  });
  return toDetail(row);
}

export interface UpdateArgs {
  id: string;
  data: { description?: string | null };
}

export async function update(args: UpdateArgs): Promise<AdminRoleDetail> {
  const row = await prisma.role.update({
    where: { id: args.id },
    data: {
      ...(args.data.description !== undefined ? { description: args.data.description } : {}),
    },
    select: roleDetailSelect,
  });
  return toDetail(row);
}

export async function archive(id: string): Promise<AdminRoleDetail> {
  const row = await prisma.role.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: roleDetailSelect,
  });
  return toDetail(row);
}

export async function restore(id: string): Promise<AdminRoleDetail> {
  const row = await prisma.role.update({
    where: { id },
    data: { deletedAt: null },
    select: roleDetailSelect,
  });
  return toDetail(row);
}

// ---------------------------------------------------------------------------
// Permission bindings — diffs the current bound codes against the target
// set, then creates / deletes RolePermission rows inside a single transaction
// so the role never observes a half-applied binding set.
// ---------------------------------------------------------------------------
export async function loadBoundPermissionCodes(roleId: string): Promise<string[]> {
  const rows = await prisma.permission.findMany({
    where: { roles: { some: { roleId } } },
    select: { code: true },
  });
  return rows.map((r) => r.code);
}

export async function setRolePermissions(
  roleId: string,
  targetCodes: string[],
): Promise<{ added: string[]; removed: string[] }> {
  return prisma.$transaction(async (tx) => {
    // Load current binding ids keyed by code so we can diff.
    const current = await tx.permission.findMany({
      where: { roles: { some: { roleId } } },
      select: { id: true, code: true },
    });
    const currentByCode = new Map(current.map((p) => [p.code, p.id]));
    const currentCodes = new Set(currentByCode.keys());
    const targetSet = new Set(targetCodes);

    const toAdd = targetCodes.filter((c) => !currentCodes.has(c));
    const toRemove = [...currentCodes].filter((c) => !targetSet.has(c));

    // Resolve permission ids for the codes to add. Unknown codes are silently
    // dropped here; the privilege-escalation guard in the service pre-validates
    // every code and throws ForbiddenError on unknowns, so this branch only
    // fires when the caller is fully authorized and all codes are valid.
    if (toAdd.length > 0) {
      const perms = await tx.permission.findMany({
        where: { code: { in: toAdd } },
        select: { id: true, code: true },
      });
      const permIds = perms.map((p) => p.id);
      if (permIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permIds.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true,
        });
      }
    }

    if (toRemove.length > 0) {
      const permIds = toRemove
        .map((c) => currentByCode.get(c))
        .filter((id): id is string => id !== undefined);
      if (permIds.length > 0) {
        await tx.rolePermission.deleteMany({
          where: { roleId, permissionId: { in: permIds } },
        });
      }
    }

    return { added: toAdd, removed: toRemove };
  });
}

