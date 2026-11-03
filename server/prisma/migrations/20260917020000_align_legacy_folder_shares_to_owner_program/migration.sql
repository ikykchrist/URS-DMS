-- Legacy Department shares were first copied to fallback Unassigned Programs.
-- Personal folder sharing now follows the owner's current Program, so align
-- only those fallback grants with the owner's canonical Program assignment.
UPDATE "folder_shares" AS fs
SET "programId" = owner."programId"
FROM "folders" AS folder
JOIN "users" AS owner ON owner."id" = folder."ownerId"
, "programs" AS shared_program
WHERE fs."folderId" = folder."id"
  AND shared_program."id" = fs."programId"
  AND fs."recipientType" = 'PROGRAM'
  AND shared_program."code" LIKE 'UNASSIGNED-%'
  AND owner."programId" IS NOT NULL
  AND owner."programId" <> fs."programId";
