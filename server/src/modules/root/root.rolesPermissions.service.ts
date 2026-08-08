import { PERMISSIONS, PERMISSION_CODES } from "@/modules/permissions/permissions.constants";
import { DEFAULT_ROLE_MATRIX } from "@/modules/roles/roles.constants";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as rolesRepo from "@/modules/admin/roles/roles.repository";
import type { AdminRoleDetail } from "@/modules/admin/roles/roles.types";
import type { UpdateRolePermissionsBody } from "@/modules/admin/roles/roles.validator";
import type { AdminListRolesQuery } from "@/modules/admin/roles/roles.validator";

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface PermissionCatalogEntry {
  code: string;
  module: string;
  description: string;
}

export interface RoleMatrixEntry {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  deletedAt: string | null;
  boundPermissions: string[];
}

export interface RolesPermissionMatrix {
  roles: RoleMatrixEntry[];
  catalog: PermissionCatalogEntry[];
  rootOnlyCodes: string[];
}

/**
 * Reads the full matrix: all roles with bound permission codes + the catalog.
 */
export async function readMatrix(): Promise<RolesPermissionMatrix> {
  const query: AdminListRolesQuery = {
    page: 1,
    pageSize: 50,
    includeArchived: true,
  };
  const list = await rolesRepo.list(query);
  const detailRows: AdminRoleDetail[] = [];
  for (const item of list.items) {
    const detail = await rolesRepo.findById(item.id, Boolean(item.deletedAt));
    if (detail) detailRows.push(detail);
  }

  const roles: RoleMatrixEntry[] = detailRows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r.userCount,
    permissionCount: r.permissionCount,
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
    boundPermissions: r.permissions.map((p) => p.code),
  }));

  const catalog = PERMISSION_CODES.map((code) => {
    const def = PERMISSIONS.find((p) => p.code === code);
    return {
      code,
      module: def?.module ?? "unknown",
      description: def?.description ?? code,
    };
  });

  const rootOnlyCodes = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ROOT")?.permissions ?? [];

  return { roles, catalog, rootOnlyCodes };
}

/**
 * Returns the full permission catalog.
 */
export function readCatalog(): PermissionCatalogEntry[] {
  return PERMISSION_CODES.map((code) => {
    const def = PERMISSIONS.find((p) => p.code === code);
    return {
      code,
      module: def?.module ?? "unknown",
      description: def?.description ?? code,
    };
  });
}

/**
 * Replaces a role's permission bindings. Protects system roles and enforces
 * the escalation guard.
 */
export async function updateRoleBindings(
  roleId: string,
  body: UpdateRolePermissionsBody,
  actor: Actor,
): Promise<{ role: RoleMatrixEntry; added: string[]; removed: string[] }> {
  // Reuse admin roles service directly — it has all guards already.
  // We wrap it here to return the same shape as the matrix endpoint.
  const existing = await rolesRepo.findById(roleId);
  if (!existing) throw new NotFoundError("Role not found");
  if (existing.deletedAt) {
    throw new BadRequestError("Role is archived; restore it before managing permissions");
  }

  // System role protections (same as admin service).
  if (existing.name === "ROOT") {
    throw new ForbiddenError("The ROOT role's permissions are fixed and cannot be modified");
  }

  // ADMINISTRATOR also gets partial protection: cannot remove ROOT_ONLY_CODES
  // but CAN otherwise manage its own permissions through the root console.

  // Validate catalog membership.
  const catalogue = new Set<string>(PERMISSION_CODES);
  const unknown = body.permissions.filter((c) => !catalogue.has(c));
  if (unknown.length > 0) {
    throw new BadRequestError(`Unknown permission code(s): ${unknown.join(", ")}`);
  }

  // Escalation guard.
  const actorSet = new Set(actor.permissions);
  const notHeld = body.permissions.filter((c) => !actorSet.has(c));
  if (notHeld.length > 0) {
    throw new ForbiddenError(
      `Cannot grant permissions you do not possess: ${notHeld.join(", ")}`,
    );
  }

  const diff = await rolesRepo.setRolePermissions(roleId, body.permissions);

  const updated = await rolesRepo.findById(roleId);
  if (!updated) throw new NotFoundError("Role not found after permission update");

  const entry: RoleMatrixEntry = {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    isSystem: updated.isSystem,
    userCount: updated.userCount,
    permissionCount: updated.permissionCount,
    deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
    boundPermissions: updated.permissions.map((p) => p.code),
  };

  return { role: entry, added: diff.added, removed: diff.removed };
}
