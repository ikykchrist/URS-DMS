# Storage Standards (URS-DMS)

> One responsibility: MinIO architecture and file storage rules. Deep dive:
> `docs/storage.md` (legacy). Upload policy → `specification/configuration.md`.

## MinIO architecture

- Bucket from env; objects are **private**; access ONLY via presigned URLs.
- Physical objects are **never deleted by soft-delete** — the database
  reference is cleared; retention sweep + future GC job remove orphans.
- `lib/storage.ts` is **frozen** — use `presignUpload` / `presignDownload`
  / `statObject` / `getObjectStream` / `deleteObject`; never modify it.

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

## Related documents

- `specification/repository.md` — file lifecycle, versions, copy
- `engineering/database.md` — DB side of storage
- `docs/storage.md` — legacy deep dive
