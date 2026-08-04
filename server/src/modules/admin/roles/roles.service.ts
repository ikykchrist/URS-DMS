import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { assertCanGrantPermissions } from "@/modules/admin/_shared/admin.guard";
import { PERMISSION_CODES } from "@/modules/permissions/permissions.constants";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/admin/roles/roles.repository";
import type { AdminRoleDetail } from "@/modules/admin/roles/roles.types";
import type {
  AdminListRolesQuery,
  CreateAdminRoleBody,
  UpdateAdminRoleBody,
  UpdateRolePermissionsBody,
} from "@/modules/admin/roles/roles.validator";

// =============================================================================
// URS-DMS — Admin · Roles service (Sprint 7.2)
// -----------------------------------------------------------------------------
// Business logic + RBAC re-checks (defence in depth — the route layer's
// `requirePermission(...)` is the first gate; the service re-asserts the same
// permission so a wiring mistake at the route layer can never bypass RBAC).
// No `if (role === "admin")` anywhere.
//
// RBAC model (matches the catalog in permissions.constants.ts):
//   - role.read              → list + detail
//   - role.create            → create
//   - role.update            → update (also covers PATCH /:id/permissions)
//   - role.archive           → archive
//   - role.restore           → restore (distinct from archive per spec)
//   - role.permission.manage → assign/remove permissions on a role
//   - permission.read        → GET /admin/permissions
//
// SECURITY: assigning permissions to a role goes through the
// privilege-escalation guard (`_shared/admin.guard.ts`): the actor must
// already hold every permission code they're trying to grant to a role. This
// prevents an admin from bootstrapping a broader permission set than they
// already possess and then using the role as a proxy grant.
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface ListResult {
  items: AdminRoleDetail[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

// ---------------------------------------------------------------------------
// RBAC re-asserts
// Per AI_CONTEXT §5, every service function re-asserts the permission so the
// route gate cannot bypass RBAC. Permissions are checked by code, not by role
// name.
// ---------------------------------------------------------------------------
function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("role.read")) {
    throw new ForbiddenError("You do not have access to the admin roles surface");
  }
}
function assertCanCreate(actor: Actor): void {
  if (!actor.permissions.includes("role.create")) {
    throw new ForbiddenError("You do not have permission to create roles");
  }
}
function assertCanUpdate(actor: Actor): void {
  if (!actor.permissions.includes("role.update")) {
    throw new ForbiddenError("You do not have permission to update roles");
  }
}
function assertCanArchive(actor: Actor): void {
  if (!actor.permissions.includes("role.archive")) {
    throw new ForbiddenError("You do not have permission to archive roles");
  }
}
function assertCanRestore(actor: Actor): void {
  if (!actor.permissions.includes("role.restore")) {
    throw new ForbiddenError("You do not have permission to restore roles");
  }
}
function assertCanManagePermissions(actor: Actor): void {
  if (!actor.permissions.includes("role.permission.manage")) {
    throw new ForbiddenError("You do not have permission to manage role permissions");
  }
}

// ---------------------------------------------------------------------------
// listRoles
// ---------------------------------------------------------------------------
export async function listRoles(query: AdminListRolesQuery, actor: Actor): Promise<ListResult> {
  assertCanRead(actor);
  const r = await repo.list({
    q: query.q,
    page: query.page,
    pageSize: query.pageSize,
    includeArchived: query.includeArchived,
  });
  return {
    items: r.items as AdminRoleDetail[],
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: r.total,
      totalPages: Math.max(1, Math.ceil(r.total / query.pageSize)),
    },
  };
}

// ---------------------------------------------------------------------------
// getRole
// ---------------------------------------------------------------------------
export async function getRole(id: string, actor: Actor): Promise<AdminRoleDetail> {
  assertCanRead(actor);
  const role = await repo.findById(id);
  if (!role) throw new NotFoundError("Role not found");
  return role;
}

// ---------------------------------------------------------------------------
// createRole
// ---------------------------------------------------------------------------
export async function createRole(
  input: CreateAdminRoleBody,
  actor: Actor,
): Promise<AdminRoleDetail> {
  assertCanCreate(actor);

  // The schema only allows one of the six non-ROOT RoleName enums. Refuse if a
  // role row already exists for that name — the @unique constraint on
  // Role.name spans soft-deleted rows, so an archived role with the same
  // enum name still blocks a fresh create. The right move for restoring an
  // archived role is the dedicated restore endpoint, not re-creating.
  const existing = await repo.findByName(input.name);
  if (existing) {
    throw new ConflictError(
      existing.deletedAt
        ? "A role with this name already exists (archived; use /restore instead of re-creating)"
        : "A role with this name already exists",
    );
  }

  const created = await repo.create({
    name: input.name,
    description: input.description ?? null,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.ROLE_CREATED,
    userId: actor.id,
    entity: "role",
    entityId: created.id,
    newValue: { name: created.name, description: created.description },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return created;
}

// ---------------------------------------------------------------------------
// updateRole (PATCH /admin/roles/:id — description only)
// ---------------------------------------------------------------------------
export async function updateRole(
  id: string,
  input: UpdateAdminRoleBody,
  actor: Actor,
): Promise<AdminRoleDetail> {
  assertCanUpdate(actor);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Role not found");
  if (existing.deletedAt) {
    throw new BadRequestError("Role is archived; restore it before updating");
  }

  // Sprint 7.4.1 — the ROOT role is never edited through the admin surface
  // ("root role never edited / deleted"). The seed owns every ROOT property
  // (name, description, bindings); admins cannot even touch the description.
  if (existing.name === "ROOT") {
    throw new ForbiddenError("The ROOT role cannot be modified; manage it from the Root Console");
  }

  const updated = await repo.update({
    id,
    data: {
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    userId: actor.id,
    entity: "role",
    entityId: id,
    oldValue: { description: existing.description },
    newValue: { description: updated.description },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// archiveRole (soft delete)
// ---------------------------------------------------------------------------
export async function archiveRole(id: string, actor: Actor): Promise<AdminRoleDetail> {
  assertCanArchive(actor);

  const existing = await repo.findById(id, false);
  if (!existing) throw new NotFoundError("Role not found");

  // Refuse to archive the ADMINISTRATOR or ROOT role entirely. Even with
  // zero live users at the moment of archive, a fresh boot could fail to
  // bootstrap an admin/root if the role row is soft-deleted. Tighter than
  // strictly necessary, but eliminates a whole class of foot-guns.
  // (Sprint 7.4.1 — ROOT: "root role never archived".)
  if (existing.name === "ADMINISTRATOR") {
    throw new ForbiddenError("The ADMINISTRATOR role cannot be archived");
  }
  if (existing.name === "ROOT") {
    throw new ForbiddenError("The ROOT role cannot be archived");
  }

  // Refuse to archive a role that still has live users. Forcing those users
  // onto a different role would silently change their privileges. Require the
  // admin to reassign / archive the users first.
  if (existing.userCount > 0) {
    throw new BadRequestError(
      "Role still has live users; reassign or archive them before archiving the role",
    );
  }

  const archived = await repo.archive(id);

  await writeAudit({
    action: AUDIT_ACTIONS.ROLE_ARCHIVED,
    userId: actor.id,
    entity: "role",
    entityId: id,
    oldValue: { name: existing.name, deletedAt: null },
    newValue: { name: archived.name, deletedAt: archived.deletedAt },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return archived;
}

// ---------------------------------------------------------------------------
// restoreRole
// ---------------------------------------------------------------------------
export async function restoreRole(id: string, actor: Actor): Promise<AdminRoleDetail> {
  assertCanRestore(actor);

  const existing = await repo.findById(id, true);
  if (!existing) throw new NotFoundError("Role not found");
  if (!existing.deletedAt) {
    throw new BadRequestError("Role is not archived");
  }

  const restored = await repo.restore(id);

  await writeAudit({
    action: AUDIT_ACTIONS.ROLE_RESTORED,
    userId: actor.id,
    entity: "role",
    entityId: id,
    oldValue: { name: existing.name, deletedAt: existing.deletedAt },
    newValue: { name: restored.name, deletedAt: null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return restored;
}

// ---------------------------------------------------------------------------
// updateRolePermissions (PATCH /admin/roles/:id/permissions)
//
// Replaces the role's permission binding set atomically. The privilege
// escalation guard (`assertCanGrantPermissions`) rejects any code the actor
// themselves does not have, so an admin cannot grant a permission they lack.
// Unknown codes (not in the catalog at all) are also rejected up front — a
// no-op binding would otherwise hide a caller typo.
// ---------------------------------------------------------------------------
export async function updateRolePermissions(
  id: string,
  input: UpdateRolePermissionsBody,
  actor: Actor,
): Promise<AdminRoleDetail> {
  assertCanManagePermissions(actor);

  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Role not found");
  if (existing.deletedAt) {
    throw new BadRequestError("Role is archived; restore it before managing permissions");
  }

  // Sprint 7.4.1 — the ROOT role's permission bindings are fixed ("ROOT
  // permissions never removed"). The seed owns the ROOT set (every catalog
  // code) and no admin action may alter it — otherwise a permission-removal
  // bug could silently strip Root's platform access.
  if (existing.name === "ROOT") {
    throw new ForbiddenError("The ROOT role's permissions are fixed and cannot be modified");
  }

  // Privilege-escalation guard. Every code the actor is granting must already
  // be in the actor's permission set, and every code must exist in the catalog
  // so a typo can never silently produce a no-op.
  assertCanGrantPermissions(actor, input.permissions);

  // Defence in depth #2: validate every requested code exists in the catalog
  // (the guard already rejects unknown codes, but this guards the case where
  // the actor's own permission set supersedes the catalog — never happens
  // in practice but keeps the audit payload clean).
  const catalogue = new Set<string>(PERMISSION_CODES);
  const unknown = input.permissions.filter((c) => !catalogue.has(c));
  if (unknown.length > 0) {
    throw new BadRequestError(`Unknown permission code(s): ${unknown.join(", ")}`);
  }

  const currentCodes = await repo.loadBoundPermissionCodes(id);
  const diff = await repo.setRolePermissions(id, input.permissions);

  // Reload the detail row so the audit `newValue` reflects the post-update
  // binding set, not the input list (which may have contained duplicates the
  // repository deduplicates).
  const updated = await repo.findById(id);
  if (!updated) {
    // Practically impossible — we just touched the row — but the type checker
    // cannot prove it. Treat as a server error.
    throw new NotFoundError("Role not found after permission update");
  }

  await writeAudit({
    action: AUDIT_ACTIONS.PERMISSIONS_UPDATED,
    userId: actor.id,
    entity: "role",
    entityId: id,
    oldValue: { permissions: currentCodes },
    newValue: {
      permissions: updated.permissions.map((p) => p.code),
      added: diff.added,
      removed: diff.removed,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}
