# Project Status (URS-DMS)

> Sprint completion history only. Current state → `AI_CONTEXT.md`. Future →
> `PROJECT_ROADMAP.md`. Append every completed sprint here (newest first).

## Sprint log

| Sprint | Scope | Status |
|---|---|---|
| 1 | Client skeleton (Vite + React + TS + Tailwind) | ✅ done |
| 2 | Auth + RBAC + Users + Sessions + AuditLog + Prisma + Docker | ✅ done |
| 3 | Documents + Folders + Versioning + Upload/Download + Tags + Shares + MinIO | ✅ done |
| 4 | Document Requests workflow (approve / reject / fulfill / cancel) | ✅ done |
| 5.1–5.5 | AACCUP areas, requirements, submissions + review state machine, compliance + analytics, QA pass | ✅ done |
| 6.1–6.3 | Dashboard statistics, analytics & trends, audit center APIs | ✅ done |
| 7.1 | Administration backend (departments + colleges + settings) | ✅ done |
| 7.2 | User & Role administration (escalation guard) | ✅ done |
| 7.3 | Notification & email service (inbox + announcements + durable queue) | ✅ done |
| 7.4.1 | System Administrator (ROOT) + Configuration Engine | ✅ done |
| 7.4.2 | Organization engine (offices/programs + versioning + rollback) | ✅ done |
| 7.4.3 | Dynamic Folder Builder (versioned trees + scoped assignment + resolve) | ✅ done |
| 7.4.4 | Dynamic Requirement Builder (recursive templates + rules + projection) | ✅ done |
| 7.4.5 | Dynamic Workflow Builder (definitions + runtime gates) | ✅ done |
| 7.4.6 | Dynamic Form Builder (12 field types + versioning + assignments) | ✅ done |
| 7.4.8 | Platform Setup Wizard (8-step, persisted, MinIO logo) | ✅ done |
| 7.5 | Integration & defense readiness (config-engine upload policy, full-flow smoke) | ✅ done |
| 7.5.1 | Document Repository stabilization (owner-scoped explorer, folder/file CRUD) | ✅ done |
| 7.6 | Complete system validation (dead code/buttons, 27/27 smoke) | ✅ done |
| 7.7 | Defense demo prep (ErrorBoundary, titles, toasts, lazy Root pages) | ✅ done |
| 7.7.5 | Production data migration & mock-data elimination (seed clean) | ✅ done |
| 7.8 | Final acceptance testing — V1.0 RC1 (36/36 smoke, Docker restart verified) | ✅ done |
| 8.0 | Accreditation hardening + realtime analytics (AreaSet separation, tasks, per-set tabs + dashboards) | ✅ done |
| 8.1 | User portal accreditation tabs (set-aware user views, ISO/Cert routes) | ✅ done |
| 8.2 | Admin dashboard real-data cleanup (honest zeros, no fake trends) | ✅ done |
| 8.3 | **Personal Document Repository completion** — provisioning, recycle bin + 30-day retention, favorites/recents/quick access, requested documents, repository-wide search, real upload progress, fixed replace-version, shared-blob copies, emergency access, snapshot columns; 49/49 smoke; mock-data audit §4 | ✅ done |
| 8.4 | **Repository Rules 1–30** — ownership-strict isolation (404, D-019), depth 5/6 enforcement, conflict modes (upload/replace/restore/copy merge/keep_both/cancel), persisted background copy jobs (D-020), folder info + honest storage display + streaming ZIP, file activity + submission badges, checksum duplicate warning, audio/video uploads, drag & drop, leave-guard on nav/logout, notification emitters (upload/request/submission/recycle/storage), upload-failure audit; 49/49 base + 40/40 rules smoke | ✅ done |

## Key verification milestones

- **V1.0 RC1 ready** — 17 migrations applied at that point; all acceptance
  checks green; data survives backend + Docker restarts.
- **Repository module** — 20/20 migrations applied; server typecheck/lint/
  build + client typecheck/build pass; `scripts/smoke-repository.ps1` 49/49;
  persistence across backend restart verified (PostgreSQL + MinIO).
- **Rules 1–30 sprint** — 21/21 migrations applied
  (`20260829000000_repository_rules`); `scripts/smoke-repository-rules.ps1`
  40/40 (depth limits, conflicts, ZIP, activity, jobs, notifications,
  emergency access, multi-user isolation); all smoke records + temp users
  removed; MinIO objects cleaned; final DB: 3 users / 3 repositories / real
  user data only.
- Final DB state (repository sprint): 3 repositories, zero test records;
  user-created demo content kept per the never-delete rule.

## Related documents

- `AI_CONTEXT.md` — current state
- `PROJECT_ROADMAP.md` — future work
- `docs/mock-data-audit.md` — removal records
- `CHANGELOG.md` — chronological change log
