# Deployment

How to deploy URS-DMS to staging and production environments.

This document covers:

1. Deployment topologies (single host vs distributed)
2. Environment configuration
3. Production hardening checklist
4. Operational runbook (logs, restarts, scaling)
5. Backup and disaster recovery
6. Upgrade procedure

## Topologies

### Single host (current — Sprint 1)

```
┌──────────────────┐
│   Docker Host    │
│ ┌──────────────┐ │
│ │   urs-server │ │  1 instance
│ ├──────────────┤ │
│ │ urs-postgres │ │  1 instance
│ ├──────────────┤ │
│ │  urs-minio   │ │  1 instance
│ ├──────────────┤ │
│ │ urs-pgadmin  │ │  1 instance (admin only)
│ └──────────────┘ │
└──────────────────┘
```

Pros: simple, easy to debug.
Cons: single point of failure.

### Distributed (future — Sprint 3+)

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (nginx / ALB)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ server #1 │  │ server #2 │  │ server #3 │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ postgres  │  │ postgres  │  │  minio    │
        │  primary  │  │  standby  │  │  cluster  │
        └───────────┘  └───────────┘  └───────────┘
```

For distributed mode, Postgres uses streaming replication (1 primary,
1+ standby). MinIO uses erasure coding across N nodes.

## Docker Compose — staging

The current `docker-compose.yml` defines all four services:

| Service    | Image                   | Port (host) | Volume              |
|------------|-------------------------|-------------|---------------------|
| `postgres` | `postgres:16-alpine`    | `5432`      | `urs-postgres-data` |
| `minio`    | `minio/minio:latest`    | `9000`,`9001` | `urs-minio-data`    |
| `pgadmin`  | `dpage/pgadmin4:latest` | `5050`      | `urs-pgadmin-data`  |
| `server`   | built from `./server/Dockerfile` | `4000` | `urs-server-logs`   |

### First-time setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate real JWT secrets
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"

# 3. Edit .env and paste the secrets

# 4. Build and start
docker compose up -d --build

# 5. Verify
curl http://localhost:4000/api/v1/health
```

### Day-to-day operations

```bash
# View logs
docker compose logs -f server

# Restart a single service
docker compose restart server

# Stop everything (keeps volumes)
docker compose down

# Reset (DESTROYS data)
docker compose down -v

# Apply Prisma migrations after schema change
docker compose exec server npx prisma migrate deploy

# Open Prisma Studio
docker compose exec server npx prisma studio
```

## Production hardening

### Required environment changes

```env
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
MINIO_USE_SSL=true
```

### TLS / HTTPS

For staging, you can use a self-signed cert. For production, use
Let's Encrypt or your cloud provider's certificate manager.

Two options:

**Option A — TLS at the load balancer (recommended)**

```
Client ──HTTPS──► ALB / nginx ──HTTP──► urs-server:4000
```

The server stays plain HTTP behind the LB. Set
`app.set("trust proxy", 1)` so `req.ip` reflects the real client.

**Option B — TLS in the container**

Run nginx or Caddy as a sidecar in the same container, or in a
separate container that proxies to the server.

### Database hardening

- Enable SSL connections (`?sslmode=require` in `DATABASE_URL`)
- Use a dedicated DB user with limited privileges (not `postgres`)
- Run automated daily backups
- Replicate to a standby in a different availability zone

### MinIO hardening

- Set `MINIO_USE_SSL=true`
- Generate strong `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- Restrict the bucket to private (no anonymous access)
- Use IAM-style service accounts for each microservice (Sprint 3+)

### Server hardening

- Run as non-root user (already done in Dockerfile: `USER nodejs`)
- Read-only filesystem where possible
- Drop `CAP_NET_RAW`, `CAP_SYS_ADMIN`, etc.
- Set resource limits (`memory: 512M, cpus: "1.0"` in compose)
- Set `--max-old-space-size=512` for Node

### Logging in production

Logs are written to:

- `stdout` — picked up by Docker, forwarded to your log aggregator
- `/app/logs/app.log` — mounted volume, persistent across restarts
- `/app/logs/error.log` — error-level only

For ELK / Loki / Datadog integration, configure your Docker logging
driver:

```yaml
# docker-compose.override.yml
services:
  server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,environment"
```

Or use a sidecar like `vector` / `fluentd` to ship logs.

### Rate limits

Default: 100 req / 15 min per IP. Adjust per environment:

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

For public-facing deployments, consider lowering to 30-50 req / 15 min.

## Backup & disaster recovery

### Postgres backups

```bash
# Daily backup (cron)
docker compose exec -T postgres pg_dump \
  -U urs_user \
  -d urs_dms \
  -F c \
  -f /tmp/backup_$(date +%Y%m%d).dump

# Copy out of the container
docker cp urs-postgres:/tmp/backup_20260727.dump ./backups/
```

Restore:

```bash
docker cp ./backups/backup_20260727.dump urs-postgres:/tmp/
docker compose exec -T postgres pg_restore \
  -U urs_user \
  -d urs_dms \
  --clean \
  --if-exists \
  /tmp/backup_20260727.dump
```

### MinIO backups

Use `mc mirror` to replicate to a backup bucket:

```bash
docker compose exec minio mc mirror /data/urs-dms /backup/urs-dms-$(date +%Y%m%d)
```

Or use MinIO's server-side replication to a remote cluster (Sprint 3+).

### Recovery objectives (targets)

| Tier    | RPO (data loss) | RTO (downtime) |
|---------|-----------------|----------------|
| Tier 1  | 1 hour          | 4 hours        |
| Tier 2  | 24 hours        | 24 hours       |

(Tune based on university requirements.)

## Upgrade procedure

1. **Test in staging first.** Always.
2. **Backup everything.** Postgres + MinIO bucket.
3. **Pull new image:**

   ```bash
   docker compose pull server
   ```
4. **Apply migrations** (the new image will run them on start, but
   you can do it manually):

   ```bash
   docker compose run --rm server npx prisma migrate deploy
   ```
5. **Restart with the new image:**

   ```bash
   docker compose up -d server
   ```
6. **Verify health:**

   ```bash
   curl http://localhost:4000/api/v1/health
   ```

### Rollback

If the new version breaks:

```bash
# Stop current server
docker compose stop server

# Start previous version
docker compose up -d server   # uses previous image if cached,
                               # or specify :previous-tag in compose
```

Postgres migrations are **forward-only**. To rollback a schema
change, write a new migration that reverses it.

## Kubernetes (future)

When migrating to K8s (Sprint 3+):

- Each service becomes a Deployment
- PersistentVolumes for postgres-data, minio-data
- StatefulSet for postgres (stable network identity)
- HorizontalPodAutoscaler for server (CPU-based)
- Ingress for HTTP routing
- cert-manager for TLS
- External secrets for JWT secrets

The current Docker Compose setup is K8s-ready in terms of patterns —
each service has health checks, persistent volumes, and explicit
dependencies.
