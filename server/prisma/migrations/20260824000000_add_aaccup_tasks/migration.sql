-- =============================================================================
-- AACCUP tasks — assignable work items attached to accreditation areas
-- -----------------------------------------------------------------------------
-- Admins / QAOs create tasks against an area and assign them to an ACTIVE
-- user (assigneeType = 'USER') or a whole department (assigneeType =
-- 'DEPARTMENT'). assigneeId stores the raw target id; assigneeLabel keeps a
-- denormalized display snapshot so the task list stays readable even if the
-- assignee is later archived. Foreign keys are intentionally omitted on the
-- assignee columns (snapshot semantics); the area FK cascades so archived
-- areas drag their tasks along (areas are soft-deleted, so this only fires
-- on hard deletion).
-- =============================================================================

-- Task lifecycle + priority enums
CREATE TYPE "AaccupTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AaccupTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Task table
CREATE TABLE "aaccup_tasks" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT DEFAULT 'documentation',
    "priority" "AaccupTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "AaccupTaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "assigneeType" TEXT NOT NULL DEFAULT 'USER',
    "assigneeId" TEXT,
    "assigneeLabel" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "aaccup_tasks_pkey" PRIMARY KEY ("id")
);

-- Area cascade (hard delete of an area removes its tasks)
ALTER TABLE "aaccup_tasks"
    ADD CONSTRAINT "aaccup_tasks_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "aaccup_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Creator / updater audit FKs
ALTER TABLE "aaccup_tasks"
    ADD CONSTRAINT "aaccup_tasks_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "aaccup_tasks"
    ADD CONSTRAINT "aaccup_tasks_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Listing indexes
CREATE INDEX "aaccup_tasks_areaId_idx" ON "aaccup_tasks"("areaId");
CREATE INDEX "aaccup_tasks_assigneeType_assigneeId_idx" ON "aaccup_tasks"("assigneeType", "assigneeId");
CREATE INDEX "aaccup_tasks_status_idx" ON "aaccup_tasks"("status");
CREATE INDEX "aaccup_tasks_dueDate_idx" ON "aaccup_tasks"("dueDate");
CREATE INDEX "aaccup_tasks_deletedAt_idx" ON "aaccup_tasks"("deletedAt");
