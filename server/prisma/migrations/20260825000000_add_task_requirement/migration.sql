-- =============================================================================
-- Tie AACCUP tasks to an optional requirement
-- -----------------------------------------------------------------------------
-- Tasks may optionally relate to a requirement of the same area (e.g. "Collect
-- the annual report" -> the Annual Report requirement). The FK is nullable and
-- ON DELETE SET NULL so archiving a requirement never deletes or orphans tasks.
-- =============================================================================

ALTER TABLE "aaccup_tasks" ADD COLUMN "requirementId" TEXT;

ALTER TABLE "aaccup_tasks"
    ADD CONSTRAINT "aaccup_tasks_requirementId_fkey"
    FOREIGN KEY ("requirementId") REFERENCES "aaccup_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "aaccup_tasks_requirementId_idx" ON "aaccup_tasks"("requirementId");
