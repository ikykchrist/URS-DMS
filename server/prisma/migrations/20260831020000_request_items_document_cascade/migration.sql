-- URS-DMS — document request items cascade with document permanent deletion
-- `document_request_items.documentId` was created with ON DELETE RESTRICT,
-- which blocked `DELETE /documents/:id/permanent` for any document that a
-- request ever referenced (recycle-bin purge 500s). Cascade removes the
-- request item when the document is permanently deleted; the request row
-- itself stays (its legacy `documentId` nulls via SetNull).
-- Applied manually via `prisma db execute` (shadow-database replay blocked by
-- a pre-existing migration-history issue).

-- DropForeignKey
ALTER TABLE "document_request_items" DROP CONSTRAINT "document_request_items_documentId_fkey";

-- AddForeignKey
ALTER TABLE "document_request_items" ADD CONSTRAINT "document_request_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
