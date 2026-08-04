# Object Storage (MinIO)

URS-DMS uses MinIO as its S3-compatible object storage layer. This
document covers configuration, the bucket layout, and how the server
interacts with it.

## Why MinIO?

- **S3-compatible** — drop-in replacement for AWS S3. Migrating to S3
  later only requires changing the endpoint and credentials.
- **Self-hosted** — no external dependencies, no cloud lock-in.
- **Production-ready** — battle-tested, used by enterprises worldwide.

## Container layout

| Container    | Port (host) | Purpose                          |
|--------------|-------------|----------------------------------|
| `urs-minio`  | `9000`      | S3 API endpoint                  |
| `urs-minio`  | `9001`      | Web console                      |

The web console is at [http://localhost:9001](http://localhost:9001).
Default credentials (configurable in `.env`):

```
user:     urs_minio_admin
password: urs_minio_secret
```

## Configuration

The MinIO client is configured in `server/src/lib/minio.ts`. It reads:

| Variable                | Purpose                                |
|-------------------------|----------------------------------------|
| `MINIO_ENDPOINT`        | Hostname (e.g., `urs-minio` in Docker) |
| `MINIO_PORT`            | API port (default `9000`)              |
| `MINIO_USE_SSL`         | Whether to use HTTPS                   |
| `MINIO_ACCESS_KEY`      | Access key                             |
| `MINIO_SECRET_KEY`      | Secret key                             |
| `MINIO_BUCKET`          | Bucket name (default `urs-dms`)        |
| `MINIO_PUBLIC_ENDPOINT` | URL for browser-accessible presigned URLs |

The **internal** endpoint is used for server-to-storage communication
(reads/writes from the backend). The **public** endpoint is used when
generating presigned URLs that a browser opens directly (Sprint 2+).

## Bucket initialization

The server ensures the configured bucket exists on every boot:

```ts
// server/src/storage/buckets.ts
await ensureBucket(env.MINIO_BUCKET);
```

`ensureBucket()` is idempotent — it calls `bucketExists()` first and
only creates if missing. Safe to run on every restart.

## Bucket layout (planned)

```
urs-dms/
├── documents/           # User-uploaded PDFs, DOCX, XLSX, images
├── avatars/             # Profile pictures
├── exports/             # Generated reports (CSV, XLSX)
└── temp/                # Staging area for multipart uploads
```

Folder prefixes in S3 are not real folders — they're part of the
object key. Use `/` as the delimiter.

## Access patterns

### Server-side read (download)

The server uses the internal endpoint + credentials to stream objects
directly to clients. Use this when the client must NOT have direct
access to MinIO.

### Browser-side read (presigned URL)

For large files, generating a presigned URL and returning it to the
client avoids proxying through the server. The client downloads
directly from MinIO using a temporary signed URL.

This is **Sprint 2+** scope — not implemented in Sprint 1.

## Verifying MinIO is working

### Via the CLI

```bash
docker compose exec minio mc alias set local http://localhost:9000 urs_minio_admin urs_minio_secret
docker compose exec minio mc ls local/
```

### Via the web console

Open [http://localhost:9001](http://localhost:9001), log in, and browse
buckets.

### Via the server health endpoint

```bash
curl http://localhost:4000/api/v1/health | jq .data.services.minio
```

Should show:

```json
{
  "status": "up",
  "bucket": "urs-dms",
  "exists": true
}
```

## Troubleshooting

### "S3 API not responding"

Check that the MinIO container is healthy:

```bash
docker compose ps minio
docker compose logs minio
```

### "Bucket does not exist"

The server should auto-create it. If it didn't:

```bash
docker compose exec minio mc mb local/urs-dms
```

Or restart the server:

```bash
docker compose restart server
```

### "Access denied"

Credentials in `.env` don't match the container's `MINIO_ROOT_USER` /
`MINIO_ROOT_PASSWORD`. Check both files.

### Reset MinIO (development only — DESTROYS DATA)

```bash
docker compose down -v
docker compose up -d
```

## Production hardening (out of scope for Sprint 1)

- TLS termination (set `MINIO_USE_SSL=true`)
- Bucket policies denying anonymous access
- Cross-region replication for disaster recovery
- Lifecycle rules for the `temp/` prefix
- Move from local to network-attached storage for the `/data` volume
