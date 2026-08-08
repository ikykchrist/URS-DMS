# Storage Standards (URS-DMS)

> One responsibility: MinIO architecture and file storage rules. Deep dive:
> `docs/storage.md` (legacy). Upload policy → `specification/configuration.md`.

## MinIO architecture

- Bucket from env; objects are **private**; access ONLY via presigned URLs.
- Physical objects are **never deleted by soft-delete** — the database
  reference is cleared; the scheduled maintenance runner handles retention
  sweep + orphan GC (see Maintenance section).
- `lib/storage.ts` is **frozen** — use `presignUpload` / `presignDownload`
  / `statObject` / `getObjectStream` / `deleteObject` / `objectExists` /
  `listObjectKeys`; never modify it.

## Object naming

```
documents/{documentId}/{versionId}/{sanitized-filename}
```

- Sanitize filenames to `[A-Za-z0-9._-]`.
- The key must be identical across presign, upload, verify, preview and
  download.

## Shared immutable blobs (D-017)

- `DocumentVersion.objectKey` is NOT unique: copies and request deliveries
  reference the SAME immutable version object (blobs are never rewritten).
- Permanent delete and the GC guard by **reference count** — an object key is
  removed only when zero version rows reference it.
- Deleting a copy never affects the source.

## Metadata

- All metadata lives in PostgreSQL (`Document`, `DocumentVersion`,
  `metadata` JSON). MinIO holds bytes only.
- Upload pipeline: create document row → create version (presigned PUT) →
  client uploads bytes → verify (SHA-256 of the stored object, streamed;
  size + digest must match) → promote `currentVersionId`.

## Presigned URLs

- `presignUpload` / `presignDownload` from `lib/storage`.
- The client strips `Content-Length` before PUT (server-supplied headers).
- Large uploads: presigned streaming PUT — never proxy bytes through the API.
- Downloads/previews: presigned GET; video via range requests (future).

## Maintenance (Sprint 8.3)

- **Recycle Bin retention**: automatic 30-day cleanup via
  `scripts/maintenance-runner.js` (24-hour cycle) or manual
  `scripts/maintenance-cleanup.js --recycle --confirm`.
- **Orphan detection**: `POST /root/maintenance/scan` enumerates all MinIO
  objects and records unreferenced ones as `CANDIDATE` in
  `maintenance_orphan_candidates`. Never deletes on first sight.
- **Orphan cleanup**: 7-day grace period, then `POST /root/maintenance/
  cleanup-orphans` re-verifies references before physical deletion.
- **Reference safety**: MinIO objects are deleted ONLY when zero
  `DocumentVersion` rows reference them (copies, Requested Document
  deliveries, and replace-version history all count).
- **Consistency check**: `npm run maintenance:storage-check` reports active
  references, recycle-bin expiry, missing MinIO objects, and orphan
  candidates (read-only).
- **Distributed lock**: all destructive jobs acquire a database-backed
  `maintenance_locks` row with 10-minute expiry + heartbeat — no Redis
  required.
- **Abandoned multipart uploads**: not currently cleaned (MinIO 7-day
  lifecycle policy recommended as a future enhancement).

## Related documents

- `specification/repository.md` — file lifecycle, versions, copy
- `engineering/database.md` — DB side of storage
- `docs/storage.md` — legacy deep dive
