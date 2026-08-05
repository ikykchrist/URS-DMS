# Architecture Decision Records (URS-DMS)

> Permanent log of architectural decisions. Each decision is recorded once and
> referenced everywhere else; do not re-litigate a recorded decision without a
> new decision record that supersedes it (status `SUPERSEDED`).
> Convention: `D-###` — Title | Decision | Reason | Status.

## Decision log

### D-001 — Maximum folder depth = 5
- **Decision**: Folders may nest at most 5 levels (root = 0; deepest = 5).
- **Reason**: Navigable tree, bounded recursive operations.
- **Status**: ACCEPTED

### D-002 — Repository isolation (owner-scoped repositories)
- **Decision**: Every account owns exactly one personal repository; all
  repository queries scoped by owner; accounts never see each other's private
  folders/files; admins do not aggregate other admins' repositories in the
  repository UI.
- **Reason**: Privacy, audit clarity, demo requirements.
- **Status**: ACCEPTED

### D-003 — Recycle Bin: soft delete + 30-day retention
- **Decision**: Deletes soft-delete into a per-owner Recycle Bin; 30-day
  retention; owner may restore anytime; past-due items removed automatically.
- **Reason**: Reversible deletion; bounded storage growth.
- **Status**: ACCEPTED

### D-004 — Upload behavior (presigned pipeline, config-driven policy)
- **Decision**: Uploads flow through presigned object-store PUTs (never
  proxied), verified by checksum before promoting the current version, reject
  duplicate checksums per document, obey Root-configured policy.
- **Reason**: Scalability, integrity, config-driven principle.
- **Status**: ACCEPTED

### D-005 — No production mock data
- **Decision**: Shipped system contains only Root account, default
  roles/permissions, bootstrap configuration. Test data removed via soft-
  delete cleanup script; removals recorded in `docs/mock-data-audit.md`.
- **Reason**: Trustworthy demos, clean database.
- **Status**: ACCEPTED

### D-006 — Root emergency access
- **Decision**: ROOT is the only account with Root-exclusive capabilities
  (hard role gate + ROOT_ONLY_CODES); Root accounts protected from admin
  mutation and cannot be locked out by admins.
- **Reason**: Always-recoverable platform owner.
- **Status**: ACCEPTED

### D-007 — Submission snapshots (immutable evidence)
- **Decision**: Accreditation submissions are immutable snapshots;
  resubmission creates a new snapshot and demotes the previous current
  pointer; approved evidence never overwritten or deleted.
- **Reason**: Auditability of accreditation evidence.
- **Status**: ACCEPTED

### D-008 — Audit deduplication
- **Decision**: Each business mutation writes exactly one audit entry via
  `writeAudit`; engine-integrated writes audit inside the business
  transaction; the audit write never fails the business operation; read-only
  surfaces do not audit.
- **Reason**: Trustworthy, non-duplicated, non-blocking trail.
- **Status**: ACCEPTED

### D-009 — Dashboard real-data policy
- **Decision**: Every dashboard statistic comes from live persisted data;
  zero records render honest zeros; API failures render error states — never
  invented values or silent mock fallbacks.
- **Reason**: Truthfulness for demonstrations and review.
- **Status**: ACCEPTED

### D-010 — Windows-Explorer interaction model
- **Decision**: Repository UI uses Explorer semantics: single click selects,
  double click opens, checkbox multi-select, per-row actions, breadcrumbs.
- **Reason**: Familiar desktop behavior for faculty/staff.
- **Status**: ACCEPTED

### D-011 — Accreditation set separation
- **Decision**: AACCUP, ISO and Certification are separate record sets
  (discriminator `areaSet`); set-scoped queries always filter by `areaSet`.
- **Reason**: Distinct programs must not mix data.
- **Status**: ACCEPTED

### D-012 — Migration workflow (manual SQL + `migrate deploy`)
- **Decision**: `prisma migrate dev` is broken on this repo; migrations are
  written as SQL files and applied with `migrate deploy`, then `generate`
  (node processes stopped first). Applied migrations never modified.
- **Reason**: Reliable schema evolution on the actual database.
- **Status**: ACCEPTED

### D-013 — Soft-delete-only persistence
- **Decision**: Business records soft-delete (`deletedAt`); permanent delete
  only for true child rows (cascade) and the Recycle Bin policy. MinIO
  objects never deleted by soft-delete (GC is a future job). `DocumentRequest`
  has no soft-delete column (documented gap).
- **Reason**: Reversibility and data safety; audit trail outlives records.
- **Status**: ACCEPTED

### D-014 — Authentication is frozen (env-driven sessions)
- **Decision**: Auth module never modified; session expiry env-driven (JWT);
  client handles expiry by clearing tokens and redirecting to login.
- **Reason**: Stability constraint; auth verified end-to-end.
- **Status**: ACCEPTED

### D-015 — Future deployment strategy (local first, cloud later)
- **Decision**: V1.0 targets local Docker deployment, zero internet
  dependency; internet deployment, Redis, monitoring, integrations deferred
  to post-1.0.
- **Reason**: Thesis demo runs on a local laptop.
- **Status**: ACCEPTED

### D-016 — Repository provisioning + owner-scoped personal sections
- **Decision**: Every account's repository is a first-class `repositories`
  row (idempotent provisioning, backfill); folders/documents carry
  `repositoryId` + `ownerId`. Favorites, recents (bounded 50/type) and quick
  access pins are schema-backed tables — never localStorage. Delivered
  request copies flagged `metadata.delivered` surface as Requested Documents.
- **Reason**: Spec requires schema-backed per-account state surviving all
  restarts; explicit repositories make provisioning/stats auditable.
- **Status**: ACCEPTED

### D-017 — Shared immutable blob references (copies / request deliveries)
- **Decision**: `DocumentVersion.objectKey` is not globally unique; copies
  and request deliveries reference the same immutable version object.
  Permanent delete and GC guard by reference count — an object key is removed
  only when zero version rows reference it.
- **Reason**: Cheap, consistent copies/deliveries; blobs never rewritten.
- **Status**: ACCEPTED

### D-018 — Recycle-bin retention enforcement (scheduled cleanup)
- **Decision**: Soft-deleted folders/documents are permanently removed only
  after the 30-day window (D-003). `scripts/cleanup-recycle-bin.js` implements
  the sweep (snapshot-guarded, reference-count aware, `--dry-run`); in-app
  permanent delete is immediate and owner-only.
- **Reason**: Retention enforced without manual effort while never removing
  evidence referenced by submission snapshots or shared blobs.
- **Status**: ACCEPTED

### D-019 — Ownership-strict repository access
- **Decision**: Repository access (documents and folders) is OWNERSHIP-BASED
  for every role — member roles hold `documents.delete`/`folders.delete` for
  their own repository, so the legacy permission-based "manager" bypass was
  removed. Direct-ID access to another account's item returns 404 (no
  existence leak). Department-scoped folders remain visible to everyone
  (organization master data). AACCUP submission reviewers and
  document-request managers get READ access only to documents that are the
  subject of a submission/request (controlled transfer, rule 22).
- **Reason**: Rule 1 isolation cannot coexist with a permission shortcut once
  member roles hold delete codes; the spec's controlled transfer mechanisms
  must keep working for reviewers.
- **Status**: ACCEPTED

### D-020 — Persisted background folder-copy jobs
- **Decision**: Folder copies with ≥ 1000 items run as a persisted
  `repository_copy_jobs` row (PENDING → RUNNING → COMPLETED/FAILED) executed
  in-process with progress updates; the client polls and shows progress.
  No Redis/BullMQ (none present); no request/browser freeze.
- **Reason**: Large copies must not block the API request or browser (rule 9).
- **Status**: ACCEPTED

## Status legend

| Status | Meaning |
|---|---|
| ACCEPTED | Decided; recorded permanently |
| SUPERSEDED | Replaced by a newer decision record |
| PROPOSED | Under review; not yet binding |
| DEFERRED | Accepted as future scope, not implemented in V1.0 |

## Related documents

- `engineering/architecture.md` — how decisions shape the architecture
- `AI_CONTEXT.md` — implementation status of decisions
