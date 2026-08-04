-- =============================================================================
-- Sprint 7.4.2 — Organization Management Engine (ROOT-only master data)
-- -----------------------------------------------------------------------------
-- 1. Adds the Office and Program master-data tables. Colleges and Departments
--    already exist (Sprint 7.1 admin rows) — the ROOT organization surface
--    reuses those SAME physical tables additively; the ADMINISTRATOR admin
--    surface keeps working on the same rows. No existing row is altered.
-- 2. Adds the OrganizationVersion snapshot table — the Configuration Engine
--    integration: every create / update / archive / restore appends a version
--    snapshot (mirrors configuration_versions), and ROOT can roll a record
--    back to any earlier snapshot (mirrors configuration rollback). `data` is
--    JSONB (editable fields: name/code/description/parent links/level).
-- 3. Program.level is a closed enum (UNDERGRADUATE / GRADUATE / DOCTORAL /
--    CERTIFICATE / DIPLOMA). All optional FKs use SetNull so archiving a
--    parent never orphans children; indexes follow AI_CONTEXT §6.
-- All new tables are empty at migration time — fully additive.
-- =============================================================================

-- 1. Enums --------------------------------------------------------------------
CREATE TYPE "ProgramLevel" AS ENUM ('UNDERGRADUATE', 'GRADUATE', 'DOCTORAL', 'CERTIFICATE', 'DIPLOMA');
CREATE TYPE "OrganizationEntity" AS ENUM ('COLLEGE', 'DEPARTMENT', 'OFFICE', 'PROGRAM');
CREATE TYPE "OrganizationChangeType" AS ENUM ('CREATED', 'UPDATED', 'ARCHIVED', 'RESTORED', 'ROLLED_BACK');

-- 2. Office -------------------------------------------------------------------
CREATE TABLE "offices" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "description"  TEXT,
  "headId"       TEXT,
  "collegeId"    TEXT,
  "departmentId" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"    TIMESTAMP(3),
  CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offices_code_key" ON "offices"("code");
CREATE INDEX "offices_deletedAt_idx" ON "offices"("deletedAt");
CREATE INDEX "offices_collegeId_idx" ON "offices"("collegeId");
CREATE INDEX "offices_departmentId_idx" ON "offices"("departmentId");

ALTER TABLE "offices" ADD CONSTRAINT "offices_headId_fkey" FOREIGN KEY ("headId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "offices" ADD CONSTRAINT "offices_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "offices" ADD CONSTRAINT "offices_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Program ------------------------------------------------------------------
CREATE TABLE "programs" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "description"  TEXT,
  "level"        "ProgramLevel" NOT NULL DEFAULT 'UNDERGRADUATE',
  "collegeId"    TEXT,
  "departmentId" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"    TIMESTAMP(3),
  CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");
CREATE INDEX "programs_deletedAt_idx" ON "programs"("deletedAt");
CREATE INDEX "programs_collegeId_idx" ON "programs"("collegeId");
CREATE INDEX "programs_departmentId_idx" ON "programs"("departmentId");

ALTER TABLE "programs" ADD CONSTRAINT "programs_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programs" ADD CONSTRAINT "programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. OrganizationVersion (Configuration Engine integration) -------------------
CREATE TABLE "organization_versions" (
  "id"          TEXT NOT NULL,
  "entity"      "OrganizationEntity" NOT NULL DEFAULT 'COLLEGE',
  "entityId"    TEXT NOT NULL,
  "version"     INTEGER NOT NULL,
  "changeType"  "OrganizationChangeType" NOT NULL DEFAULT 'CREATED',
  "data"        JSONB NOT NULL,
  "changedById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_versions_entity_entityId_version_key" ON "organization_versions"("entity", "entityId", "version");
CREATE INDEX "organization_versions_entity_entityId_idx" ON "organization_versions"("entity", "entityId");
CREATE INDEX "organization_versions_createdAt_idx" ON "organization_versions"("createdAt");

ALTER TABLE "organization_versions" ADD CONSTRAINT "organization_versions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
