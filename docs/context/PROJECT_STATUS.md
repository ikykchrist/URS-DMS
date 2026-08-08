# Project Status (URS-DMS)

> Sprint completion history only. Current state → `AI_CONTEXT.md`. Future →
> `PROJECT_ROADMAP.md`. Append every completed sprint here (newest first).

## Sprint log

| Sprint | Scope | Status |
|---|---|---|
| 1 | Client skeleton (Vite + React + TS + Tailwind) | ✅ done |
| 2 | Auth + RBAC + Users + Sessions + AuditLog + Prisma + Docker | ✅ done |
| 3 | Documents + Folders + Versioning + Upload/Download + Tags + Shares + MinIO | ✅ done |
| 4 | Document Requests workflow (approve / reject / fulfill / cancel) | ✅ done |
| 5.1–5.5 | AACCUP areas, requirements, submissions + review state machine, compliance + analytics, QA pass | ✅ done |
| 6.1–6.3 | Dashboard statistics, analytics & trends, audit center APIs | ✅ done |
| 7.1 | Administration backend (departments + colleges + settings) | ✅ done |
| 7.2 | User & Role administration (escalation guard) | ✅ done |
| 7.3 | Notification & email service (inbox + announcements + durable queue) | ✅ done |
| 7.4.1 | System Administrator (ROOT) + Configuration Engine | ✅ done |
| 7.4.2 | Organization engine (offices/programs + versioning + rollback) | ✅ done |
| 7.4.3 | Dynamic Folder Builder (versioned trees + scoped assignment + resolve) | ✅ done |
| 7.4.4 | Dynamic Requirement Builder (recursive templates + rules + projection) | ✅ done |
| 7.4.5 | Dynamic Workflow Builder (definitions + runtime gates) | ✅ done |
| 7.4.6 | Dynamic Form Builder (12 field types + versioning + assignments) | ✅ done |
| 7.4.8 | Platform Setup Wizard (8-step, persisted, MinIO logo) | ✅ done |
| 7.5 | Integration & defense readiness (config-engine upload policy, full-flow smoke) | ✅ done |
| 7.5.1 | Document Repository stabilization (owner-scoped explorer, folder/file CRUD) | ✅ done |
| 7.6 | Complete system validation (dead code/buttons, 27/27 smoke) | ✅ done |
| 7.7 | Defense demo prep (ErrorBoundary, titles, toasts, lazy Root pages) | ✅ done |
| 7.7.5 | Production data migration & mock-data elimination (seed clean) | ✅ done |
| 7.8 | Final acceptance testing — V1.0 RC1 (36/36 smoke, Docker restart verified) | ✅ done |
| 8.0 | Accreditation hardening + realtime analytics (AreaSet separation, tasks, per-set tabs + dashboards) | ✅ done |
| 8.1 | User portal accreditation tabs (set-aware user views, ISO/Cert routes) | ✅ done |
| 8.2 | Admin dashboard real-data cleanup (honest zeros, no fake trends) | ✅ done |
| 8.3 | **Personal Document Repository completion** — provisioning, recycle bin + 30-day retention, favorites/recents/quick access, requested documents, repository-wide search, real upload progress, fixed replace-version, shared-blob copies, emergency access, snapshot columns; 49/49 smoke; mock-data audit §4 | ✅ done |
| 8.4 | **Repository Rules 1–30** — ownership-strict isolation (404, D-019), depth 5/6 enforcement, conflict modes (upload/replace/restore/copy merge/keep_both/cancel), persisted background copy jobs (D-020), folder info + honest storage display + streaming ZIP, file activity + submission badges, checksum duplicate warning, audio/video uploads, drag & drop, leave-guard on nav/logout, notification emitters (upload/request/submission/recycle/storage), upload-failure audit; 49/49 base + 40/40 rules smoke | ✅ done |
| 8.5 | **AACCUP group + tasks + submissions + requests** — single AACCUP tab (both portals) with URL-synced sub-tabs; area CRUD (edit mode + per-card actions); requirement CRUD tab (builder-managed detection); task fixes (assignees endpoint, dueDate null, area picker, assignee transitions, mine=true, task assignment notifications, submit-into-task via taskId); submission review buttons per-row + per-area, fixed Return wiring, reviewer notifications; multi-file requests (DocumentRequestItem, 1–3 files), admin Requests review tab (approve / reject-with-reason), department archive browse (list-only, max 3, explanation), request details + cancel; 43/43 + 32/32 smoke | ✅ done |
| 8.6 | **UI unification & bug-fix pass (UI only, no permission changes)** — shared tab strip + shared SubmissionsTable (review/view) + shared TaskSubmitDialog; user command palette (Ctrl+K) + quick actions; dead controls removed (toolbar filters wired, bulk actions, pagination, presets, dashboard request table relabeled, mojibake, orphan pages); user dashboard dead card replaced + shared table primitives; "My Documents" labels unified; D-026 request-items cascade fix (permanent delete unblocked); all 4 smoke suites green | ✅ done |
| 8.7 | **Cloudflare tunnel deployment + upload fixes** — `tunnel-all.ps1` full deploy (app + MinIO + console, VITE_API_BASE=/api/v1 same-origin proxy, env backup/restore, Vite+API restarts), `tunnel-stop.ps1` restore; D-027 presigned URLs signed for the public endpoint (403 SignatureDoesNotMatch fixed, verified via tunnel PUT/GET); D-028 maximum upload size removed (validator cap + config check + seed + Settings UI; 115 MB upload verified); add-user employeeId derivation fixed (dotted emails) + validation errors now surface field details | ✅ done |
| 8.1 | **Account & Session Management** — self-service Account & Security page on both portals (profile edit via new `PATCH /users/me` with strict whitelist, read-only email/role, change password, active sessions with current-session badge + revoke one/revoke-others); reused existing auth endpoints (`/auth/me`, `/auth/sessions`, `/kill`, `/kill-all`, `/change-password`, `/logout`); session-revoke + profile-update audits (once each); `users.self.update` granted to READ_ONLY; `scripts/smoke-account.ps1` 35/35 + requests regression 32/32 | ✅ done |
| 8.2 | **Password Recovery & Account Security** — self-service forgot/reset password: `POST /auth/forgot-password` (generic non-enumerating response, rate-limited), `POST /auth/reset-password` (single-use SHA-256-hashed 20-min tokens, transactional Argon2 update + outstanding-token invalidation + ALL-session revocation), durable-email reset link, dev-only reset-link helper; new `PasswordResetToken` model (migration `20260831030000_add_password_reset_tokens`); wired the existing Forgot/Reset pages to the real API; `scripts/smoke-password-reset.ps1` 30/30 + Sprint 8.1 regression 35/35 | ✅ done |
| 8.3 | **Repository Maintenance, Retention & Storage Integrity** — automatic 30-day Recycle Bin cleanup (batch-based, snapshot-guarded, reference-counted, AACCUP-submission safe); two-stage orphan MinIO-object detection (SCAN → 7-day grace → VERIFY → DELETE) with idempotent cleanup; database/storage consistency checker (read-only by default, reports missing objects never secretly deletes); accurate storage statistics (MinIO-connected, no fabricated capacity); database-backed distributed job lock (10-min expiry + heartbeat, no Redis dependency); 24-hour scheduled `maintenance-runner.js` + manual `maintenance-cleanup.js` with `--dry-run`/`--confirm`; Root Console Storage Maintenance page (stats, job history, orphan browser, controlled actions with confirmation); 7 audit event types; 3 new models (`MaintenanceJob`, `MaintenanceOrphanCandidate`, `MaintenanceLock`) via migration `20260831040000`; `maintenance:storage-check`, `maintenance:cleanup`, `maintenance:run` npm scripts; `scripts/smoke-maintenance.ps1`; DECISIONS D-032 + D-033 | ✅ done |
| 8.4 | **Roles & Permissions Management** — ROOT-only Roles & Permissions page (`RootRolesPermissions.tsx`) with full permission matrix (roles × permissions grouped by module), search/filter, per-role assignment checkboxes, Save Changes with confirmation diff; ROOT-protected codes locked + disabled; system role protection (ROOT/ADMINISTRATOR cannot be removed); privilege-escalation guard; backend routes under `/root/roles-permissions` (hard `requireRole("ROOT")`) reusing existing admin roles service; client-side permission system refactored to server-authoritative `hasServerPermission(user, code)` using granular codes from `/auth/me`; legacy `ROLE_PERMISSIONS` matrix retained for backward compatibility; one audit event per permission change; `scripts/smoke-roles-permissions.ps1` 28/28 | ✅ done |
| 8.6 | **Automated Testing & Engineering Cleanup** — Vitest 2.1 config with v8 coverage; 46 automated tests across 3 suites: RBAC (role hierarchy + permissions + escalation guard + DB population, 24 tests), Repository (ownership isolation + depth limits + soft-delete/restore + metadata, 12 tests), Audit/Notifications/Background Jobs (10 tests); test helpers/factories (`createTestUser`, `createTestDocument`, `createTestFolder`, `cleanupTestUser`); client ESLint 9 flat config (`eslint.config.mjs`); test commands (`test`, `test:watch`, `test:coverage`); `docs/testing/TESTING.md` created; build excludes test files | ✅ done |
| 8.7 | **Final Repository UX & File Behavior (Rules 31-40)** — Rule 31: Folder customization (color + icon columns, hex-validated PATCH API, color-picker + presets in RepositoryExplorer with save/reset); Rule 33: ZIP extraction service with ZIP Slip guard, depth enforcement, max entries/bomb protection; Rule 37: Recycle Bin shows days remaining per deleted item + improved metadata display; Rule 38: Bulk delete + Empty Recycle Bin use proper Dialog confirmations instead of `window.confirm`; Rule 40: `ServiceUnavailable` component (customizable service name, message, retry); migration `20260808000000_sprint8_7_folder_customization`; 4 new audit event codes (`folder.customized`, `document.zip_extracted`, `document.replaced`, `document.upload_resumed`); DECISIONS D-035..D-044 | ✅ done |
| 8.8 | **Full System Integration & End-to-End Regression** — Full cross-module integration verified: server typecheck + build green, client typecheck + build green, 46 automated tests green; 7 of 9 smoke suites fully green (Repository 49/49, Rules 40/40, Roles 28/28, Maintenance 31/31, Account 35/35, Requests 32/32, Background Jobs 12/12); all navigation items verified (no dead routes, no orphaned pages); all core modules function together (Root config, Admin dashboard, User repository, Requests, AACCUP, Workflows, Forms, Notifications, Audit); no critical integration-breaking defects found; cleanup of leftover SMK test records | ✅ done |

## Key verification milestones

- **V1.0 RC1 ready** — 17 migrations applied at that point; all acceptance
  checks green; data survives backend + Docker restarts.
- **Repository module** — 20/20 migrations applied; server typecheck/lint/
  build + client typecheck/build pass; `scripts/smoke-repository.ps1` 49/49;
  persistence across backend restart verified (PostgreSQL + MinIO).
- **Rules 1–30 sprint** — 21/21 migrations applied
  (`20260829000000_repository_rules`); `scripts/smoke-repository-rules.ps1`
  40/40 (depth limits, conflicts, ZIP, activity, jobs, notifications,
  emergency access, multi-user isolation); all smoke records + temp users
  removed; MinIO objects cleaned; final DB: 3 users / 3 repositories / real
  user data only.
- Final DB state (repository sprint): 3 repositories, zero test records;
  user-created demo content kept per the never-delete rule.
- **AACCUP group sprint (8.5/8.6)** — 25/25 migrations applied
  (`20260831020000_request_items_document_cascade` is the newest); server
  typecheck/lint/build + client tsc/build pass; smoke suites all green
  (AACCUP 43/43, Requests 32/32, Repository 49/49, Rules 40/40); all smoke
  fixtures self-clean (no SMK rows remain); D-026 fixed the request-items FK
  that blocked document permanent deletion (stale recycle-bin rows purged).
- **Storage maintenance sprint (8.3)** — migration `20260831040000_add_maintenance_models`
  applied (3 new tables); `MaintenanceLock` provides distributed duplicate-job
  prevention without Redis; reference-safe MinIO object deletion respects
  copies, deliveries, and AACCUP snapshots; orphan cleanup uses 7-day grace
  period; all destructive operations support `--dry-run`.

## Related documents

- `AI_CONTEXT.md` — current state
- `PROJECT_ROADMAP.md` — future work
- `docs/mock-data-audit.md` — removal records
- `CHANGELOG.md` — chronological change log
