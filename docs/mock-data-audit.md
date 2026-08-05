# URS-DMS — Mock Data Audit Report

> Sprint 7.7.5 + 7.5.1 · Production data migration & mock-data elimination
> Every entry below was removed with a **soft delete** (reversible — restore by
> clearing `deletedAt`). MinIO objects were never deleted. The cleanup is
> repeatable via `node scripts/cleanup-demo-data.js` (add `--dry-run` to
> preview). **No real user-created records were deleted.**

## 1. Database mock data removed (soft-deleted)

| Entity | Type of Mock Data | Reason for Removal | Replacement | Risk | Status |
|--------|-------------------|--------------------|-------------|------|--------|
| `aaccup_tasks` (11 rows) | Development test tasks ("Test", "task", "Collect …", "Department-wide …") | Created by automated smoke tests, not real assignments | Created through the AACCUP Tasks UI | Low | ✅ Removed |
| `aaccup_submissions` (12 rows) | Smoke submissions ("RC1 …", "Sprint75 …", "folder archive check") | Automated-test evidence uploads | Created through the Add Submission flow | Low | ✅ Removed |
| `aaccup_areas` (5 rows) | Smoke / ISO-AREA / CERT-AREA / "Area I" test areas | Automated-test areas; no real accreditation scope | Created through AACCUP Management / Setup Wizard | Low | ✅ Removed |
| `aaccup_requirements` (1 visible + orphans) | "E2E-SUB-001" + requirements under archived areas | E2E test requirements | Created through the Requirement Builder / AACCUP UI | Low | ✅ Removed |
| `documents` (49 total) | "Smoke …", "E2E AACCUP Submission N", "Meowl", "Photoo", "Img ni cj", "Policy Test", "PDF Test", "RC1 …", "Sprint75 …", "Folder Archive Test" | Automated-test uploads | Real uploads through the Repository / submission flows | Low | ✅ Removed |
| `folders` (12 total) | "Smoke Test Folder", "Drive Test Folder", "Nested Subfolder", "Renamed Subfolder", "Sprint75 Test Folder", "AACCUP" archive root, "Folder 101", "Area I - Instruction" | Test-created archive/tree folders | Real folders via the Repository Explorer | Low | ✅ Removed |
| `folder_templates` (2) | "Institutional Folders", "Wizard Folder Template" | Setup-wizard smoke runs | Real templates via Folder Builder | Low | ✅ Removed |
| `requirement_templates` (6) | "Wizard Requirements", "Accreditation Requirements", smoke templates | Setup-wizard smoke runs | Real templates via Requirement Builder | Low | ✅ Removed |
| `workflow_definitions` (1) | "smoke.override.flow" | Workflow runtime smoke test | Real workflows via Workflow Builder | Low | ✅ Removed |
| `form_templates` (3) | "Accreditation Survey Form", "ui-smoke-form" | Form Builder smoke tests | Real forms via Form Builder | Low | ✅ Removed |
| `users` (1) | `wizard.admin@urs.local` (ADMINISTRATOR) | Setup-wizard smoke account | Real admins via User Management / wizard | Medium | ✅ Removed |
| `setup_states` | status=COMPLETED + logo reference | Wizard completion was a test artifact | Reset to NOT_STARTED (guides Root to configure) | Low | ✅ Reset |
| `configurations.upload.allowed_file_types` | `["pdf","docx"]` | Test value left behind | Seed default `[]` (all types allowed) | Low | ✅ Reset |

**Kept (allowed defaults):** Root account, 7 system roles, 118 permission
codes, 14 configuration entries, system settings, audit history (399
entries), 4 colleges + 4 departments (real configuration created through the
app), canonical accounts `root@urs.local`, `christbaldado@gmail.com`,
`neil@thesis.com`.

**Not removable without a schema change (documented):** 1 PENDING
`document_request` ("Smoke request for override") — the table has no
soft-delete column; deliberately kept intact rather than hard-deleted.

**User-created record intentionally kept:** "File 1 Neil" (document created
by the user through the application during testing — does not match demo
patterns; the data-safety rule wins).

## 2. Frontend hardcoded business data removed (Sprint 7.5.1)

| File | Type of Mock Data | Reason for Removal | Replacement | Risk | Status |
|------|-------------------|--------------------|-------------|------|--------|
| `client/src/pages/DocumentRepository.tsx` | Hardcoded "Area" dropdown (Academic / Faculty / Curriculum / Facility / Resources / Administrative) | Hardcoded business categories | Free-text area input + Area filter derived from real documents | Low | ✅ Removed |
| `client/src/pages/Submissions.tsx` | Hardcoded "AACCUP Area" filter (Area 1–10) | Hardcoded org structure | Filter derived from real submissions | Low | ✅ Removed |
| `client/src/pages/UserManagement.tsx` | Hardcoded role filter (Super Admin / QA Office / …) | Hardcoded role list | Filter derived from real users + role label map | Low | ✅ Removed |
| `client/src/services/documents.ts` (pre-7.5.1) | Reverted explorer helpers | Dead code | Re-added real API helpers (`listRepositoryFolders`, rename/move/delete, `moveOnlineDocument`, `addOnlineDocumentVersion`) | Low | ✅ Replaced |
| `client/src/components/modals/AssignUserModal.tsx` + 5 others | Unused components | Dead code (Sprint 7.6) | Deleted | Low | ✅ Removed |

## 3. Verification

- Post-cleanup database: 0 visible folders / documents / areas / requirements /
  submissions / tasks / templates / workflows / forms.
- Seed (`server/prisma/seed.ts`) verified: seeds ONLY roles, permissions,
  configuration, and the ROOT/admin bootstrap.
- `node scripts/cleanup-demo-data.js --dry-run` previews every removal before
  execution; the script is idempotent and re-runnable.

## 4. Repository-sprint test records removed (Personal Document Repository)

Removed via the **audited API path** (soft delete, manager permission) during
the repository smoke sweep — not the pattern script, because the names did not
match its demo list. All rows remain recoverable by clearing `deletedAt`;
MinIO objects were never deleted.

| Entity | Records | Reason for Removal | Replacement | Risk | Status |
|--------|---------|--------------------|-------------|------|--------|
| `documents` (4) | "Lifecycle File" ×4 (admin account) | Lifecycle-verification uploads from the previous session | Real uploads via the Repository Explorer | Low | ✅ Soft-deleted |
| `folders` (5) | "Lifecycle Test Folder" ×3, "CopyTree Source" ×2 (admin account) | Lifecycle / copy-subtree verification artifacts | Real folders via the Explorer | Low | ✅ Soft-deleted |
| `documents` + `folders` | "SMK …" smoke records (root account) | Repository smoke-test fixtures (`scripts/smoke-repository.ps1`) | None — the smoke script pre-cleans + self-cleans | Low | ✅ Permanently removed |

**Kept:** "Admin Folder" + the remaining live user documents (real user-created
content; the never-delete-user-records rule wins).
