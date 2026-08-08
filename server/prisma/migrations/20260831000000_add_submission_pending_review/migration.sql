-- URS-DMS — notify reviewers when a submission is created (AACCUP_SUBMISSION_PENDING_REVIEW)
-- Applied manually via `prisma db execute` (shadow-database replay blocked by a
-- pre-existing migration-history issue).

ALTER TYPE "NotificationType" ADD VALUE 'AACCUP_SUBMISSION_PENDING_REVIEW';
