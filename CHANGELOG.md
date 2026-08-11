# URS-DMS — Changelog

> Chronological log of changes per sprint. Newest first. Companion:
> `PROJECT_STATUS.md` (sprint reports), `AI_CONTEXT.md` (current state),
> `ENGINEERING_RULES.md` (standards), `URS_DMS_SPECIFICATION.md` (spec).

---

## Cross-module stabilization - Audit, dashboards, notifications, repository (2026-08-11)

- Fixed auth audit attribution/classification, ROOT refresh-as-login
  duplication, audit filters/date presets, null actor rendering, detail
  loading, and password-reset failure classification.
- Fixed user accreditation navigation for AACCUP/ISO/Certification,
  Returned/Needs Revision deep links, notification single-click routing, and
  admin notification navigation.
- Fixed repository current-level folder rendering, visible list names,
  accessible action menus, touch-safe Open actions, pinned-first ordering,
  folder color persistence/rendering, and file/folder/bulk Copy confirmation.
- Verified client/server typechecks and builds plus 46 server tests. No
  migrations, resets, deployments, or Docker volume operations performed.

## Admin dashboard workflow upgrade (2026-08-11)

- Replaced the analytics-heavy admin dashboard view with real operational
  attention counts, accreditation progress, recent submissions, requests,
  tasks, and recent audit activity.
- Added keyboard-accessible dashboard navigation with URL-backed submission,
  request, task, accreditation, and entity highlighting destinations.
- Preserved task/request/submission filters through refresh and browser
  navigation, including the backend `NEEDS_REVISION` status as Returned.

## User Management - Department assignment fix (2026-08-11)

- Fixed User Details sending `status` through the strict general user-update
  endpoint when assigning a department. Department/role updates and explicit
  status changes now use their correct endpoints.
- User Details now awaits saves, keeps API failures inside the dialog, blocks
  dismissal while saving, and reconciles successful responses directly into
  the selected user and table.
- Suspended users retain `SUSPENDED` when only their department changes; status
  mutates only after the Active Status switch is explicitly changed.
- Department/role option loading now clears stale options, handles failures,
  and ignores completions after the dialog changes or closes.
- Verified through the real modal: Department A to Department B, PATCH `200`,
  persisted `departmentId`, immediate table update, no uncaught console error;
  temporary users archived afterward. No API or database changes.

## ROOT Organization - New Department crash fix (2026-08-11)

**Client**

- Fixed `New Department` crashing the global error boundary because the form
  rendered Radix Select items with forbidden empty-string values. Optional
  parent choices now use a UI-only sentinel that maps back to the existing
  nullable API fields.
- Organization writes now send entity-specific payloads, so Department create
  no longer includes `departmentId`, which its strict ROOT DTO rejects.
- Added contract-matched inline validation for required values, code format,
  and field lengths; API conflicts remain recoverable inside the dialog.
- Added latest-request protection and current-query refresh generation so fast
  tab changes or late mutations cannot overwrite the visible entity list.

**Verification**

- ROOT browser flow: modal open/cancel, empty and invalid validation, create
  (`201`), duplicate (`409` with a friendly message), immediate list refresh,
  browser refresh, logout/login persistence, and no uncaught console exception.
- ROOT-only route enforcement verified for ADMINISTRATOR and STAFF (`403`);
  Add User and AACCUP department selectors both exposed the created department.
- Dialog verified at 1366x768, 768x1024, and 390x844. Server RBAC tests pass
  (24/24). The smoke department/user were archived through audited API paths.
- No API, Prisma schema, migration, or destructive database changes.

## Sprint 8.5 — Background Jobs, Concurrency & Heavy-Load Reliability (2026-08-08)

**Infrastructure**

- Redis 7 added to `docker-compose.yml` (`urs-redis` container on port 6380,
  persistent AOF, 128MB maxmemory, allkeys-lru eviction).
- `ioredis` + `bullmq` packages installed.
- `lib/redis.ts` — singleton Redis client with retry strategy (10 attempts,
  200ms base), duplicate subscriber, `redisHealth()` ping probe,
  `disconnectRedis()` graceful close.
- `lib/queue.ts` — BullMQ abstraction: 4 named queues (`urs-folder-copy`,
  `urs-folder-zip`, `urs-email-delivery`, `urs-maintenance`), `enqueue()`,
  `createWorker()`, `getQueueMetrics()`, `shutdownQueues()`. Shared defaults:
  3 attempts, exponential backoff (2s base), auto-remove completed after 24h.
- Prisma connection pool configured via docker-compose: `connection_limit=20`,
  `pool_timeout=30` on DATABASE_URL.
- New env vars (server/src/config/env.ts):
  `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`,
  `DATABASE_CONNECTION_LIMIT`, `WORKER_CONCURRENCY`, `JOB_RETRY_LIMIT`,
  `JOB_TIMEOUT_MS`, `ZIP_EXPIRATION_SECONDS`.

**Workers**

- `workers/startup.ts` — registers all 4 workers at server boot.
- `workers/folderCopy.worker.ts` — replaces the in-process fire-and-forget
  IIFE in `folders.service.ts`. Persisted `repository_copy_jobs` row is
  created synchronously; BullMQ picks up the job and handles execution.
  Progress is tracked via `job.updateProgress()` + periodic DB updates.
  Survives server restarts (BullMQ retry with exponential backoff).
- `workers/folderZip.worker.ts` — for large folder ZIP requests, streams
  the ZIP from MinIO into a temporary MinIO object, stores the presigned
  download URL in Redis with `${ZIP_EXPIRATION_SECONDS}` TTL. Cleanup is
  automatic via Redis key expiry.
- `workers/email.worker.ts` — replaces the in-process `setInterval` poller
  in `email.service.ts`. Reuses existing `claimDueMessages` / `markSent` /
  `markFailed` repository functions. Exponential backoff for retries.
  Legacy poller kept as fallback.
- `workers/maintenance.worker.ts` — wraps `runRecycleCleanup` /
  `runOrphanScan` / `runOrphanCleanup` from the maintenance service. The
  database-backed lock in `maintenance.jobs.ts` still prevents concurrent
  execution.

**Email service**

- `sendEmail()` now enqueues to BullMQ as primary delivery path; falls
  back to in-process `processQueue()` if Redis is unavailable.

**Folder copy service**

- `startFolderCopyJob()` in `folders.service.ts` now enqueues via
  `enqueue(QUEUE_NAMES.FOLDER_COPY, ...)` instead of `void (async () => { ... })()`.
  Job record is still created in `repository_copy_jobs` for polling.

**Server lifecycle**

- `server.ts` rewritten: graceful shutdown handles HTTP server close →
  BullMQ worker shutdown → Redis disconnect → Prisma disconnect. Workers
  started via dynamic import after server listen.
- SIGINT/SIGTERM handled with async shutdown; 10s force-kill fallback.

**Health endpoint**

- `/api/v1/health` now includes:
  - `services.redis` (ping + latencyMs)
  - `queues` (waiting/active/completed/failed/delayed per queue)
  - `memory` (rssMB, heapUsedMB)

**Load testing**

- `scripts/load-test.ps1` — parameterized concurrent-user load test
  (`-Users N -Duration S`). Login → list folders → list documents →
  health check in a loop per user via background jobs. Reports total
  requests, success/failure counts, p50/p95 latency, server memory.

**Results** (5 concurrent users, 15s): 279 requests, 0 failures, avg 22.6ms
latency, p95 39ms, server RSS 110MB.

## Sprint 8.4 — Roles & Permissions Management (2026-08-08)

**Backend**

- New `modules/root/root.rolesPermissions.routes.ts` + `root.rolesPermissions.service.ts`
  mounted under `/root/roles-permissions` (hard `requireRole("ROOT")` — no
  ADMIN access):
  - `GET /root/roles-permissions/matrix` — returns all roles with bound
    permission codes + full permission catalog + ROOT-only codes.
  - `GET /root/roles-permissions/catalog` — returns the full permission
    catalog (code, module, description).
  - `PATCH /root/roles-permissions/roles/:id/permissions` — replaces a
    role's permission bindings atomically with privilege-escalation guard
    and catalog validation; ROOT role permissions are fixed and immutable;
    ADMINISTRATOR role is mutable (through Root Console only).
- Reuses existing `admin/roles/roles.repository.ts` for data access — no
  duplicate business logic. All guards (escalation, ROOT protection,
  catalog validation) are re-asserted in the root service layer.

**Client**

- `RootRolesPermissions.tsx` (~410 lines) — ROOT-only page with role list
  panel (left), permission matrix panel (right) grouped by module. Features:
  - Permission checkboxes per role with toggle, search, and module filter
    pills.
  - ROOT-protected codes shown as locked + disabled with shield icon.
  - ROOT ONLY badge on `rootOnlyCodes`.
  - Modified/unsaved state indication with Reset and Save Changes buttons.
  - Confirmation dialog with diff summary (added/removed codes) before save.
  - Loading skeleton, empty state, archived role state.
  Registered in `App.tsx` (`root-roles-permissions`) and `Sidebar.tsx`
  (Roles & Permissions under Root Console, Shield icon).
- `lib/permissions.tsx` refactored (Sprint 8.4):
  - New `hasServerPermission(user, code)` — checks `user.permissions`
    array (populated from `GET /auth/me`). **Preferred method for new code.**
  - New `hasAnyServerPermission(user, codes)` / `hasAllServerPermissions(user, codes)`.
  - New `getUserPermissions(user)` — returns full set.
  - New `isRootUser(user)` — server-authoritative ROOT check via
    `root.access` code.
  - New `isAdminUser(user)` — server-authoritative admin-gate check.
  - Legacy `ROLE_PERMISSIONS` matrix, `isAdminRole()`, `isRootRole()`
    retained for backward compatibility.
- `services/admin.ts` — new API wrappers: `getRolesPermissionMatrix()`,
  `getPermissionCatalog()`, `updateRolePermissions(roleId, permissions)`.

**Docs**

- `engineering/security.md`: RBAC section updated with Sprint 8.4 additions.
- `specification/users.md`: server-authoritative client permissions + management page.
- `AI_CONTEXT.md` / `PROJECT_STATUS.md` / `CHANGELOG.md` updated.
- `API_CONTRACTS.md`: root roles-permissions endpoints documented.

**Smoke**

- `scripts/smoke-roles-permissions.ps1` — 28 checks covering authorization
  (ROOT-only matrix, ADMIN/FACULTY/anon denied), matrix structure (roles,
  catalog, rootOnlyCodes), catalog grouping, PATCH permission save +
  persist + restore, ROOT permission protection (blocked mutation),
  escalation guard (admin PATCH denied), `/auth/me` granular permissions
  (root + faculty), and audit trail.

**Backend**

- New `modules/maintenance/` (service → routes → jobs) mounted under
  `/root/maintenance` (hard ROOT role gate + `root.access` permission):
  - `GET /root/maintenance/status` — job history, lock state, orphan
    candidate counts, storage statistics.
  - `GET /root/maintenance/storage` — verified storage statistics (MinIO
    object count/size, active file count, recycle-bin storage, pending orphan
    storage; capacity fields return null rather than fabricated numbers).
  - `GET /root/maintenance/check` — READ-ONLY consistency check: active
    files/folders, stored object references, expired recycle-bin items,
    missing MinIO objects (reported, never silently deleted), orphan
    candidate count, failed/pending job counts.
  - `GET /root/maintenance/orphans` — paginated orphan candidate list.
  - `POST /root/maintenance/scan` — orphan MinIO-object scan (detection
    only; records candidates in `maintenance_orphan_candidates`).
  - `POST /root/maintenance/cleanup-recycle` — 30-day retention recycle-bin
    cleanup (requires `confirm: true` for destructive mode); batch-based,
    snapshot-guarded (AACCUP submissions block permanent removal),
    reference-counted (MinIO objects deleted ONLY when zero version rows
    reference them), idempotent.
  - `POST /root/maintenance/cleanup-orphans` — two-stage orphan cleanup
    (SCAN → CANDIDATE → 7-day grace → RE-VERIFY → DELETE); requires
    `confirm: true`; re-referenced candidates are marked `RE_REFERENCED` and
    preserved; "object not found" is handled idempotently.
- Maintenance jobs module (`maintenance.jobs.ts`):
  - Database-backed distributed lock (`maintenance_locks` row) with 10-minute
    expiry and 60-second heartbeat — crashed workers cannot permanently block
    maintenance; no Redis dependency.
  - Job persistence in `maintenance_jobs` (jobId, type, status, counts, error,
    batchCursor, timestamps); PENDING → RUNNING → COMPLETED/FAILED lifecycle.
  - Shared lock-release heartbeat pattern used by all destructive jobs.
- Reference-safe physical object deletion (`deleteDocumentWithObjects`):
  - Before deleting a MinIO object, counts ALL `DocumentVersion` rows
    referencing that key (including copies, Requested Document deliveries,
    and replace-version history).
  - Object is deleted ONLY when no other reference exists.
  - AACCUP submission snapshots block document permanent removal entirely
    (RESTRICT FK checked before proceeding).
- 7 new audit action codes: `maintenance.recycle_cleanup.*`,
  `maintenance.storage_scan.completed`, `maintenance.orphan_cleanup.*`,
  `maintenance.storage_check.completed`, `maintenance.manual_triggered`.
  Audit events are ONE per job run (never per item) with jobId and counts.
- MinIO storage helpers (additive to frozen `lib/storage.ts`):
  `objectExists()` (stat probe), `listObjectKeys()` (streaming list with
  cap), `statObject()` (size retrieval).
- Cleanup notifications: owners receive `RECYCLE_BIN_CLEANUP` notification
  when an expired item is permanently removed (best-effort, never blocks).

**Database**

- Migration `20260831040000_add_maintenance_models` (3 tables):
  `maintenance_jobs` (jobId unique, jobType+status indexed, status+createdAt
  indexed, batchCursor JSONB), `maintenance_orphan_candidates` (objectKey
  unique, status+firstSeenAt indexed), `maintenance_locks` (jobType PK with
  expiry — crashed worker auto-recovery).

**Client**

- `RootMaintenance.tsx` (~350 lines) — Root Console page with storage
  overview cards (object count, active files, recycle bin, orphan
  candidates), maintenance job history table, orphan candidates table, and
  controlled action buttons (Scan, Recycle Cleanup, Orphan Cleanup) with
  dry-run toggle and confirmation dialog before any destructive operation.
  Registered in `App.tsx` (`root-maintenance`) and `Sidebar.tsx` (Storage
  Maintenance under Root, HardDrive icon).

**Scripts**

- `scripts/maintenance-runner.js` — scheduled runner (boot + every 24 hours,
  `--once` for single cycle); logs in via ROOT credentials from `.env`,
  performs recycle cleanup + orphan scan via the Root API; lock prevents
  duplicate execution across instances.
- `scripts/maintenance-cleanup.js` — manual driver with `--dry-run`,
  `--scan`, `--recycle`, `--orphans`, `--confirm` flags; dry runs delete
  nothing; destructive cleanup requires `--confirm`.
- `scripts/maintenance-storage-check.js` — read-only consistency check via
  the Root API, prints full JSON report.
- npm scripts: `maintenance:run`, `maintenance:cleanup`, `maintenance:storage-check`.

**Docs**

- DECISIONS.md: D-032 (7-day orphan grace period), D-033 (database-backed
  maintenance lock).
- `engineering/storage.md`: maintenance section added.
- `specification/repository.md`: Recycle Bin updated to reference the new
  scheduled `maintenance-runner.js`.
- `AI_CONTEXT.md` / `PROJECT_STATUS.md` / `MODULE_INDEX.md`: Sprint 8.3
  updated.

**Smoke**

- `scripts/smoke-maintenance.ps1` — 29 checks covering authorization
  (ROOT-only, ADMIN/FACULTY/anon denied), <30-day preservation, >=30-day
  cleanup (files + nested folder trees), shared-blob reference survival,
  AACCUP snapshot guard, orphan two-stage flow (candidate → grace →
  dry-run → verified cleanup), missing-object reporting (never deleted),
  idempotent cleanup, storage statistics with real data + null capacity,
  maintenance audit trail, and fixture self-clean.

## Sprint 8.2 — Password Recovery & Account Security (2026-08-08)

**Backend**

- New `modules/passwordReset/` (routes → controller → service → repository →
  Prisma) mounted on `/api/v1/auth` AFTER the frozen `authRouter` (additive,
  no frozen auth file modified):
  - `POST /auth/forgot-password` — always 200 with the SAME generic message
    ("If an account exists for this email, password reset instructions have
    been sent") for known and unknown accounts (no enumeration). Known
    ACTIVE accounts get a single-use reset token + queued email.
  - `POST /auth/reset-password` — validates the token, rejects invalid /
    expired / already-used tokens with a generic error, refuses resetting to
    the current password, and transactionally: updates the Argon2 hash,
    marks the token used, invalidates all other outstanding tokens, and
    revokes EVERY refresh session (old refresh tokens can no longer obtain
    new access tokens).
  - `GET /auth/dev/reset-link?email=` — DEVELOPMENT-ONLY (404 outside
    `NODE_ENV=development`) helper that returns the latest reset token so
    local testing can exercise the full flow without SMTP.
- Token design (D-031): 384-bit random token (`randomToken(48)`), only its
  SHA-256 hash stored (`PasswordResetToken.tokenHash` unique), 20-minute
  expiry, single-use (`usedAt`), outstanding older tokens invalidated on
  every new request or completion. New Prisma model + migration
  `20260831030000_add_password_reset_tokens` (FK → users, CASCADE).
- Dedicated reset rate limiter (12 requests / 15 min / IP, counts every
  request — separate from login/refresh so hammering cannot lock auth).
  Note: the pre-existing `authLimiter`'s `skip: res.statusCode < 400` hook
  evaluates before the handler and never counts (documented; not changed —
  frozen-adjacent middleware).
- Email reuses the durable queue (`sendEmail`): subject "Reset your
  URS-DMS password", 20-minute expiry notice, link built from
  `CLIENT_URL[0]` → `/reset-password?token=…`. No secrets, no tokens in
  audit; audit actions `auth.password_reset.requested` /
  `.completed` / `.failed` (exactly one per event).

**Frontend**

- `services/auth.ts`: `forgotPassword` / `resetPassword` implemented
  (previously stubs returning "not available yet"); a successful reset
  clears local tokens so the app returns to login.
- `ForgotPasswordForm.tsx`: real API call, generic success screen
  ("If an account exists…", 20-minute expiry), loading/error states kept.
- `ResetPasswordForm.tsx`: real API call, server errors surfaced
  (invalid/expired token), existing success screen + password strength/
  show-hide/validation retained.

**Verification**

- New `scripts/smoke-password-reset.ps1` — **30/30 PASS**: generic
  known/unknown equivalence, token hashing (plaintext never stored),
  invalid/expired/used-token rejection, new-reset invalidation, valid
  reset, Argon2 hash, old password fails / new works, old refresh token
  fails (post rotation-grace), Sprint 8.1 session regression, rate
  limiting 429, audit exactly once, cleanup.
- Regression: `smoke-account.ps1` (Sprint 8.1) 35/35. Server
  typecheck/lint/build + client tsc/build pass.

---

## Sprint 8.1 — Account & Session Management (2026-08-08)

**Backend**

- **Reused existing auth self-service endpoints** (no duplicates): `GET
  /auth/me`, `GET /auth/sessions`, `POST /auth/sessions/:id/kill`,
  `POST /auth/sessions/kill-all`, `POST /auth/change-password`,
  `POST /auth/logout` (all actor-scoped, ownership enforced server-side,
  current-session identified via `req.auth.sessionId`).
- **New `PATCH /api/v1/users/me`** (users module, NOT frozen): self-service
  profile edit. Zod `.strict()` whitelist — only `firstName`, `middleName`,
  `lastName`, `suffix`; role/status/department/email/permissions are rejected
  (mass-assignment / privilege-escalation guard). Gated by the existing
  `users.self.update` permission (granted to every role incl. READ_ONLY via
  the role matrix + seed). Response is the safe authenticated view.
- **`GET /auth/me` enriched** (minimal frozen-auth change): now returns
  `departmentName`, `createdAt`, `lastLogin` — still no hashes/tokens.
- **Audit** (frozen-auth change, required by the sprint): `revokeSession` and
  `revokeOtherSessions` now write exactly one event each —
  `session.revoked` / `session.revoked_others` (new `AUDIT_ACTIONS` codes);
  `PATCH /users/me` writes `user.profile_updated` once. Existing
  login/logout auditing unchanged (no duplicates).
- **Email is read-only** (D-029): email is the login identity — no
  self-service email change in 8.1; documented limitation.

**Frontend**

- New shared **Account & Security** page (`client/src/pages/AccountSecurity.tsx`)
  used by BOTH portals: Profile (avatar upload, identity fields, editable
  name fields with save/validation/unsaved-changes states), Security (read-only
  email + role, Change Password via existing modal), Active Sessions (device/
  browser/IP/created/expires, "Current Session" badge, per-row Sign Out,
  "Sign Out All Other Devices" with confirmation, empty/loading/error states).
- User portal `/user/profile` → shared page (wrapper kept); admin portal gains
  `/profile` + TopNav "Account & Security" menu item (was a dead item).
- `services/auth.ts`: `updateProfile` implemented (PATCH /users/me),
  `meRaw()` added, `killAllOtherSessions` returns the revoked count.
- `Settings.tsx`: removed the fake "Profile Settings" editor (name/email/
  phone/department were not real self-service fields); its Account Security
  section (password + sessions modal) stays.

**Verification**

- New `scripts/smoke-account.ps1` — **35/35 PASS**: safe /me shape (no
  secrets), edit + persistence across refresh/logout/login, all 5 mass-
  assignment guards (role/status/department/email/permissions → 400), sessions
  list + current flag, revoke own session (token becomes invalid), cannot
  revoke current (400) or another user's session (404), revoke-others (count +
  current survives rotation), logout invalidation, ADMINISTRATOR + FACULTY
  self-service, audit events once each, self-cleanup.
- Regression: `smoke-requests.ps1` 32/32 (shared auth path untouched
  behaviorally). Server typecheck/lint/build + client tsc/build pass.

---

## Cloudflare tunnel deployment + upload fixes (2026-08-08)

**Deployment tooling**

- `tunnel-all.ps1` rewritten as the full deploy: app (5173) + MinIO (9000)
  + console (9001) quick tunnels; backs up `.env` to `.env.tunnel-backup`;
  rewrites `MINIO_PUBLIC_ENDPOINT` to the MinIO tunnel; restarts the API;
  restarts Vite with `VITE_API_BASE=/api/v1` so the browser calls the app
  tunnel same-origin and Vite proxies `/api` → `:4000` (no CORS, no separate
  API tunnel). `tunnel-stop.ps1` restores `.env` and local dev.
- Verified end-to-end through the tunnels: app HTML 200, API health via
  proxy `ok`, ROOT login via tunnel OK, MinIO health 200.

**Fix: presigned URL signature mismatch (D-027)**

- `server/src/lib/storage.ts` signed presigned PUT/GET URLs for the internal
  endpoint (`localhost:9000`) and then string-rewrote the host to
  `MINIO_PUBLIC_ENDPOINT` after signing. SigV4 signs the Host header, so
  MinIO returned 403 `SignatureDoesNotMatch` for every upload/download
  through the tunnel (and locally while the tunnel `.env` was active).
- Fix: presigned URLs are now signed with a client built from
  `MINIO_PUBLIC_ENDPOINT` (host/port/scheme) when set; the host-rewriting
  hack was removed. Single point — covers uploads, replace-version, preview,
  downloads, setup-wizard logo.
- Verified through the tunnel: presigned PUT → tunnel host → HTTP 200,
  verify OK, presigned GET → 200.

**Change: maximum upload size removed (D-028)**

- `documents.validator.ts`: the hard 100 MB `sizeBytes` cap was removed.
- `documents.service.ts` `assertUploadPolicy`: no longer reads/enforces
  `upload.max_size_bytes`; the file-type allowlist is still enforced.
- `root.config.seeddata.ts`: `upload.max_size_bytes` seed entry removed.
- `Settings.tsx`: the "Default Upload Size Limit" selector removed.
- Verified: 115 MB file upload (create → version → presigned PUT → verify →
  cleanup) succeeded — no size cap.

---

## AACCUP group + tasks + submissions + requests + UI unification (2026-08-08)

**AACCUP group (one tab, both portals)**

- Sidebar collapsed to a single **AACCUP** entry on both portals (admin +
  user); the three accreditation sets + review/task surfaces live in an
  in-page tab strip (shared `AACCUPGroupTabs` component).
- Tabs are URL-synced (`?tab=`) and deep links preserve the set:
  `/iso` → ISO tab, `/certification` → CERT tab, `/submissions` →
  Submissions tab (admin); `/user/iso` / `/user/certification` now land on
  the right user tab too.
- Admin tabs: AACCUP | ISO | Certification | Submissions | My Tasks.
  User tabs: AACCUP | ISO | Certification | My Submissions | My Tasks.
- Shared `SubmissionsTable` (review mode = admin with Approve/Return/Reject +
  bulk actions; view mode = user's own submissions, read-only) and shared
  `TaskSubmitDialog` for evidence uploads.

**Area management (admin)**

- Full area CRUD from the UI: `AddAreaModal` gained an edit mode (name,
  description, department, active/inactive) triggered from a pencil button
  on each area card and an Edit button in the area details modal.
- Per-area submissions table now has Approve / Return / Reject actions
  (PENDING / NEEDS_REVISION only); stats standardized (returned = REJECTED,
  pending = PENDING + NEEDS_REVISION).
- AACCUP management toolbar filters wired (search + area/status/submission
  selects + reset).

**Requirements (admin)**

- New Requirements tab in the area details modal + `RequirementModal`
  (add/edit): title, document code, description, category, priority,
  required/optional, active/inactive, display order; archive action.
  Root Requirement Builder-managed areas are detected and read-only
  (server 409 surfaces otherwise).

**Tasks (admin + user)**

- Fixed: QAO could not populate the assignee dropdowns (403 on
  `/admin/users`) → new `GET /aaccup/tasks/assignees` (aaccup.read).
- Fixed: `dueDate: null` was coerced to 1970-01-01 → validator now accepts
  null and the client omits the field.
- Fixed: dead "Create Task" quick action → the modal gained an Area picker
  when opened without an area.
- Assignees can transition their tasks OPEN → IN_PROGRESS → COMPLETED
  (PATCH authorization enforced in the service; managers keep full edits).
- `GET /aaccup/tasks?mine=true` returns tasks assigned to the caller or
  their department; new "My Tasks" tab on both portals.
- `AACCUP_TASK_ASSIGNED` notification emitted on creation; submissions can
  reference the task they fulfil (`taskId` on `AaccupSubmission`).
- Admin area-modal tasks table gained the same Start / Mark Complete /
  Submit Evidence actions as the user cards.

**Submissions**

- Per-row Approve / Return / Reject buttons on the Submissions tab (were
  missing); the Return modal was miswired to `/requests/:id/reject` and now
  calls the review API with `NEEDS_REVISION`; preview modal admin actions
  wired.
- Repository-style rows: single click selects, double click opens preview,
  action buttons stop propagation; hint text added.
- Set filter (All / AACCUP / ISO / CERT), status filter case-bug fixed,
  department name now populated by the server list, duplicate File column
  removed, bulk Archive/Delete now call the API, dead Bulk Assign removed.
- `AACCUP_SUBMISSION_PENDING_REVIEW` notification to all reviewers
  (aaccup.submission.review / aaccup.manage) when a submission is created.

**Requests**

- Multi-file requests: `DocumentRequestItem` join model; one request covers
  up to 3 documents; legacy single `documentId` retained (mirrors the first
  item). FULFILLED delivery clones every item into the requester's
  repository.
- New admin **Requests** tab (sidebar + `/requests`): full list with
  requester/files/explanation, Approve (optional note) / Reject (reason
  required — server-enforced) dialogs; Dashboard "Pending Approvals" widget
  and the dashboard's request table now point there.
- New `GET /requests/browse` (request.create): list-only view of the
  caller's department archive bucket (name, type, owner, date, size — no
  preview/download surface).
- User browse rework: department bucket, max 3 files selected at once,
  required explanation, single "Request Files" button; request details
  modal (files + decision note) and Cancel for pending requests wired;
  dead pagination removed.
- `GET /requests` and `GET /requests/:id` now allow `request.manage`
  holders (QAOs) to list/review.

**UI unification & bug fixes (UI only — no permission changes)**

- Users got the command palette (Ctrl+K) and a "New" quick-action menu;
  admin palette gained Requests/ISO/Certification entries; dead search
  input on the user top nav replaced with the palette trigger.
- Removed dead controls: admin dashboard "Recent Submissions" table
  relabeled "Recent Requests" (it listed document requests) with correct
  columns/actions, never-matching "In Review" filter, mojibake (–/…),
  dead MoreHorizontal buttons, dead saved-view presets, orphaned pages
  (ISO/Cert shims, UserSubmitRequest, UserAACCUP wrappers), admin TopNav
  dead Profile item, QuickActionButton dead links + fake kbd hints.
- UserDashboard: dead "Upcoming Deadlines" card (no due-date data exists)
  replaced with Recent Requests; raw `<table>` swapped for shared Table
  primitives.
- Labels unified: "My Documents" on both sidebars/pages (the repository is
  owner-scoped for everyone); user request cards label "Explanation".

**Data layer**

- Migrations: `20260830000000_aaccup_task_submission_link` (taskId on
  submissions + AACCUP_TASK_ASSIGNED), `20260831000000_add_submission_pending_review`,
  `20260831010000_add_request_items`, `20260831020000_request_items_document_cascade`.
- **Bug fixed (D-026)**: `document_request_items.documentId` FK was
  RESTRICT, so `DELETE /documents/:id/permanent` 500'd for any document a
  request ever referenced (recycle-bin purge blocked) → FK is CASCADE;
  stale SMK recycle-bin rows purged.

**Verification**: server typecheck/lint/build + client tsc/build pass.
Smokes all green — AACCUP 43/43, Requests 32/32, Repository 49/49,
Rules 40/40; smoke scripts self-clean (no SMK rows remain).

---

## Repository Rules 1–30 implementation (2026-08-05)

**Backend**

- **Ownership-strict access (D-019)**: documents/folders access is
  owner-based for every role; foreign direct-ID access → 404; lists always
  owner-or-shared (documents) / owner-or-department (folders) scoped;
  submission reviewers + request managers get controlled-transfer READ of
  submission/request-linked documents only.
- Depth enforcement (rule 3): create/move/copy/restore reject depth 6+;
  folder copy conflict modes merge/keep_both/cancel (rule 8); restore with
  destination + conflict modes; replace-version preserves identity/favorites/
  history (rule 8).
- **Persisted background copy jobs (D-020)**: `repository_copy_jobs` model +
  endpoints (`GET /folders/jobs`, `GET /folders/jobs/:id`); copies ≥ 1000
  items run async with progress.
- **Folder info (rule 12)**: `GET /folders/:id/info` (recursive counts +
  size, aggregate queries).
- **Storage display (rule 13)**: `GET /repositories/storage` (used bytes +
  MinIO status; capacity honestly `null`).
- **ZIP (rule 14)**: `GET /folders/:id/zip` — streaming store-method archive
  (incremental CRC32 + data descriptors, no in-memory archive).
- **Activity (rule 18)**: `GET /documents/:id/activity` — download count +
  the file's own audit timeline.
- **Submission badges (rule 17)**: `submissionStatus` + `currentChecksum`
  added to document list rows (enriched in one batched query).
- **Duplicates (rule 7)**: list exposes checksum; client warns on
  checksum+size matches.
- **Notifications (rule 19)**: emitters in documents (upload ok/fail),
  requests (approved/rejected/delivered), submissions
  (approved/returned/rejected), recycle-bin cleanup script, storage warning
  (throttled 24h). New NotificationType enum values + `NOTIFICATION_EVENTS`
  specs.
- **Audit (rule 23)**: `document.upload_failed` action with failure reason;
  service layer stays the single authoritative writer.
- **Uploads (rule 6)**: audio/video MIME types added to
  `ALLOWED_MIME_TYPES`.
- Migration `20260829000000_repository_rules` applied (21 total).
- `.env`: `MINIO_PUBLIC_ENDPOINT` restored to `http://localhost:9000` (a dead
  Cloudflare tunnel had broken presigned URLs).

**Frontend**

- `lib/uploadBus.ts`: upload leave-guard wired into logout + sidebar
  navigation (rule 6).
- `RepositoryExplorer`: upload queue with bytes/speed/ETA/destination +
  overall progress; checksum duplicate dialog; restore dialog (destination +
  conflict mode); copy-folder dialog (destination + conflict mode + large-copy
  confirm); background job banner with polling; folder info bar; storage
  card; ZIP download action; submission badges; recycle deleted/expiry
  dates; drag & drop (rows + OS files into folders); audio/video accept
  types.
- `FilePreviewModal`: audio playback, print, Details & Activity tab
  (metadata, download count, timeline, checksum under Advanced).
- Services: restore/copy options, activity, folder info, jobs, ZIP blob
  download, storage summary.

**Database changes**

- Migration `20260829000000_repository_rules`: `NotificationType` enum +6
  values; `repository_copy_jobs` table + enum + indexes.
- `prisma validate` OK; `migrate status` up to date.

**Verification**

- Server typecheck/lint/build + client typecheck/production build pass.
- `scripts/smoke-repository.ps1` 49/49; `scripts/smoke-repository-rules.ps1`
  40/40 (depth 5/6, conflicts, ZIP, activity, jobs, notifications,
  emergency access, multi-user isolation, upload-failure audit, audio/video,
  replace-version identity). All smoke records, temp users, notifications and
  MinIO objects removed. Final DB: 3 users / 3 repositories / 3 folders /
  9 docs — real user data only.

---

## Personal Document Repository — implementation completion (2026-08-05)

**Backend**

- `repositories` table (one row per owner, idempotent provisioning +
  backfill); `folders.repositoryId` / `documents.repositoryId` columns.
- Schema-backed `repository_favorites`, `repository_recents` (bounded 50 per
  type), `repository_pins`, `emergency_access` (ROOT-gated, time-limited,
  audited), AACCUP submission snapshot columns.
- `shared_blob_references`: `document_versions.objectKey` unique index → plain
  index (copies / request deliveries share immutable blobs; permanent delete
  is reference-count guarded).
- New module `server/src/modules/repositories/*` (`GET /repositories/me`,
  backfill, emergency grant/revoke/list, owner listing).
- Documents: recycle-bin list/restore/permanent-delete (snapshot-guarded),
  copy (keep_both/replace/cancel), favorites, recents, `GET
  /documents/requested`, replace-version pipeline.
- Folders: recycle-bin list/restore, deep subtree copy, permanent delete,
  pins (quick access), depth ≤ 5 enforcement, cycle guard.
- Audit actions: `repository.provisioned`, `repository.emergency.granted/
  revoked`, `document.copied/permanently_deleted/favorited/unfavorited/
  previewed`, `folder.restored/copied/permanently_deleted/pinned/unpinned`,
  `recycle_bin.emptied`, `request.fulfilled.delivered`.
- Permission `repository.emergency_access` (ROOT-only; catalog 119).
- Migrations applied: `20260828000000_personal_repository_lifecycle`,
  `20260828010000_shared_blob_references` (20 total, up to date).
- Scripts: `scripts/cleanup-recycle-bin.js` (30-day retention sweep,
  snapshot-guarded, reference-count aware, `--dry-run`),
  `scripts/smoke-repository.ps1` (49-check repository smoke, self-cleaning).

**Frontend**

- `RepositoryExplorer` (shared by admin `DocumentRepository` and user
  `UserDocuments`): My Uploads, Quick Access, Favorites, Recent, Requested
  Documents, Recycle Bin sections; folder tree + breadcrumbs; grid/list
  views; single-click select / double-click open.
- Upload queue with REAL XHR progress (bytes transferred), cancel, retry,
  per-file status, leave-page warning, name-conflict dialog (keep both /
  replace / cancel); Replace Version now adds a real version to the existing
  document.
- Repository-wide search (backend `q` + ownerId across all folders + files).
- `FilePreviewModal`: PDF/image/video/text inline preview, download, rename,
  move, delete, details.
- Client service additions in `services/documents.ts` (progress-capable
  upload, requested-docs list) and `services/repository.ts` (provisioning,
  emergency access).

**Database changes**

- Two migrations (see above). `prisma validate` OK; `migrate status` up to
  date; client regenerated.

**Verification**

- Server: typecheck + lint + build pass. Client: typecheck + production build
  pass. Repository smoke: 49/49 pass (CRUD, upload pipeline, copy, recycle
  bin, favorites/recents/pins, search, isolation, audit, persistence across a
  backend restart for PostgreSQL + MinIO).
- Mock data: previous-session "Lifecycle"/"CopyTree" test artifacts
  soft-deleted via the audited API path; documented in
  `docs/mock-data-audit.md` §4.

---

## Previous sprints

- **User Portal — Accreditation / ISO / Certification tabs** (post-7.5.1):
  shared set-aware `UserAccreditationView` + `/user/iso` + `/user/certification`;
  per-set user submissions; user sidebar + routes + titles.
- **Admin Dashboard Real Data Cleanup**: fake trend badges eliminated;
  Total Folders + Storage Used cards from real API; zero mock fallbacks.
- **Sprint 7.8 — Final Acceptance Testing & V1.0 Stabilization (RC1)**:
  36/36 smoke checks; expired-session auto-logout; workflow runtime verified;
  Docker restart persistence verified.
- **Sprint 7.7 — Defense Demo Preparation & UX Polish**: global ErrorBoundary,
  per-page titles, toast feedback, autoFocus, React.lazy Root Console.
- **Sprint 7.6 — Complete System Validation**: dead code/buttons removed,
  real CSV exports, 27/27 smoke.
- **Sprint 7.5 — System Integration & Defense Readiness**: config-engine
  upload policy consumers; hardcoded departments removed; compliance fix.
- **Sprint 7.4.8 — Platform Setup Wizard** (8-step, persisted, MinIO logo).
- **Sprint 7.4.6 — Dynamic Form Builder** (12 field types, versioning,
  publish/rollback, assignments).
- **Sprint 7.4.5 — Dynamic Workflow Builder** (definitions, runtime engine,
  scoped assignments, ROOT builder UI).
- **Sprint 7.4.4 — Dynamic Requirement Builder** (recursive templates,
  validation rules, runtime projection).
- **Sprint 7.4.3 — Dynamic Folder Builder** (versioned trees, scoped
  assignments, `/folders/resolve`).
- **Sprint 7.4.2 — Organization Management Engine** (colleges/departments/
  offices/programs, versioning + rollback).
- **Sprint 7.4.1 — System Administrator (ROOT) + Configuration Engine**
  (versioned config, 60s cache, Root Console UI).
- **Sprint 7.7.5 — Production Data Migration & Mock Data Elimination**
  (cleanup script, empty-platform support, seed verified clean).
- **Sprint 7.5.1 — Document Repository Stabilization** (owner-scoped
  RepositoryExplorer, folder/file CRUD, RBAC gap fix, mock-data audit).
- **Sprint 7.3 — Notification & Email Service** (inbox, announcements,
  durable email queue).
- **Sprint 7.2 — User & Role Administration**.
- **Sprint 7.1 — Administration Backend** (departments, colleges, settings).
- **Sprint 6.x — Dashboard / Analytics / Audit Center APIs**.
- **Sprint 5.x — AACCUP Areas / Requirements / Submissions / Compliance /
  Analytics**.
- **Sprint 4 — Document Requests workflow**.
- **Sprint 3 — Documents + Folders + Versioning + MinIO storage**.
- **Sprint 2 — Auth + RBAC + Users + AuditLog + Prisma + Docker**.
- **Sprint 1 — Client skeleton**.
