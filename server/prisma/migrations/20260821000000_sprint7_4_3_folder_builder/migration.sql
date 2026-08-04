-- =============================================================================
-- Sprint 7.4.3 — Dynamic Folder Builder
-- -----------------------------------------------------------------------------
-- Versioned, assignable folder templates that replace hardcoded folder
-- structures. Mirrors the Configuration Engine (version + snapshot + history
-- + rollback) and the Organization Engine (soft delete, SetNull attribution
-- FKs, partial unique indexes for live-row uniqueness).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
CREATE TYPE "FolderTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "FolderNodeVisibility" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "FolderNodeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "FolderAssignmentTargetType" AS ENUM ('UNIVERSITY', 'COLLEGE', 'DEPARTMENT', 'PROGRAM', 'OFFICE', 'AACCUP_AREA');
CREATE TYPE "FolderTemplateChangeType" AS ENUM ('CREATED', 'UPDATED', 'ASSIGNED', 'ARCHIVED', 'RESTORED', 'ROLLED_BACK');

-- -----------------------------------------------------------------------------
-- folder_templates
-- -----------------------------------------------------------------------------
CREATE TABLE "folder_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "status" "FolderTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "icon" TEXT,
  "color" TEXT,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "folder_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "folder_templates_code_key" ON "folder_templates"("code");
CREATE INDEX "folder_templates_deletedAt_idx" ON "folder_templates"("deletedAt");
CREATE INDEX "folder_templates_status_idx" ON "folder_templates"("status");
-- One live template name only (duplicate-name prevention across the catalog).
CREATE UNIQUE INDEX "folder_templates_live_name_key" ON "folder_templates"("name") WHERE "deletedAt" IS NULL;

-- -----------------------------------------------------------------------------
-- folder_nodes
-- -----------------------------------------------------------------------------
CREATE TABLE "folder_nodes" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "metadata" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "icon" TEXT,
  "color" TEXT,
  "visibility" "FolderNodeVisibility" NOT NULL DEFAULT 'VISIBLE',
  "status" "FolderNodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "level" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "folder_nodes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "folder_nodes_templateId_idx" ON "folder_nodes"("templateId");
CREATE INDEX "folder_nodes_templateId_parentId_idx" ON "folder_nodes"("templateId", "parentId");
CREATE INDEX "folder_nodes_templateId_level_idx" ON "folder_nodes"("templateId", "level");
CREATE INDEX "folder_nodes_templateId_deletedAt_idx" ON "folder_nodes"("templateId", "deletedAt");
-- Prisma-level @@unique([templateId, parentId, name]) plus a partial unique
-- for live rows (Postgres treats NULLs as distinct, so root-level duplicates
-- would otherwise slip past the composite constraint).
CREATE UNIQUE INDEX "folder_nodes_live_unique_key" ON "folder_nodes"("templateId", COALESCE("parentId", '00000000-0000-0000-0000-000000000000'), "name") WHERE "deletedAt" IS NULL;

-- -----------------------------------------------------------------------------
-- folder_assignments
-- -----------------------------------------------------------------------------
CREATE TABLE "folder_assignments" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "targetType" "FolderAssignmentTargetType" NOT NULL,
  "targetId" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "folder_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "folder_assignments_targetType_targetId_key" ON "folder_assignments"("targetType", "targetId");
-- One LIVE assignment per target: a re-assignment replaces rather than stacks.
CREATE UNIQUE INDEX "folder_assignments_live_target_key" ON "folder_assignments"("targetType", COALESCE("targetId", '00000000-0000-0000-0000-000000000000')) WHERE "deletedAt" IS NULL;
CREATE INDEX "folder_assignments_templateId_idx" ON "folder_assignments"("templateId");
CREATE INDEX "folder_assignments_targetType_idx" ON "folder_assignments"("targetType");

-- -----------------------------------------------------------------------------
-- folder_versions
-- -----------------------------------------------------------------------------
CREATE TABLE "folder_versions" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "changeType" "FolderTemplateChangeType" NOT NULL DEFAULT 'CREATED',
  "data" JSONB NOT NULL,
  "changeNote" TEXT,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "folder_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "folder_versions_templateId_version_key" ON "folder_versions"("templateId", "version");
CREATE INDEX "folder_versions_templateId_idx" ON "folder_versions"("templateId");
CREATE INDEX "folder_versions_createdAt_idx" ON "folder_versions"("createdAt");

-- -----------------------------------------------------------------------------
-- folder_histories
-- -----------------------------------------------------------------------------
CREATE TABLE "folder_histories" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "action" "FolderTemplateChangeType" NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "versionFrom" INTEGER,
  "versionTo" INTEGER,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "folder_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "folder_histories_templateId_idx" ON "folder_histories"("templateId");
CREATE INDEX "folder_histories_templateId_createdAt_idx" ON "folder_histories"("templateId", "createdAt");
CREATE INDEX "folder_histories_actorId_idx" ON "folder_histories"("actorId");

-- -----------------------------------------------------------------------------
-- Foreign keys
-- -----------------------------------------------------------------------------
ALTER TABLE "folder_nodes" ADD CONSTRAINT "folder_nodes_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "folder_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_nodes" ADD CONSTRAINT "folder_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folder_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_nodes" ADD CONSTRAINT "folder_nodes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_nodes" ADD CONSTRAINT "folder_nodes_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_templates" ADD CONSTRAINT "folder_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_templates" ADD CONSTRAINT "folder_templates_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_assignments" ADD CONSTRAINT "folder_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "folder_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_assignments" ADD CONSTRAINT "folder_assignments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_versions" ADD CONSTRAINT "folder_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "folder_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_versions" ADD CONSTRAINT "folder_versions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_histories" ADD CONSTRAINT "folder_histories_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "folder_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_histories" ADD CONSTRAINT "folder_histories_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
