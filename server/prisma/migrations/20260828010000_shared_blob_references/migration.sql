-- =============================================================================
-- Personal Repository — shared immutable blob references
-- -----------------------------------------------------------------------------
-- DocumentVersion.objectKey is no longer globally unique: copies and request
-- deliveries reference the SAME immutable version object (blobs are never
-- rewritten). Permanent-delete and the future GC job already guard by
-- reference count — an object key is removed only when zero version rows
-- reference it. The former unique index is replaced by a plain index for
-- reference-count lookups.
-- =============================================================================

DROP INDEX IF EXISTS "document_versions_objectKey_key";
CREATE INDEX "document_versions_objectKey_idx" ON "document_versions"("objectKey");
