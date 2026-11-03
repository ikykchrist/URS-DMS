CREATE TABLE "bug_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "tab" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bug_reports_reporterId_idx" ON "bug_reports"("reporterId");
CREATE INDEX "bug_reports_createdAt_idx" ON "bug_reports"("createdAt");

ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
