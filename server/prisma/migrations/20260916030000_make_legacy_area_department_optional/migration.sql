-- New AACCUP/ISO areas use Campus → College → Program. Keep the legacy
-- department column nullable during the cutover; the final cleanup migration
-- removes it after all callers have moved.
ALTER TABLE "aaccup_areas" ALTER COLUMN "departmentId" DROP NOT NULL;
