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
| Current sprint | Repository Rules 1–30 implementation — COMPLETE (49/49 base + 40/40 rules smoke) |
| Current goal | Finish 1.0 backlog (notification emitters wiring, self-service profile/sessions, password reset); keep every surface demo-safe with real data only |

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
- Accreditation: areas/requirements/submissions/tasks per set (AACCUP/ISO/
  CERT), compliance + analytics, admin + user tabs
- Dashboard / analytics / reports / audit (live data only)
- Notifications + durable email queue (+ repository-rule emitters)
- Admin: users, roles, permissions, departments, colleges, settings
- Root Console: Configuration Engine, Organization, Folder/Requirement/
  Workflow/Form Builders, Setup Wizard, Control Center
- Client hardening: ErrorBoundary, lazy-loaded Root pages, page titles,
  toasts, session-expiry redirect
- Tooling: `restart-server.ps1`, `ai-dev.bat`, `scripts/cleanup-demo-data.js`,
  `scripts/cleanup-recycle-bin.js`, `scripts/smoke-repository.ps1`,
  `scripts/smoke-repository-rules.ps1`

## 5. Known issues (confirmed)

- No test files (server `test` exits 1; vitest unused).
- No ESLint 9 config for the client (`lint` cannot start).
- `prisma migrate dev` broken — manual SQL + `migrate deploy` (D-012).
- `DocumentRequest` has no soft-delete column (archival needs a migration).
- MinIO object GC is partial (retention sweep exists; dedicated GC job not
  scheduled).
- Storage "available" metric `null` (no MinIO quota probe).
- Roles/permissions management UI absent (backend CRUD complete).
- Vite chunk-size warning non-blocking.
- Background copy jobs run in-process (no worker process; crash restarts the
  job as FAILED — acceptable for 1.0).

## 6. Priorities

1. Self-service `PATCH /users/me` + sessions list/revoke.
2. Forgot/reset password endpoints (email queue ready).
3. UX/feedback consistency; bug fixes surfaced by demos.
4. Retention cron scheduling; defense readiness; smoke discipline.
5. Production deployment — later, out of 1.0.

## 7. Non-negotiables

- Frozen: `modules/auth/*`, `middlewares/authenticate`,
  `middlewares/authorize` (callers only), `lib/storage.ts`, Docker config
  unless a sprint asks.
- No production mock data; dashboards show real data only; everything
  user-created persists; permissions additive-only; every mutation audited
  once; every sprint ends with the §19 smoke checklist
  (`engineering/testing.md`).

## 8. Demo identities

- `root@urs.local` — ROOT (password from `.env` `BOOTSTRAP_ROOT_PASSWORD`)
- `christbaldado@gmail.com` — ADMINISTRATOR
- `neil@thesis.com` — FACULTY (College of Education)

## 9. Next objective

Remaining 1.0 backlog per `docs/context/PROJECT_ROADMAP.md`: self-service
profile + sessions, forgot/reset password, retention cron scheduling.
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
