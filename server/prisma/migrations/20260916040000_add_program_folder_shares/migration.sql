-- Folder shares now support the canonical Program recipient scope. Legacy
-- department shares are copied to the corresponding migrated fallback
-- program; the old columns remain until the final department cleanup.
ALTER TYPE "FolderShareRecipientType" ADD VALUE IF NOT EXISTS 'PROGRAM';
ALTER TABLE "folder_shares" ADD COLUMN "programId" TEXT;

UPDATE "folder_shares" fs
SET "programId" = p."id"
FROM "departments" d
JOIN "programs" p ON p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)
WHERE fs."departmentId" = d."id" AND fs."programId" IS NULL;

CREATE UNIQUE INDEX "folder_shares_folderId_programId_key" ON "folder_shares"("folderId", "programId");
CREATE INDEX "folder_shares_programId_idx" ON "folder_shares"("programId");
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
