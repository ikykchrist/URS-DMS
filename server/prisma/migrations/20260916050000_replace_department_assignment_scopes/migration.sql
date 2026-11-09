-- Replace Department assignment scopes with Program scopes.
-- Existing department assignment rows are mapped to the Unassigned Program
-- created for that department's Campus + College by the prior migration.

ALTER TABLE "folder_assignments" ALTER COLUMN "targetType" TYPE text USING "targetType"::text;
ALTER TABLE "requirement_assignments" ALTER COLUMN "targetType" TYPE text USING "targetType"::text;
ALTER TABLE "workflow_assignments" ALTER COLUMN "targetType" TYPE text USING "targetType"::text;

UPDATE "folder_assignments" AS fa
SET "targetType" = 'PROGRAM',
    "targetId" = COALESCE(
      (SELECT p."id" FROM "programs" p
       WHERE p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)),
      (SELECT p."id" FROM "programs" p WHERE p."code" = 'UNASSIGNED-PROGRAM' LIMIT 1)
    )
FROM "departments" AS d
WHERE fa."targetType" = 'DEPARTMENT' AND fa."targetId" = d."id";

UPDATE "requirement_assignments" AS ra
SET "targetType" = 'PROGRAM',
    "targetId" = COALESCE(
      (SELECT p."id" FROM "programs" p
       WHERE p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)),
      (SELECT p."id" FROM "programs" p WHERE p."code" = 'UNASSIGNED-PROGRAM' LIMIT 1)
    )
FROM "departments" AS d
WHERE ra."targetType" = 'DEPARTMENT' AND ra."targetId" = d."id";

UPDATE "workflow_assignments" AS wa
SET "targetType" = 'PROGRAM',
    "targetId" = COALESCE(
      (SELECT p."id" FROM "programs" p
       WHERE p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)),
      (SELECT p."id" FROM "programs" p WHERE p."code" = 'UNASSIGNED-PROGRAM' LIMIT 1)
    )
FROM "departments" AS d
WHERE wa."targetType" = 'DEPARTMENT' AND wa."targetId" = d."id";

ALTER TYPE "FolderAssignmentTargetType" RENAME TO "FolderAssignmentTargetType_old";
CREATE TYPE "FolderAssignmentTargetType" AS ENUM ('UNIVERSITY', 'CAMPUS', 'COLLEGE', 'PROGRAM', 'OFFICE', 'AACCUP_AREA');
ALTER TABLE "folder_assignments" ALTER COLUMN "targetType" TYPE "FolderAssignmentTargetType"
  USING "targetType"::"FolderAssignmentTargetType";
DROP TYPE "FolderAssignmentTargetType_old";

ALTER TYPE "RequirementAssignmentTargetType" RENAME TO "RequirementAssignmentTargetType_old";
CREATE TYPE "RequirementAssignmentTargetType" AS ENUM ('UNIVERSITY', 'CAMPUS', 'COLLEGE', 'PROGRAM', 'OFFICE', 'AACCUP_AREA', 'ACCREDITATION_CYCLE');
ALTER TABLE "requirement_assignments" ALTER COLUMN "targetType" TYPE "RequirementAssignmentTargetType"
  USING "targetType"::"RequirementAssignmentTargetType";
ALTER TABLE "workflow_assignments" ALTER COLUMN "targetType" TYPE "RequirementAssignmentTargetType"
  USING "targetType"::"RequirementAssignmentTargetType";
DROP TYPE "RequirementAssignmentTargetType_old";
