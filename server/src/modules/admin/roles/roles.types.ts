import type { RoleName } from "@prisma/client";

// =============================================================================
// URS-DMS — Admin · Roles domain shapes (Sprint 7.2)
// -----------------------------------------------------------------------------
// Wire view of a role for the admin surface. The list + detail shapes collapse
// to one view — `permissions` is included on the detail call via the same
// projection (single round-trip).
//
// Schema constraint worth calling out: `Role.name` is a Prisma `RoleName` enum
// (seven system roles seeded by `prisma/seed.ts`, including protected ROOT).
// There is NO `String`-named custom role surface in 1.0. The admin create
// endpoint accepts only one of the six non-ROOT values; "create a custom role" is a 2.0 backlog item that
// would require a schema migration widening `Role.name` to `String`.
//
// `isSystem` flags the seven seeded roles. Archive/restore respects this: an
// archived system role is restorable; a non-existent enum name is not
// creatable in 1.0 (see schema note above).
// =============================================================================

export interface AdminRoleListItem {
  id: string;
  name: RoleName;
  description: string | null;
  isSystem: boolean;
  userCount: number; // live (non-archived) users on this role
  permissionCount: number; // permissions currently bound to this role
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AdminRoleDetail extends AdminRoleListItem {
  permissions: AdminRolePermissionItem[];
}

export interface AdminRolePermissionItem {
  code: string;
  module: string;
  description: string | null;
}

export interface AdminPermissionItem {
  code: string;
  module: string;
  description: string | null;
}
