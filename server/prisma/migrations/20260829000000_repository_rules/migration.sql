-- =============================================================================
-- Repository Rules 1-30 — notification events + persisted background copy jobs
-- -----------------------------------------------------------------------------
-- 1. NotificationType enum gains repository-rule events (upload failed,
--    delivery, return, recycle-bin cleanup, storage warning). ALTER TYPE
--    ADD VALUE cannot run inside a transaction block on older PG; the
--    engine runs this file statement-by-statement.
-- 2. `repository_copy_jobs` — persisted async folder-copy jobs so large
--    copies (>= 1000 items) never freeze the request or the browser.
-- =============================================================================

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_UPLOAD_FAILED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_DELIVERED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_RETURNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AACCUP_SUBMISSION_RETURNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RECYCLE_BIN_CLEANUP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STORAGE_WARNING';

CREATE TYPE "RepositoryCopyJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "repository_copy_jobs" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "sourceFolderId" TEXT,
    "targetParentId" TEXT,
    "conflictMode" TEXT NOT NULL DEFAULT 'keep_both',
    "status" "RepositoryCopyJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "resultFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "repository_copy_jobs_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "repository_copy_jobs" ADD CONSTRAINT "repository_copy_jobs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_copy_jobs" ADD CONSTRAINT "repository_copy_jobs_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_copy_jobs" ADD CONSTRAINT "repository_copy_jobs_sourceFolderId_fkey" FOREIGN KEY ("sourceFolderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repository_copy_jobs" ADD CONSTRAINT "repository_copy_jobs_targetParentId_fkey" FOREIGN KEY ("targetParentId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "repository_copy_jobs_ownerId_status_idx" ON "repository_copy_jobs"("ownerId", "status");
