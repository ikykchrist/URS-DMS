-- =============================================================================
-- Sprint 7.2 — Notifications Backend
-- -----------------------------------------------------------------------------
-- Adds:
--   * enum `NotificationType` — six event kinds emitted by the existing
--     document / request / aaccup-submission flows. The enum is closed; new
--     kinds land as a new value + a new dispatch branch.
--   * table `notifications` — append-only per-user inbox row. Carries:
--       userId  (FK→users, cascade on user hard-delete)
--       type    (NotificationType enum)
--       title / message (human-readable)
--       entity / entityId (optional FK-shaped pointer to the source row —
--         the client uses this to deep-link into the relevant page)
--       readAt (NULL = unread, timestamp = read)
--       createdAt (defaulted, indexed for timeline ordering)
--
-- Indexes:
--   * userId                       — every inbox query filters by recipient.
--   * (userId, readAt)             — the bell-badge "unread count" path is the
--                                    hot read; the partial index on readAt =
--                                    NULL would be ideal but Prisma's
--                                    WhereInput has no partialUnique, so a
--                                    composite covers the same access pattern
--                                    without the partial-index DDL escape.
--   * createdAt                    — global timeline / purge ordering.
--
-- No existing column / row is altered, so the migration is safe to apply on
-- a populated DB. It sorts AFTER 20260817000000_sprint7_2_admin_user_role_
-- management alphabetically, preserving the timestamp ordering Prisma
-- expects.
-- =============================================================================

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'DOCUMENT_SHARED',
  'DOCUMENT_VERSION_ADDED',
  'REQUEST_CREATED',
  'REQUEST_DECIDED',
  'REQUEST_FULFILLED',
  'AACCUP_SUBMISSION_REVIEWED'
);

-- CreateTable
CREATE TABLE "notifications" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "NotificationType" NOT NULL,
  "title"     TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "entity"    TEXT,
  "entityId"  TEXT,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_idx"          ON "notifications"("userId");
CREATE INDEX "notifications_userId_readAt_idx"   ON "notifications"("userId", "readAt");
CREATE INDEX "notifications_createdAt_idx"       ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
