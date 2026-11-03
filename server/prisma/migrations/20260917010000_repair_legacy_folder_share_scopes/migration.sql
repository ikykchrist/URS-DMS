-- The Department-to-Program cutover added programId to folder shares but left
-- the legacy enum label on existing rows. Prisma's current FolderShare enum
-- intentionally accepts only USER and PROGRAM, so normalize every recoverable
-- legacy grant before application reads it.
UPDATE "folder_shares"
SET "recipientType" = 'PROGRAM'
WHERE "recipientType" = 'DEPARTMENT'
  AND "programId" IS NOT NULL;

-- A legacy share without a Program cannot be mapped after Department removal.
-- It was already inaccessible under the canonical model, so remove it rather
-- than leaving an invalid enum value that can break share-list queries.
DELETE FROM "folder_shares"
WHERE "recipientType" = 'DEPARTMENT'
  AND "programId" IS NULL;
