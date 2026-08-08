# Testing Guide (URS-DMS)

> Sprint 8.6 — automated testing infrastructure for V1.0.

## Test Architecture

| Category | Tool | Location | Command |
|---|---|---|---|
| Server unit/integration tests | Vitest 2.1 | `server/src/__tests__/` | `npm test` |
| Server test watch | Vitest | — | `npm run test:watch` |
| Server coverage | Vitest + v8 | — | `npm run test:coverage` |
| Server lint | ESLint 9 flat config | `server/eslint.config.mjs` | `npm run lint` |
| Client lint | ESLint 9 flat config | `client/eslint.config.mjs` | `npm run lint` |
| Smoke tests (live API) | PowerShell | `scripts/smoke-*.ps1` | See below |
| Load tests | PowerShell | `scripts/load-test.ps1` | See below |

## Server Automated Tests

### Commands

```bash
cd server
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test Structure

```
server/src/__tests__/
├── setup.ts              # Test environment safety guard
├── helpers.ts             # Factory functions (createTestUser, createTestDocument, etc.)
├── rbac.test.ts           # Roles, permissions, escalation guard (24 tests)
├── repository.test.ts     # Ownership, isolation, depth, soft-delete, metadata (12 tests)
└── audit.test.ts          # Audit events, notifications, background jobs (10 tests)
```

### Test Safety

- Tests run against the configured `DATABASE_URL` (development DB by default).
- All test records use `smk.test.*@urs.local` email prefix and `SMK-TEST-*` employeeId prefix.
- Each `createTestUser()` call generates a unique random suffix to avoid email conflicts.
- `cleanupTestUser()` soft-deletes user and associated documents/folders.
- Individual tests clean up after themselves via `afterAll()` hooks.
- **No legitimate development data is modified.**
- To use a dedicated test database, set `DATABASE_URL` env var before running tests.

### Test Categories

| File | Focus | Type |
|---|---|---|
| `rbac.test.ts` | Role hierarchy, permission catalog, escalation guard, DB role population | Unit + Integration |
| `repository.test.ts` | Ownership isolation, folder depth limits, soft delete/restore, metadata | Integration |
| `audit.test.ts` | Audit event creation, notification per-user scoping, background job tables | Integration |

## Client ESLint

### Command

```bash
cd client
npm run lint
```

### Configuration

- `client/eslint.config.mjs` — ESLint 9 flat config
- Rules: no-explicit-any, no-unused-vars, no-empty, react-hooks, react-refresh
- Extended from: `@eslint/js` recommended + `typescript-eslint` recommended

## Smoke Tests (Live API)

9 PowerShell smoke test scripts for broad regression testing against a running server:

```bash
powershell -ExecutionPolicy Bypass -File scripts/smoke-repository.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-account.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-password-reset.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-aaccup.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-requests.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-roles-permissions.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-maintenance.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-background-jobs.ps1
powershell -ExecutionPolicy Bypass -File scripts/smoke-repository-rules.ps1
```

All smoke tests are self-cleaning (create `SMK`-prefixed fixtures, clean up after running).

## Load Testing

```bash
powershell -ExecutionPolicy Bypass -File scripts/load-test.ps1 -Users 10 -Duration 30
```

Simulates concurrent users hitting login → list folders → list documents → health check in a loop.

## Cleanup Scripts

```bash
node scripts/cleanup-demo-data.js     # Remove demo data
node scripts/cleanup-recycle-bin.js   # Sweep recycle bin items past retention
```

## Known Gaps

- No client-side Vitest/component tests (remaining future work).
- No end-to-end browser tests (Cypress/Playwright).
- Coverage reporting is available but thresholds are zero (informational only).
- Tests use the development database; no dedicated test PostgreSQL instance.
- No test isolation via transactions (tests operate on the shared DB with unique prefixes).

## CI Readiness

A future CI pipeline can execute:

```bash
npm install
cd server && npm run lint && npm run typecheck && npm test && npm run build
cd client && npm run lint && npx tsc -b && npm run build
```
