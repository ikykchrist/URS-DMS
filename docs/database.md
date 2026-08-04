# Database

This document explains how the URS-DMS PostgreSQL database is configured
and how to interact with it during development.

## Stack

- **Database**: PostgreSQL 16 (Alpine image in production)
- **ORM**: Prisma 5
- **Migrations**: Prisma Migrate
- **Connection**: Pooled via Prisma's built-in connection pool

## Connection

The `DATABASE_URL` environment variable is the single source of truth.
Format:

```
postgresql://<user>:<password>@<host>:<port>/<database>?schema=public
```

For local development with Docker Compose, use the docker service name
(`urs-postgres`) as the host:

```
postgresql://urs_user:urs_password@urs-postgres:5432/urs_dms?schema=public
```

For local development WITHOUT Docker (running directly on the host):

```
postgresql://urs_user:urs_password@localhost:5432/urs_dms?schema=public
```

## Prisma setup

### Configuration files

| File | Purpose |
|---|---|
| `server/prisma/schema.prisma` | Data model — single source of truth |
| `server/prisma/migrations/` | Generated SQL migrations (created by Sprint 2) |
| `server/prisma/seed.ts` | Seed script (Sprint 1: placeholder) |

### Generator

The client is generated to `node_modules/@prisma/client`. It runs at
install time via `postinstall` and at build time in Docker.

Binary targets include `linux-musl-openssl-3.0.x` so the Alpine image
works out-of-the-box.

### Common commands

```bash
# Generate the client (after editing schema.prisma)
npm run prisma:generate

# Create a new migration (interactive)
npm run prisma:migrate

# Apply pending migrations (production / CI)
npm run prisma:deploy

# Open Prisma Studio (web UI for browsing data)
npm run prisma:studio
```

## Sprint 1 — empty schema

The schema currently contains only the generator and datasource blocks.
No models, no tables. Sprint 2 will introduce:

- `User`, `Role`, `Permission`, `RolePermission`
- `Session` (for refresh-token tracking and audit)
- `Department`, `Document`, `DocumentVersion`
- `DocumentRequest`, `Comment`, `ApprovalRecord`
- `AACCUPArea`, `AACCUPAreaRequirement`
- `AuditLog`, `Notification`

These will be added via Prisma migrations, **not** by writing SQL by
hand. Migrations live in `server/prisma/migrations/` and are applied
automatically on container start (`prisma migrate deploy` in the
Dockerfile CMD chain).

## Why no `prisma migrate dev` placeholder?

Some Prisma versions require at least one model to create a migration.
Prisma 5+ does **not** — an empty schema (with only generator +
datasource) is valid, and `prisma migrate dev --create-only --name init`
produces an empty migration. The migrations table is created on the
first `prisma migrate deploy` run.

If you need to verify the migrations table exists, run:

```bash
docker compose exec postgres psql -U urs_user -d urs_dms \
  -c "SELECT * FROM _prisma_migrations LIMIT 5;"
```

(Empty result is normal in Sprint 1.)

## Schema design rules (going forward)

1. **Use UUIDs** for primary keys (`id String @id @default(uuid())`).
   UUIDs make data portable across environments (no ID collisions when
   restoring backups).
2. **Use `createdAt` / `updatedAt`** on every model. Set via `@default(now())`
   and `@updatedAt`.
3. **Soft-delete** (`deletedAt DateTime?`) for business entities you
   might need to recover.
4. **Use enums** for fixed sets of values (e.g., DocumentStatus, Role).
5. **Add indexes** on foreign keys and any field used in WHERE clauses.
6. **Avoid JSON columns** unless the data is truly unstructured.
7. **Migrations are immutable** — never edit a migration that has been
   applied. Add a new migration instead.

## Connection pooling

Prisma manages connections automatically. Default pool size is `num_physical_cpus * 2 + 1`.
For production tuning, see
[Prisma connection management](https://www.prisma.io/docs/guides/connection-management).

## Backups

For local development, use `pg_dump`:

```bash
docker compose exec -T postgres pg_dump -U urs_user urs_dms > backup.sql
```

Restore:

```bash
cat backup.sql | docker compose exec -T postgres psql -U urs_user -d urs_dms
```

Production backups are out of scope for Sprint 1 — use managed Postgres
backups (e.g., AWS RDS automated snapshots, Google Cloud SQL, etc.).

## Troubleshooting

### "Can't reach database server"

Postgres container isn't healthy yet. Wait or check:

```bash
docker compose ps postgres
docker compose logs postgres
```

### "Prisma Client is not generated"

Run:

```bash
npm --workspace server run prisma:generate
```

### "Migration failed"

Inspect:

```bash
docker compose logs server
```

Then either fix the migration and re-run, or reset (development only):

```bash
docker compose down -v   # DESTROYS DATA
docker compose up -d
```

## Sprint 7.4.5 — Dynamic Workflow Builder tables

Migration `20260823000000_sprint7_4_5_workflow_builder` adds the workflow
engine schema. All tables use UUID PKs, `createdAt` / `updatedAt`, and soft
delete (`deletedAt`) where business entities are involved:

| Table | Purpose |
|---|---|
| `workflow_definitions` | Authoring root; `code` + `entityType` unique per live row, `status` DRAFT/PUBLISHED/ARCHIVED, `version` counter |
| `workflow_steps` | START/TASK/REVIEW/APPROVAL/END steps; optional `roleName` / `permissionCode` gates, `sortOrder` |
| `workflow_transitions` | `fromStepId` → `toStepId` edges carrying the authored `actionCode` + optional `requiredPermission` |
| `workflow_assignments` | Scoped assignment (`targetType` + `targetId` + `priority`); one live assignment per targetType per definition |
| `workflow_versions` | Immutable post-mutation snapshots in `data` JSON (steps/transitions/assignments with stable UUIDs), `version` + `changeType` + `changedBy` |
| `workflow_histories` | Append-only engine history (action, old/new values, versionFrom/To, actor) |
| `workflow_instances` | Runtime bindings; `entityType` + `entityId` unique per RUNNING instance, `currentStepId`, status RUNNING/COMPLETED/TERMINATED |
| `workflow_step_instances` | Per-step runtime rows; snapshot strings (`stepCode`, `stepName`, `stepType`) copied from the published version |
| `workflow_actions` | Recorded action executions (actionCode, from/to snapshot step IDs, actor, note) |

Runtime instances execute against the snapshot strings in
`workflow_versions.data`, never against the mutable authoring rows, so
published workflows stay immutable while drafts continue to be edited.
