import { z } from "zod";

// =============================================================================
// URS-DMS — Admin · Roles validators (Sprint 7.2)
// -----------------------------------------------------------------------------
// Schemas for the admin role surface. Reused Zod patterns mirror the rest of
// the admin module: optional trimmed strings, optional uuids, coerce numbers
// for query params, `strict()` on bodies to fail on unknown keys.
// =============================================================================

export const roleIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const adminListRolesQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  includeArchived: z.coerce.boolean().default(false),
});
export type AdminListRolesQuery = z.infer<typeof adminListRolesQuerySchema>;

// `name` is the Prisma `RoleName` enum. ROOT is protected separately, so the
// admin create endpoint accepts only one of the six non-ROOT seeded values
// and rejects if a role with that name already exists (live OR archived, since
// the @unique constraint spans soft-deleted rows).
export const createAdminRoleSchema = z.object({
  name: z.enum([
    "ADMINISTRATOR",
    "QUALITY_ASSURANCE_OFFICER",
    "DEPARTMENT_COORDINATOR",
    "FACULTY",
    "STAFF",
    "READ_ONLY",
  ]),
  description: z.string().trim().max(500).optional(),
});
export type CreateAdminRoleBody = z.infer<typeof createAdminRoleSchema>;

export const updateAdminRoleSchema = z
  .object({
    description: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
export type UpdateAdminRoleBody = z.infer<typeof updateAdminRoleSchema>;

// Body for PATCH /admin/roles/:id/permissions.
// The actor MUST already hold every permission code they are granting
// (privilege-escalation guard — admin/roles/roles.service.ts). The schema
// only validates shape; the privilege check is a service-layer rule per
// the project's defence-in-depth convention.
export const updateRolePermissionsSchema = z
  .object({
    // The full target set of permission codes for this role. Replaces the
    // existing bindings atomically (service uses a diff + createMany/deleteMany
    // inside a transaction). Empty array = remove all bindings.
    permissions: z.array(z.string().min(1).max(100)).max(200),
  })
  .strict();
export type UpdateRolePermissionsBody = z.infer<typeof updateRolePermissionsSchema>;

// Note: user↔role assignment has no dedicated /admin/roles/:id/users endpoint
// in the sprint's API surface. The "Assign Users to Role / Remove Users from
// Role" features are satisfied by PATCH /admin/users/:id { roleId } on the
// user surface, which the spec's API list enumerates explicitly. That path
// enforces the privilege-escalation guard for the target role's permissions
// (see admin/users/users.service.ts), keeping a single, audited assignment
// surface for both create + update.
