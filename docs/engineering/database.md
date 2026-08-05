# Database Standards (URS-DMS)

> One responsibility: PostgreSQL / Prisma conventions. Deep dive:
> `docs/database.md` (legacy).

## Prisma

- `server/prisma/schema.prisma` is the single source of truth for the DB.
- UUID primary keys everywhere: `@id @default(uuid())` (TEXT columns).
- Audit timestamps on every transactional model: `createdAt @default(now())`,
  `updatedAt @updatedAt`, `deletedAt DateTime?` (soft delete).
- **Soft delete only** — no hard-delete endpoints except true child rows with
  `onDelete: Cascade`.

## Migration rules

- One folder per migration: `YYYYMMDDHHMMSS_<sprint>_<feature>`.
- **`prisma migrate dev` is broken on this repo** (shadow-DB replay fails on
  the Sprint 5 chain). Write the migration SQL manually, then:
  ```bash
  npx prisma migrate deploy   # applies pending migrations
  npx prisma generate         # stop node processes first (EPERM on DLL)
  ```
- Never modify an applied migration. Never remove bootstrap configuration.
- Health check: `npx prisma validate` + `npx prisma migrate status`.

## Relationships / onDelete

| Semantic | Rule |
|---|---|
| Required owned children | `onDelete: Restrict` |
| Optional attribution | `onDelete: SetNull` (`*.updatedBy`, `*.reviewedBy`, …) |
| True parent-owned sub-rows | `onDelete: Cascade` (versions, snapshots, history) |
| Indexes | Every FK and every filterable field is indexed |

## Transactions

Business writes + version snapshots + history rows + workflow bindings must
commit atomically inside `prisma.$transaction`. Repositories expose optional
`Prisma.TransactionClient` parameters for engine integrations.

## Uniqueness

- Composite unique for "unique within a parent"
  (`@@unique([areaId, code])`).
- Partial unique via raw index for "globally unique among live rows".
- BigInt fields serialize to strings in API responses.

## Related documents

- `coding.md` — repository layer, transactions in services
- `engineering/storage.md` — MinIO objects (DB holds all metadata)
- `docs/database.md` — legacy deep dive
