# Coding Standards (URS-DMS)

> One responsibility: how code is written. Architecture → `architecture.md`.
> API/backend conventions → `backend.md`. UI rules → `frontend.md`.

## TypeScript

- **Strict mode** everywhere. No `any`; use `unknown` + narrowing.
- No `if (role === "admin")` anywhere — every access decision routes through
  permissions (see `security.md`).
- BigInt fields serialize to strings in API responses.

## Naming conventions

| Kind | Standard |
|---|---|
| Backend files | `module.name.layer.ts` (e.g. `aaccup.submissions.service.ts`) |
| Components | PascalCase |
| Constants | UPPER_SNAKE |
| Functions / variables | camelCase |
| Folder structure | One directory per feature module; standard layer files; **no new top-level dirs** |

## Comments

- Explain **why**, not what. Header comment block per file with `=====`
  separators. No lint-appeasing comments.

## Layer patterns

Every feature module follows exactly:

```
routes → controller → service → repository → Prisma
```

| Layer | Responsibility | Constraints |
|---|---|---|
| Routes | HTTP mapping, permission gates, validation middlewares | Thin; register fixed segments before `/:id` |
| Controller | Build `Actor` from `req.auth` + `req.context`, delegate to service | Thin; no business logic |
| Service | Business logic, RBAC assertions, audit writes, transactions | Owns all rules |
| Repository | Prisma access only | No business rules |

- Dashboard-style read-only modules may aggregate directly via Prisma without
  a repository.
- Services re-assert permissions (defense in depth, see `security.md`).

## Service actor contract

```ts
interface Actor {
  id: string
  permissions: string[]
  ipAddress?: string
  userAgent?: string
}
```

## Error handling

- Use `utils/errors` classes (`BadRequestError`, `UnauthorizedError`,
  `ForbiddenError`, `NotFoundError`, `ConflictError`, `ServiceUnavailableError`).
- Never send raw errors; map at the central error handler.

## Reuse (never duplicate)

Shared helpers (do not re-implement): `writeAudit` (see
`specification/audit.md`), `sendSuccess`/`sendCreated`/`sendNoContent`,
`asyncHandler`, `requirePermission`/`requireAnyPermission`/`requireRole`,
`getConfigValue` (see `specification/configuration.md`), compliance service
(see `specification/aaccup.md`), workflow engine (see
`specification/workflow.md`), requirement runtime, storage helpers (see
`engineering/storage.md`), `prisma` singleton.

## Frontend components

- Reusable; one concern per file; extract shared views (e.g.
  `UserAccreditationView`, `RepositoryExplorer`).
- Use the existing shadcn-style primitives in `components/ui/` — never fork
  new primitives (see `frontend.md`).

## Related documents

- `architecture.md` — module shape rationale
- `backend.md` — API conventions, validation, controllers
- `frontend.md` — component and UI rules
