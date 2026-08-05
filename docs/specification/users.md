# Users, Roles & Permissions (URS-DMS)

> One responsibility: roles, permissions, and repository ownership rules.
> Gate mechanics → `engineering/security.md`. Audit → `specification/audit.md`.

## Roles

| Role (enum) | Portal | Purpose |
|---|---|---|
| `ROOT` | Root Console | Platform-wide configuration: configuration engine, organization master data, folder/requirement/workflow/form builders, setup wizard, platform health |
| `ADMINISTRATOR` | Admin Portal | Daily management: users, departments, documents, AACCUP/ISO/Cert areas, submissions review, requests, audit, settings |
| `QUALITY_ASSURANCE_OFFICER` | Admin Portal | AACCUP management + submission review + workflow runtime actions |
| `DEPARTMENT_COORDINATOR` | Admin Portal | Department-level submissions, review, workflow actions |
| `FACULTY` / `STAFF` | User Portal | Personal repository, AACCUP/ISO/Cert evidence submissions, document requests |
| `READ_ONLY` | User Portal | View-only access to documents |

Roles are **not hardcoded checks** anywhere — every access decision routes
through permissions (see `engineering/security.md`).

## Permissions

- Catalog: `permissions.constants.ts` — single source of truth (119 codes).
- Role bindings: `roles.constants.ts` `DEFAULT_ROLE_MATRIX`;
  `ROOT_ONLY_CODES` bound exclusively to ROOT (e.g. `repository.
  emergency_access`, all `root.*`, `config.*`, builder codes).
- **Additive-only**: never remove existing codes; grant by adding to the
  matrix + re-running the seed.
- Escalation guard: admin cannot acquire ROOT-only codes.

## Root protection (D-006)

- ROOT is the only account with Root-exclusive capabilities (hard
  `requireRole("ROOT")` gate + ROOT_ONLY_CODES).
- ROOT accounts are protected from admin mutation (archive/status/
  password/update) and cannot be locked out by admins.
- Bootstrap credentials from `BOOTSTRAP_ROOT_*` env.

## Repository ownership (D-002)

- **Every authenticated account owns one personal repository** — Root,
  Administrator, User alike (see `specification/repository.md`).
- Each administrator's repository is independent; the repository UI never
  aggregates other administrators' private records.
- Emergency access: ROOT-gated time-limited grants let a designated admin
  view a user's repository; audited at HIGH severity.

## User management rules

- Users assigned to roles + optional department (college derived through the
  department FK chain).
- Must-change-password on admin-created accounts; initial credentials via the
  durable email queue.
- Password policy: min length env-driven (`PASSWORD_MIN_LENGTH`).

## Related documents

- `engineering/security.md` — gates, ownership validation, escalation guard
- `specification/repository.md` — per-account repository behavior
- `specification/audit.md` — user/role audit events
- `docs/context/MODULE_INDEX.md` — Users/Roles/Admin module map
