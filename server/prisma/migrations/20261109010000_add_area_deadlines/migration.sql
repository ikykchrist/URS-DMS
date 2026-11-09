ALTER TABLE "aaccup_areas" ADD COLUMN "dueDate" TIMESTAMP(3);

CREATE INDEX "aaccup_areas_dueDate_idx" ON "aaccup_areas"("dueDate");

ALTER TYPE "NotificationType" ADD VALUE 'AACCUP_AREA_DUE_IN_3_MONTHS';
ALTER TYPE "NotificationType" ADD VALUE 'AACCUP_AREA_DUE_IN_1_MONTH';
ALTER TYPE "NotificationType" ADD VALUE 'AACCUP_AREA_DUE_IN_7_DAYS';
ALTER TYPE "NotificationType" ADD VALUE 'AACCUP_AREA_DUE_IN_3_DAYS';

CREATE TABLE "aaccup_area_deadline_reminders" (
  "id" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reminderKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aaccup_area_deadline_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aaccup_area_deadline_reminders_areaId_userId_reminderKey_key"
  ON "aaccup_area_deadline_reminders"("areaId", "userId", "reminderKey");
CREATE INDEX "aaccup_area_deadline_reminders_userId_idx"
  ON "aaccup_area_deadline_reminders"("userId");

ALTER TABLE "aaccup_area_deadline_reminders"
  ADD CONSTRAINT "aaccup_area_deadline_reminders_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "aaccup_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aaccup_area_deadline_reminders"
  ADD CONSTRAINT "aaccup_area_deadline_reminders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
