# URS-DMS — Handoff Summary for the Next AI Session

> Send this file (plus any question-specific file paths it references) to the
> next AI/agent. It captures the current state, conventions, recent work, and
> the recommended next steps. Live detail: read `docs/context/AI_CONTEXT.md`
> (current state), `docs/context/PROJECT_STATUS.md` (sprint history),
> `docs/context/DECISIONS.md` (D-001…D-028), `API_CONTRACTS.md` (endpoints),
> `CHANGELOG.md` (chronological log).

---

## 1. What this project is

**URS-DMS** — a Document Management System for University Recognition and
Accreditation (URS). Handles AACCUP / ISO / Certification accreditation
(areas, requirements, submissions, review, tasks), personal document
repositories (folders, files, versions, recycle bin, favorites, requests),
user/role management, dashboards, audit logs, notifications, and a ROOT
console (configuration engine, folder/requirement/workflow/form builders,
setup wizard). Local-first deployment (Docker), zero internet dependency in
production; Cloudflare quick tunnels are used only for temporary remote
sharing during development.

Repository: `C:\Dev\URS-DMS` (Windows). Git remote:
`https://github.com/ikykchrist/URS-DMS.git` (branch `master`).

## 2. Tech stack & how to run

- **Client**: React 18 + TypeScript (strict) + Vite 5 + Tailwind 3 +
  shadcn-style UI (`client/`). Vite proxies `/api` → `http://localhost:4000`.
- **Server**: Node ≥ 20 + Express 4.21 + TypeScript strict (`server/`),
  Prisma 5.22, zod 3.23, argon2, JWT auth, winston.
- **Infra (Docker)**: PostgreSQL 16 (`urs-postgres`, :5432) + MinIO
  (`urs-minio`, :9000/:9001) + pgAdmin (:5050). Data lives in Docker named
  volumes — never in the repo.

**Running locally (dev):**
```powershell
# infra
docker compose up -d postgres minio
# server (compiled — env loaded via --env-file, npm run dev:server does NOT load .env)
cd server; node --env-file=C:\Dev\URS-DMS\.env dist/server.js   # or: ..\restart-server.ps1
# client
cd client; npm run dev                                         # :5173
```
- `.env` is gitignored; copy `.env.example → .env` on a new machine.
  `DATABASE_URL` must use `localhost:5432` (was once `urs-postgres` — Docker
  hostname only works inside containers). Rate limit: `RATE_LIMIT_MAX=500`
  per 15 min per IP — repeated smoke runs can hit it; restart resets it.
- Credentials in `.env`: `BOOTSTRAP_ROOT_EMAIL/PASSWORD` (ROOT),
  `BOOTSTRAP_ADMIN_*`. Demo accounts: `root@urs.local` (ROOT),
  `christbaldado@gmail.com` (ADMINISTRATOR), `neil@thesis.com` (FACULTY).

**Remote sharing (Cloudflare quick tunnels):**
```powershell
.\tunnel-all.ps1   # app(5173)+minio(9000)+console(9001); rewrites
                   # MINIO_PUBLIC_ENDPOINT; restarts API + Vite with
                   # VITE_API_BASE=/api/v1 (same-origin /api proxy, no CORS)
.\tunnel-stop.ps1  # kills tunnels, restores .env from .env.tunnel-backup
```
URLs are ephemeral (change each run). Logs: `urs-tunnel-*.log`.

## 3. Architecture & conventions (follow these)

- Module layering everywhere: `routes → controller → service → repository →
  Prisma`, mounted under `/api/v1` (`server/src/routes/index.ts`). ROOT
  surfaces under `/api/v1/root` (hard `requireRole("ROOT")`).
- Response envelope: `{ success, data, meta? }` via
  `server/src/utils/apiResponse.ts` (`sendSuccess`/`sendCreated`/`sendNoContent`).
- Validators: zod in `server/src/modules/<module>/*.validator.ts`
  (`validateBody/Query/Params` middlewares). Validation failures → 400 with
  `details.fieldErrors` (the client surfaces the first field message).
- RBAC: permissions are DB-backed codes (`permissions.constants.ts`, 100+,
  additive-only); role matrix in `roles.constants.ts`; route gates via
  `requirePermission(...)` / `requireAnyPermission(...)` /
  `requireRole(...)` in `middlewares/authorize.ts`. NEVER hardcode
  `if (role === "admin")`. Note D-025: the client `ROLE_PERMISSIONS` matrix
  (`client/src/lib/permissions.tsx`) is a hand-maintained parallel that may
  drift — UI gating is intentionally loose; the server is the authority.
- Audit: every business mutation writes exactly one entry via `writeAudit`
  (`modules/audit/audit.service.ts`) — never fails the operation.
- Notifications: `notifyUser(userId, type, input)` / `notifyUsers(ids, …)`
  from `modules/notifications/notifications.service.ts`; types must exist in
  the Prisma `NotificationType` enum AND the `NOTIFICATION_EVENTS` catalog
  (`notifications.events.ts`); emitting adds a new enum value = migration.
- BigInt on the wire: always `.toString()` (string) — e.g. `sizeBytes`.
- Migrations: `prisma migrate dev` is BROKEN on this repo (shadow-DB replay
  fails on an old migration) → write `migration.sql` files manually and apply
  with `prisma db execute` (see D-012). Pattern: folder
  `server/prisma/migrations/YYYYMMDDHHMMSS_name/migration.sql`, apply with
  `prisma db execute --url <DATABASE_URL> --stdin`, then `prisma generate`
  (stop the running server first — the engine DLL is locked).
- Frozen modules (do not touch unless explicitly asked): `modules/auth/*`,
  `middlewares/authenticate`, `middlewares/authorize` (callers only),
  `lib/storage.ts` (one recorded exception: D-027), Docker config.
- No production mock data; dashboards show live data only; every sprint ends
  by running the smoke suites and updating `PROJECT_STATUS.md`.

## 4. Recent work (all verified, 2026-08-08)

1. **AACCUP group UX** — one sidebar "AACCUP" entry on both portals with an
   in-page tab strip (shared `components/aaccup/AACCUPGroupTabs.tsx`):
   admin `AACCUP | ISO | Certification | Submissions | My Tasks`, user
   `AACCUP | ISO | Certification | My Submissions | My Tasks`; tabs synced to
   `?tab=`; deep links `/iso`, `/certification`, `/user/iso`, `/submissions`
   land on the right tab.
2. **Area CRUD** — `AddAreaModal` create+edit (name, description, department,
   status), pencil on area cards + Edit in the details modal; per-area
   submissions table has Approve/Return/Reject.
3. **Requirements** — `RequirementModal` + Requirements tab in the area
   details modal (add/edit/archive); ROOT-builder-managed areas are read-only.
4. **Tasks** — `GET /aaccup/tasks/assignees` (QAO-friendly picker),
   `dueDate` null fix (was → 1970), area picker when opened via quick action,
   assignee transitions OPEN→IN_PROGRESS→COMPLETED (authorization inside the
   service), `GET /aaccup/tasks?mine=true`, `AACCUP_TASK_ASSIGNED`
   notifications, submissions link to tasks via `taskId`.
5. **Submissions** — per-row Approve/Return/Reject, fixed Return modal
   (was wrongly calling `/requests/:id/reject`), repository-style rows
   (single-click select, double-click preview), set filter, status-filter
   case fix, department name populated, bulk Archive/Delete wired,
   `AACCUP_SUBMISSION_PENDING_REVIEW` to reviewers on create. Shared
   `components/aaccup/SubmissionsTable.tsx` (review/view modes) +
   `TaskSubmitDialog.tsx`.
6. **Requests** — multi-file (1–3 docs per request via `DocumentRequestItem`;
   legacy `documentId` kept; FULFILLED delivers every item), admin Requests
   tab (`pages/RequestsReview.tsx`: approve with optional note, reject with
   REQUIRED reason), `GET /requests/browse` (department bucket, list-only:
   name/type/owner/date/size — no presigned URLs), user browse rework (max 3
   files, required explanation), request details modal + cancel.
7. **UI unification (UI only — no permission changes)** — shared tab strip,
   shared tables/dialogs, user command palette (Ctrl+K) + quick actions,
   dead controls removed (toolbar filters now functional, Bulk Assign
   removed, broken saved-view presets, dashboard "Recent Submissions" table
   relabeled "Recent Requests" and pointed at the Requests page, mojibake
   chars, orphaned pages deleted: `AACCUPManagementISO/Cert.tsx`,
   `UserSubmitRequest.tsx`, `UserAACCUP/ISO/Cert.tsx`), "My Documents"
   labels unified, user dashboard dead "Upcoming Deadlines" card replaced
   with Recent Requests, shared Table primitives.
8. **Tunnel deployment** — `tunnel-all.ps1`/`tunnel-stop.ps1` (see §2);
   D-027 presigned URLs are signed for `MINIO_PUBLIC_ENDPOINT` (was: host
   rewritten post-signing → 403 SignatureDoesNotMatch).
9. **Upload size cap removed (D-028)** — 100 MB caps removed from the
   validator, `assertUploadPolicy`, seed data, and the Settings UI; file-type
   allowlist still enforced.
10. **Bug fixes** — Add User failed for dotted emails (employeeId derived
    from email prefix now sanitized); validation errors now surface the real
    field message; `document_request_items.documentId` FK → CASCADE so
    permanent document delete works (D-026).
11. **Sprint 8.1 — Account & Session Management** — shared Account & Security
    page on both portals (profile edit via new `PATCH /users/me` with a
    `.strict()` name-only whitelist; read-only email/role; change password;
    active sessions with "Current Session" badge, revoke one, "Sign Out All
    Other Devices" with confirmation). Reused existing auth endpoints
    (`GET /auth/me`, `GET /auth/sessions`, `POST /auth/sessions/:id/kill`,
    `POST /auth/sessions/kill-all`, `POST /auth/change-password`,
    `POST /auth/logout`). Minimal frozen-auth change (D-030): revoke
    operations now audit `session.revoked` / `session.revoked_others` once
    each; `/auth/me` gained `departmentName`/`createdAt`/`lastLogin`.
    `users.self.update` granted to READ_ONLY. Email is read-only identity
    (D-029). Smoke: `scripts/smoke-account.ps1` 35/35.
12. **Sprint 8.2 — Password Recovery** — `POST /auth/forgot-password`
    (generic non-enumerating response; dedicated 12/15-min rate limiter;
    durable-email reset link built from `CLIENT_URL[0]`), `POST
    /auth/reset-password` (single-use SHA-256-hashed 20-minute tokens —
    `PasswordResetToken` model + migration `20260831030000`; transactional
    Argon2 update + outstanding-token invalidation + ALL-session revocation;
    generic invalid/expired/used rejection; refuses resetting to the current
    password), and a development-only `GET /auth/dev/reset-link?email=`
    helper (404 outside `NODE_ENV=development`) so the flow is testable
    without SMTP. New `modules/passwordReset/` mounted on `/auth` after the
    frozen authRouter (no frozen files modified). Forgot/Reset pages wired
    to the real API. Audit `auth.password_reset.requested/completed/failed`
    exactly once each. Smoke: `scripts/smoke-password-reset.ps1` 30/30;
    Sprint 8.1 regression 35/35.

## 5. Verification

```powershell
# build/lint (client lint has NO config — skip; use tsc + build)
npm --workspace server run typecheck; npm --workspace server run lint; npm --workspace server run build
npm --prefix client exec tsc -- --noEmit; npm --prefix client run build
# smoke (need server up on :4000 + docker postgres/minio)
powershell -ExecutionPolicy Bypass -File scripts\smoke-password-reset.ps1    # 30/30 (Sprint 8.2)
powershell -ExecutionPolicy Bypass -File scripts\smoke-account.ps1            # 35/35 (Sprint 8.1)
powershell -ExecutionPolicy Bypass -File scripts\smoke-aaccup.ps1             # 43/43
powershell -ExecutionPolicy Bypass -File scripts\smoke-requests.ps1           # 32/32
powershell -ExecutionPolicy Bypass -File scripts\smoke-repository.ps1         # 49/49
powershell -ExecutionPolicy Bypass -File scripts\smoke-repository-rules.ps1   # 40/40
```
Smoke scripts are self-cleaning (SMK-prefixed fixtures; pre-clean leftovers).
Use `powershell.exe -File … *> log.txt` if console output seems swallowed.

## 6. Known issues / open items

- **No tests** (vitest configured but unused; `server test` exits 1).
- **No client ESLint 9 config** (`npm --prefix client run lint` fails).
- `prisma migrate dev` broken (D-012) — manual SQL workflow.
- `DocumentRequest` has no soft-delete column (archival needs a migration).
- MinIO object GC partial; no scheduled retention cron; storage "available"
  metric is `null`.
- Roles/permissions management UI absent (backend CRUD complete).
- Background copy jobs run in-process (no worker).
- Client `ROLE_PERMISSIONS` can drift from the server matrix (D-025).
- Vite chunk-size warning (non-blocking).

## 7. Recommended next steps (from `PROJECT_ROADMAP.md` / AI_CONTEXT priorities)

1. **Retention cron scheduling** for the recycle-bin sweep (BACKUP_RECOVERY
   cadence); defense readiness; smoke discipline.
2. UX/feedback consistency; bug fixes surfaced by demos.
3. Production deployment — later, out of 1.0.

When starting: read `docs/context/AI_CONTEXT.md`, `PROJECT_STATUS.md`,
`MODULE_INDEX.md`, the relevant `docs/specification/*.md` and
`docs/engineering/*.md`, and `API_CONTRACTS.md`; end every change with the
smoke suites and update `PROJECT_STATUS.md` + `CHANGELOG.md`.
