CREATE TABLE "audit_reviews" (
  "id" TEXT NOT NULL,
  "auditLogId" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'UNREVIEWED',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "audit_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audit_reviews_auditLogId_key" ON "audit_reviews"("auditLogId");

ALTER TABLE "audit_reviews"
  ADD CONSTRAINT "audit_reviews_auditLogId_fkey"
  FOREIGN KEY ("auditLogId") REFERENCES "audit_logs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_reviews"
  ADD CONSTRAINT "audit_reviews_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
