-- URS-DMS — AACCUP task submission linkage (Sprint)
-- 1. Notify assignees when a task is created (AACCUP_TASK_ASSIGNED).
-- 2. Submissions may reference the AACCUP task they fulfil (taskId).
-- Applied manually via `prisma db execute` on the live DB; the shadow-
-- database replay is blocked by a pre-existing migration-history issue.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AACCUP_TASK_ASSIGNED';

-- AlterTable
ALTER TABLE "aaccup_submissions" ADD COLUMN "taskId" TEXT;

-- CreateIndex
CREATE INDEX "aaccup_submissions_taskId_idx" ON "aaccup_submissions"("taskId");

-- AddForeignKey
ALTER TABLE "aaccup_submissions" ADD CONSTRAINT "aaccup_submissions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "aaccup_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
