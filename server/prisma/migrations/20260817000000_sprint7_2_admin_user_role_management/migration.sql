-- =============================================================================
-- Sprint 7.2 — Administration Backend (User & Role Administration)
-- -----------------------------------------------------------------------------
-- Adds:
--   * roles.deletedAt  — soft-delete column on Role so the admin role surface
--     can archive/restore roles. Additive only — existing role rows get NULL,
--     which Prisma interprets as "live" (matches the soft-delete convention
--     on every other model). A @@index on deletedAt keeps the "list live
--     roles" path indexed.
--   * users.mustChangePassword — boolean flag set by the
--     POST /admin/users/:id/force-password-change endpoint. The next time the
--     user logs in, the auth module (untouched by this sprint — the flag is a
--     pure additive read) may surface this to the client. Defaulted false so
--     existing rows are untouched.
-- No existing column / constraint / row is altered or removed, so the
-- migration is safe to apply on a populated DB. It sorts after
-- 20260816000000_sprint7_1_admin alphabetically, preserving FK ordering.
-- =============================================================================

-- AlterTable: roles soft delete
ALTER TABLE "roles" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "roles_deletedAt_idx" ON "roles"("deletedAt");

-- AlterTable: users must-change-password flag
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
