# Dashboard Specification (URS-DMS)

> One responsibility: dashboard behavior and the real-data policy. Data
> sources → `specification/aaccup.md` (accreditation), `specification/
> repository.md` (documents), `specification/audit.md` (activity).

## Surfaces

| Dashboard | Audience | Content |
|---|---|---|
| Administrator Dashboard | ADMIN / QAO | Total folders, total documents, storage used, active users, pending/approved requests, per-set AACCUP/ISO/CERT compliance + area counts, submission trends, document-status distribution, recent activity |
| System Administrator Dashboard | ROOT | Platform health: status, uptime, config counts, database, object storage, email queue, active modules, recent configuration changes |
| User Dashboard | FACULTY / STAFF | Own activity: my documents, pending/approved requests, storage used, upcoming accreditation areas, recent activity, per-set contribution |

## Real-data policy (D-009)

| Rule | Statement |
|---|---|
| Real data only | Every number comes from live persisted backend data; never invented values |
| Empty states | Zero records render as `0` or a clean empty chart (`ChartEmpty`) — never fake lines/bars |
| Errors | Backend failures render honest loading/empty/error states (`—`), never silent fallbacks |
| Refresh | Dashboards poll at 20–30s intervals and refresh after repository activity |
| Trends | Percentages computed from displayed data; omit where no meaningful trend exists |
| Derived live | Dashboard/analytics values are computed at request time — never stored snapshots |

## Data sources

- `GET /dashboard/overview` — document stats (incl. `totalFolders`), storage
  bytes, users, requests, per-set accreditation breakdown.
- `GET /aaccup/analytics/overview` — compliance (single-source
  `compliance.service.ts`), per-set.
- `GET /analytics/*` — time-series (buckets computed in JS over bounded
  windows), category breakdowns, uploads trend.
- Known approximations (documented, accepted): `activeUsers` ≈ sessions
  created; storage trend based on `DocumentVersion.uploadedAt`; compliance
  trend bucket-sampled.

## Related documents

- `specification/aaccup.md` — compliance service, per-set stats
- `specification/repository.md` — document counts/storage inputs
- `engineering/frontend.md` — chart components, polling
- `docs/context/MODULE_INDEX.md` — Dashboard/Analytics module map
