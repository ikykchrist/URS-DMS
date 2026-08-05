# URS-DMS — Changelog

> Chronological log of changes per sprint. Newest first. Companion:
> `PROJECT_STATUS.md` (sprint reports), `AI_CONTEXT.md` (current state),
> `ENGINEERING_RULES.md` (standards), `URS_DMS_SPECIFICATION.md` (spec).

---

## Repository Rules 1–30 implementation (2026-08-05)

**Backend**

- **Ownership-strict access (D-019)**: documents/folders access is
  owner-based for every role; foreign direct-ID access → 404; lists always
  owner-or-shared (documents) / owner-or-department (folders) scoped;
  submission reviewers + request managers get controlled-transfer READ of
  submission/request-linked documents only.
- Depth enforcement (rule 3): create/move/copy/restore reject depth 6+;
  folder copy conflict modes merge/keep_both/cancel (rule 8); restore with
  destination + conflict modes; replace-version preserves identity/favorites/
  history (rule 8).
- **Persisted background copy jobs (D-020)**: `repository_copy_jobs` model +
  endpoints (`GET /folders/jobs`, `GET /folders/jobs/:id`); copies ≥ 1000
  items run async with progress.
- **Folder info (rule 12)**: `GET /folders/:id/info` (recursive counts +
  size, aggregate queries).
- **Storage display (rule 13)**: `GET /repositories/storage` (used bytes +
  MinIO status; capacity honestly `null`).
- **ZIP (rule 14)**: `GET /folders/:id/zip` — streaming store-method archive
  (incremental CRC32 + data descriptors, no in-memory archive).
- **Activity (rule 18)**: `GET /documents/:id/activity` — download count +
  the file's own audit timeline.
- **Submission badges (rule 17)**: `submissionStatus` + `currentChecksum`
  added to document list rows (enriched in one batched query).
- **Duplicates (rule 7)**: list exposes checksum; client warns on
  checksum+size matches.
- **Notifications (rule 19)**: emitters in documents (upload ok/fail),
  requests (approved/rejected/delivered), submissions
  (approved/returned/rejected), recycle-bin cleanup script, storage warning
  (throttled 24h). New NotificationType enum values + `NOTIFICATION_EVENTS`
  specs.
- **Audit (rule 23)**: `document.upload_failed` action with failure reason;
  service layer stays the single authoritative writer.
- **Uploads (rule 6)**: audio/video MIME types added to
  `ALLOWED_MIME_TYPES`.
- Migration `20260829000000_repository_rules` applied (21 total).
- `.env`: `MINIO_PUBLIC_ENDPOINT` restored to `http://localhost:9000` (a dead
  Cloudflare tunnel had broken presigned URLs).

**Frontend**

- `lib/uploadBus.ts`: upload leave-guard wired into logout + sidebar
  navigation (rule 6).
- `RepositoryExplorer`: upload queue with bytes/speed/ETA/destination +
  overall progress; checksum duplicate dialog; restore dialog (destination +
  conflict mode); copy-folder dialog (destination + conflict mode + large-copy
  confirm); background job banner with polling; folder info bar; storage
  card; ZIP download action; submission badges; recycle deleted/expiry
  dates; drag & drop (rows + OS files into folders); audio/video accept
  types.
- `FilePreviewModal`: audio playback, print, Details & Activity tab
  (metadata, download count, timeline, checksum under Advanced).
- Services: restore/copy options, activity, folder info, jobs, ZIP blob
  download, storage summary.

**Database changes**

- Migration `20260829000000_repository_rules`: `NotificationType` enum +6
  values; `repository_copy_jobs` table + enum + indexes.
- `prisma validate` OK; `migrate status` up to date.

**Verification**

- Server typecheck/lint/build + client typecheck/production build pass.
- `scripts/smoke-repository.ps1` 49/49; `scripts/smoke-repository-rules.ps1`
  40/40 (depth 5/6, conflicts, ZIP, activity, jobs, notifications,
  emergency access, multi-user isolation, upload-failure audit, audio/video,
  replace-version identity). All smoke records, temp users, notifications and
  MinIO objects removed. Final DB: 3 users / 3 repositories / 3 folders /
  9 docs — real user data only.

---

## Personal Document Repository — implementation completion (2026-08-05)

**Backend**

- `repositories` table (one row per owner, idempotent provisioning +
  backfill); `folders.repositoryId` / `documents.repositoryId` columns.
- Schema-backed `repository_favorites`, `repository_recents` (bounded 50 per
  type), `repository_pins`, `emergency_access` (ROOT-gated, time-limited,
  audited), AACCUP submission snapshot columns.
- `shared_blob_references`: `document_versions.objectKey` unique index → plain
  index (copies / request deliveries share immutable blobs; permanent delete
  is reference-count guarded).
- New module `server/src/modules/repositories/*` (`GET /repositories/me`,
  backfill, emergency grant/revoke/list, owner listing).
- Documents: recycle-bin list/restore/permanent-delete (snapshot-guarded),
  copy (keep_both/replace/cancel), favorites, recents, `GET
  /documents/requested`, replace-version pipeline.
- Folders: recycle-bin list/restore, deep subtree copy, permanent delete,
  pins (quick access), depth ≤ 5 enforcement, cycle guard.
- Audit actions: `repository.provisioned`, `repository.emergency.granted/
  revoked`, `document.copied/permanently_deleted/favorited/unfavorited/
  previewed`, `folder.restored/copied/permanently_deleted/pinned/unpinned`,
  `recycle_bin.emptied`, `request.fulfilled.delivered`.
- Permission `repository.emergency_access` (ROOT-only; catalog 119).
- Migrations applied: `20260828000000_personal_repository_lifecycle`,
  `20260828010000_shared_blob_references` (20 total, up to date).
- Scripts: `scripts/cleanup-recycle-bin.js` (30-day retention sweep,
  snapshot-guarded, reference-count aware, `--dry-run`),
  `scripts/smoke-repository.ps1` (49-check repository smoke, self-cleaning).

**Frontend**

- `RepositoryExplorer` (shared by admin `DocumentRepository` and user
  `UserDocuments`): My Uploads, Quick Access, Favorites, Recent, Requested
  Documents, Recycle Bin sections; folder tree + breadcrumbs; grid/list
  views; single-click select / double-click open.
- Upload queue with REAL XHR progress (bytes transferred), cancel, retry,
  per-file status, leave-page warning, name-conflict dialog (keep both /
  replace / cancel); Replace Version now adds a real version to the existing
  document.
- Repository-wide search (backend `q` + ownerId across all folders + files).
- `FilePreviewModal`: PDF/image/video/text inline preview, download, rename,
  move, delete, details.
- Client service additions in `services/documents.ts` (progress-capable
  upload, requested-docs list) and `services/repository.ts` (provisioning,
  emergency access).

**Database changes**

- Two migrations (see above). `prisma validate` OK; `migrate status` up to
  date; client regenerated.

**Verification**

- Server: typecheck + lint + build pass. Client: typecheck + production build
  pass. Repository smoke: 49/49 pass (CRUD, upload pipeline, copy, recycle
  bin, favorites/recents/pins, search, isolation, audit, persistence across a
  backend restart for PostgreSQL + MinIO).
- Mock data: previous-session "Lifecycle"/"CopyTree" test artifacts
  soft-deleted via the audited API path; documented in
  `docs/mock-data-audit.md` §4.

---

## Previous sprints

- **User Portal — Accreditation / ISO / Certification tabs** (post-7.5.1):
  shared set-aware `UserAccreditationView` + `/user/iso` + `/user/certification`;
  per-set user submissions; user sidebar + routes + titles.
- **Admin Dashboard Real Data Cleanup**: fake trend badges eliminated;
  Total Folders + Storage Used cards from real API; zero mock fallbacks.
- **Sprint 7.8 — Final Acceptance Testing & V1.0 Stabilization (RC1)**:
  36/36 smoke checks; expired-session auto-logout; workflow runtime verified;
  Docker restart persistence verified.
- **Sprint 7.7 — Defense Demo Preparation & UX Polish**: global ErrorBoundary,
  per-page titles, toast feedback, autoFocus, React.lazy Root Console.
- **Sprint 7.6 — Complete System Validation**: dead code/buttons removed,
  real CSV exports, 27/27 smoke.
- **Sprint 7.5 — System Integration & Defense Readiness**: config-engine
  upload policy consumers; hardcoded departments removed; compliance fix.
- **Sprint 7.4.8 — Platform Setup Wizard** (8-step, persisted, MinIO logo).
- **Sprint 7.4.6 — Dynamic Form Builder** (12 field types, versioning,
  publish/rollback, assignments).
- **Sprint 7.4.5 — Dynamic Workflow Builder** (definitions, runtime engine,
  scoped assignments, ROOT builder UI).
- **Sprint 7.4.4 — Dynamic Requirement Builder** (recursive templates,
  validation rules, runtime projection).
- **Sprint 7.4.3 — Dynamic Folder Builder** (versioned trees, scoped
  assignments, `/folders/resolve`).
- **Sprint 7.4.2 — Organization Management Engine** (colleges/departments/
  offices/programs, versioning + rollback).
- **Sprint 7.4.1 — System Administrator (ROOT) + Configuration Engine**
  (versioned config, 60s cache, Root Console UI).
- **Sprint 7.7.5 — Production Data Migration & Mock Data Elimination**
  (cleanup script, empty-platform support, seed verified clean).
- **Sprint 7.5.1 — Document Repository Stabilization** (owner-scoped
  RepositoryExplorer, folder/file CRUD, RBAC gap fix, mock-data audit).
- **Sprint 7.3 — Notification & Email Service** (inbox, announcements,
  durable email queue).
- **Sprint 7.2 — User & Role Administration**.
- **Sprint 7.1 — Administration Backend** (departments, colleges, settings).
- **Sprint 6.x — Dashboard / Analytics / Audit Center APIs**.
- **Sprint 5.x — AACCUP Areas / Requirements / Submissions / Compliance /
  Analytics**.
- **Sprint 4 — Document Requests workflow**.
- **Sprint 3 — Documents + Folders + Versioning + MinIO storage**.
- **Sprint 2 — Auth + RBAC + Users + AuditLog + Prisma + Docker**.
- **Sprint 1 — Client skeleton**.
