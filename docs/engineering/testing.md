# Testing Standards (URS-DMS)

> One responsibility: smoke testing, regression, build verification, sprint
> completion. Behavioral checklist source: `ENGINEERING_RULES.md` §19/§20
> (historical; superseded by this document).

## Build verification (before any completion)

```bash
# server
npm run build                              # typecheck + compile (workspace server)
npx prisma validate                        # schema valid
npx prisma migrate status                  # up to date
# client
npx tsc -b                                 # typecheck
npm run build                              # production build (client)
```

Known tooling gaps (documented, non-blocking): server `test` exits 1 (no
test files; vitest configured but unused — no tests unless a sprint
explicitly asks); client lint has no ESLint 9 config.

## Smoke test standard

Every sprint MUST end with one complete smoke test:

```
✓ Login (root / administrator / faculty)
✓ Root Portal (config, organization, folder/requirement/workflow/form builders, setup wizard, control center)
✓ Administrator Portal (dashboard, analytics, reports, audit, users, roles, permissions, settings, requests, notifications)
✓ User Portal (documents, requests, AACCUP/ISO/Certification, notifications, profile)
✓ Upload / Download / Preview / Search
✓ Folder CRUD (create, rename, delete, move, nested, breadcrumb)
✓ File CRUD (rename, move, delete, replace version, multi-select)
✓ Repository isolation (user A never sees user B)
✓ AACCUP flow (area → requirement → submission → review → approval → compliance)
✓ Workflow execution (bind → advance → complete)
✓ Forms + assignments
✓ Requests flow
✓ Configuration persistence
✓ PostgreSQL persistence (data survives backend restart)
✓ MinIO persistence (object survives restart)
✓ RBAC spot checks (faculty blocked from admin/root; admin blocked from /root)
✓ Empty states (zero business data renders honest zeros)
✓ No mock data introduced (grep for mock identifiers + cleanup of test records)
✓ TypeScript build (server + client), production build, Prisma validate
✓ No broken imports, no console errors
```

The checklist must pass before a sprint is reported complete; any failure is
fixed before completion.

Repository module: `scripts/smoke-repository.ps1` runs the full 49-check
repository suite (self-cleaning; uses ROOT from `.env` bootstrap).

## Regression

- After every change: full typecheck + build + `prisma validate`; re-run the
  relevant module smoke.
- Read-only regression matrix pattern: probe every module's list endpoints
  after integration changes.

## Mock data policy

| Rule | Standard |
|---|---|
| Temporary testing only | Mock records may be created during development/testing only |
| Remove before completion | Every sprint must remove its temporary test records before finishing |
| Never ship mock data | Finished system contains only Root account, roles, permissions, bootstrap configuration |
| Dashboard | Every statistic from real backend APIs; failures render honest zero/empty states — never invented values |
| Cleanup tooling | `scripts/cleanup-demo-data.js` (dry-run + execute, soft-delete, pattern-based); `scripts/cleanup-recycle-bin.js` (retention sweep) |
| Safety | Never delete user-created records; never delete MinIO objects during cleanup; keep the audit trail |
| Audit report | Any removal recorded in `docs/mock-data-audit.md` (file, type, reason, replacement, risk, status) |

## Sprint completion

Every sprint MUST finish with a report containing:

1. Summary (1 paragraph)
2. Files Created
3. Files Modified
4. Database Changes (schema/migration/seed)
5. API Changes (endpoints added/changed)
6. UI Changes
7. Smoke Test Results (checklist above)
8. Known Issues
9. Completion Confirmation (the exact phrase the sprint brief specifies)

Update `docs/context/PROJECT_STATUS.md` (sprint history) and
`docs/context/PROJECT_ROADMAP.md` (sprint table) with every completed sprint.

## Related documents

- `engineering/backend.md` — health/build commands
- `docs/context/MODULE_INDEX.md` — module map for targeted smoke
- `docs/mock-data-audit.md` — removal records
