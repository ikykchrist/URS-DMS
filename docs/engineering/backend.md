# Backend Standards (URS-DMS)

> One responsibility: backend/API conventions. Code-level patterns →
> `coding.md`. Security gates → `security.md`.

## Stack

Node ≥ 20, Express 4.21, TypeScript strict, Zod 3.23, Prisma 5.22.

## REST conventions

- Plural resource nouns: `/documents`, `/aaccup/areas`, `/root/forms`.
- Fixed segments before `/:id` (e.g. `/documents/deleted`,
  `/documents/favorites`, `/folders/resolve`).
- Actions as sub-resources: `POST /:id/restore`, `POST /:id/publish`.
- Base `/api/v1`; ROOT-only management surfaces under `/api/v1/root` with the
  hard `requireRole("ROOT")` gate.

## Status codes

| Code | Use |
|---|---|
| 200 | Success (with `sendSuccess`) |
| 201 | Created (with `sendCreated`) |
| 204 | No content |
| 400 | Validation / bad request (`BadRequestError`) |
| 401 | Unauthenticated (`UnauthorizedError`) |
| 403 | Forbidden (`ForbiddenError`) |
| 404 | Not found (`NotFoundError`) |
| 409 | Conflict (duplicate, wrong state) (`ConflictError`) |
| 503 | Storage/DB unavailable (`ServiceUnavailableError`) |

## Envelope

```json
{ "success": true, "data": <T>, "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} } }
```

## Pagination / filtering / search

- Every list endpoint: `page` + `pageSize` (cap 100–200), `sort`, `order`.
- Filters as query params; `q` = case-insensitive partial search
  (`contains + mode: insensitive` on indexed/scan-able columns; bounded `q`).
- `null`-able query params accept the literal `null` via zod `preprocess`
  (e.g. `folderId=null` for root-level documents).
- Client list helpers paginate via `everyPage`/`apiGetPage`.

## Controllers

Thin: build `Actor` via `toActor(req)` from `req.auth` + `req.context`,
delegate to the service. No business logic (see `coding.md`).

## Services

Own business logic, RBAC assertions (defense in depth), audit writes,
transactions. Business writes + snapshots + history + workflow bindings must
commit atomically inside `prisma.$transaction`; repositories expose optional
`Prisma.TransactionClient` parameters for engine integrations.

## Validation

- Zod on every body/query/params; `.strict()` bodies reject unknown fields.
- Error classes map at the central error handler (see `coding.md`).
- File validation: size cap + allowed-file-types from the Configuration
  Engine, plus per-requirement dynamic rules (see `specification/configuration.md`
  and `specification/aaccup.md`).

## Related documents

- `coding.md` — layer contracts, actor shape, reuse
- `security.md` — permission gates, ownership checks
- `specification/audit.md` — audit writes from services
- `API_CONTRACTS.md` (root) — full endpoint contracts
- `docs/api.md` — legacy API reference
