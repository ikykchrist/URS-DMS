INSERT INTO "roles" ("id", "name", "description", "isSystem", "updatedAt")
VALUES (
  '7818bc5b-f39d-4f24-a38b-13c1430674b0',
  'ACCREDITOR',
  'View and preview approved accreditation evidence',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;
