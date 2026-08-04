-- =============================================================================
-- Sprint 7.1 — Administration Backend
-- -----------------------------------------------------------------------------
-- Adds two new tables for the admin module and a nullable FK from
-- departments to colleges (academic-organisational parent of departments).
--
--   * colleges          — academic-organisational grouping (admin-managed)
--   * system_settings   — singleton row (id="singleton") for application config
--   * departments.collegeId — nullable back-reference; ON DELETE SET NULL
--     preserves existing department rows when a college is archived+hard-
--     purged in a future GC pass.
--
-- BigInt default for maxUploadSizeBytes (100 MiB) is set via the model; no
-- explicit DEFAULT clause in the migration is needed because Prisma seeds it
-- in the application layer.
-- =============================================================================

-- CreateTable
CREATE TABLE "colleges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "applicationName" TEXT NOT NULL DEFAULT 'URS Document Management System',
    "maxUploadSizeBytes" BIGINT NOT NULL DEFAULT 104857600,
    "allowedFileTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "defaultPaginationSize" INTEGER NOT NULL DEFAULT 25,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "storageThresholdWarning" INTEGER NOT NULL DEFAULT 80,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable (add nullable collegeId FK + index)
ALTER TABLE "departments" ADD COLUMN "collegeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "colleges_code_key" ON "colleges"("code");
CREATE INDEX "colleges_deletedAt_idx" ON "colleges"("deletedAt");
CREATE INDEX "departments_collegeId_idx" ON "departments"("collegeId");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
