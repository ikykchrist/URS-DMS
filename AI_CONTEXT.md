# URS-DMS — AI Context

> **Read this file before making ANY changes.**
> Stable shared context for AI agents (and humans) working on URS-DMS.
> Keep this file authoritative — update it only when architecture changes.

---

## 1. What this project is

URS-DMS = **University Recognition System — Document Management System**.
Layered, modular monolith for managing accreditation documents (AACCUP) for the
University of Rizal System. Backend = Express + Prisma + PostgreSQL + MinIO.
Frontend = Vite + React + TypeScript + Tailwind. The two live in one git repo
under an npm workspaces monorepo (`server/` is the workspace). `client/` is the
canonical frontend used by root scripts; root `src/` is retained legacy client
code and must not receive new feature work.

---

## 2. Folder structure (server)

```
server/
├── prisma/
│   ├── schema.prisma          # single source of truth for the DB
│   ├── seed.ts                # idempotent, re-runnable
│   └── migrations/           # one dir per migration, alphabetical-by-timestamp
└── src/
    ├── app.ts                 # express factory (helmet, cors, rate-limit, morgan)
    ├── server.ts              # http server bootstrap
    ├── index.ts               # entrypoint
    ├── config/{constants,env} # env validated by zod at boot, fail-fast
    ├── health/                # GET /health (db + minio probe)
    ├── lib/{prisma,storage}   # singletons (PrismaClient, MinIO client)
    ├── middlewares/{authenticate,authorize,errorHandler,rateLimiter,
    │                requestContext,validate}
    ├── modules/
    │   ├── audit/audit.{service,repository,routes,controller,types,validator}  # writeAudit (unchanged) + Sprint 6.3 read/export
    │   ├── auth/{controller,cookies,password,routes,service,tokens,validator}
    │   ├── documents/{controller,repository,routes,service,types,validator}
    │   ├── folders/{controller,repository,routes,service,types,validator}
    │   ├── dashboard/{controller,routes,service,types}   # Sprint 6.1
    │   ├── analytics/{analytics.{routes,controller,service,types,validator}}   # Sprint 6.2 — trend/time-series
    │   ├── admin/                       # Sprint 7.1 — Administration Backend
    │   │   ├── admin.routes            # mounts `authenticate` once + dispatches sub-routers
    │   │   ├── departments/departments.{controller,repository,routes,service,types,validator}
    │   │   ├── colleges/colleges.{controller,repository,routes,service,types,validator}
    │   │   └── settings/settings.{controller,routes,service,types,validator}  # singleton, no repository
    │   ├── permissions/{constants,repository,types}
    │   ├── requests/{controller,repository,routes,service,types,validator}
    │   ├── reports/{controller,repository,routes,service,types,validator}
    │   ├── requirements/requirement.runtime   # assignment resolution, stable AACCUP projection, upload rules
    │   ├── workflow/                          # Sprint 7.4.5 - Dynamic Workflow engine
    │   │   ├── workflow.{routes,controller,service,engine,repository,types,validator,cache}
    │   │   └── workflow.routes  # mounts /root/workflows (authoring) + /workflows (runtime)
    │   ├── root/                              # ROOT configuration, organization, folder, requirement engines
    │   │   ├── root.requirement.{controller,routes,service,repository,types,validator,cache}
    │   │   ├── root.folderBuilder.*
    │   │   └── root.organization.*
    │   ├── roles/{constants}
    │   ├── users/{controller,repository,routes,service,types,validator}
    │   └── aaccup/
    │       ├── aaccup.{controller,repository,routes,service,types,validator}
    │       ├── requirements/aaccup.requirements.{controller,repository,routes,service,types,validator}
    │       ├── submissions/aaccup.submissions.{controller,repository,routes,service,types,validator}
    │       ├── analytics/aaccup.analytics.{controller,routes,validator}
    │       └── services/compliance.service.ts   # SINGLE SOURCE OF TRUTH for compliance
    ├── routes/index.ts        # route registry — mounted under /api/v1
    ├── types/express.d.ts     # augments Express with req.auth + req.context
    └── utils/{apiResponse,asyncHandler,device,errors,hash,logger}
```

**Every feature module follows the same shape:**
`routes → controller → service → repository → Prisma`. Controllers are thin
(`toActor` + delegate). Business logic lives in services. DB access lives in
repositories. A dashboard-style read-only module may omit the repository and
aggregate directly via Prisma (see `modules/dashboard/`).

---

## 3. Tech stack

| Layer        | Stack                                                       |
|--------------|-------------------------------------------------------------|
| Runtime      | Node >= 20                                                  |
| Backend      | Express 4.21                                                |
| ORM          | Prisma 5.22 (PostgreSQL)                                    |
| Auth         | jsonwebtoken 9, argon2 0.41                                 |
| Validation   | zod 3.23                                                    |
| Storage      | minio ^8.0.1 (S3-compatible object storage)                |
| Logging      | winston 3.15, morgan 1.10                                  |
| Security     | helmet 7, cors 2.8, express-rate-limit 7.4                 |
| Frontend     | React 18, Vite 5, TypeScript 5.2, Tailwind 3.4             |
| Test runner  | vitest 2.1 (configured; **no test files yet**)             |

Engine pin: Node >= 20.

---

## 4. API response format

Every response goes through `utils/apiResponse.ts`:

```ts
// Success
{ "success": true,  "data": <T>, "meta"?: { ... } }

// Error
{ "success": false, "error": { "code": <ErrorCode>, "message": <string>, "details"?: <any> } }
```

- `sendSuccess(res, data, status=200, meta?)`
- `sendCreated(res, data)` → 201
- `sendNoContent(res)` → 204

Error codes live in `config/constants.ts` `ERROR_CODES`. Error classes in
`utils/errors.ts` (`ApiError`, `BadRequestError`, `UnauthorizedError`,
`ForbiddenError`, `NotFoundError`, `ConflictError`, ...). The centralized
`errorHandler.ts` (last middleware) maps: `ApiError` → its status/code;
`ZodError` → 400 with `fieldErrors`; Prisma `P2002` → 409 conflict;
Prisma `P2025` → 404 not found; Prisma connectivity → 503; everything else →
500 (stack only when `NODE_ENV !== "production"`).

**Never** send a raw error to the client. **Never** expose internal messages in
production.

---

## 5. RBAC rules

- **Permission-driven.** No `if (role === "admin")` anywhere in the codebase.
- Permission catalog is the **single source of truth** at
  `modules/permissions/permissions.constants.ts` (`PERMISSIONS` array).
- Role → permission bindings in `modules/roles/roles.constants.ts`
  (`DEFAULT_ROLE_MATRIX`). Seeded idempotently by `prisma/seed.ts`.
- 7 system roles: protected `ROOT`, `ADMINISTRATOR`,
  `QUALITY_ASSURANCE_OFFICER`, `DEPARTMENT_COORDINATOR`, `FACULTY`, `STAFF`,
  and `READ_ONLY`.
- `ROOT` receives all catalog permissions. `ADMINISTRATOR` receives every
  non-ROOT-only code; `root.*`, `organization.*`, singular `folder.*`,
  singular `requirement.*`, and singular `workflow.*` management codes are
  deliberately excluded. The three workflow RUNTIME codes
  (`workflow.instance.read`, `workflow.action.perform`, `workflow.review`)
  are granted exactly to ADMINISTRATOR, QAO, and DEPARTMENT_COORDINATOR;
  `workflow.override` is ROOT-only.
- HTTP gate: `requirePermission(...codes)` middleware in
  `middlewares/authorize.ts`. DB-backed (loads `req.auth.permissions` from the
  session/user). Denials emit a `PERMISSION_DENIED` audit entry (best-effort).
- Defense in depth: services re-check permissions via `assertCanManage/Read/...`
  helpers — never trust the route layer alone.
- Types: `req.auth: AuthContext` ({ userId, roleId, roleName, sessionId,
  permissions }) and `req.context: RequestContext` ({ ipAddress, userAgent })
  are added by `types/express.d.ts`.

**Adding a new permission = one entry in `PERMISSIONS` + (optionally) bind it
to a role in `DEFAULT_ROLE_MATRIX`. Nothing else changes.**

**Adding a new role = one entry in `DEFAULT_ROLE_MATRIX`.**

---

## 6. Prisma conventions

- **UUID PKs** everywhere (`@id @default(uuid())`).
- **Soft delete** via `deletedAt: DateTime?` on every transactional model.
  Always filter `where: { deletedAt: null }` for live rows, unless you
  explicitly need archived rows (restore flows pass `includeDeleted = true`).
- **Audit fields:** `createdAt @default(now())`, `updatedAt @updatedAt`,
  `deletedAt DateTime?`. Areas/Requirements/Submissions also carry
  `createdBy` + `updatedBy?` (FK to User).
- **FK delete semantics:**
  - `Restrict` for required, owned children (e.g. `AaccupArea.departmentId`,
    `AaccupSubmission.documentId`, `Document.ownerId`).
  - `SetNull` for optional attribution fields (e.g. `AuditLog.userId`,
    `*.updatedBy`, `*.reviewedBy`).
  - `Cascade` only for true parent-owned sub-rows (e.g.
    `DocumentVersion → Document`, `RolePermission → Role/Permission`).
- **Indexes:** every FK and every filterable field is indexed. Search uses
  `contains: ..., mode: "insensitive"` (PostgreSQL ILIKE).
- **Unique constraints:** use composite unique for "unique within a parent"
  (e.g. `@@unique([areaId, documentCode])`); use partial unique for
  "globally unique among live rows" (see the `aaccup_areas_code_active` partial
  index in migration `20250731000000_sprint5_aaccup_areas`).
- **Migrations:** one folder per migration under `prisma/migrations/`, named
  `YYYYMMDDHHMMSS_<sprint>_<feature>`. Prisma applies them in alphabetical
  order, so timestamp ordering must respect FK dependencies.
- **BigInt:** `DocumentVersion.sizeBytes` is `BigInt`. Serialize to string in
  API responses (`bigInt.toString()`); use `aggregate({ _sum: { sizeBytes: true } })`
  for sums (executed in SQL — only the scalar returns).
- Generator targets both `native` and `linux-musl-openssl-3.0.x` for Docker.
- Requirement snapshots preserve node, validation, and assignment UUIDs.
  Never regenerate these IDs during rollback: stable `AaccupRequirement` rows
  protect existing `AaccupSubmission.requirementId` foreign keys.

---

## 7. Docker conventions

- `docker-compose.yml` defines `postgres:16`, `minio/latest`, `pgadmin4`, and
  the `server` container. Volumes: `urs-postgres-data`, `urs-minio-data`,
  `urs-pgadmin-data`, `urs-server-logs`. Network: `urs-net` (bridge).
- `server/Dockerfile` is multi-stage (deps → build → runtime), runs as
  non-root, Alpine + OpenSSL for Prisma.
- `server/entrypoint.sh` runs `prisma migrate deploy` + `prisma seed` before
  `node dist/server.js`. Healthcheck is a `wget` against `/api/v1/health`.
- Env is read from `.env` (validated by Zod at boot).
- **Do not change Docker config unless a sprint explicitly asks for it.**

---

## 8. Audit log

- Model: `AuditLog` (append-only, immutable).
- Helper: `writeAudit({ action, userId?, entity?, entityId?, oldValue?,
  newValue?, ipAddress?, userAgent? })` in `modules/audit/audit.service.ts`.
- **`writeAudit` never throws** — it catches + logs errors, so an audit
  failure can never break a request flow.
- Action codes live in `config/constants.ts` `AUDIT_ACTIONS` (e.g.
  `AACCUP_AREA_CREATED`, `DOCUMENT_UPDATED`, `DEPARTMENT_CREATED`,
  `COLLEGE_ARCHIVED`, `SETTINGS_UPDATED`). Always add a new constant when
  you add a new mutation action — don't reuse string literals.
- Read-only endpoints (analytics, dashboard, health) do **not** write audit
  entries by convention.

---

## 9. Compliance — single source of truth

All AACCUP compliance calculations MUST go through
`modules/aaccup/services/compliance.service.ts`:

- `calculateRequirementStatus(requirementId)`
- `calculateAreaCompliance(areaId)`
- `calculateDepartmentCompliance(departmentId)`
- `calculateOverallCompliance(filter?)`

**Never reimplement compliance math in dashboard, reports, or future modules.**
Nothing is stored as a percentage — all values are computed live.
The dashboard module (`modules/dashboard/`) reuses
`calculateOverallCompliance()` for the AACCUP section.

### 9.1 Dynamic Requirement Engine

- ROOT management API base: `/api/v1/root/requirements`; management uses the
  seven singular `requirement.*` permissions and a hard ROOT role gate.
- Effective AACCUP precedence is `AACCUP_AREA` -> active
  `ACCREDITATION_CYCLE` -> `DEPARTMENT` -> `COLLEGE` -> `UNIVERSITY`.
  PROGRAM/OFFICE assignments are stored but do not participate in area
  resolution.
- `modules/requirements/requirement.runtime.ts` is the single source for
  assignment resolution, stable AACCUP projections, and dynamic upload-rule
  evaluation. Do not reproduce precedence or validation logic elsewhere.
- SECTION nodes are structural only. Active REQUIREMENT, SUB_REQUIREMENT, and
  SUPPORTING_DOCUMENT nodes project into existing `AaccupRequirement` rows.
- Runtime provenance is `sourceNodeId`, `sourceAssignmentId`, and
  `sourceTemplateVersion`; API output derives `sourceTemplateId` through the
  source node relation.
- Legacy AACCUP rows are used only when no builder assignment resolves.
  Builder-managed rows are immutable through legacy AACCUP CRUD.
- Resolution cache TTL is 60 seconds. Mutations invalidate it and refresh only
  areas affected by the template scopes/existing projections; read-time sync
  is the final consistency backstop.
- FILE_TYPE, FILE_SIZE, PAGE_COUNT, EXPIRATION_DATE, NAMING_CONVENTION, and
  METADATA rules run at preflight and submission. Only ERROR issues block.

### 9.2 Dynamic Workflow Engine

- ROOT management API base: `/api/v1/root/workflows`; runtime API base:
  `/api/v1/workflows` (mounted outside `/root` so reviewers can advance live
  instances). Management uses the eleven ROOT-only `workflow.*` codes plus
  `workflow.override`; runtime uses `workflow.instance.read` /
  `workflow.action.perform` / `workflow.review` granted to reviewer roles.
- `modules/workflow/` owns everything: definitions, steps, transitions,
  assignments, versions, history, instances, and the engine. Do not reproduce
  precedence or gating logic elsewhere.
- Published definitions are immutable. Publish writes a complete snapshot
  (steps/transitions/assignments with stable UUIDs) into
  `workflow_versions.data`; runtime instances execute against snapshot
  strings, never the authoring tables. Editing a PUBLISHED definition returns
  409; rollback replays an older snapshot as a NEW version.
- Host services call `bindWorkflowInstance`, `evaluateWorkflowAction`, and
  `recordWorkflowAction` INSIDE the same Prisma transaction as the business
  write (requests `create/decide/cancel`, submissions `create/review`,
  documents `create/status-change`). Repositories expose optional
  `Prisma.TransactionClient` params for this.
- Glue adapters map business decisions to authoring action codes:
  requests APPROVED/REJECTED/FULFILLED -> APPROVE/REJECT/FULFILL (+ CANCEL);
  submissions APPROVED/REJECTED/NEEDS_REVISION ->
  APPROVE/REJECT/REQUEST_REVISION; documents status changes ->
  RESET_TO_DRAFT/SUBMIT_FOR_REVIEW/APPROVE/PUBLISH/ARCHIVE. The action names
  themselves are authored by ROOT in the builder.
- Assignment precedence: AACCUP_SUBMISSION is AACCUP_AREA -> active
  ACCREDITATION_CYCLE -> DEPARTMENT -> COLLEGE -> UNIVERSITY;
  DOCUMENT_REQUEST / DOCUMENT is DEPARTMENT -> COLLEGE -> UNIVERSITY; then
  priority desc, newest createdAt, PUBLISHED only. Fail-open: unresolved
  assignment means the legacy flow runs unchanged.
- Resolution cache TTL is 60 seconds; mutations invalidate it.
- Override (COMPLETE/TERMINATE) is ROOT-only and always audited.

---

## 10. Things AI must NEVER change

| Area                | Rule                                                       |
|---------------------|------------------------------------------------------------|
| Authentication      | Never touch `modules/auth/*` or `middlewares/authenticate`. |
| RBAC engine         | Never touch `middlewares/authorize.ts` (only its callers  |
|                     | — `requirePermission(...)` calls — may be added).          |
| rbac catalog        | Only ADD entries to `permissions.constants.ts` /           |
|                     | `roles.constants.ts`. Never remove existing ones.          |
| Upload / MinIO      | Never modify `lib/storage.ts` or the upload API surface.   |
| Document repository | No changes to `modules/documents/*` unless a sprint says.  |
|                     | (Sprint 7.4.5's additive workflow gate in                   |
|                     | `documents.service.ts` is the sanctioned exception.)        |
| Request workflow    | No changes to `modules/requests/*` unless a sprint says.   |
|                     | (Sprint 7.4.5's additive workflow gate in                   |
|                     | `requests.service.ts` is the sanctioned exception.)        |
| Dashboard UI        | Backend-only. Don't touch `client/` or root `src/` unless  |
|                     | a sprint explicitly says "frontend".                       |
| Docker              | No changes to compose / Dockerfile / entrypoint unless a   |
|                     | sprint explicitly asks.                                    |
| Folder structure    | Keep the `routes → controller → service → repository`     |
|                     | module shape. Don't invent new top-level dirs.            |
| Existing API        | Never break an existing endpoint's contract.               |
| Tests               | There are none yet — don't add unless asked. vitest exists.|
| Secrets             | Never log/commit secrets. `.env` is gitignored.            |

When a sprint says "do not modify X", that means **do not even touch X to
"improve" it** unless fixing a bug that Sprint explicitly identifies.

---

## 11. Reusable services / helpers

| Need                       | Use                                                  |
|----------------------------|------------------------------------------------------|
| Audit write                | `writeAudit()` from `modules/audit/audit.service.ts` |
| API envelope               | `sendSuccess` / `sendCreated` from `utils/apiResponse` |
| Async handler              | `asyncHandler()` from `utils/asyncHandler`          |
| Error classes              | `BadRequestError`, `NotFoundError`, `ConflictError`, |
|                            | `ForbiddenError`, `UnauthorizedError` from `utils/errors` |
| Validation                 | `validateBody/Query/Params(schemaZod)` from          |
|                            | `middlewares/validate`                              |
| Permission gate            | `requirePermission(...codes)` from `middlewares/authorize` |
| Authentication gate        | `authenticate` from `middlewares/authenticate`        |
| Compliance (AACCUP)       | `calculateXxxCompliance` from                       |
|                            | `modules/aaccup/services/compliance.service.ts`      |
| Requirement runtime       | resolution/projection/validation from                |
|                            | `modules/requirements/requirement.runtime.ts`        |
| Workflow engine           | bind/evaluate/record + precedence from               |
|                            | `modules/workflow/workflow.{engine,service}.ts`      |
| Storage ops                | `presignUpload/Download`, `statObject`, `deleteObject`,|
|                            | `getObjectStream` from `lib/storage`                |
| Prisma singleton          | `prisma` from `lib/prisma`                          |

---

## 12. Coding conventions

- **TypeScript strict.** No `any`. Use `unknown` + narrowing if type is truly
  dynamic.
- **No code comments unless they explain WHY, not WHAT.** Inline-only when
  non-obvious. The repo style prefers a header comment block per file with
  `=====` separators (see any existing service file).
- **Controllers stay thin.** They build an `Actor` and delegate.
- **Services own business logic + RBAC assertions.**
- **Repositories own Prisma access only** (no business rules).
- **Don't duplicate logic.** Reuse `assertDepartmentExists`-style helpers
  instead of pasting the same `findFirst` everywhere.
- **Use `satisfies Prisma.<XxxInclude>`** for relation include objects so the
  compiler checks the shape without widening the type.
- **Soft delete only.** No hard-delete endpoints except where the schema
  uses `onDelete: Cascade` for true child rows.
- **Don't add code comments to satisfy a linter.** The project's ESLint config
  does not require JSDoc.
- **Run server typecheck/lint/build, Prisma validation, and canonical client
  typecheck/build before returning from any sprint.** The server test command
  currently has no test files; client lint currently has no ESLint 9 config.

---

## 13. Environment variables (validated by Zod at boot)

Required: `DATABASE_URL`. Defaults provided for everything else (see
`config/env.ts`). Notable:
- `DATABASE_URL` — Postgres connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — signing secrets
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`,
  `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_ENDPOINT`
- `CLIENT_URL` — CORS origin
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_EMPLOYEE_ID`,
  `BOOTSTRAP_ADMIN_PASSWORD` — optional, used by seed on first boot
- `BOOTSTRAP_ROOT_EMAIL`, `BOOTSTRAP_ROOT_EMPLOYEE_ID`,
  `BOOTSTRAP_ROOT_PASSWORD` — optional protected ROOT bootstrap
- `NODE_ENV` — controls logging + error detail leakage
