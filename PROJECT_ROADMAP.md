# URS-DMS — Project Roadmap

> Long-term development plan. Keep this high-level; the *current* state lives
> in `PROJECT_STATUS.md`.

---

## Version 1.0 scope (target)

> The system that must be complete and stable for the thesis / production MVP.

### Sprints completed

| Sprint | Scope                                                              | Status |
|--------|--------------------------------------------------------------------|--------|
| 1      | Client skeleton (Vite + React + TS + Tailwind)                      | ✅ done |
| 2      | Auth + Users + RBAC + Sessions + AuditLog + Prisma + Docker         | ✅ done |
| 3      | Documents + Folders + Versioning + Upload/Download + Tags + Shares  | ✅ done |
| 4      | Document Requests workflow (approve / reject / fulfill / cancel)   | ✅ done |
| 5.1    | AACCUP Areas backend (CRUD + archive + restore + audit)            | ✅ done |
| 5.2    | AACCUP Requirements backend (CRUD + audit)                         | ✅ done |
| 5.3    | AACCUP Submissions + review state machine + audit                  | ✅ done |
| 5.4    | Compliance tracking + analytics APIs (single-source compliance svc) | ✅ done |
| 5.5    | AACCUP QA + integration + bug-fix pass                             | ✅ done |
| 6.1    | Dashboard Statistics API (live aggregations across all modules)     | ✅ done |
| 6.2    | Analytics & Trend API (time-series + category breakdowns)          | ✅ done |
| 6.3    | Audit Center API (timeline view, search, filters, export)          | ✅ done |
| 7.1    | Administration Backend (Departments + Colleges + System Settings) | ✅ done |
| 7.2    | User & Role Administration (Users + Roles + Permissions + escalation guard) | ✅ done |
| 7.3    | Notification & Email Service (inbox + announcements + durable email queue) | done |
| 7.4.1  | System Administrator (ROOT) + Configuration Engine (backend + Root Console UI) | ✅ done |
| 7.4.2  | Organization Management Engine (offices/programs + colleges/departments reuse + versioning + rollback, ROOT-only) | ✅ done |
| 7.4.3  | Dynamic Folder Builder (versioned trees + scoped assignments + rollback + repository resolution, ROOT-only management) | ✅ done |
| 7.4.4  | Dynamic Requirement Builder (recursive templates + rules + cycles + scoped assignment + stable AACCUP projection, ROOT-only management) | ✅ done |
| 7.4.5  | Dynamic Workflow Builder (versioned step/transition definitions + scoped assignment + immutable publish + runtime gates on requests/AACCUP/documents, ROOT-only management) | ✅ done |

### Sprints in flight

| Sprint | Scope                                                  | Status |
|--------|--------------------------------------------------------|--------|
| (next) | Awaiting user direction (e.g. emitters wiring, configuration-engine consumption, feature flags) | pending approval |

### 1.0 backlog (still pending)

- Wire notification emitters into document / request / aaccup flows via the
  Sprint 7.3 `notifyUser` / `notifyUsers` surface + event catalog.
- Server-side SSE / WebSocket push for real-time notifications.
- Self-service `PATCH /users/me` (self-update profile) + `/sessions` list/revoke.
- Forgot / reset password endpoints (`/auth/forgot-password`,
  `/auth/reset-password`). Client UI already exists.
- Standalone Tag entity + CRUD endpoints (currently inline strings on DocumentTag).
- Document favorites + recent documents (new schema + endpoints).
- Multipart / resumable upload for files > 100 MB.
- Vitest test suite (auth, users, documents, folders, requests, aaccup,
  dashboard).
- Canonical client ESLint 9 configuration and lint baseline.
- Documentation pass — fix stale paths in `docs/`.
- /roles list-by-permission endpoint, /permissions CRUD (admin surface).
- Retention enforcement job (Document.retentionUntil) + MinIO object GC for
  soft-deleted documents (cron).

---

## Version 2.0 backlog

> Out of scope for 1.0; tracked so it informs 1.0 design decisions.

- Custom roles at runtime (Role.isSystem=false + admin CRUD).
- Full-text search across extracted document content (PDF/DOCX text index).
- Saved searches / saved filter views per user.
- Document comment / review threads (new DocumentComment model).
- Backup / restore scripts (beyond current `scripts/reset-db.sh`).
- Mobile app (React Native) consuming the same REST API.
- AI features over the corpus (summarization, compliance-gap detection,
  suggested reviewers).
- Multi-tenant / multi-campus support.
- SAML / OIDC SSO.
- On-disk encryption for CONFIDENTIAL documents.

---

## Cross-cutting principles (apply to every sprint)

1. **Reuse, don't refactor.** Touch only what the sprint asks for.
2. **Single source of truth** for compliance (`compliance.service.ts`),
   permissions (`permissions.constants.ts`), roles (`roles.constants.ts`),
   error codes (`config/constants.ts`).
3. **Live data, never mock.** All dashboard/analytics/compliance numbers are
   computed from DB rows at request time.
4. **RBAC is permission-driven.** No `if (role === "admin")`.
5. **Soft delete only.** Audit log is append-only.
6. **Strict TypeScript. Lint + typecheck + build must pass before a sprint is
   declared complete.**
7. **No secrets in the repo.** `.env` is gitignored.
8. **API contracts after every backend task.** Each backend task ENDS by
   appending its endpoint contracts to `API_CONTRACTS.md` (Endpoint / Method /
   Permission / Request body / Query params / Response schema / Error
   responses). This keeps frontend integration, thesis documentation, and any
   future AI / developer handoff fast and unambiguous.
