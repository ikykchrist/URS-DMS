-- Remove the retired Department organization scope after the preceding
-- migrations have copied all usable scope data to Campus/College/Program.
-- This migration is intentionally not run automatically against a live DB.

ALTER TYPE "FormAssignmentTargetType" RENAME TO "FormAssignmentTargetType_old";
CREATE TYPE "FormAssignmentTargetType" AS ENUM (
  'REQUIREMENT_TEMPLATE', 'WORKFLOW_STEP', 'AACCUP_AREA', 'FOLDER_TEMPLATE',
  'UNIVERSITY', 'CAMPUS', 'COLLEGE', 'PROGRAM'
);
ALTER TABLE "form_assignments" ALTER COLUMN "targetType" TYPE "FormAssignmentTargetType"
  USING "targetType"::text::"FormAssignmentTargetType";
DROP TYPE "FormAssignmentTargetType_old";

ALTER TABLE "users" DROP COLUMN IF EXISTS "departmentId";
ALTER TABLE "folders" DROP COLUMN IF EXISTS "departmentId";
ALTER TABLE "folder_shares" DROP COLUMN IF EXISTS "departmentId";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "departmentId";
ALTER TABLE "aaccup_areas" DROP COLUMN IF EXISTS "departmentId";
ALTER TABLE "offices" DROP COLUMN IF EXISTS "departmentId";
ALTER TABLE "programs" DROP COLUMN IF EXISTS "departmentId";

DROP TABLE IF EXISTS "_UserDepartment";
DROP TABLE IF EXISTS "departments";

-- Legacy assignment rows are converted by 20260916050000 before their enums
-- are replaced; this removes any remaining Department assignment value from
-- the database contract.
