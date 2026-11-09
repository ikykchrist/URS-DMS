-- Move department-scoped records onto the explicit Campus → College → Program
-- hierarchy. This migration is intentionally additive. The old department
-- columns stay until the application has completed the final cutover.

ALTER TABLE "folders" ADD COLUMN "campusId" TEXT;
ALTER TABLE "folders" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "folders" ADD COLUMN "programId" TEXT;
ALTER TABLE "documents" ADD COLUMN "campusId" TEXT;
ALTER TABLE "documents" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "documents" ADD COLUMN "programId" TEXT;
ALTER TABLE "aaccup_areas" ADD COLUMN "campusId" TEXT;
ALTER TABLE "aaccup_areas" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "aaccup_areas" ADD COLUMN "programId" TEXT;

INSERT INTO "campuses" ("id", "name", "code", "description", "displayOrder", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Unassigned Campus', 'UNASSIGNED-CAMPUS', 'Fallback scope for legacy records without a campus.', 2147483647, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "colleges" ("id", "name", "code", "description", "displayOrder", "campusId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Unassigned College', 'UNASSIGNED-COLLEGE', 'Fallback scope for legacy records without a college.', 2147483647, c."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "campuses" c
WHERE c."code" = 'UNASSIGNED-CAMPUS'
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "programs" ("id", "name", "code", "description", "displayOrder", "level", "collegeId", "campusId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Unassigned Program', 'UNASSIGNED-PROGRAM', 'Fallback scope for legacy records without a program.', 2147483647, 'UNDERGRADUATE', cp."id", cp."campusId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "colleges" cp
JOIN "campuses" c ON c."id" = cp."campusId"
WHERE cp."code" = 'UNASSIGNED-COLLEGE'
ON CONFLICT ("code") DO NOTHING;

-- One deterministic fallback program per legacy department parent. Existing
-- programs are retained; only records that used a department scope are mapped.
INSERT INTO "programs" ("id", "name", "code", "description", "displayOrder", "level", "collegeId", "campusId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Unassigned Program',
       'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18),
       'Fallback program created while migrating legacy department scope.', 2147483646, 'UNDERGRADUATE',
       coalesce(d."collegeId", fallback_college."id"),
       coalesce(d."campusId", fallback_campus."id"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "departments" d
LEFT JOIN "colleges" fallback_college ON fallback_college."code" = 'UNASSIGNED-COLLEGE'
LEFT JOIN "campuses" fallback_campus ON fallback_campus."code" = 'UNASSIGNED-CAMPUS'
WHERE NOT EXISTS (
  SELECT 1 FROM "programs" p
  WHERE p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)
);

UPDATE "users" u
SET "campusId" = coalesce(d."campusId", fallback_campus."id"),
    "collegeId" = coalesce(d."collegeId", fallback_college."id"),
    "programId" = coalesce(u."programId", p."id")
FROM "departments" d
LEFT JOIN "campuses" fallback_campus ON fallback_campus."code" = 'UNASSIGNED-CAMPUS'
LEFT JOIN "colleges" fallback_college ON fallback_college."code" = 'UNASSIGNED-COLLEGE'
JOIN "programs" p ON p."code" = CASE WHEN d."campusId" IS NULL OR d."collegeId" IS NULL
  THEN 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)
  ELSE 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18) END
WHERE u."departmentId" = d."id";

UPDATE "folders" f
SET "campusId" = coalesce(d."campusId", fallback_campus."id"),
    "collegeId" = coalesce(d."collegeId", fallback_college."id"),
    "programId" = p."id"
FROM "departments" d
LEFT JOIN "campuses" fallback_campus ON fallback_campus."code" = 'UNASSIGNED-CAMPUS'
LEFT JOIN "colleges" fallback_college ON fallback_college."code" = 'UNASSIGNED-COLLEGE'
JOIN "programs" p ON p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)
WHERE f."departmentId" = d."id";

UPDATE "documents" f
SET "campusId" = coalesce(d."campusId", fallback_campus."id"),
    "collegeId" = coalesce(d."collegeId", fallback_college."id"),
    "programId" = p."id"
FROM "departments" d
LEFT JOIN "campuses" fallback_campus ON fallback_campus."code" = 'UNASSIGNED-CAMPUS'
LEFT JOIN "colleges" fallback_college ON fallback_college."code" = 'UNASSIGNED-COLLEGE'
JOIN "programs" p ON p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)
WHERE f."departmentId" = d."id";

UPDATE "aaccup_areas" a
SET "campusId" = coalesce(d."campusId", fallback_campus."id"),
    "collegeId" = coalesce(d."collegeId", fallback_college."id"),
    "programId" = p."id"
FROM "departments" d
LEFT JOIN "campuses" fallback_campus ON fallback_campus."code" = 'UNASSIGNED-CAMPUS'
LEFT JOIN "colleges" fallback_college ON fallback_college."code" = 'UNASSIGNED-COLLEGE'
JOIN "programs" p ON p."code" = 'UNASSIGNED-' || left(md5(coalesce(d."campusId", '') || ':' || coalesce(d."collegeId", '') || ':' || d."id"), 18)
WHERE a."departmentId" = d."id";

CREATE INDEX "folders_campusId_idx" ON "folders"("campusId");
CREATE INDEX "folders_collegeId_idx" ON "folders"("collegeId");
CREATE INDEX "folders_programId_idx" ON "folders"("programId");
CREATE INDEX "documents_campusId_idx" ON "documents"("campusId");
CREATE INDEX "documents_collegeId_idx" ON "documents"("collegeId");
CREATE INDEX "documents_programId_idx" ON "documents"("programId");
CREATE INDEX "aaccup_areas_campusId_idx" ON "aaccup_areas"("campusId");
CREATE INDEX "aaccup_areas_collegeId_idx" ON "aaccup_areas"("collegeId");
CREATE INDEX "aaccup_areas_programId_idx" ON "aaccup_areas"("programId");

ALTER TABLE "folders" ADD CONSTRAINT "folders_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "aaccup_areas" ADD CONSTRAINT "aaccup_areas_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "aaccup_areas" ADD CONSTRAINT "aaccup_areas_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "aaccup_areas" ADD CONSTRAINT "aaccup_areas_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
