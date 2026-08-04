import { ForbiddenError } from "@/utils/errors";
import { PERMISSION_CODES } from "@/modules/permissions/permissions.constants";

// =============================================================================
// URS-DMS — admin _shared · privilege-escalation guard (Sprint 7.2)
// -----------------------------------------------------------------------------
// Security rule (Sprint 7.2 spec §Security):
//   "Users cannot assign permissions they themselves do not possess."
//
// This guard is invoked by the admin/users and admin/roles services whenever
// the actor is assigning a Role (which transitively grants its permissions)
// or directly assigning Permission codes to a Role. It guarantees that no
// administrator can bootstrap a broader permission set than they already
// hold: every code being granted must already be present in the actor's
// `permissions` array.
//
// The check is deliberately conservative:
//   * Unknown codes (not in the catalog at all) are rejected — they would be
//     a no-op binding anyway, and silently accepting them would hide a
//     caller bug.
//   * The actor's own permissions are read from `req.auth.permissions`
//     (populated by the authenticate middleware from the DB) — never trust a
//     freshly-supplied list.
// =============================================================================

export interface GuardedActor {
  permissions: string[];
}

/**
 * Asserts that the actor already holds every permission code in `codes`.
 * Throws `ForbiddenError` on the first missing/unknown code.
 */
export function assertCanGrantPermissions(actor: GuardedActor, codes: string[]): void {
  // Cheap referential check: every code must exist in the catalog so a typo
  // can never silently produce a no-op binding.
  const catalogue = new Set<string>(PERMISSION_CODES);
  for (const code of codes) {
    if (!catalogue.has(code)) {
      throw new ForbiddenError(`Unknown permission code: ${code}`);
    }
    if (!actor.permissions.includes(code)) {
      throw new ForbiddenError(
        `Privilege escalation blocked: you may not assign a permission you do not possess ("${code}")`,
      );
    }
  }
}

/**
 * Convenience overload for the "assign a role" path: the actor must hold every
 * permission currently bound to the target role. Resolves the role's codes
 * first (caller passes them in — the repository already loaded them).
 */
export function assertCanAssignRole(actor: GuardedActor, rolePermissionCodes: string[]): void {
  assertCanGrantPermissions(actor, rolePermissionCodes);
}
