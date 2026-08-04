-- =============================================================================
-- Sprint 7.4.5 — Dynamic Workflow Builder
-- -----------------------------------------------------------------------------
-- Additive migration: ROOT-authored, versioned, validated/published workflow
-- definitions that control real runtime behavior (AACCUP submissions,
-- document requests, documents) via instances / step instances / actions.
--
-- Design notes:
--   * Published workflow versions are immutable snapshots stored in
--     workflow_versions; publishing bumps workflow_definitions.version.
--   * Assignments reuse the requirement target-scope universe
--     (UNIVERSITY..ACCREDITATION_CYCLE) and resolve by specificity →
--     priority → newest effective (workflow.engine.ts). Duplicate assignment
--     of the same definition to the same scope is impossible via the partial
--     unique (definitionId, targetType, targetId) where deletedAt IS NULL.
--   * Runtime rows are never soft-deleted: workflow_instances carry a partial
--     unique (entityType, entityId) — one live workflow per business entity.
-- =============================================================================

-- CreateEnum
CREATE TYPE "WorkflowDefinitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowEntityType" AS ENUM ('DOCUMENT_REQUEST', 'AACCUP_SUBMISSION', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('START', 'TASK', 'REVIEW', 'APPROVAL', 'END');

-- CreateEnum
CREATE TYPE "WorkflowStepStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WorkflowChangeType" AS ENUM ('CREATED', 'UPDATED', 'VALIDATED', 'PUBLISHED', 'ASSIGNED', 'UNASSIGNED', 'ARCHIVED', 'RESTORED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('RUNNING', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WorkflowStepInstanceStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" "WorkflowEntityType" NOT NULL,
    "status" "WorkflowDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkflowStepType" NOT NULL DEFAULT 'TASK',
    "roleName" TEXT,
    "permissionCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "status" "WorkflowStepStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT NOT NULL,
    "actionCode" TEXT NOT NULL,
    "requiredPermission" TEXT,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_assignments" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "targetType" "RequirementAssignmentTargetType" NOT NULL,
    "targetId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "workflow_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeType" "WorkflowChangeType" NOT NULL DEFAULT 'CREATED',
    "data" JSONB NOT NULL,
    "changeNote" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_histories" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "action" "WorkflowChangeType" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "versionFrom" INTEGER,
    "versionTo" INTEGER,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "entityType" "WorkflowEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'RUNNING',
    "currentStepCode" TEXT,
    "data" JSONB,
    "startedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_instances" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepCode" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepType" "WorkflowStepType" NOT NULL,
    "status" "WorkflowStepInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "actorId" TEXT,
    "note" TEXT,
    CONSTRAINT "workflow_step_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_actions" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepCode" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepType" "WorkflowStepType" NOT NULL,
    "actionCode" TEXT NOT NULL,
    "fromStepCode" TEXT,
    "toStepCode" TEXT,
    "actorId" TEXT,
    "note" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");
CREATE INDEX "workflow_definitions_status_idx" ON "workflow_definitions"("status");
CREATE INDEX "workflow_definitions_entityType_idx" ON "workflow_definitions"("entityType");
CREATE INDEX "workflow_definitions_deletedAt_idx" ON "workflow_definitions"("deletedAt");

CREATE UNIQUE INDEX "workflow_steps_definitionId_code_key" ON "workflow_steps"("definitionId", "code");
CREATE INDEX "workflow_steps_definitionId_idx" ON "workflow_steps"("definitionId");
CREATE INDEX "workflow_steps_definitionId_type_idx" ON "workflow_steps"("definitionId", "type");
CREATE INDEX "workflow_steps_definitionId_deletedAt_idx" ON "workflow_steps"("definitionId", "deletedAt");

CREATE UNIQUE INDEX "workflow_transitions_definitionId_fromStepId_actionCode_key" ON "workflow_transitions"("definitionId", "fromStepId", "actionCode");
CREATE INDEX "workflow_transitions_definitionId_idx" ON "workflow_transitions"("definitionId");
CREATE INDEX "workflow_transitions_definitionId_toStepId_idx" ON "workflow_transitions"("definitionId", "toStepId");
CREATE INDEX "workflow_transitions_definitionId_deletedAt_idx" ON "workflow_transitions"("definitionId", "deletedAt");

CREATE INDEX "workflow_assignments_targetType_targetId_idx" ON "workflow_assignments"("targetType", "targetId");
CREATE INDEX "workflow_assignments_definitionId_idx" ON "workflow_assignments"("definitionId");
CREATE UNIQUE INDEX "workflow_assignments_definitionId_targetType_targetId_active" ON "workflow_assignments"("definitionId", "targetType", "targetId") WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "workflow_versions_definitionId_version_key" ON "workflow_versions"("definitionId", "version");
CREATE INDEX "workflow_versions_definitionId_idx" ON "workflow_versions"("definitionId");
CREATE INDEX "workflow_versions_createdAt_idx" ON "workflow_versions"("createdAt");

CREATE INDEX "workflow_histories_definitionId_idx" ON "workflow_histories"("definitionId");
CREATE INDEX "workflow_histories_definitionId_createdAt_idx" ON "workflow_histories"("definitionId", "createdAt");
CREATE INDEX "workflow_histories_actorId_idx" ON "workflow_histories"("actorId");

CREATE UNIQUE INDEX "workflow_instances_entityType_entityId_key" ON "workflow_instances"("entityType", "entityId");
CREATE INDEX "workflow_instances_definitionId_idx" ON "workflow_instances"("definitionId");
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");

CREATE UNIQUE INDEX "workflow_step_instances_instanceId_stepCode_key" ON "workflow_step_instances"("instanceId", "stepCode");
CREATE INDEX "workflow_step_instances_instanceId_idx" ON "workflow_step_instances"("instanceId");

CREATE INDEX "workflow_actions_instanceId_idx" ON "workflow_actions"("instanceId");
CREATE INDEX "workflow_actions_instanceId_createdAt_idx" ON "workflow_actions"("instanceId", "createdAt");
CREATE INDEX "workflow_actions_actorId_idx" ON "workflow_actions"("actorId");

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_assignments" ADD CONSTRAINT "workflow_assignments_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_assignments" ADD CONSTRAINT "workflow_assignments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_histories" ADD CONSTRAINT "workflow_histories_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_histories" ADD CONSTRAINT "workflow_histories_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_step_instances" ADD CONSTRAINT "workflow_step_instances_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_step_instances" ADD CONSTRAINT "workflow_step_instances_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
