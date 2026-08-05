-- =============================================================================
-- Sprint 7.4.6 — Dynamic Form Builder (ROOT-only authoring engine)
-- -----------------------------------------------------------------------------
-- Reusable, completely dynamic form templates: a template owns an ordered set
-- of fields (12 types, stored as enum), assignments to scopes, immutable
-- version snapshots, and an append-only history. Mutations bump the template
-- version and write a snapshot + history row in one transaction.
-- =============================================================================

-- Enums
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'DATE', 'TIME', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'MULTI_SELECT', 'FILE', 'SECTION');
CREATE TYPE "FormAssignmentTargetType" AS ENUM ('REQUIREMENT_TEMPLATE', 'WORKFLOW_STEP', 'AACCUP_AREA', 'FOLDER_TEMPLATE', 'UNIVERSITY');
CREATE TYPE "FormChangeType" AS ENUM ('CREATED', 'UPDATED', 'SAVED', 'PUBLISHED', 'DUPLICATED', 'ASSIGNED', 'UNASSIGNED', 'ARCHIVED', 'RESTORED', 'DELETED', 'ROLLED_BACK');

-- Templates
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "form_templates_code_key" ON "form_templates"("code");
CREATE INDEX "form_templates_status_idx" ON "form_templates"("status");
CREATE INDEX "form_templates_deletedAt_idx" ON "form_templates"("deletedAt");
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fields
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "description" TEXT,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "options" JSONB,
    "validation" JSONB,
    "helpText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "form_fields_templateId_key_key" ON "form_fields"("templateId", "key");
CREATE INDEX "form_fields_templateId_idx" ON "form_fields"("templateId");
CREATE INDEX "form_fields_templateId_sortOrder_idx" ON "form_fields"("templateId", "sortOrder");
CREATE INDEX "form_fields_templateId_deletedAt_idx" ON "form_fields"("templateId", "deletedAt");

-- Assignments
CREATE TABLE "form_assignments" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "targetType" "FormAssignmentTargetType" NOT NULL,
    "targetId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "form_assignments_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "form_assignments_templateId_targetType_targetId_key" ON "form_assignments"("templateId", "targetType", "targetId");
CREATE INDEX "form_assignments_targetType_targetId_idx" ON "form_assignments"("targetType", "targetId");
CREATE INDEX "form_assignments_templateId_idx" ON "form_assignments"("templateId");

-- Versions (immutable snapshots)
CREATE TABLE "form_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeType" "FormChangeType" NOT NULL DEFAULT 'CREATED',
    "data" JSONB NOT NULL,
    "changeNote" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "form_versions_templateId_version_key" ON "form_versions"("templateId", "version");
CREATE INDEX "form_versions_templateId_idx" ON "form_versions"("templateId");
CREATE INDEX "form_versions_createdAt_idx" ON "form_versions"("createdAt");

-- History (append-only)
CREATE TABLE "form_histories" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "action" "FormChangeType" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "versionFrom" INTEGER,
    "versionTo" INTEGER,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_histories_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "form_histories" ADD CONSTRAINT "form_histories_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_histories" ADD CONSTRAINT "form_histories_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "form_histories_templateId_idx" ON "form_histories"("templateId");
CREATE INDEX "form_histories_templateId_createdAt_idx" ON "form_histories"("templateId", "createdAt");
CREATE INDEX "form_histories_actorId_idx" ON "form_histories"("actorId");
