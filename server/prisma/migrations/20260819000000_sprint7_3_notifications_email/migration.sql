-- =============================================================================
-- Sprint 7.3 — Notification & Email Service
-- -----------------------------------------------------------------------------
-- 1. Replaces the Sprint 7.2 `NotificationType` enum values with the definitive
--    Sprint 7.3 event catalog (11 kinds). The rename→recreate→cast→drop pattern
--    is safe on a populated table because the column value is coerced through
--    text; the old values no longer exist in the schema, and the table is empty
--    in practice (the notifications module ships with this sprint).
-- 2. Adds `NotificationPriority` (LOW/MEDIUM/HIGH) and the notification
--    columns: priority, actionUrl, metadata (JSONB), updatedAt, deletedAt
--    (recipient-owned soft delete).
-- 3. Adds index (userId, deletedAt) — every inbox query filters on both.
-- 4. Adds `EmailStatus` enum and the durable `email_messages` outbound-queue
--    table (at-least-once: persist first, then claim, deliver, settle).
--
-- No existing column or row is altered destructively; the migration is safe
-- to apply on a populated DB.
-- =============================================================================

-- 1. Replace NotificationType enum values -------------------------------------
ALTER TYPE "NotificationType" RENAME TO "NotificationType_legacy_7_3";

CREATE TYPE "NotificationType" AS ENUM (
  'DOCUMENT_UPLOADED',
  'DOCUMENT_APPROVED',
  'DOCUMENT_REJECTED',
  'REQUEST_SUBMITTED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'AACCUP_SUBMISSION_APPROVED',
  'AACCUP_SUBMISSION_REJECTED',
  'PASSWORD_RESET',
  'ROLE_CHANGED',
  'SYSTEM_ANNOUNCEMENT'
);

ALTER TABLE "notifications"
  ALTER COLUMN "type" TYPE "NotificationType" USING "type"::text::"NotificationType";

DROP TYPE "NotificationType_legacy_7_3";

-- 2. NotificationPriority enum + new notification columns --------------------
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "notifications"
  ADD COLUMN "priority"  "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "actionUrl" TEXT,
  ADD COLUMN "metadata"  JSONB,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- 3. Inbox index on (userId, deletedAt) ---------------------------------------
CREATE INDEX "notifications_userId_deletedAt_idx" ON "notifications"("userId", "deletedAt");

-- 4. EmailStatus enum + email_messages queue table ----------------------------
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

CREATE TABLE "email_messages" (
  "id"            TEXT NOT NULL,
  "to"            TEXT NOT NULL,
  "subject"       TEXT NOT NULL,
  "body"          TEXT NOT NULL,
  "provider"      TEXT NOT NULL,
  "status"        "EmailStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"      INTEGER NOT NULL DEFAULT 0,
  "maxAttempts"   INTEGER NOT NULL DEFAULT 3,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"        TIMESTAMP(3),
  CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_messages_status_nextAttemptAt_idx" ON "email_messages"("status", "nextAttemptAt");
CREATE INDEX "email_messages_createdAt_idx"             ON "email_messages"("createdAt");
