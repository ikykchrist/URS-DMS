# Sprint 7.4.5 — Dynamic Workflow Builder: Completion Report

**Sprint:** 7.4.5
**Status:** COMPLETE
**Date:** 2026-08-04
**Migration:** `20260823000000_sprint7_4_5_workflow_builder`
**Scope rule:** nothing from 7.4.6 or later is included.

---

## 1. Executive Summary

Sprint 7.4.5 delivered the platform's Dynamic Workflow Builder: a ROOT-only
authoring engine for versioned, validated, publishable workflow definitions
(steps + transitions + scoped assignments), an immutable published-snapshot
model, a runtime engine that binds and gates live workflow instances, and a
reviewer-facing runtime API — wired into the three existing business flows
(document requests, AACCUP submissions, document status changes) through
transactional glue. It also replaced the last production mock in the canonical
client: the Document Repository now loads its real folder tree from the server
and creates folders through the real API. The sprint ships with 14 new
permission codes (catalog now 108), 27 management + 4 runtime endpoints, 9 new
tables, and a Root Console Workflow Builder page.

## 2. Sprint Goal and Scope

Goal: make approval/review flows fully data-driven — ROOT authors the workflow
once; every request, submission, and document-status change is gated by the
published workflow of the day, with legacy behavior preserved when no workflow
is assigned (fail-open).

In scope: engine + schema + management API + runtime API + RBAC + integration
into requests / AACCUP submissions / documents + ROOT Workflow Builder UI +
repository folder persistence fix + regression verification + docs.

Out of scope (deliberately not started): notification emitter wiring,
configuration-engine consumption, self-service profile endpoints, SSE/WebSocket
push, test suite, ESLint 9 config, multipart uploads.

## 3. Deliverables

- Backend: `server/src/modules/workflow/*` (routes, controller, service,
  engine, repository, types, validator, cache).
- Integration: `requests.service.ts` / `requests.repository.ts`,
  `aaccup.submissions.service.ts`, `documents.service.ts` /
  `documents.repository.ts` (transaction-aware).
- RBAC: 14 `workflow.*` codes in `permissions.constants.ts`,
  `roles.constants.ts` (reviewer-role grants), ROOT_ONLY_CODES protection.
- Migration `20260823000000_sprint7_4_5_workflow_builder` (9 tables).
- Client: full workflow API layer in `client/src/services/root.ts`, new page
  `client/src/pages/root/RootWorkflowBuilder.tsx`, `App.tsx` + `Sidebar.tsx`
  registration.
- Persistence fix: `client/src/services/documents.ts` (resolve + create
  folder), `client/src/pages/DocumentRepository.tsx` (server-backed tree,
  working Create Folder dialog).
- Docs: `API_CONTRACTS.md` (Sprint 7.4.5 section), `docs/database.md`,
  `PROJECT_STATUS.md`, `PROJECT_ROADMAP.md`, `AI_CONTEXT.md`, and this report.

## 4. Backend: Workflow Engine

- Definitions carry `entityType` (DOCUMENT_REQUEST, AACCUP_SUBMISSION,
  DOCUMENT), a version counter, and DRAFT / PUBLISHED / ARCHIVED status.
- Steps are START / TASK / REVIEW / APPROVAL / END with optional
  `roleName` / `permissionCode` gates and ordering.
- Transitions are directed edges `fromStepId → toStepId` carrying the authored
  `actionCode` and an optional `requiredPermission`.
- Publish writes a complete immutable snapshot (steps, transitions,
  assignments, all with stable UUIDs) into `workflow_versions.data` in one
  transaction with engine history. Runtime executes snapshot strings only —
  authoring rows can be edited in drafts without affecting live instances.
- Rollback replays an older snapshot as a NEW version (auditable,
  non-destructive), preserving step/transition UUIDs so existing
  step-instance and action rows keep valid foreign keys.
- Validation runs 13 structural checks: start/end presence and uniqueness,
  reachability of every step from START, terminability to END, action-code
  resolution on every transition, role/permission existence, no duplicate
  sibling codes, no self-loops on START/END.
- 60-second in-process resolution cache; mutations invalidate it.

## 5. Management API

Base `/api/v1/root/workflows` — 27 endpoints, hard ROOT role gate (parent
`rootRouter`) plus per-route `workflow.*` permission gates. Fixed segments
`/history`, `/assignments`, `/instances` are registered before `/:id` so they
can never be shadowed.

- Definitions: list (q/entityType/status/page), create (unique code per
  entityType), get detail, patch, soft-archive, restore.
- Steps: list, create, patch, soft-archive, restore.
- Transitions: create, patch, soft-archive, restore.
- Assignments: assign (`targetType` + optional `targetId` + `priority`, one
  live assignment per targetType), unassign, list all.
- Lifecycle: validate, publish (must be valid; bumps version, writes snapshot +
  history), rollback (to a prior version), versions list.
- Instance administration: list (entityType/entityId/status filters), get
  detail.
- Engine history: paginated list with versionFrom/versionTo and actor.

Publish immutability is enforced: PATCH on a PUBLISHED definition,
step/transition writes, and re-assignment all return 409 until a rollback
creates a new DRAFT.

## 6. Runtime API

Base `/api/v1/workflows` — mounted OUTSIDE `/root` so reviewer roles can act:

| Endpoint | Permission | Purpose |
|---|---|---|
| `GET /instances` | workflow.instance.read | list (filters + pagination) |
| `GET /instances/:id` | workflow.instance.read | detail + `allowedActions` for the actor |
| `POST /instances/:entityType/:entityId/actions` | workflow.action.perform | advance the live instance |
| `POST /instances/:id/override` | workflow.override (ROOT) | COMPLETE / TERMINATE |

`actions` resolves the entity's RUNNING instance, finds the transition whose
actionCode matches, checks the actor against the transition's
requiredPermission, the step's roleName/permissionCode, or the `workflow.review`
grant on review steps, advances the instance, and completes it at END.
Wrong action from the current step, unknown entity, terminal instance, and
missing binding all return 409. Override is always recorded in audit + engine
history.

## 7. RBAC and Permissions

Fourteen new codes; the catalog now contains 108 permissions.

- ROOT-only (authoring + override): `workflow.read`, `workflow.create`,
  `workflow.update`, `workflow.archive`, `workflow.restore`,
  `workflow.version`, `workflow.validate`, `workflow.publish`,
  `workflow.rollback`, `workflow.assign`, `workflow.override`.
- Reviewer roles (ADMINISTRATOR, QAO, DEPARTMENT_COORDINATOR) hold exactly:
  `workflow.instance.read`, `workflow.action.perform`, `workflow.review`
  (ROOT also has them via the full catalog).
- The privilege-escalation guard and ROOT account protections are unchanged;
  the new codes live in `ROOT_ONLY_CODES` and are filtered from the
  ADMINISTRATOR seed set.
- Service-level assertions re-check scope (readers may only see instances for
  their scope chain), per defense-in-depth.

## 8. Runtime Integration into Business Flows

Glue adapters map business decisions to authored action codes; host services
wrap engine calls in the same Prisma transaction as the business write so a
workflow failure rolls back the request/submission/document write.

| Flow | Trigger | Adapter |
|---|---|---|
| DOCUMENT_REQUEST | `POST /requests/:id/decision` | APPROVED→APPROVE, REJECTED→REJECT, FULFILLED→FULFILL |
| DOCUMENT_REQUEST | `POST /requests/:id/cancel` | CANCEL |
| AACCUP_SUBMISSION | `POST /aaccup/submissions/:id/review` | APPROVED→APPROVE, REJECTED→REJECT, NEEDS_REVISION→REQUEST_REVISION |
| DOCUMENT | `PATCH /documents/:id` (status change only) | DRAFT→RESET_TO_DRAFT, UNDER_REVIEW→SUBMIT_FOR_REVIEW, APPROVED→APPROVE, PUBLISHED→PUBLISH, ARCHIVED→ARCHIVE |

Repositories became transaction-aware (`create(args, tx?)`,
`decide(args, tx?)`, `update(args, tx?)`); `repo.decide` also sets
`decidedAt`. When no workflow assignment resolves for the entity, the legacy
path runs unchanged (fail-open). Assignment precedence: AACCUP_SUBMISSION is
AREA → active CYCLE → DEPARTMENT → COLLEGE → UNIVERSITY; requests/documents
are DEPARTMENT → COLLEGE → UNIVERSITY; then priority desc, newest createdAt,
PUBLISHED only.

## 9. Client: Root Console Workflow Builder

- `client/src/services/root.ts`: typed API layer for definitions, steps,
  transitions, assignments, versions, history, validation, publish, rollback,
  instances, and target options.
- `client/src/pages/root/RootWorkflowBuilder.tsx` (~2,250 lines): four tabs —
  Builder (definition cards + detail with step/transition tables),
  Assignments (list + assign dialog with live target-type options),
  Instances (filterable list + detail dialog with perform-action and
  COMPLETE/TERMINATE override), History (paginated engine history).
- Dialogs: step editor, transition editor, validation results, publish
  confirmation, versions + rollback, assignment, instance detail.
- Registered in `App.tsx` (`root-workflow-builder`) and the sidebar
  (`WorkflowBuilder` under Root, `Workflow` icon).

## 10. Mock Persistence Fix (Document Repository)

- `GET /folders/resolve` + `POST /folders` were already live on the server;
  the client was still using a hardcoded tree and a fake create-folder dialog.
- `client/src/services/documents.ts` gained `resolveRepositoryStructure()` and
  `createRepositoryFolder()` with server response types.
- `DocumentRepository.tsx`: the hardcoded tree is now the offline `fallback`
  only; with a server session the page resolves the real tree (template →
  mapped tree, legacy folders → derived tree), shows the resolved source
  (template / legacy / none / fallback), and the Create Folder dialog now
  posts to the server (or updates local state when offline) with real name +
  parent selects.

## 11. Schema and Migration

`20260823000000_sprint7_4_5_workflow_builder` adds 9 tables —
`workflow_definitions`, `workflow_steps`, `workflow_transitions`,
`workflow_assignments`, `workflow_versions`, `workflow_histories`,
`workflow_instances`, `workflow_step_instances`, `workflow_actions` — with
UUID PKs, `createdAt`/`updatedAt`, enums (statuses, step types, target types,
change types), FK indexes, a partial unique for live definition
(code, entityType), a unique per-definition targetType on assignments, and
soft-delete semantics. Runtime rows store snapshot strings (step code/name/
type) rather than FK-only references, keeping published versions immutable.

## 12. Static Verification

- `prisma validate` — pass.
- Server: `npm run typecheck` (tsc --noEmit) — pass; `npm run build`
  (tsc + tsc-alias) — pass.
- Client: `npx tsc -b` — pass; `npm run build` (tsc -b && vite build) — pass,
  2501 modules, only pre-existing warnings (chunk size; dynamic-vs-static
  import notices for validation.ts / storage.ts).
- Docker: `urs-postgres` and `urs-minio` healthy.
- Known tooling gaps (unchanged, documented): server `npm test` exits 1
  (vitest configured, zero test files); client lint has no ESLint 9 config.

## 13. Live Smoke — Builder Lifecycle

Suite `smoke-workflows.ps1` against the running server (PostgreSQL + MinIO):

- ROOT creates a workflow (DOCUMENT_REQUEST), adds 2 steps + APPROVE
  transition; validation returns 13 checks, `valid: true`.
- Publish → PUBLISHED, version 2. PATCH on the PUBLISHED definition → 409.
- Rollback to version 1 → DRAFT, version 1.
- A broken definition (no END reachability) validates `false` and publish is
  blocked with HTTP 400.
- Assignments: UNIVERSITY assignment created; duplicate targetType → 409.
- RBAC: a non-ROOT (requester) user gets 403 on `/root/workflows`.
- Engine history lists 11 actions (CREATED, VALIDATED, PUBLISHED, ASSIGNED,
  ROLLED_BACK, ...); versions count 2.

## 14. Live Smoke — Runtime Integration

- Creating a document request auto-binds a RUNNING instance at step `start`.
- QAO performs SUBMIT, then APPROVE → instance COMPLETED. A wrong action from
  the current step → 409.
- Requester cannot read instances (403) and cannot perform actions (403);
  QAO can read and act (scope chain respected).
- ROOT overrides a RUNNING instance with TERMINATE → TERMINATED; further
  actions on it → 409.
- Audit Center `q=Workflow` returns 40 entries covering mutation actions.

## 15. Live Smoke — AACCUP End-to-End

Suite `smoke-aaccup.ps1` (department → area → template assignment →
projection → upload → submission):

- ROOT creates a department, an AACCUP area bound to it, a requirement
  template, and a REQUIREMENT node; template assignment to the area syncs the
  stable `AaccupRequirement` projection.
- QAO creates a document in the department, uploads a version to MinIO
  (presigned PUT) and verifies it (SHA-256 streams; verified: true).
- Submission creation → status PENDING and the AACCUP_SUBMISSION instance is
  bound RUNNING at `start`.
- Review decision APPROVED (mapped to APPROVE) advances the UNIVERSITY-scoped
  flow → submission APPROVED, instance COMPLETED.

## 16. Persistence and Restart Verification

After all smoke data was created, the server process was stopped and restarted:

- Definitions list still returns the published workflow (meta.total 1).
- `/folders/resolve` still returns `source=legacy` with 2 legacy folders.
- Instance administration still lists 7 instances.
- The uploaded MinIO object still downloads (33 bytes, exact content) through
  a fresh presigned URL.
- Conclusion: workflow, folder, instance, and object-store state all survive
  restarts; the migration is fully applied on the live database.

## 17. Known Issues and Gaps

- No automated test files (vitest configured; sprint rule: don't add tests
  unless asked).
- Canonical client has no ESLint 9 configuration; client lint cannot start.
- Existing Vite chunk-size and dynamic-import warnings remain (non-blocking,
  pre-existing).
- Runtime instance view reports `actions: []` on completed instances because
  no action is available from a terminal step (by design).
- Rate limiter (100 req / 15 min per IP) can throttle heavy smoke runs; the
  test server was run with a raised limit — production defaults unchanged.
- AACCUP submission creation requires a verified current document version and
  a projected builder requirement; legacy requirements still work via the
  legacy fallback path.

## 18. Performance and Caching

- Assignment resolution uses a 60-second in-process cache; authoring
  mutations invalidate it so publish/assign/rollback are immediately visible.
- Runtime lookups (entity → instance) use the unique `(entityType, entityId)`
  index; instance detail joins only the steps/actions of that instance.
- Publish and rollback each run in a single transaction (snapshot + history +
  status bump), so the versions table can never drift from the definitions
  table.

## 19. Documentation Updates

- `API_CONTRACTS.md`: new Sprint 7.4.5 section (permissions table, core
  types, 27 management endpoints, runtime endpoints, glue adapter table,
  precedence rules, schema, error semantics).
- `docs/database.md`: new workflow tables section + schema-intro fix.
- `PROJECT_STATUS.md`: current sprint = 7.4.5 COMPLETE (7.4.4 moved to
  Previous), completed-tasks list, next-task, health-check results.
- `PROJECT_ROADMAP.md`: 7.4.5 marked done in Sprints completed.
- `AI_CONTEXT.md`: module tree + workflow engine conventions (9.2), RBAC
  section (108 codes, reviewer grants), reusable helpers, sanctioned
  exceptions table for documents/requests services.

## 20. Retrospective and Next Steps

What went well: the snapshot/publish model made immutability simple to
verify; the fail-open glue kept all three legacy flows untouched when no
workflow is assigned; live smoke suites caught integration issues (e.g., the
AACCUP requirement must be the projected row id, not the template id) before
sign-off; the folder-tree fix removed the last hardcoded client fixture.

What to watch: runtime integration grows with each new business flow — new
flows should adopt the `bind/evaluate/record` + transaction pattern from the
start; the reviewer-role grant model must be re-validated if new runtime
actions are added.

Suggested next focus (awaiting user direction): wire notification emitters
and configuration-engine consumption into existing modules (Sprint 7.3 /
7.4.1 integration contracts), or self-service profile (`PATCH /users/me` +
`/sessions` list/revoke).
