# MinIO bucket initialization

The `urs-minio` container is configured to run a startup script that creates
the `urs-dms` bucket if it doesn't already exist. The bucket is created via
the MinIO client in `server/src/storage/buckets.ts` during server boot.

## Bucket configuration

| Setting     | Value      |
|-------------|------------|
| Name        | `urs-dms`  |
| Region      | `us-east-1` (default) |
| Versioning  | disabled   |
| Locking     | disabled   |

## Folder structure (recommended for Sprint 2+)

When uploads are implemented, organize objects by content type:

```
urs-dms/
├── documents/      # PDF, DOCX, XLSX, etc.
├── avatars/        # User profile pictures
├── exports/        # Generated reports (CSV, XLSX)
└── temp/           # Short-lived upload staging (TTL: 24h)
```

## Access

The MinIO Console is exposed at `http://localhost:9001` with credentials:

- User:     `urs_minio_admin` (configurable via `MINIO_ACCESS_KEY`)
- Password: `urs_minio_secret` (configurable via `MINIO_SECRET_KEY`)

The server uses these credentials to sign requests programmatically.

## Production hardening (out of scope for Sprint 1)

- TLS termination (set `MINIO_USE_SSL=true`)
- Bucket policies restricting public access
- Lifecycle rules for the `temp/` prefix
- Cross-region replication for disaster recovery
