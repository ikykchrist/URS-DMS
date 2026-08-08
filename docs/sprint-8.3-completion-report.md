# Sprint 8.3 — Repository Maintenance, Retention & Storage Integrity: Completion Report

**Sprint:** 8.3
**Status:** COMPLETE
**Date:** 2026-08-08
**Migration:** `20260831040000_add_maintenance_models`

---

## 1. Executive Summary

Sprint 8.3 hardened repository storage for long-term operation. It delivered
automatic 30-day Recycle Bin retention cleanup, reference-safe MinIO object
deletion (copies, deliveries, and AACCUP snapshots are never broken), two-stage
orphan-object detection with a 7-day grace period, a database/storage
consistency checker, accurate storage statistics, and a database-backed
distributed maintenance lock. All destructive operations support dry-run
preview and require explicit confirmation. A scheduled 24-hour runner, manual
CLI driver, and Root Console page provide controlled maintenance access.

## 2. Sprint Goal and Scope

Goal: make repository storage safe for long-term operation — automated cleanup
that never accidentally deletes shared blobs, submission evidence, or live
objects.

In scope: recycle-bin automation, reference-safe deletion, orphan
detection/cleanup, consistency checker, storage statistics, background
maintenance architecture, Root maintenance controls, failure recovery.

Out of scope: notification emitter wiring (existing `RECYCLE_BIN_CLEANUP` reused),
multipart upload cleanup (future MinIO lifecycle policy), SSE/WebSocket push,
test suite expansion.

## 3. Deliverables

- **Backend**: `server/src/modules/maintenance/` — `maintenance.service.ts`
  (recycle cleanup, orphan scan, orphan cleanup, consistency check, storage
  stats, status), `maintenance.routes.ts` (7 endpoints under
  `/root/maintenance`), `maintenance.jobs.ts` (database-backed lock with
  10-min expiry + 60s heartbeat, job persistence).
- **Database**: Migration `20260831040000_add_maintenance_models` — 3 tables
  (`maintenance_jobs`, `maintenance_orphan_candidates`, `maintenance_locks`)
  with proper indexes.
- **Storage**: 3 additive helpers in `lib/storage.ts` (`objectExists`,
  `listObjectKeys`, `statObject`) — frozen-file behavior unchanged.
- **Audit**: 7 new action codes in `constants.ts` (one event per job run,
  never per item).
- **Client**: `RootMaintenance.tsx` — storage overview cards, job history
  table, orphan browser, controlled action buttons with dry-run toggle and
  confirmation dialog. Registered in `App.tsx` + `Sidebar.tsx`.
- **Scripts**: `maintenance-runner.js` (24h scheduled), `maintenance-cleanup.js`
  (manual `--dry-run`/`--recycle`/`--orphans`/`--scan`/`--confirm`),
  `maintenance-storage-check.js` (read-only).
- **npm scripts**: `maintenance:run`, `maintenance:cleanup`, `maintenance:storage-check`.
- **Docs**: DECISIONS.md (D-032, D-033), CHANGELOG.md (full sprint entry),
  `engineering/storage.md` (Maintenance section), `specification/repository.md`
  (updated Recycle Bin), `AI_CONTEXT.md`, `PROJECT_STATUS.md`, `MODULE_INDEX.md`.

## 4. Recycle Bin Retention (30-Day Cleanup)

- Batch-based (`BATCH_SIZE = 200`), idempotent, retry-safe.
- Folders: expired folders with subtrees deleted; child documents unfiled
  (folderId SET NULL), then handled by the document sweep.
- Documents: AACCUP submission snapshot guard prevents permanent removal;
  `deleteDocumentWithObjects()` checks reference counts on every version
  object key before MinIO deletion — copies, deliveries, and replace-version
  history all count.
- `RECYCLE_BIN_CLEANUP` notifications emitted per owner (best-effort).
- Items <30 days are preserved; expired items become eligible for permanent
  deletion.

## 5. Reference-Safe Object Deletion

Central logic in `deleteDocumentWithObjects()`:
1. Gather all `DocumentVersion` rows for the document.
2. For each `objectKey`, count remaining `DocumentVersion` rows referencing it
   (including copies, Requested Document deliveries, and replace-version
   history — D-017 shared blobs).
3. Delete the MinIO object ONLY when zero references remain.
4. Delete the document row.
5. "Object not found" during authorized cleanup is success (idempotent).
6. Failed object deletions are retried by the orphan sweep.

## 6. Orphan Detection & Cleanup (Two-Stage)

**Stage 1 — SCAN** (`POST /root/maintenance/scan`):
- Builds the full set of referenced `objectKeys` from `DocumentVersion`.
- Lists all MinIO objects (capped at 100,000).
- Creates `CANDIDATE` rows for unreferenced objects. Never deletes on first sight.
- Integrity probe: reports DB references whose MinIO object is missing
  (data-integrity problem — never silently deletes the DB row).

**Stage 2 — CLEANUP** (`POST /root/maintenance/cleanup-orphans`):
- Only processes candidates older than the 7-day grace period.
- RE-VERIFIES each candidate against `DocumentVersion` before deletion
  (handles re-referencing during the grace window).
- Uses stable object keys, never filenames.
- Idempotent: missing MinIO objects on retry are marked REMOVED.

## 7. Storage Consistency Checker

`GET /root/maintenance/check` (READ-ONLY) reports:
- Active files, folders, version rows, stored object references
- Recycle-bin items awaiting expiration / expired
- Missing MinIO objects (probe-capped at 2000)
- Failed/pending jobs, orphan candidate counts
- Storage statistics + MinIO health

Also available as `npm run maintenance:storage-check` (CLI, prints full JSON).

## 8. Storage Statistics

`GET /root/maintenance/storage` returns verified real data:
- `objectStorageUsedBytes` (aggregate of all `DocumentVersion.sizeBytes`)
- `storedObjectCount` (distinct object keys)
- `activeFileCount` (undeleted documents)
- `recycleBinStorageBytes` (deleted document version bytes)
- `pendingOrphanStorageBytes` / `pendingOrphanCount`
- `minio` health status

Capacity fields (`availableCapacityBytes`, `totalCapacityBytes`) are null —
the server filesystem cannot be reliably determined, and object storage used !=
physical disk used. No fabricated numbers.

## 9. Background Maintenance Architecture

- **Scheduled runner**: `scripts/maintenance-runner.js` — boots once, then
  every 24 hours; `--once` for single cycle (cron-friendly). Logs in via
  ROOT credentials from `.env`, calls `POST /root/maintenance/cleanup-recycle`
  then `POST /root/maintenance/scan` via the Root API.
- **Manual driver**: `scripts/maintenance-cleanup.js` — supports
  `--dry-run` (preview), `--scan`, `--recycle`, `--orphans`, `--confirm`.
  Destructive ops require `--confirm`. Dry runs delete nothing.
- **Distributed lock**: `maintenance_locks` row per job type with 10-min expiry
  and 60s heartbeat. Two server instances/workers cannot run the same
  destructive job concurrently. A crashed worker cannot permanently block
  maintenance (lock auto-expires).
- **Job persistence**: `maintenance_jobs` tracks every run with status, counts,
  error, and timestamps for inspection.

## 10. Root Maintenance Controls

Root Console page (`/root-maintenance`) provides:
- Storage overview cards (object count, active files, recycle bin, orphan
  candidates, ready-for-cleanup count)
- Maintenance job history table (type, status, counts, timestamps)
- Orphan candidates table (key, status, age, size)
- Action buttons: Scan, Recycle Cleanup, Orphan Cleanup — each with dry-run
  toggle and confirmation dialog before execution
- ADMINIDENTISTRATOR, FACULTY, and anonymous users are denied (403/401)

## 11. Database Changes

Migration `20260831040000_add_maintenance_models`:
- `maintenance_jobs` — unique jobId, type/status/createdAt indexes, JSONB
  batchCursor, BigInt bytesReclaimed
- `maintenance_orphan_candidates` — unique objectKey, status+firstSeenAt index
- `maintenance_locks` — jobType PK with lockExpiresAt (expiry-based recovery)

All additive; no existing tables modified.

## 12. Files Created/Modified

**New:**
- `server/src/modules/maintenance/maintenance.service.ts` (563 lines)
- `server/src/modules/maintenance/maintenance.routes.ts` (141 lines)
- `server/src/modules/maintenance/maintenance.jobs.ts` (191 lines)
- `server/prisma/migrations/20260831040000_add_maintenance_models/migration.sql`
- `client/src/pages/root/RootMaintenance.tsx` (~350 lines)
- `scripts/maintenance-runner.js`
- `scripts/maintenance-cleanup.js`
- `scripts/maintenance-storage-check.js`
- `scripts/smoke-maintenance.ps1` (259 lines)
- `docs/sprint-8.3-completion-report.md`

**Modified (Sprint 8.3 changes):**
- `server/prisma/schema.prisma` — 3 new models
- `server/src/lib/storage.ts` — 3 additive helpers
- `server/src/config/constants.ts` — 7 audit action codes
- `server/src/routes/index.ts` / `root.routes.ts` — maintenance mount
- `client/src/App.tsx`, `Sidebar.tsx` — RootMaintenance registration
- `client/src/services/root.ts` — typed API layer
- `package.json` — 3 npm scripts
- `docs/context/AI_CONTEXT.md`, `PROJECT_STATUS.md`, `MODULE_INDEX.md`,
  `DECISIONS.md`, `CHANGELOG.md`
- `docs/engineering/storage.md`, `docs/specification/repository.md`

## 13. Static Verification

- `server: npm run typecheck` (tsc --noEmit) — pass
- `server: npm run build` (tsc + tsc-alias) — pass
- `client: npx tsc -b` — pass
- `client: npm run build` (tsc -b && vite build) — pass, 2506 modules
- Pre-existing warnings only (chunk size).

## 14. Smoke Test Results

| Suite | Results |
|---|---|
| `smoke-maintenance.ps1` | **31/31 passed** |
| `smoke-repository.ps1` | **49/49 passed** (regression) |
| `smoke-repository-rules.ps1` | **40/40 passed** (regression) |

Key verifications:
- <30-day items preserved; >=30-day files + nested folders cleaned
- Shared MinIO object survives when another document still references it
- AACCUP snapshot-referenced file is never removed
- Orphan two-stage flow: CANDIDATE → 7-day grace → dry-run safe → verified cleanup
- Dry run deletes nothing; idempotent cleanup
- Missing MinIO object reported, DB row NOT deleted
- Storage stats use real data; capacity is null (not fabricated)
- ROOT-only authorization; ADMIN/FACULTY/anon denied
- Maintenance audit events are accurate (one per job run)
- All test fixtures self-clean

## 15. Known Limitations

- Multipart upload cleanup not implemented — recommend MinIO lifecycle policy
  as a future enhancement.
- `retentionUntil` field exists on documents but expiration is calculated from
  `deletedAt` per D-003 (the authoritative deletion timestamp). The
  `retentionUntil` column is informational and carries over from earlier work.
- Maintenance runner is a standalone Node script — runs in-process with the
  configured 24h interval; requires a cron/scheduler for production hosting.
- No abandoned multipart upload detection (MinIO native lifecycle rules
  handle this better).
- Storage "available" capacity remains null (no MinIO quota probe; server
  filesystem capacity is unreliable from inside Docker).
- Background copy jobs still run in-process (unchanged; D-020 already
  documented).
- `prisma migrate dev` broken (D-012) — migration applied via `prisma db execute`.

## 16. Completion Percentage

**100%** — all 20 sections of the specification are implemented and verified.

## 17. Verdict

**COMPLETE**

All deliverables built, integrated, cleaned up, type-checked, build-verified,
and smoke-tested. Three regression suites are green (maintenance 31/31,
repository 49/49, rules 40/40). Documentation updated per spec §20.
