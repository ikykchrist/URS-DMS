-- =============================================================================
-- Sprint 7.4.8 — Platform Setup Wizard support
-- -----------------------------------------------------------------------------
-- 1. SetupState singleton row (wizard progress/status + logo object key).
-- 2. displayOrder on the four organization entities so the wizard can persist
--    user-defined ordering (reorder) of colleges, departments, offices and
--    programs. Existing rows default to 0 (name ordering remains the tiebreak).
-- =============================================================================

CREATE TYPE "SetupStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "setup_states" (
    "id" TEXT NOT NULL,
    "status" "SetupStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedSteps" JSONB NOT NULL DEFAULT '[]',
    "logoObjectKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "setup_states_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "setup_states" ADD CONSTRAINT "setup_states_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "colleges" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "departments" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "offices" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "programs" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "colleges_displayOrder_idx" ON "colleges"("displayOrder");
CREATE INDEX "departments_displayOrder_idx" ON "departments"("displayOrder");
CREATE INDEX "offices_displayOrder_idx" ON "offices"("displayOrder");
CREATE INDEX "programs_displayOrder_idx" ON "programs"("displayOrder");
