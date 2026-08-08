-- URS-DMS — multi-file document requests (DocumentRequestItem)
-- One request may cover up to 3 documents. The legacy single `documentId`
-- column on document_requests is kept for backward compatibility.
-- Applied manually via `prisma db execute` (shadow-database replay blocked by
-- a pre-existing migration-history issue).

-- CreateTable
CREATE TABLE "document_request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_request_items_requestId_documentId_key" ON "document_request_items"("requestId", "documentId");

-- CreateIndex
CREATE INDEX "document_request_items_documentId_idx" ON "document_request_items"("documentId");

-- AddForeignKey
ALTER TABLE "document_request_items" ADD CONSTRAINT "document_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "document_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_request_items" ADD CONSTRAINT "document_request_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
