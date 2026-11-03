-- Requirement/task workflow: accreditation-set ownership, shared task provenance,
-- approval-gated completion, and idempotent deadline reminders.

ALTER TYPE "AaccupTaskStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REVISION';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AACCUP_TASK_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AACCUP_TASK_DUE_IN_3_DAYS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AACCUP_TASK_DUE_TOMORROW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AACCUP_TASK_DUE_TODAY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AACCUP_TASK_OVERDUE';

ALTER TABLE "requirement_templates"
  ADD COLUMN "areaSet" "AreaSet" NOT NULL DEFAULT 'AACCUP';

UPDATE "requirement_templates"
SET "areaSet" = 'ISO'
WHERE UPPER(COALESCE("category", '')) = 'ISO';

ALTER TABLE "requirement_assignments"
  ADD COLUMN "dueDate" TIMESTAMP(3);

ALTER TABLE "aaccup_tasks"
  ADD COLUMN "sourceAssignmentId" TEXT;

CREATE INDEX "aaccup_tasks_sourceAssignmentId_idx"
  ON "aaccup_tasks"("sourceAssignmentId");

ALTER TABLE "aaccup_tasks"
  ADD CONSTRAINT "aaccup_tasks_sourceAssignmentId_fkey"
  FOREIGN KEY ("sourceAssignmentId") REFERENCES "requirement_assignments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "aaccup_task_reminders" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reminderKey" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "aaccup_task_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aaccup_task_reminders_taskId_userId_reminderKey_key"
  ON "aaccup_task_reminders"("taskId", "userId", "reminderKey");
CREATE INDEX "aaccup_task_reminders_taskId_idx"
  ON "aaccup_task_reminders"("taskId");
CREATE INDEX "aaccup_task_reminders_userId_sentAt_idx"
  ON "aaccup_task_reminders"("userId", "sentAt");

ALTER TABLE "aaccup_task_reminders"
  ADD CONSTRAINT "aaccup_task_reminders_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "aaccup_tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aaccup_task_reminders"
  ADD CONSTRAINT "aaccup_task_reminders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
