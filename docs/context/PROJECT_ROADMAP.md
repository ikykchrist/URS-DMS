# Project Roadmap (URS-DMS)

> Future sprint roadmap only. Completion history → `PROJECT_STATUS.md`.
> Current state → `AI_CONTEXT.md`.

## Version 1.0 backlog (next up, priority order)

1. **Notification emitter wiring** — `notifyUser` / `notifyUsers` into the
   existing document / request / aaccup flows (Sprint 7.3 event catalog
   ready; spec previously forbade touching those modules).
2. **Self-service profile** — `PATCH /users/me` + `/sessions` list/revoke.
3. **Forgot / reset password** — `/auth/forgot-password`,
   `/auth/reset-password` (email queue ready; client UI exists).
4. Server-side SSE / WebSocket push for real-time inbox updates.
5. Multipart / resumable upload for files > 100 MB.
6. Standalone Tag entity + CRUD endpoints (currently inline strings on
   DocumentTag).
7. Retention cron scheduling (30-day cleanup script exists) + dedicated
   MinIO object GC job.
8. `/roles` list-by-permission endpoint, `/permissions` CRUD admin surface.
9. Vitest test suite (auth, users, documents, folders, requests, aaccup,
   dashboard).
10. Canonical client ESLint 9 configuration and lint baseline.
11. Documentation pass — fix stale paths in `docs/`.

## Version 2.0 backlog (out of 1.0 scope)

- Custom roles at runtime (Role.isSystem=false + admin CRUD).
- Full-text search across extracted document content (PDF/DOCX index).
- Saved searches / saved filter views per user.
- Document comment / review threads (new model).
- Backup / restore scripts (beyond `scripts/reset-db.sh`).
- Mobile app (React Native) consuming the same REST API.
- AI features over the corpus (summarization, compliance-gap detection,
  suggested reviewers).
- Multi-tenant / multi-campus support.
- SAML / OIDC SSO.
- On-disk encryption for CONFIDENTIAL documents.

## Cross-cutting principles (apply to every sprint)

1. **Reuse, don't refactor** — touch only what the sprint asks for.
2. **Single source of truth** for compliance (`compliance.service.ts`),
   permissions (`permissions.constants.ts`), roles (`roles.constants.ts`),
   error codes (`config/constants.ts`).
3. **Live data, never mock** — dashboard/analytics/compliance numbers are
   computed from DB rows at request time.
4. **RBAC is permission-driven** — no `if (role === "admin")`.
5. **Soft delete only** — audit log is append-only.
6. **Strict TypeScript** — lint + typecheck + build must pass before a sprint
   is declared complete.
7. **No secrets in the repo** — `.env` is gitignored.
8. **API contracts after every backend task** — append endpoint contracts to
   `API_CONTRACTS.md`.

## Related documents

- `PROJECT_STATUS.md` — completed sprint table
- `AI_CONTEXT.md` — current state, priorities
- `engineering/testing.md` — sprint completion rules
