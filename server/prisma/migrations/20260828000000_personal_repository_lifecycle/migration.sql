-- =============================================================================
-- Personal Document Repository & File Lifecycle (implementation sprint)
-- -----------------------------------------------------------------------------
-- 1. `repositories` — one idempotently provisioned repository per owner
--    (Users and Administrators; backfilled for existing accounts).
-- 2. `folders.repositoryId` / `documents.repositoryId` — repository-scoped
--    ownership key, backfilled from the owner's repository.
-- 3. Favorites / Recents / Quick Access (pins) — schema-backed per account.
-- 4. `emergency_access` — time-limited Root-granted repository access.
-- 5. AACCUP submission snapshot columns — immutable evidence capture.
-- =============================================================================

CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "repositories_ownerId_key" ON "repositories"("ownerId");
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one repository per existing account
INSERT INTO "repositories" ("id", "ownerId")
SELECT gen_random_uuid()::text, u."id"
FROM "users" u
WHERE u."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "repositories" r WHERE r."ownerId" = u."id");

ALTER TABLE "folders" ADD COLUMN "repositoryId" TEXT;
ALTER TABLE "folders" ADD CONSTRAINT "folders_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "folders" f SET "repositoryId" = r."id"
FROM "repositories" r WHERE r."ownerId" = f."ownerId";
CREATE INDEX "folders_repositoryId_idx" ON "folders"("repositoryId");

ALTER TABLE "documents" ADD COLUMN "repositoryId" TEXT;
ALTER TABLE "documents" ADD CONSTRAINT "documents_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "documents" d SET "repositoryId" = r."id"
FROM "repositories" r WHERE r."ownerId" = d."ownerId";
CREATE INDEX "documents_repositoryId_idx" ON "documents"("repositoryId");

-- Favorites (files only; folders pinned via quick access)
CREATE TABLE "repository_favorites" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repository_favorites_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "repository_favorites" ADD CONSTRAINT "repository_favorites_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_favorites" ADD CONSTRAINT "repository_favorites_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "repository_favorites_ownerId_documentId_key" ON "repository_favorites"("ownerId", "documentId");
CREATE INDEX "repository_favorites_ownerId_idx" ON "repository_favorites"("ownerId");

-- Recents (files and folders; last-opened per account)
CREATE TABLE "repository_recents" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repository_recents_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "repository_recents" ADD CONSTRAINT "repository_recents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "repository_recents_ownerId_itemType_itemId_key" ON "repository_recents"("ownerId", "itemType", "itemId");
CREATE INDEX "repository_recents_ownerId_lastOpenedAt_idx" ON "repository_recents"("ownerId", "lastOpenedAt" DESC);

-- Quick Access (pinned folders per account)
CREATE TABLE "repository_pins" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repository_pins_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "repository_pins" ADD CONSTRAINT "repository_pins_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_pins" ADD CONSTRAINT "repository_pins_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "repository_pins_ownerId_folderId_key" ON "repository_pins"("ownerId", "folderId");
CREATE INDEX "repository_pins_ownerId_idx" ON "repository_pins"("ownerId");

-- Root-granted time-limited repository access
CREATE TABLE "emergency_access" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "emergency_access_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "emergency_access" ADD CONSTRAINT "emergency_access_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_access" ADD CONSTRAINT "emergency_access_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_access" ADD CONSTRAINT "emergency_access_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "emergency_access_adminId_ownerId_idx" ON "emergency_access"("adminId", "ownerId");
CREATE INDEX "emergency_access_expiresAt_idx" ON "emergency_access"("expiresAt");

-- Immutable AACCUP evidence snapshot columns (captured at submission time)
ALTER TABLE "aaccup_submissions" ADD COLUMN "snapshotFilename" TEXT;
ALTER TABLE "aaccup_submissions" ADD COLUMN "snapshotMimeType" TEXT;
ALTER TABLE "aaccup_submissions" ADD COLUMN "snapshotSizeBytes" BIGINT;
ALTER TABLE "aaccup_submissions" ADD COLUMN "snapshotChecksum" TEXT;
