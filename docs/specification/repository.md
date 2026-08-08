# Repository Specification (URS-DMS)

> One responsibility: personal repository behavior. File storage mechanics →
> `engineering/storage.md`. Permissions → `specification/users.md`. Access
> control → `engineering/security.md`. Audit → `specification/audit.md`.

## Ownership and isolation (D-002)

- **Every authenticated account owns one repository.** Provisioning is
  implicit and idempotent (`repositories` row per owner; first folder/file
  access starts it). Folders and files carry `ownerId` + `repositoryId`.
- **Isolation is mandatory**: an account must never see another account's
  private folders or files. Personal surfaces are hard owner-scoped.
- **Repository access is OWNERSHIP-BASED — the Administrator role does not
  bypass ownership.** Direct-ID access to another account's item returns
  404 without revealing existence (rule 1).
- Managers see other accounts' records only through explicit management
  surfaces (reports, submission review, document-request management) — never
  through the repository API (rule 22).
- Administrators have their own independent repositories; the repository UI
  never aggregates other accounts' private records.
- Departments/colleges/offices/programs are organization master data — never
  treated as repository ownership.
- System folders (templates, AACCUP archives) never appear as personal
  ownership.
- Sharing happens only through the explicit document-request / share
  mechanisms, never implicitly.

## Protected system sections (rule 2)

- **My Uploads** and **Requested Documents** are protected system sections
  (virtual roots, not folder rows). Users may open them and manage their
  contents, but can never rename, move or delete the sections themselves.

## Folder behavior (D-001)

- Maximum folder depth: **5 levels** (root = level 0; deepest folder = level 5).
  Any create, move, copy, merge or restore that would place a folder (or any
  descendant) at depth 6+ is rejected (rule 3).
- Name unique among siblings, case-insensitive; names trimmed; empty rejected.
- Operations: create, rename, move (cycle-guarded: never into own subtree;
  depth enforced; subtree moves together), copy (deep subtree copy; conflict
  modes **merge / keep_both / cancel** — rule 8), delete (soft), expand/
  collapse, breadcrumbs (each segment clickable).
- **Copy**: large folders (≥ 1000 items) copy as a **persisted background
  job** (`repository_copy_jobs`) with progress — the request and browser
  never freeze (rule 9).
- Deleting a folder soft-deletes its complete subtree as one recoverable
  unit; **files inside remain in the repository (unfiled)**.
- Restoring a folder restores the complete tree; destination + conflict mode
  (keep_both suffix / replace / cancel) selectable (rule 10).
- Only the owner may rename/move/delete/restore/copy; unauthorized direct-ID
  access returns 404.

## File lifecycle

| Operation | Behavior |
|---|---|
| Upload | Create → version → presigned PUT → verify (SHA-256); belongs to current folder + owner |
| Download | Presigned GET of the current version |
| Preview | Presigned GET rendered inline; PDF/image/text via iframe, video + audio native controls, office via download |
| Rename | `PATCH /documents/:id { title }`; uniqueness not required, empty rejected |
| Move | `PATCH /documents/:id { folderId }` (null = root) |
| Copy | New document referencing the same immutable bytes (shared blob, D-017); conflict modes keep_both (auto-suffix `(n)`) / replace / cancel |
| Replace version | `POST /documents/:id/version` + verify; history preserved; current pointer moves; **same document identity — folder, favorites and activity history preserved** (rule 8) |
| Delete | Soft delete (`deletedAt`) → Recycle Bin; hidden everywhere |
| Restore | Clear `deletedAt`; destination selectable (original location / another folder / root); conflict modes keep_both (suffix) / replace / cancel (rule 8/10) |
| Permanent delete | Owner-only; blocked (409) when an AACCUP submission snapshot references the file; MinIO objects removed only when no remaining version row references them |
| Conflict rule | Reject a version whose checksum already exists for that document (409) |
| Bulk actions | Multi-select for bulk delete |
| Sorting | By name, size, or modification date, asc/desc |
| Folder ZIP | `GET /folders/:id/zip` streams the ACTIVE subtree (nested structure + files) as a ZIP; recycle-bin items and deleted files excluded; no in-memory archive (rule 14) |
| Details / Activity | `GET /documents/:id/activity` — metadata + download count + the file's own audit timeline (rule 18) |

- Only the owner may replace, rename, move or delete a file.
- **Submission badges** (rule 17): files connected to AACCUP submissions show
  a real badge (Pending / Approved / Returned) derived from the latest
  submission status — never inferred. Moving/renaming the file never breaks
  the badge relationship.
- **Duplicate detection** (rule 7): uploading the exact same file (checksum +
  size) warns and lets the user continue (keep both) or cancel — never
  silently skip, merge or duplicate.

## Upload system

- Multiple files processed as a **queue**: sequential, each with its own
  state and result.
- **Progress**: every upload shows bytes/percent (real XHR upload progress),
  filename, size, destination folder, status, speed and ETA where practical
  (rule 6).
- Statuses: Waiting → Preparing → Uploading → Verifying → Completed / Failed
  / Cancelled; a failed upload does not block the rest of the queue.
- Cancel: queued/uploading file may be canceled. Retry: failed upload may be
  retried without re-selecting the file.
- **Leave warning**: refresh, close, in-app navigation and logout are guarded
  while uploads are active (`lib/uploadBus.ts`).
- Advisory validation warnings show but do not stop the upload.
- **Allowed types + max size are configurable by Root** via the Configuration
  Engine (office docs, images, CSV/TXT, **audio + video**; 100 MB) — see
  `specification/configuration.md`. Uploads never buffer the whole file in
  Node memory (streaming presigned PUT).
- Video/audio upload supported at storage level; inline playback via native
  controls in the shared preview modal.

## Recycle Bin (D-003, D-018)

| Rule | Statement |
|---|---|
| Soft delete | Deleting a folder or file moves it to the Recycle Bin (hidden from all normal views); a folder keeps its complete subtree as one recoverable unit |
| Retention | Items retained **30 days** (deleted + expiry dates shown) |
| Restore | Any retained item may be restored by its owner to the original location, another folder, or root, with conflict handling (keep_both / replace / cancel) |
| Folder restoration | Restores the complete tree |
| Permanent delete | Owner may permanently delete at any time during retention (snapshot/reference guarded); bulk via Empty Recycle Bin |
| Automatic cleanup | Past-due items permanently removed by the scheduled `maintenance-runner.js` (24-hour cycle; snapshot-guarded, reference-count aware, `--dry-run` supported; manual via `maintenance-cleanup.js`); owners get a RECYCLE_BIN_CLEANUP notification |
| Blob safety | MinIO blobs still referenced by active files, copies, request deliveries or AACCUP snapshots are never deleted |
| Scope | Per-owner; accounts only see their own deleted items |

## Search / Recent / Favorites / Quick Access

- Search scopes: current folder + entire personal repository; filters by
  name (case-insensitive partial), type, date, size, folder, deleted state,
  favorite state; sortable and paginated (rule 11).
- **Recent**: last-opened files + folders (schema-backed, bounded to 50 per
  type); recorded on folder open + file download/preview — real activity,
  never mock.
- **Favorites / Quick Access**: schema-backed; marked/unmarked instantly.
- All three persist per account — **never localStorage**.

## Folder information (rule 12)

- `GET /folders/:id/info` returns file count, subfolder count, **total
  recursive size** and depth — computed with two aggregate queries; loaded
  on demand, never re-computed per render.

## Server storage display (rule 13)

- `GET /repositories/storage` returns verified used bytes + MinIO status.
- Available/total capacity are shown honestly as unavailable (`—`) — no
  fabricated quota.

## Drag and drop (rule 15)

- Drag file items into folders; drag folder items into folders; drag files
  from the OS into the browser (single or multiple); drop onto a folder
  uploads into that folder. All moves enforce ownership, depth, conflict and
  protected-section rules server-side.

## Requested Documents (spec §10.2)

- Approved requests are fulfilled by delivering a **requester-owned copy**
  flagged `metadata.delivered = true` + `metadata.requestId`.
- The requester receives access, never ownership of the source document; the
  requester cannot modify/delete the source.
- Delivered documents appear in the owner's Requested Documents section
  (`GET /documents/requested`).

## Explorer UX (D-010)

Single click selects/highlights; double click opens (folder → navigate,
file → preview); checkbox multi-select (Ctrl/Cmd and Shift-range where
practical); per-row action menus; breadcrumbs; grid/list views.

## Preview modal (rule 16)

One shared modal: PDF, images, video (native playback controls), audio and
text via secure short-lived presigned URLs after ownership checks. Actions:
download, rename, move, delete, print (where supported), Details & Activity,
close.

## Notifications (rule 19)

Backend-authoritative emits (never duplicated from the frontend), best-effort
— they never fail the business operation:

| Event | Emitted when |
|---|---|
| DOCUMENT_UPLOADED | Upload verified (owner) |
| DOCUMENT_UPLOAD_FAILED | Upload verification failed (owner) |
| REQUEST_APPROVED / REQUEST_REJECTED | Request decided (requester) |
| DOCUMENT_DELIVERED | Request fulfilled (requester) |
| AACCUP_SUBMISSION_APPROVED / _RETURNED / _REJECTED | Submission reviewed (submitter) |
| RECYCLE_BIN_CLEANUP | Retention sweep permanently removed an item (owner) |
| STORAGE_WARNING | Verified storage threshold crossed (admins, throttled 24h) |

## Repository permissions

Repository access is permission-gated (`documents.*`, `folders.*`,
`repository.*`) per `specification/users.md`; isolation is enforced by
ownership, not by RBAC.

## Related documents

- `engineering/storage.md` — presigned pipeline, shared blobs
- `engineering/frontend.md` — explorer UI rules
- `engineering/security.md` — ownership validation
- `specification/audit.md` — folder/file/recycle audit events
- `docs/context/MODULE_INDEX.md` — Repository module map
