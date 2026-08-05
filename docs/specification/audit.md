# Audit Specification (URS-DMS)

> One responsibility: audit logging rules, events, deduplication. Writer
> pattern → `coding.md` (services). Read surface → `docs/context/
> MODULE_INDEX.md` (Audit module).

## Purpose (D-008)

A permanent, append-only record of every meaningful action — for compliance,
investigation and demonstration.

## Rules

| Rule | Standard |
|---|---|
| Single helper | `writeAudit({ action, userId?, entity?, entityId?, oldValue?, newValue?, ipAddress?, userAgent? })` — never throws |
| Action codes | Constants in `config/constants.ts` `AUDIT_ACTIONS` (e.g. `DOCUMENT_UPDATED`, `FORM_PUBLISHED`); never string literals |
| Required events | Every create/update/archive/restore/publish/assign/rollback/delete mutation audits |
| Event naming | `<domain>.<verb>` (e.g. `form.assigned`, `aaccup_submission.reviewed`, `workflow_instance.completed`) |
| Metadata | Entity type + id + old/new values (JSON) |
| Success rules | Successful mutations audit with `newValue` |
| Failure rules | Permission denials emit best-effort `PERMISSION_DENIED`; **upload failures audit once via `document.upload_failed` with the failure reason**; read-only endpoints do NOT audit |
| Authoritative boundary | The service layer after successful completion is the single audit writer — never the frontend, controller, repository or event listener (rule 23) |
| Append-only | Never delete/modify entries (wipe only via the explicit admin clear endpoint) |
| Read-only convention | Reads (analytics, dashboards, health) generate no entries |

## Tracked event groups

| Group | Actions |
|---|---|
| Authentication | Login, logout, failed login |
| Files | Upload, version added, download (best-effort), preview, rename, move, delete, restore, permanent delete, copy, favorite/unfavorite, share/unshare |
| Folders | Create, rename, move, delete, restore, copy, permanent delete, pin/unpin |
| Repository | Provisioning, recycle-bin actions, emergency access granted/revoked |
| Submissions | Submit, review (approve/reject/return), archive, restore |
| Accreditation | Area/requirement/task create/update/archive/restore; set changes |
| Workflows | Bind, transition, complete, override, publish, rollback, assignment |
| Builders | Template create/update/publish/assign/archive/restore/rollback (folders, requirements, workflows, forms) |
| Organization | Master-data create/update/archive/restore/rollback |
| Configuration | Config create/update/delete/restore/rollback |
| Users & roles | User create/update/archive/status/password, role changes |
| Setup | Wizard start/update/complete, logo upload |
| Administration | Settings updates, announcements |

## Duplicate prevention

- Audit rows are written **once per business action**, inside the same
  transaction as the write where the engine pattern requires it; the audit
  write itself never fails a business operation.

## Read surface

- `GET /audit` — paginated timeline (page/pageSize, filters, `q` search over
  JSON payloads, module/action/status filters, sort).
- `GET /audit/:id` — detail incl. `changes` payload.
- `GET /audit/export?format=csv` — bounded export (10k row cap).
- Admin clear endpoint wipes entries explicitly (audited).

## Related documents

- `coding.md` — services own audit writes
- `engineering/security.md` — PERMISSION_DENIED on denials
- `specification/users.md` — audit.read permission
