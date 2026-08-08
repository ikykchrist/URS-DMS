-- URS-DMS — Sprint 8.3 storage maintenance models
-- Additive persisted state for recycle-bin retention cleanup, orphaned MinIO
-- object detection/cleanup, consistency checks, and distributed job locking
-- (database-backed lock with expiry; no Redis dependency).
-- Applied manually via `prisma db execute` (shadow-database replay blocked by
-- a pre-existing migration-history issue).

-- CreateTable
CREATE TABLE "maintenance_jobs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggerSource" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "triggeredBy" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "totalScanned" INTEGER NOT NULL DEFAULT 0,
    "eligibleCount" INTEGER NOT NULL DEFAULT 0,
    "removedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "bytesReclaimed" BIGINT NOT NULL DEFAULT 0,
    "error" TEXT,
    "batchCursor" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_jobs_jobId_key" ON "maintenance_jobs"("jobId");

-- CreateIndex
CREATE INDEX "maintenance_jobs_jobType_status_idx" ON "maintenance_jobs"("jobType", "status");

-- CreateIndex
CREATE INDEX "maintenance_jobs_status_createdAt_idx" ON "maintenance_jobs"("status", "createdAt");

-- CreateTable
CREATE TABLE "maintenance_orphan_candidates" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'CANDIDATE',
    "removedAt" TIMESTAMP(3),
    "removedByJobId" TEXT,

    CONSTRAINT "maintenance_orphan_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_orphan_candidates_objectKey_key" ON "maintenance_orphan_candidates"("objectKey");

-- CreateIndex
CREATE INDEX "maintenance_orphan_candidates_status_firstSeenAt_idx" ON "maintenance_orphan_candidates"("status", "firstSeenAt");

-- CreateTable
CREATE TABLE "maintenance_locks" (
    "jobType" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockExpiresAt" TIMESTAMP(3) NOT NULL,
    "workerId" TEXT NOT NULL,

    CONSTRAINT "maintenance_locks_pkey" PRIMARY KEY ("jobType")
);
