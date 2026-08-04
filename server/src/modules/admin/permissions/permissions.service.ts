import { PERMISSIONS, PERMISSION_CODES } from "@/modules/permissions/permissions.constants";
import { ForbiddenError } from "@/utils/errors";

// =============================================================================
// URS-DMS — Admin · Permissions service (Sprint 7.2)
// -----------------------------------------------------------------------------
// The permission catalog is the single source of truth at
// `permissions.constants.ts` — the seed script (prisma/seed.ts) upserts the
// same rows into the DB, so the wire view and the persisted authorization
// matrix stay in sync. Read-only surface: the only endpoint here is
// `GET /admin/permissions`; permission *assignment* lives on
// `PATCH /admin/roles/:id/permissions` (admin/roles module) so a single
// audit action covers each role's binding change.
//
// RBAC: `permission.read` (granted to ADMINISTRATOR only by default). The
// route layer asserts it; the service re-asserts (defence in depth) so a
// wiring mistake at the route layer cannot bypass RBAC.
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

const PERMISSION_BY_CODE = new Map(PERMISSIONS.map((p) => [p.code, p]));

export async function listPermissions(
  actor: Actor,
): Promise<{ code: string; module: string; description: string }[]> {
  if (!actor.permissions.includes("permission.read")) {
    throw new ForbiddenError("You do not have permission to view the permission catalog");
  }
  return PERMISSION_CODES.map((code) => {
    const def = PERMISSION_BY_CODE.get(code);
    // Unreachable: PERMISSION_CODES is derived from PERMISSIONS by map.
    if (!def) throw new Error(`Permission catalog drift: missing definition for ${code}`);
    return { code, module: def.module, description: def.description };
  });
}
