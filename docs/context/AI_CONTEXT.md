# AI Context (URS-DMS)

> Current-state snapshot. **Read first, plus `PROJECT_STATUS.md`,
> `MODULE_INDEX.md`, and ONE engineering + ONE specification document for the
> module you touch.** Full behavior: `specification/`; standards:
> `engineering/`.

## 1. Project summary

| Field | Value |
|---|---|
| Project | URS-DMS — University Recognition System Document Management System (AACCUP/ISO/Certification + personal repositories), local deployment, zero internet dependency |
| Version | 1.0 (Release Candidate) |
| Phase | Stabilization / defense-demo readiness |
| Current sprint | Sprint 8.3 Repository Maintenance — COMPLETE (29/29 smoke) |
| Current goal | Finish 1.0 backlog (defense readiness, Cloudflare VPS deployment); keep every surface demo-safe with real data only |

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript strict, Vite 5, Tailwind CSS 3, shadcn-style UI, Recharts, lucide-react |
| Backend | Node ≥ 20, Express 4.21, TypeScript strict |
| Database | PostgreSQL 16 (Docker) via Prisma 5.22 |
| Storage | MinIO (Docker); presigned PUT/GET; private objects |
| Auth | JWT access + rotating refresh cookies, argon2 |
| Validation | Zod 3.23 |
| Monorepo | npm workspaces (`server/` + `client/`); API local via `restart-server.ps1` |

## 3. Architecture in one paragraph

Per-module layering `routes → controller → service → repository → Prisma`
under `/api/v1`; ROOT surfaces under `/api/v1/root` (hard `requireRole`).
Client: one `services/*` layer per module over `lib/http.ts` (single-flight
refresh; `urs:session-expired` forces logout). Every account owns one
repository; all user data persists in PostgreSQL + MinIO; config lives in the
Configuration Engine (`getConfigValue` only); RBAC is permission-driven (119
codes, additive-only). Details: `engineering/architecture.md`.

## 4. Completed modules

- Auth + sessions (frozen), RBAC (7 roles)
- Document repository — COMPLETE (rules 1–30): provisioning, folder/file
  CRUD, copy (merge/keep_both/cancel + background jobs), replace-version
  identity preservation, recycle bin + 30-day retention + conflict-aware
  restore, favorites, recents, quick access, requested documents,
  repository-wide search, upload queue + real progress + duplicate warning,
  audio/video, preview modal with Details & Activity, submission badges,
  folder info + storage display + ZIP download, drag & drop, ownership-strict
  isolation (404), emergency access, notification emitters, upload-failure
  audit
- Document requests (create/approve/reject/fulfill + delivery)
- Accreditation: areas (full CRUD UI), requirements (add/edit/archive tab,
  builder-managed detection), submissions (review mode + per-area actions +
  reviewer notifications), tasks (assignee picker, assignee transitions,
  submit-into-task, My Tasks on both portals) per set (AACCUP/ISO/CERT)
- AACCUP group UX: one sidebar entry per portal, shared tab strip
  (AACCUP | ISO | Certification | Submissions | My Tasks), URL-synced tabs,
  deep links preserve the set; shared SubmissionsTable + TaskSubmitDialog
- Document requests: multi-file (1–3 per request), admin Requests review tab
  (approve / reject-with-reason), department archive browse (list-only,
  max 3 files, explanation required), request details + cancel
- Dashboard / analytics / reports / audit (live data only)
- Notifications + durable email queue (+ repository-rule emitters +
  AACCUP_TASK_ASSIGNED + AACCUP_SUBMISSION_PENDING_REVIEW)
- Admin: users, roles, permissions, departments, colleges, settings
- Root Console: Configuration Engine, Organization, Folder/Requirement/
  Workflow/Form Builders, Setup Wizard, Control Center
- Client hardening: ErrorBoundary, lazy-loaded Root pages, page titles,
  toasts, session-expiry redirect, command palette for both portals (Ctrl+K),
  quick-action menus
- Account & Security (Sprint 8.1): shared page for both portals — profile
  edit (`PATCH /users/me`), change password, active sessions (current badge,
  revoke one / revoke others); audits `user.profile_updated`,
  `session.revoked`, `session.revoked_others` once each
- Password recovery (Sprint 8.2): `modules/passwordReset/` on `/auth`
  (forgot-password generic + rate-limited 12/15min/IP, reset-password with
  single-use SHA-256-hashed 20-min tokens, transactional Argon2 update +
  full session revocation); dev-only `GET /auth/dev/reset-link?email=`;
  `PasswordResetToken` model (migration 20260831030000); Forgot/Reset pages
  wired to the real API; audits `auth.password_reset.requested/completed/failed`
- Storage maintenance (Sprint 8.3): `modules/maintenance/` under `/root`
  (30-day recycle-bin retention cleanup, two-stage orphan MinIO-object
  detection with 7-day grace, database/storage consistency checker, verified
  storage statistics, database-backed distributed lock with 10-min expiry +
  heartbeat); 3 new models (`MaintenanceJob`, `MaintenanceOrphanCandidate`,
  `MaintenanceLock`) via migration `20260831040000`; Root Console Storage
  Maintenance page; `scripts/maintenance-runner.js` (24h scheduled),
  `maintenance-cleanup.js` (manual `--dry-run`/`--confirm`),
  `maintenance-storage-check.js` (read-only); 7 audit event types;
  reference-safe MinIO deletion respects copies, deliveries, AACCUP snapshots
- Tooling: `restart-server.ps1`, `ai-dev.bat`, `tunnel-all.ps1` /
  `tunnel-stop.ps1` (Cloudflare quick-tunnel deploy + restore),
  `scripts/cleanup-demo-data.js`,
  `scripts/cleanup-recycle-bin.js`,
  `scripts/maintenance-runner.js`, `scripts/maintenance-cleanup.js`,
  `scripts/maintenance-storage-check.js`
  `scripts/smoke-repository.ps1`, `scripts/smoke-repository-rules.ps1`,
  `scripts/smoke-aaccup.ps1`, `scripts/smoke-requests.ps1`,
  `scripts/smoke-account.ps1`, `scripts/smoke-password-reset.ps1`,
  `scripts/smoke-maintenance.ps1`

## 5. Known issues (confirmed)

- No test files (server `test` exits 1; vitest unused).
- No ESLint 9 config for the client (`lint` cannot start).
- `prisma migrate dev` broken — manual SQL + `migrate deploy` (D-012).
- `DocumentRequest` has no soft-delete column (archival needs a migration).
- MinIO object GC is now fully operational (Sprint 8.3): scheduled
  `maintenance-runner.js` covers recycle-bin retention, orphan detection,
  and post-grace cleanup; the older `cleanup-recycle-bin.js` script is
  superseded.
- Storage "available" metric `null` (no MinIO quota probe).
- Roles/permissions management UI absent (backend CRUD complete).
- Vite chunk-size warning non-blocking.
- Background copy jobs run in-process (no worker process; crash restarts the
  job as FAILED — acceptable for 1.0).
- Client `ROLE_PERMISSIONS` (permissions.tsx) is a hand-maintained parallel
  matrix that can drift from the server role matrix; client UI never
  hard-gates by it (intentional — see D-025), so 403s surface from the API
  if drift occurs (e.g. department_head review buttons).
- Frozen `lib/storage.ts` was modified once by explicit request (D-027 —
  presigned URLs signed for `MINIO_PUBLIC_ENDPOINT`); treat it as frozen
  again.
- Frozen `modules/auth/*` was modified minimally for Sprint 8.1 (D-030):
  session-revoke audit events + additive `/auth/me` fields; treat as frozen
  again.
- Uploads have NO size cap (D-028); the admin Settings page no longer
  exposes a limit selector (the legacy `maxUploadSizeBytes` system-setting
  row may still exist in the DB and is ignored).
- Email is read-only identity (D-029): no self-service email change until a
  verified change flow exists (Sprint 8.2+).
- Password recovery (D-031): reset tokens hashed at rest, 20-min single-use;
  `GET /auth/dev/reset-link` is development-only (404 in production).
  After a reset, old refresh tokens fail once the frozen auth module's 60s
  rotation-grace window passes (the reuse path then revokes ALL sessions).
- The pre-existing `authLimiter` `skip: res.statusCode < 400` hook evaluates
  before handlers and therefore never counts requests (latent; the Sprint
  8.2 reset limiter counts all requests instead).

## 6. Priorities

1. **Cloudflare VPS production deployment** — V1.0 release readiness; DNS,
   SSL, automated backups, monitoring.
2. UX/feedback consistency; bug fixes surfaced by demos.

## 7. Non-negotiables

- Frozen: `modules/auth/*`, `middlewares/authenticate`,
  `middlewares/authorize` (callers only), `lib/storage.ts` (one explicit
  exception recorded as D-027), Docker config unless a sprint asks.
- No production mock data; dashboards show real data only; everything
  user-created persists; permissions additive-only; every mutation audited
  once; every sprint ends with the §19 smoke checklist
  (`engineering/testing.md`).

## 8. Demo identities

- `root@urs.local` — ROOT (password from `.env` `BOOTSTRAP_ROOT_PASSWORD`)
- `christbaldado@gmail.com` — ADMINISTRATOR
- `neil@thesis.com` — FACULTY (College of Education)

## 9. Next objective

Remaining 1.0 backlog per `docs/context/PROJECT_ROADMAP.md`: production
deployment (VPS + Cloudflare tunnel), monitoring, automated backups.
Do not begin work outside the roadmap; end every change with the smoke
checklist and update `PROJECT_STATUS.md`.

## 10. Read-first files per sprint

| File | Why |
|---|---|
| `docs/context/AI_CONTEXT.md` (this) | Current state |
| `docs/context/PROJECT_STATUS.md` | Sprint history |
| `docs/context/MODULE_INDEX.md` | Module map |
| `docs/engineering/*.md` | Only the relevant topic (coding/backend/database/…) |
| `docs/specification/*.md` | Only the module you touch |
