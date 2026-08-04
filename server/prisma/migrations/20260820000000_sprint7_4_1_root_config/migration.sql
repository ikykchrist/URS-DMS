-- =============================================================================
-- Sprint 7.4.1 — System Administrator (ROOT) Foundation + Configuration Engine
-- -----------------------------------------------------------------------------
-- 1. Adds the ROOT value to the RoleName enum. The ROOT role is the
--    highest-privilege system role (never archived, permissions never
--    removed — enforced by the seed + admin guards). Additive only; existing
--    role rows are untouched.
-- 2. Adds the Configuration Engine schema:
--      * configuration_categories  — grouping buckets (system, university,
--        academic, security, upload, storage, pagination).
--      * configurations            — versioned configuration entries. `value`
--        is JSONB (one column for STRING/NUMBER/BOOLEAN/JSON/LIST), `version`
--        is the monotonic current version, `isSystem` marks seed-owned
--        entries (undeletable), soft delete via `deletedAt`.
--      * configuration_versions    — append-only per-version value snapshots
--        (one row per create/update/rollback; mirrors Configuration.version
--        via the (configurationId, version) composite unique key).
--      * configuration_histories   — lifecycle audit trail (CREATED / UPDATED /
--        DELETED / RESTORED / ROLLED_BACK) with before/after values, version
--        deltas and the acting user.
-- FK semantics follow AI_CONTEXT §6: Restrict on required owned children,
-- SetNull on optional attribution fields, Cascade on parent-owned rows.
-- All new tables are empty at migration time — no existing row is altered.
-- =============================================================================

-- 1. ROOT role ----------------------------------------------------------------
ALTER TYPE "RoleName" ADD VALUE 'ROOT';

-- 2. Configuration engine enums ----------------------------------------------
CREATE TYPE "ConfigurationStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ConfigurationValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'LIST');
CREATE TYPE "ConfigurationAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'RESTORED', 'ROLLED_BACK');

-- 3. ConfigurationCategory ----------------------------------------------------
CREATE TABLE "configuration_categories" (
  "id"          TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isSystem"    BOOLEAN NOT NULL DEFAULT false,
  "createdBy"   TEXT,
  "updatedBy"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "configuration_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "configuration_categories_code_key" ON "configuration_categories"("code");
CREATE INDEX "configuration_categories_deletedAt_idx" ON "configuration_categories"("deletedAt");
CREATE INDEX "configuration_categories_displayOrder_idx" ON "configuration_categories"("displayOrder");

ALTER TABLE "configuration_categories" ADD CONSTRAINT "configuration_categories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "configuration_categories" ADD CONSTRAINT "configuration_categories_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Configuration ------------------------------------------------------------
CREATE TABLE "configurations" (
  "id"          TEXT NOT NULL,
  "categoryId"  TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "value"       JSONB NOT NULL,
  "valueType"   "ConfigurationValueType" NOT NULL DEFAULT 'STRING',
  "status"      "ConfigurationStatus" NOT NULL DEFAULT 'ACTIVE',
  "version"     INTEGER NOT NULL DEFAULT 1,
  "isSystem"    BOOLEAN NOT NULL DEFAULT false,
  "createdBy"   TEXT,
  "updatedBy"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"   TIMESTAMP(3),
  CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "configurations_categoryId_key_key" ON "configurations"("categoryId", "key");
CREATE INDEX "configurations_categoryId_idx" ON "configurations"("categoryId");
CREATE INDEX "configurations_status_idx" ON "configurations"("status");
CREATE INDEX "configurations_deletedAt_idx" ON "configurations"("deletedAt");

ALTER TABLE "configurations" ADD CONSTRAINT "configurations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "configuration_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. ConfigurationVersion -----------------------------------------------------
CREATE TABLE "configuration_versions" (
  "id"              TEXT NOT NULL,
  "configurationId" TEXT NOT NULL,
  "version"         INTEGER NOT NULL,
  "value"           JSONB NOT NULL,
  "changeNote"      TEXT,
  "changedById"     TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuration_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "configuration_versions_configurationId_version_key" ON "configuration_versions"("configurationId", "version");
CREATE INDEX "configuration_versions_configurationId_idx" ON "configuration_versions"("configurationId");

ALTER TABLE "configuration_versions" ADD CONSTRAINT "configuration_versions_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuration_versions" ADD CONSTRAINT "configuration_versions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. ConfigurationHistory -----------------------------------------------------
CREATE TABLE "configuration_histories" (
  "id"              TEXT NOT NULL,
  "configurationId" TEXT NOT NULL,
  "action"          "ConfigurationAction" NOT NULL,
  "oldValue"        JSONB,
  "newValue"        JSONB,
  "versionFrom"     INTEGER,
  "versionTo"       INTEGER,
  "actorId"         TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuration_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "configuration_histories_configurationId_idx" ON "configuration_histories"("configurationId");
CREATE INDEX "configuration_histories_action_idx" ON "configuration_histories"("action");
CREATE INDEX "configuration_histories_createdAt_idx" ON "configuration_histories"("createdAt");

ALTER TABLE "configuration_histories" ADD CONSTRAINT "configuration_histories_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuration_histories" ADD CONSTRAINT "configuration_histories_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
