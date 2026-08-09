ALTER TABLE "audit_logs"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'INFO',
  ADD COLUMN "result" TEXT NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN "actorName" TEXT,
  ADD COLUMN "actorRole" TEXT,
  ADD COLUMN "actorOrganization" TEXT,
  ADD COLUMN "targetType" TEXT,
  ADD COLUMN "targetId" TEXT,
  ADD COLUMN "targetName" TEXT,
  ADD COLUMN "correlationId" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");
CREATE INDEX "audit_logs_result_idx" ON "audit_logs"("result");
CREATE INDEX "audit_logs_target_type_id_idx" ON "audit_logs"("targetType", "targetId");

CREATE TABLE "audit_archives" (
  "id" TEXT NOT NULL,
  "dateRangeFrom" TIMESTAMP(3) NOT NULL,
  "dateRangeTo" TIMESTAMP(3) NOT NULL,
  "recordCount" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'json',
  "objectKey" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "audit_archives_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "system_settings"
  ADD COLUMN "auditRetentionYears" INTEGER NOT NULL DEFAULT 5;
