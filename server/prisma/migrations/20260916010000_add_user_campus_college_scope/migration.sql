-- Add the explicit Campus → College scope required by the admin user surface.
-- Existing department-scoped users are backfilled from their department's
-- campus/college. departmentId remains temporarily for the compatibility
-- phase; it is removed only by the final department-removal migration after
-- every dependent module has switched to the new scope.

ALTER TABLE "users" ADD COLUMN "campusId" TEXT;
ALTER TABLE "users" ADD COLUMN "collegeId" TEXT;

UPDATE "users" u
SET "campusId" = d."campusId",
    "collegeId" = d."collegeId"
FROM "departments" d
WHERE u."departmentId" = d."id"
  AND (u."campusId" IS NULL OR u."collegeId" IS NULL);

CREATE INDEX "users_campusId_idx" ON "users"("campusId");
CREATE INDEX "users_collegeId_idx" ON "users"("collegeId");

ALTER TABLE "users"
  ADD CONSTRAINT "users_campusId_fkey"
  FOREIGN KEY ("campusId") REFERENCES "campuses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_collegeId_fkey"
  FOREIGN KEY ("collegeId") REFERENCES "colleges"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
