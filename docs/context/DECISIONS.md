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

### D-021 — AACCUP group = one sidebar entry, in-page tabs (both portals)
- **Decision**: The accreditation sets are no longer separate sidebar
  entries/routes. Both portals show one "AACCUP" entry with an in-page tab
  strip (AACCUP | ISO | Certification | Submissions | My Tasks — user label:
  My Submissions). Tabs sync to `?tab=` and deep links
  (`/iso`, `/certification`, `/user/iso`, ...) preserve the set. The shared
  tab strip, `SubmissionsTable` (review/view modes) and `TaskSubmitDialog`
  are reused verbatim on both sides.
- **Reason**: Uniform admin/user workflow; one place to find accreditation
  work; deep links kept working for dashboards.
- **Status**: ACCEPTED

### D-022 — Multi-file document requests (1–3 documents per request)
- **Decision**: `DocumentRequestItem` (requestId FK Cascade, documentId FK
  Cascade, unique pair) lets one request cover up to 3 documents. The legacy
  single `documentId` column stays and mirrors the first item so old rows and
  the delivery flow keep working. FULFILLED delivery clones every item into
  the requester's repository.
- **Reason**: Users request batches of files with one explanation; no schema
  churn for historical rows.
- **Status**: ACCEPTED

### D-023 — Rejecting a request requires a reason
- **Decision**: `POST /requests/:id/reject` fails with 400 unless
  `decisionNote` is provided; approve keeps the note optional. The UI
  enforces the same rule before calling.
- **Reason**: Rejections without explanation are useless to the requester.
- **Status**: ACCEPTED

### D-024 — Assignee-driven task transitions (service-level authorization)
- **Decision**: `PATCH /aaccup/tasks/:id` no longer requires `aaccup.manage`
  at the middleware; the service authorizes manager OR assignee (USER target
  matching the caller, or a member of the assigned DEPARTMENT). Assignees may
  only change `status` along OPEN → IN_PROGRESS → COMPLETED; managers keep
  full edits. All other task routes keep their permission middleware.
- **Reason**: Tasks must be actionable by the people they are assigned to;
  the assignee check needs DB context (department membership) that a
  permission middleware cannot express.
- **Status**: ACCEPTED

### D-025 — UI unification is permission-neutral
- **Decision**: The UI unification pass (grouping, shared components, dead
  control removal, command palette, labels) changes NO permissions and NO
  client permission gates; role behavior on the server is untouched.
- **Reason**: Product decision — permissions are stable; only the user
  experience is being improved.
- **Status**: ACCEPTED

### D-026 — Request items cascade with document permanent deletion
- **Decision**: `document_request_items.documentId` FK is ON DELETE CASCADE.
  Initially RESTRICT, it blocked `DELETE /documents/:id/permanent` for any
  document a request ever referenced (recycle-bin purge 500'd on
  `document_request_items_documentId_fkey`).
- **Reason**: Permanently deleting a document must remove its request-item
  references; the request row survives (legacy `documentId` SetNull).
- **Status**: ACCEPTED

### D-027 — Presigned URLs signed for the public endpoint
- **Decision**: `presignUpload`/`presignDownload` sign with a client built
  from `MINIO_PUBLIC_ENDPOINT` (host/port/scheme) whenever it is set (e.g. a
  Cloudflare tunnel), falling back to the internal endpoint otherwise. The
  previous post-signing host rewrite was removed. `lib/storage.ts` is on the
  frozen list — this is an explicit user-requested fix.
- **Reason**: SigV4 signs the Host header; rewriting the host after signing
  made MinIO return 403 `SignatureDoesNotMatch` for every presigned
  upload/download through the tunnel.
- **Status**: ACCEPTED

### D-028 — No maximum upload size
- **Decision**: The upload size cap is removed: the validator's hard 100 MB
  `sizeBytes` limit, the `upload.max_size_bytes` config check in
  `assertUploadPolicy`, the seed entry, and the Settings UI selector are all
  gone. The `upload.allowed_file_types` allowlist remains enforced.
- **Reason**: Product request — users may upload arbitrarily large files
  (MinIO handles objects up to 5 TB).
- **Status**: ACCEPTED

### D-029 — Email is read-only identity (Sprint 8.1)
- **Decision**: Self-service profile editing (`PATCH /users/me`) whitelists
  ONLY name fields (`firstName`, `middleName`, `lastName`, `suffix`) via a
  `.strict()` zod schema. Email, employee ID, role, status, department and
  permissions cannot be self-changed. Email remains read-only because it is
  the login identity (no secure email-change infrastructure exists yet;
  changing it without verification would be insecure).
- **Reason**: Sprint 8.1 spec §3 — do not build an insecure email-change
  shortcut; the server stays authoritative on all privileged fields.
- **Status**: ACCEPTED

### D-030 — Session revoke audit in the frozen auth module
- **Decision**: `revokeSession` / `revokeOtherSessions` in the frozen
  `modules/auth/*` now write exactly one audit event each
  (`session.revoked` / `session.revoked_others`); the controllers pass
  ip/userAgent through. This is the ONLY auth-module change in 8.1 (plus the
  additive `/auth/me` fields `departmentName`/`createdAt`/`lastLogin`).
- **Reason**: The sprint mandates accurate audit events for revocations, and
  the audit call needs actor context (ip/user-agent) that the service
  previously did not receive; login/logout auditing is untouched.
- **Status**: ACCEPTED

### D-031 — Password recovery token design (Sprint 8.2)
- **Decision**: Reset tokens are 384-bit random values (`randomToken(48)`),
  only their SHA-256 hash is stored (`PasswordResetToken.tokenHash` unique);
  20-minute expiry; single-use (`usedAt`); requesting or completing a reset
  invalidates all other outstanding tokens for the account; a successful
  reset transactionally updates the Argon2 hash, consumes the token, and
  revokes EVERY refresh session. New endpoints live in a new
  `modules/passwordReset/` mounted on `/auth` AFTER the frozen `authRouter`
  (additive; no frozen auth file modified). A dedicated reset rate limiter
  (12/15 min/IP, counts all requests) is separate from login/refresh.
  `GET /auth/dev/reset-link?email=` is a development-only helper (404
  outside `NODE_ENV=development`) so the full flow is testable without SMTP.
- **Reason**: No plaintext tokens at rest; replay/expiry protection;
  enumeration-safe generic responses; old refresh tokens must stop working
  after a reset; the frozen auth module must not be redesigned.
- **Status**: ACCEPTED

### D-032 — Orphan MinIO-object two-stage cleanup with 7-day grace period (Sprint 8.3)
- **Decision**: Unreferenced MinIO objects discovered during an orphan scan
  are recorded as `CANDIDATE` in `maintenance_orphan_candidates` but are NOT
  deleted. After a 7-day grace period, a second VERIFY + DELETE pass checks
  again for DB references — only then is the physical object deleted and
  marked `REMOVED`. Objects re-referenced during the grace window (e.g. by a
  new copy or delivery) are marked `RE_REFERENCED` and preserved.
- **Reason**: Prevents race-condition deletions on freshly uploaded objects
  that haven't yet been saved as `DocumentVersion` rows; avoids deleting
  multipart upload artifacts still belonging to an active operation.
- **Status**: ACCEPTED

### D-033 — Database-backed distributed maintenance lock (Sprint 8.3)
- **Decision**: Destructive maintenance jobs (recycle cleanup, orphan scan,
  orphan cleanup) acquire a `maintenance_locks` row with a 10-minute expiry
  and 60-second heartbeat. No Redis dependency — the lock works identically
  across multiple server instances via PostgreSQL. A crashed worker cannot
  permanently block maintenance (the lock auto-expires). The lock is job-type
  scoped (e.g. `RECYCLE_CLEANUP`, `ORPHAN_SCAN`, `ORPHAN_CLEANUP`).
- **Reason**: The spec requires duplicate-job prevention; Redis exists for
  sessions but a DB-backed lock is simpler, requires no additional
  infrastructure, and survives the worker crash scenario the spec mandates.
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
