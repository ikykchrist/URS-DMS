## Current sprint

**Sprint 7.4.5 - Dynamic Workflow Builder:** COMPLETE.

Delivers a ROOT-only authoring and runtime engine for dynamic, data-driven
workflow definitions that gate the existing document request, AACCUP
submission, and document status flows:

  - Fourteen new permission codes (catalog now 108): ten authoring codes
    (`workflow.read`, `workflow.create`, `workflow.update`,
    `workflow.archive`, `workflow.restore`, `workflow.version`,
    `workflow.validate`, `workflow.publish`, `workflow.rollback`,
    `workflow.assign`) plus `workflow.override` are ROOT-only; the three
    runtime codes (`workflow.instance.read`, `workflow.action.perform`,
    `workflow.review`) are granted exactly to ADMINISTRATOR, QAO, and
    DEPARTMENT_COORDINATOR (with ROOT). The privilege-escalation guard is
    unchanged.
  - Management API: 27 endpoints under `/api/v1/root/workflows` for
    definitions, steps (START/TASK/REVIEW/APPROVAL/END), transitions
    (actionCode + requiredPermission), scoped assignments, structural
    validation, immutable publish, version snapshots + rollback, engine
    history, and instance administration. Fixed segments (`/history`,
    `/assignments`, `/instances`) register before `/:id`.
  - Publish model: publishing bumps the version, atomically writes a complete
    immutable snapshot (steps, transitions, assignments with stable UUIDs)
    into `workflow_versions.data`, and appends engine history in one
    transaction. Editing a PUBLISHED definition returns 409 until rollback
    replays an older snapshot as a new DRAFT. Runtime instances execute
    against the snapshot strings, never the authoring tables.
  - Runtime engine: `bindWorkflowInstance` / `evaluateWorkflowAction` /
    `recordWorkflowAction` are called inside the same Prisma transaction as
    the host business write. Requests (create/decide/cancel), AACCUP
    submissions (create/review), and documents (status change) are now
    workflow-aware through small adapter maps
    (APPROVED→APPROVE/REJECTED→REJECT/FULFILLED→FULFILL/CANCEL,
    APPROVED→APPROVE/REJECTED→REJECT/NEEDS_REVISION→REQUEST_REVISION,
    status→RESET_TO_DRAFT/SUBMIT_FOR_REVIEW/APPROVE/PUBLISH/ARCHIVE).
    Unresolved assignments fall back to the legacy path (fail-open).
  - Runtime API outside `/root`: `/api/v1/workflows/instances`,
    `/instances/:id`, `POST /instances/:entityType/:entityId/actions`, and
    ROOT-only `POST /instances/:id/override` (COMPLETE/TERMINATE). Actions
    validate step/role/permission/action against the live step; wrong-action
    and terminal-instance calls return 409.
  - Assignment resolution: AACCUP_SUBMISSION precedence is AREA -> active
    CYCLE -> DEPARTMENT -> COLLEGE -> UNIVERSITY; requests/documents use
    DEPARTMENT -> COLLEGE -> UNIVERSITY; priority desc then newest first,
    PUBLISHED only, with a 60-second in-process cache.
  - Client: responsive `/root-workflow-builder` Root Console page (Builder /
    Assignments / Instances / History tabs, step/transition dialogs,
    validation results, publish + versions + rollback dialogs, assignment
    dialog with live target options, instance detail with perform-action and
    override), full workflow API layer in `client/src/services/root.ts`,
    and sidebar/app registration. The canonical Document Repository now loads
    its real folder tree from the server (`GET /folders/resolve`) and creates
    folders through `POST /folders` when a server session exists, with the
    previous hardcoded tree kept only as offline fallback.

Schema migration `20260823000000_sprint7_4_5_workflow_builder` is applied.
It adds the nine workflow engine tables (definitions, steps, transitions,
assignments, versions, histories, instances, step_instances, actions) with
UUID keys, enums, FK indexes, and soft-delete semantics.

Verification: server typecheck + build, client typecheck + production build,
and `prisma validate` all pass. Three live smoke suites passed against the
running server (PostgreSQL + MinIO, Docker healthchecks green): the full
builder lifecycle (create → validate 13 checks → publish v2 → 409 on
published mutation → rollback → DRAFT; broken flow validate=false + publish
blocked), runtime integration (DOCUMENT_REQUEST instance bound at START →
QAO SUBMIT → APPROVE → COMPLETED; wrong action 409; requester 403 on
management + instance surfaces; ROOT override TERMINATE on a RUNNING
instance; terminated instance 409), and the AACCUP end-to-end path
(department → area → template assignment → projection → verified upload →
submission binds AACCUP_SUBMISSION instance RUNNING → review APPROVED →
instance COMPLETED). Folder resolution returned `source=legacy` with the
created folder after `POST /folders`; audit entries for workflow mutations
were present; and definitions, instances, folders, and MinIO objects all
survived a full server restart. Existing Vite chunk warnings remain
non-blocking. The server test script still exits 1 because the repository
has no test files, and canonical client lint cannot start because no ESLint 9
config exists.

---

## Previous sprint

**Sprint 7.4.4 - Dynamic Requirement Builder:** COMPLETE.

Delivers a ROOT-only authoring and runtime engine for recursive accreditation
requirements, scoped assignment, versioning, rollback, and live AACCUP use:

  - Seven ROOT-exclusive permissions: `requirement.read`,
    `requirement.create`, `requirement.update`, `requirement.archive`,
    `requirement.restore`, `requirement.assign`, and `requirement.rollback`.
    The ROOT role holds all seven; ADMINISTRATOR holds none. The seeded catalog
    now contains 94 permissions across seven system roles.
  - Management API: 27 endpoints under `/api/v1/root/requirements` for
    templates, arbitrary-depth nodes, drag/move ordering, six validation-rule
    types, assignments, accreditation cycles, immutable snapshots, history,
    archive/restore, and non-destructive rollback.
  - Versioning: every template mutation atomically claims the current version,
    applies the write, and appends a complete post-mutation snapshot plus engine
    history. Snapshots preserve node, validation, and assignment UUIDs. Rollback
    replays an older snapshot as a new version, preserving existing AACCUP
    submission foreign keys.
  - Runtime resolution: AACCUP precedence is AREA -> active CYCLE -> DEPARTMENT
    -> COLLEGE -> UNIVERSITY. Effective content nodes are projected into stable
    `AaccupRequirement` rows with source node/assignment/version provenance.
    Legacy rows remain the fallback only when no builder assignment resolves.
  - Validation: FILE_TYPE, FILE_SIZE, PAGE_COUNT, EXPIRATION_DATE,
    NAMING_CONVENTION, and METADATA rules run at upload preflight and again when
    a document is submitted. ERROR rules block; WARNING rules remain advisory.
  - Performance: assignment resolution uses a 60-second in-process cache and a
    projection freshness fast path. Mutations invalidate the cache and refresh
    only areas covered by the changed template's assignment scopes or existing
    projections; cycle changes refresh only linked areas.
  - Upload reliability: version verification streams SHA-256 from MinIO,
    verifies byte size/checksum, and only then promotes `currentVersionId`.
    Object keys use sanitized filenames and remain identical across presign,
    verify, preview, and download.
  - Client: responsive `/root-requirement-builder` authoring UI, Root navigation,
    live `/user/aaccup` requirements/submissions with validation-aware upload,
    and server-backed AACCUP evidence in the canonical Document Repository.
    Hardcoded requirement fixtures were removed from `client/src/services/seed.ts`.

Schema migration `20260822000000_sprint7_4_4_requirement_builder` is applied.
It adds accreditation cycles, requirement templates/nodes/validations/
assignments/versions/histories, AACCUP projection provenance, area-cycle links,
and document metadata fields with supporting indexes and soft-delete semantics.

Verification: Prisma validation, server typecheck/lint/build, client typecheck,
and client production build pass. Two live PostgreSQL/MinIO smoke suites passed:
11 end-to-end behavior groups (ROOT/ADMIN RBAC, CRUD, precedence, validation,
stable IDs, rollback, subtree archive isolation, versions/history) plus eight
targeted projection-refresh checks. Cleanup queries confirmed zero live smoke
fixtures. A final read-only regression matrix passed 45/45 probes across Auth,
Users, Documents, Folders, Requests, AACCUP, Dashboard, Analytics, Audit,
Reports, Admin, Notifications, Configuration, Organization, Folder Builder,
and Requirement Builder. Existing Vite chunk warnings remain non-blocking. The server test
script still exits 1 because the repository has no test files, and canonical
client lint cannot start because no ESLint 9 config exists.

---

## Previous sprint

**Sprint 7.4.3 - Dynamic Folder Builder:** COMPLETE.

Added the ROOT-only versioned folder-template engine, recursive tree authoring,
scoped assignments, rollback, `/folders/resolve`, and responsive
`/root-folder-builder`. Migration
`20260821000000_sprint7_4_3_folder_builder` adds the five folder engine tables.
Resolution uses DEPARTMENT -> COLLEGE -> UNIVERSITY and preserves legacy folder
fallback. Its live 60-assertion API smoke suite and static checks passed.

### Sprint 7.4.2 reference

**Organization Management Engine (ROOT):** COMPLETE.

Added ROOT-only management for Colleges, Departments, Offices, and Programs.
Colleges/departments reuse the Sprint 7.1 tables; offices/programs and the
shared `organization_versions` table were added by migration
`20260821000000_sprint7_4_2_organization_engine`. Five `organization.*`
permissions protect the tree, CRUD, archive/restore, version, and rollback
surfaces. The `/root-organization` client page provides entity tabs, parent
filters, an organization tree, and version rollback. Legacy organization rows
remain version 0 until first recreated in the engine.

### Sprint 7.4.1 reference

**System Administrator (ROOT) + Configuration Engine:** COMPLETE.

Implemented the ROOT role + the platform Configuration Engine as a standalone
backend module pair, plus the Root Console UI on the client, with no changes
to Auth/RBAC/Documents/Requests/AACCUP/Dashboard/Reports/Analytics/Audit
internals (the root module is mounted read-only next to them; the only
touches elsewhere are additive guards + seed):

  - ROOT role + RBAC: new `ROOT` role in the default role matrix holding ALL
    catalog permissions (75) plus four new root.* codes
    (`root.access`, `root.configuration.read`, `root.configuration.update`,
    `root.configuration.rollback`) that are bound exclusively to ROOT -
    ADMINISTRATOR cannot obtain them (privilege-escalation guard unchanged;
    ROOT_ONLY_CODES are filtered out of the admin role's seed set).
    ROOT users are bootstrapped from `BOOTSTRAP_ROOT_*` env vars and are
    protected from every admin surface: archive/status/password-reset/update
    on the ROOT user and archive/update/permission-manage on the ROOT role
    all return FORBIDDEN ("Root accounts are protected..."). The Root
    Console route group is gated by `requireRole("ROOT")` (hard role gate)
    plus per-route `requirePermission("root.*")` - defence in depth.
  - Configuration Engine: four new tables (`configuration_categories`,
    `configurations`, `configuration_versions`, `configuration_histories`)
    with `ConfigurationStatus` / `ConfigurationValueType` /
    `ConfigurationAction` enums; Json values, `version` counter,
    `isSystem` flag (seed-owned entries cannot be deleted), soft delete.
  - Endpoints (`/api/v1/root`): `GET /overview` (Platform Overview
    aggregate: platform, configuration, active modules, storage, database,
    minio, api, queue, recent changes), `GET /config` (paginated, category/
    status/q filters), `GET /config/categories`, `GET /config/:category`,
    `PATCH /config` (bulk update - bumps version, writes snapshot + history
    in one transaction), `DELETE /config/:key`, `POST /config/:key/restore`,
    `GET /config/:key/versions`, `POST /config/rollback`, `GET /config/history`.
  - Versioning model: every mutation bumps `Configuration.version` and
    appends a `configuration_versions` snapshot + a `configuration_histories`
    row inside a single Prisma transaction, so the two tables can never
    drift; rollback restores a past snapshot as a NEW version (auditable,
    non-destructive).
  - Caching: 60s TTL in-process cache for the live config set; every
    mutation invalidates the whole cache. `getConfigValue()` is the internal
    accessor future consumers use instead of hardcoding system settings.
  - Session lifecycle: in-process watcher polls the Session table every 30s
    and emits `root.login` / `root.logout` audit entries without touching
    the auth module internals (Sprint 7.4.1 constraint: auth stays pristine).
  - Audit actions added: `config.created`, `config.updated`,
    `config.deleted`, `config.restored`, `config.rolled_back`, `root.login`,
    `root.logout`. Read paths unaudited per convention.
  - Seed: idempotent `seedConfigEngine()` upserts 7 categories and 10
    isSystem default configurations (application name, university name,
    academic year, semester, max upload size, allowed file types, session
    timeout, maintenance mode, storage warning threshold, default
    pagination) - each with a v1 snapshot + CREATED history row; existing
    configurations are never overwritten by re-running the seed. ROOT
    bootstrap user is created from `BOOTSTRAP_ROOT_EMAIL` /
    `BOOTSTRAP_ROOT_EMPLOYEE_ID` / `BOOTSTRAP_ROOT_PASSWORD`.

Schema (migration `20260820000000_sprint7_4_1_root_config`, applied
manually via `prisma db execute` + `migrate resolve` because `migrate dev`
is broken on this repo - shadow-DB replay P3006 on the Sprint 5 migration):
`RoleName` + ROOT; the four config tables + three enums; User relations for
created/updated/changed-by/actor. Env additions (`env.ts`):
`BOOTSTRAP_ROOT_*` (optional, seed-only).

Client (Root Console UI): new role `root` in the client role model
(seed user root@urs.local), Root Console sidebar section, and four pages
that call the real backend through the Sprint 4 pattern (`services/root.ts`
over `lib/http.ts` with a server-session bridge that exchanges credentials
for a JWT at login): Platform Overview (stat cards + module/queue/storage/
recent-changes tables), Configuration Engine (category/search filters,
type-aware edit dialog, version history + rollback drawer, seed-owned
delete protection), System Audit (shared /audit surface) and System Users
(shared /admin/users surface). API contracts appended to
`API_CONTRACTS.md`.

---

## Completed tasks (all sprints to date)

- ✅ Sprint 1 — Client skeleton
- ✅ Sprint 2 — Auth + RBAC + Users + AuditLog + Prisma + Docker
- ✅ Sprint 3 — Documents + Folders + Versioning + MinIO storage
- ✅ Sprint 4 — Document Requests workflow
- ✅ Sprint 5.1 — AACCUP Areas (CRUD + archive + restore)
- ✅ Sprint 5.2 — AACCUP Requirements (CRUD)
- ✅ Sprint 5.3 — AACCUP Submissions + review state machine
- ✅ Sprint 5.4 — Compliance tracking + analytics APIs
- ✅ Sprint 5.5 — AACCUP QA / integration / bug-fix pass
- ✅ Sprint 6.1 — Dashboard Statistics API (live aggregations)
- ✅ Sprint 6.2 — Analytics & Trend API (time-series + category breakdowns)
- ✅ Sprint 6.3 — Audit Center API (timeline view, search, filters, export)
- ✅ Sprint 7.1 — Administration Backend (Departments + Colleges + System Settings)
- ✅ Sprint 7.2 — User & Role Administration (Users + Roles + Permissions)
- ✅ Sprint 7.3 — Notification & Email Service (inbox + announcements + durable email queue)
- ✅ Sprint 7.4.1 — System Administrator (ROOT) + Configuration Engine
- ✅ Sprint 7.4.2 — Organization Management Engine (Colleges / Departments / Offices / Programs + versioning + rollback)
- ✅ Sprint 7.4.3 — Dynamic Folder Builder (versioned trees + scoped assignments + rollback + repository resolution)
- ✅ Sprint 7.4.4 — Dynamic Requirement Builder (versioned recursive requirements + validation + AACCUP runtime projection)
- ✅ Sprint 7.4.5 — Dynamic Workflow Builder (versioned workflow definitions + runtime gates + ROOT builder UI + real repository folders)

End-to-end workflow live: **Department → Area → Requirement → Submission →
Review → Compliance → Analytics → Dashboard** plus full
**User↔Role↔Permission** admin surface and the **Notification inbox +
announcements + email queue** backend.
ROOT additionally has the **Configuration + Organization + Dynamic Folder +
Dynamic Requirement + Dynamic Workflow Builder** control plane, including
effective repository structure, AACCUP requirement resolution, and live
workflow instance administration (bind, advance, override).

---

## Pending tasks (next-up, in priority order)

1. **Wire configuration-engine consumption** — existing modules should read system settings through `getConfigValue()` (upload size / allowed file types / storage threshold / maintenance mode) instead of hardcoding (Sprint 7.4.1 integration contract).
2. Self-service — `PATCH /users/me` + `/sessions` list/revoke.
3. Forgot / reset password endpoints (client UI already exists). Note: the
   email queue built in Sprint 7.3 is the delivery vehicle for the reset
   email (`notifyUser` + `PASSWORD_RESET` catalog entry are ready).
4. Wire notification emitters into the existing document / request / aaccup
   flows via `notifyUser` / `notifyUsers` (Sprint 7.3 spec forbade modifying
   those modules — the emit surface + event catalog are the integration
   contract).
5. Server-side SSE / WebSocket push for real-time inbox updates.
6. Vitest test suite.
7. Multipart / resumable upload for files > 100 MB.
8. Standalone Tag entity + CRUD endpoints.
9. Document favorites + recent documents.
10. Retention enforcement + MinIO object GC (cron jobs).
11. Documentation pass (fix stale paths in `docs/`).
12. Runtime custom roles — widening `Role.name` from the `RoleName` enum to
    `String` (2.0 backlog item; the platform currently has seven seeded enum
    values, including protected ROOT).

(See `PROJECT_ROADMAP.md` for the full 1.0 backlog and the 2.0 backlog.)

---

## Known issues

1. **No tests.** `vitest` is configured in `server/package.json` but there are
   no `*.test.ts` files. Sprint-deliverable rule says don't add tests unless
   explicitly asked.
2. **Storage "available" metric is `null`.** MinIO has no configured quota /
   capacity value in the env or MinIO client lib. `GET /dashboard/storage`
   returns `availableStorageBytes: null` deliberately (the spec forbade
   modifying MinIO). Implement a MinIO bucket-quota probe as a future task.
3. **No physical MinIO object GC.** Soft-deleted documents leave their object
   behind in MinIO indefinitely (repo known issue #14). The dashboard storage
   total therefore counts "ghost" objects until a GC job lands.
4. **Analytics overview `q` param is a no-op.** Accepted by the validator but
   the compliance service has no full-text field to search at that abstraction
   level. Silently ignored (no false matches, no crash).
5. **Analytics not scope-restricted by actor department.** A coordinator with
   `dashboard.read` / `aaccup.analytics.read` can query any department's
   numbers. Matches current RBAC code definitions; self-department scoping is
   out of 1.0 scope.
6. **Recent activity analytics not yet requested.** Sprint 6.1 covers static
   aggregate snapshots; trend-over-time ("uploads per day for last 30 days")
   is now implemented by Sprint 6.2's `/analytics/*` endpoints.
7. **Analytics time-series buckets are computed in JS.** Prisma's `groupBy` has
   no `date_trunc`, so each `/analytics/*` endpoint issues one `findMany`
   selecting only the timestamp column it needs (bounded by the `from..to`
   window — defaulted to 12 months for monthly granularity) and buckets the
   rows in JS. Acceptable for a dashboard over bounded windows; if a windowed
   query ever needs to scan millions of rows, switch to raw SQL with
   `date_trunc` (would need a small repository addition).
8. **AACCUP compliance trend is bucket-sampled, not per-requirement.**
   `complianceTrend` in `/analytics/aaccup` computes `APPROVED / total
   submissions` per bucket — it mirrors the compliance service's COMPLETED
   rule but aggregates by bucket, not by requirement. Snapshot overall
   compliance still goes through `calculateOverallCompliance()` (single source
   of truth) and is exposed via the existing `/aaccup/analytics/overview`.
9. **`activeUsers` is approximated by Session creation.** There is no
   `VisitLog` table, so `/analytics/users` uses `Session.createdAt` per bucket
   (best available proxy). A dedicated user-activity model would be needed for
   a true unique-active metric.
10. **Storage growth only reflects DocumentVersion rows.** Soft-deleted
     documents leave their physical MinIO objects in place until a GC job runs
     (repo known issue #3), so `totalStorageUsedBytes` may exceed the sum of
     live `DocumentVersion.sizeBytes`. The trend lines themselves are based on
     `DocumentVersion.uploadedAt` and therefore never show the missing GC delta.
11. **`/audit` exposes `userDepartmentId`, not `userDepartment` (name).** The
     Prisma schema declares `User.departmentId` as a scalar with no relation
     field (only the reverse relations `UserDepartment` / `DepartmentHead` are
     modelled, both of them one-to-many). The Audit Center therefore exposes
     the FK and lets the client resolve the department name via the existing
     departments module. Avoiding a secondary per-row lookup is also why the
     list query stays a single round-trip.
12. **Audit `q` search uses Postgres JSON `string_contains`.** Free-text
     search across document / area / requirement names is reached through the
     JSON payload's text content rather than a normalized full-text index —
     writeAudit's `newValue` typically carries the human label of the affected
     entity. This works on the existing index-free `Json?` column but a future
     PostgreSQL `jsonb_path_ops` GIN index would help once the table grows.
13. **CSV export row cap is 10,000.** `GET /audit/export?format=csv` ignores
     pagination and runs one bounded `findMany({ take: maxRows })` with
     `maxRows` capped at 10,000. Dataset-wide exports beyond that threshold
     need either paginated CSV downloads or a background job (out of 1.0
     scope).
14. **`changes` payload is exposed only on `GET /audit/:id`.** The list and
      export rows are intentionally slim (no `changes` field), so paginated /
      bulk reads don't ship the JSON blob for every row. The detail endpoint
      is the integration surface for the "View Audit Details → Changes"
      requirement; masking is applied there.
15. **`Role.name` is enum-constrained; no runtime custom roles in 1.0.** The
      admin role surface (`POST /admin/roles`) accepts only seeded non-ROOT
      `RoleName` values; ROOT is protected separately. Widening `Role.name` to `String` is a 2.0
      backlog item.
16. **Notification emitters are not yet wired into the existing modules.**
      Sprint 7.3 delivered the inbox + announcements + the programmatic emit
      surface (`notifyUser` / `notifyUsers`) + the 11-event catalog, but the
      spec forbade modifying Auth/RBAC/Documents/Requests/AACCUP, so no
      module currently *emits* notifications — the inbox fills only via
      announcements until the wiring sprint.
17. **Dev default is the `console` email provider.** No SMTP credentials are
      configured in `.env`, so `EMAIL_PROVIDER` defaults to `console` (logs
      the rendered message through winston instead of sending). Set
      `EMAIL_PROVIDER=smtp` + `SMTP_*` to send real mail; boot fails fast
      only if `smtp` is selected without `SMTP_HOST`/`SMTP_FROM`.
18. **Email delivery runs in-process.** The durable queue is drained by an
      in-process worker (15s poll). The queue table is designed so a
      dedicated background worker process can take over (claim loop is
      already atomic), but no separate worker process ships yet.
19. **Dev DB was stale before Sprint 7.3 — now baselined + fully migrated.**
      The dockerized `urs-postgres` had only the `init` migration applied
      (no `_prisma_migrations` table; aaccup / 7.1 / 7.2 schema missing). It
      was baselined with `prisma migrate resolve --applied
      20260815000000_init` (the DB matched that migration exactly) and all
      remaining migrations were applied non-destructively, then the seed was
      re-run (now 94 permission codes + 7 roles + bootstrap admin/ROOT). Any *other*
      database (e.g. a local Postgres used before Docker) is unrelated and
      untouched.
20. **Legacy org rows have no version history.** Colleges / departments
      created before Sprint 7.4.2 report `version: 0` and have no
      `organization_versions` snapshots, so rollback rejects them (400). New
      records - and all offices / programs - start at version 1 with full
      history.
21. **Repository resolution currently uses three assignment scopes.** The
      Folder Builder can manage UNIVERSITY, COLLEGE, DEPARTMENT, PROGRAM,
      OFFICE, and AACCUP_AREA assignments, but `GET /folders/resolve` currently
      resolves only DEPARTMENT -> COLLEGE -> UNIVERSITY for the authenticated
      user's repository. The other target types remain management metadata
      until their repository contexts are defined.
22. **Canonical client lint has no ESLint 9 configuration.**
      `npm run lint:client` stops before reading source because `client/` has no
      `eslint.config.js|mjs|cjs`. Typecheck and production build pass. Adding a
      client lint policy remains a repository tooling task rather than silently
      inheriting the server's Node-only globals/rules.
23. **Local-only demo accounts do not automatically become server accounts.**
      The hybrid client opens a server session after local authentication, so
      server-backed AACCUP and online-document views require a matching backend
      user with the same credentials. ROOT/ADMIN bootstrap users and properly
      provisioned users work; purely IndexedDB demo users retain local-only
      functionality.

---

## Next task

Sprint 7.4.5 is complete. Awaiting user direction for the next sprint.
Suggested next focus: wire
notification emitters (`notifyUser` / `notifyUsers`) + configuration-engine
consumption (`getConfigValue()`) into the existing modules - both are
Sprint 7.3 / 7.4.1 integration contracts - or self-service profile
(`PATCH /users/me` + `/sessions` list/revoke), the last auth-adjacent gap
in 1.0.

---

## Health checks

Run after every change to the server:

```powershell
npm --workspace server run typecheck
npm --workspace server run lint
npm --workspace server run build
npx prisma validate --schema server/prisma/schema.prisma
npm --prefix client run build
```

All five pass for Sprint 7.4.5. The sprint also uses live Workflow Builder
smoke coverage for RBAC, authoring, publish immutability, rollback,
validation, runtime gates on requests/AACCUP/documents, override, folder
resolution, and restart persistence. The separate
server `test` and client `lint` tooling gaps are documented above.
