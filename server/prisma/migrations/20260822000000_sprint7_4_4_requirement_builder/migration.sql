-- =============================================================================
-- Sprint 7.4.4 - Dynamic Requirement Builder
-- =============================================================================

CREATE TYPE "RequirementTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RequirementNodeType" AS ENUM ('SECTION', 'REQUIREMENT', 'SUB_REQUIREMENT', 'SUPPORTING_DOCUMENT');
CREATE TYPE "RequirementNodeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RequirementAssignmentTargetType" AS ENUM ('UNIVERSITY', 'COLLEGE', 'DEPARTMENT', 'PROGRAM', 'OFFICE', 'AACCUP_AREA', 'ACCREDITATION_CYCLE');
CREATE TYPE "RequirementChangeType" AS ENUM ('CREATED', 'UPDATED', 'ASSIGNED', 'ARCHIVED', 'RESTORED', 'ROLLED_BACK');
CREATE TYPE "RequirementValidationType" AS ENUM ('FILE_TYPE', 'FILE_SIZE', 'PAGE_COUNT', 'EXPIRATION_DATE', 'NAMING_CONVENTION', 'METADATA');
CREATE TYPE "RequirementValidationSeverity" AS ENUM ('ERROR', 'WARNING');
CREATE TYPE "AccreditationCycleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "accreditation_cycles" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "AccreditationCycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "accreditation_cycles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accreditation_cycles_code_key" ON "accreditation_cycles"("code");
CREATE INDEX "accreditation_cycles_status_idx" ON "accreditation_cycles"("status");
CREATE INDEX "accreditation_cycles_startDate_endDate_idx" ON "accreditation_cycles"("startDate", "endDate");
CREATE INDEX "accreditation_cycles_deletedAt_idx" ON "accreditation_cycles"("deletedAt");
CREATE UNIQUE INDEX "accreditation_cycles_live_name_key" ON "accreditation_cycles"("name") WHERE "deletedAt" IS NULL;

CREATE TABLE "requirement_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "metadata" JSONB,
  "status" "RequirementTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "requirement_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_templates_code_key" ON "requirement_templates"("code");
CREATE UNIQUE INDEX "requirement_templates_live_name_key" ON "requirement_templates"("name") WHERE "deletedAt" IS NULL;
CREATE INDEX "requirement_templates_status_idx" ON "requirement_templates"("status");
CREATE INDEX "requirement_templates_category_idx" ON "requirement_templates"("category");
CREATE INDEX "requirement_templates_deletedAt_idx" ON "requirement_templates"("deletedAt");

CREATE TABLE "requirement_nodes" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "parentId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "helpText" TEXT,
  "type" "RequirementNodeType" NOT NULL DEFAULT 'REQUIREMENT',
  "metadata" JSONB,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 0,
  "status" "RequirementNodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "requirement_nodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_nodes_templateId_code_key" ON "requirement_nodes"("templateId", "code");
CREATE UNIQUE INDEX "requirement_nodes_live_sibling_name_key" ON "requirement_nodes"("templateId", COALESCE("parentId", '00000000-0000-0000-0000-000000000000'), "name") WHERE "deletedAt" IS NULL;
CREATE INDEX "requirement_nodes_templateId_idx" ON "requirement_nodes"("templateId");
CREATE INDEX "requirement_nodes_templateId_parentId_idx" ON "requirement_nodes"("templateId", "parentId");
CREATE INDEX "requirement_nodes_templateId_level_idx" ON "requirement_nodes"("templateId", "level");
CREATE INDEX "requirement_nodes_templateId_type_idx" ON "requirement_nodes"("templateId", "type");
CREATE INDEX "requirement_nodes_templateId_deletedAt_idx" ON "requirement_nodes"("templateId", "deletedAt");

CREATE TABLE "requirement_validations" (
  "id" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "type" "RequirementValidationType" NOT NULL,
  "config" JSONB NOT NULL,
  "message" TEXT,
  "severity" "RequirementValidationSeverity" NOT NULL DEFAULT 'ERROR',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "requirement_validations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_validations_nodeId_type_key" ON "requirement_validations"("nodeId", "type");
CREATE INDEX "requirement_validations_nodeId_idx" ON "requirement_validations"("nodeId");
CREATE INDEX "requirement_validations_type_idx" ON "requirement_validations"("type");
CREATE INDEX "requirement_validations_nodeId_deletedAt_idx" ON "requirement_validations"("nodeId", "deletedAt");

CREATE TABLE "requirement_assignments" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "targetType" "RequirementAssignmentTargetType" NOT NULL,
  "targetId" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "requirement_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_assignments_targetType_targetId_key" ON "requirement_assignments"("targetType", "targetId");
CREATE UNIQUE INDEX "requirement_assignments_live_target_key" ON "requirement_assignments"("targetType", COALESCE("targetId", '00000000-0000-0000-0000-000000000000')) WHERE "deletedAt" IS NULL;
CREATE INDEX "requirement_assignments_templateId_idx" ON "requirement_assignments"("templateId");
CREATE INDEX "requirement_assignments_targetType_idx" ON "requirement_assignments"("targetType");
CREATE INDEX "requirement_assignments_targetType_targetId_deletedAt_idx" ON "requirement_assignments"("targetType", "targetId", "deletedAt");

CREATE TABLE "requirement_versions" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "changeType" "RequirementChangeType" NOT NULL DEFAULT 'CREATED',
  "data" JSONB NOT NULL,
  "changeNote" TEXT,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "requirement_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_versions_templateId_version_key" ON "requirement_versions"("templateId", "version");
CREATE INDEX "requirement_versions_templateId_idx" ON "requirement_versions"("templateId");
CREATE INDEX "requirement_versions_createdAt_idx" ON "requirement_versions"("createdAt");

CREATE TABLE "requirement_histories" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "action" "RequirementChangeType" NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "versionFrom" INTEGER,
  "versionTo" INTEGER,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "requirement_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "requirement_histories_templateId_idx" ON "requirement_histories"("templateId");
CREATE INDEX "requirement_histories_templateId_createdAt_idx" ON "requirement_histories"("templateId", "createdAt");
CREATE INDEX "requirement_histories_actorId_idx" ON "requirement_histories"("actorId");

ALTER TABLE "documents" ADD COLUMN "metadata" JSONB;
ALTER TABLE "aaccup_areas" ADD COLUMN "accreditationCycleId" TEXT;
ALTER TABLE "aaccup_requirements" ADD COLUMN "sourceNodeId" TEXT;
ALTER TABLE "aaccup_requirements" ADD COLUMN "sourceAssignmentId" TEXT;
ALTER TABLE "aaccup_requirements" ADD COLUMN "sourceTemplateVersion" INTEGER;

CREATE INDEX "aaccup_areas_accreditationCycleId_idx" ON "aaccup_areas"("accreditationCycleId");
CREATE UNIQUE INDEX "aaccup_requirements_areaId_sourceNodeId_key" ON "aaccup_requirements"("areaId", "sourceNodeId");
CREATE INDEX "aaccup_requirements_sourceNodeId_idx" ON "aaccup_requirements"("sourceNodeId");
CREATE INDEX "aaccup_requirements_sourceAssignmentId_idx" ON "aaccup_requirements"("sourceAssignmentId");

ALTER TABLE "accreditation_cycles" ADD CONSTRAINT "accreditation_cycles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accreditation_cycles" ADD CONSTRAINT "accreditation_cycles_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_templates" ADD CONSTRAINT "requirement_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_templates" ADD CONSTRAINT "requirement_templates_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_nodes" ADD CONSTRAINT "requirement_nodes_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "requirement_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requirement_nodes" ADD CONSTRAINT "requirement_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "requirement_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requirement_nodes" ADD CONSTRAINT "requirement_nodes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_nodes" ADD CONSTRAINT "requirement_nodes_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_validations" ADD CONSTRAINT "requirement_validations_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "requirement_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requirement_validations" ADD CONSTRAINT "requirement_validations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_validations" ADD CONSTRAINT "requirement_validations_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_assignments" ADD CONSTRAINT "requirement_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "requirement_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requirement_assignments" ADD CONSTRAINT "requirement_assignments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_versions" ADD CONSTRAINT "requirement_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "requirement_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requirement_versions" ADD CONSTRAINT "requirement_versions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requirement_histories" ADD CONSTRAINT "requirement_histories_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "requirement_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requirement_histories" ADD CONSTRAINT "requirement_histories_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "aaccup_areas" ADD CONSTRAINT "aaccup_areas_accreditationCycleId_fkey" FOREIGN KEY ("accreditationCycleId") REFERENCES "accreditation_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "aaccup_requirements" ADD CONSTRAINT "aaccup_requirements_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "requirement_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "aaccup_requirements" ADD CONSTRAINT "aaccup_requirements_sourceAssignmentId_fkey" FOREIGN KEY ("sourceAssignmentId") REFERENCES "requirement_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
