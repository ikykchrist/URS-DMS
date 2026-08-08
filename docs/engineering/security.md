# Security Standards (URS-DMS)

> One responsibility: authentication, authorization, RBAC, ownership,
> validation, root protection. Deep dive: `docs/security.md` (legacy).

## Authentication

- JWT access token (short-lived) + refresh token (rotating cookie).
- Failed attempts lock the account temporarily (lockout).
- **`modules/auth/*`, `middlewares/authenticate`, `middlewares/authorize` are
  frozen** — callers only. Session expiry is env-driven (JWT expiry).
- Client: `lib/http.ts` single-flights refresh; on failure clears token and
  dispatches `urs:session-expired` → AuthContext forces logout.

## Authorization

- Every endpoint gated by `requirePermission(...)` /
  `requireAnyPermission(...)`; `requireRole("ROOT")` for Root surfaces.
- Services **re-assert** permissions (defense in depth).
- No `if (role === "admin")` anywhere — permission-driven only.

## RBAC

- Permission catalog (`permissions.constants.ts`) is the **single source of
  truth** (119 codes).
- Role → permission bindings live in `roles.constants.ts`
  (`DEFAULT_ROLE_MATRIX`); `ROOT_ONLY_CODES` are bound exclusively to ROOT.
- Adding a permission = one catalog entry + (optionally) a role binding.
  **Never remove existing codes.** Role matrix changes are additive (re-run
  the seed after granting).
- **Escalation guard**: ADMINISTRATOR and member roles can never acquire
  `ROOT_ONLY_CODES`.
- See `specification/users.md` for the role table.
- **Sprint 8.4 — Roles & Permissions Management**: ROOT-only page
  (`/root/roles-permissions`) surfaces the full permission matrix with
  per-role assignment checkboxes, permission search, module filtering,
  and Save Changes with confirmation diff. Protected permissions (ROOT
  codes, system roles) are displayed as locked/disabled. All changes are
  guarded by privilege-escalation checks and audited.
- **Client permissions** (Sprint 8.4): the client-side permission system is
  now server-authoritative via `useServerPermission(user, code)`. The
  legacy `ROLE_PERMISSIONS` matrix in `permissions.tsx` is retained for
  backward compatibility only.

## Ownership

- Ownership checks on all personal resources server-side: folders, files,
  submissions, tasks.
- Repository queries are always scoped to the authenticated owner (see
  `specification/repository.md`); an account never sees another account's
  private folders or files. Managers see other records only through explicit
  management surfaces (reports, review), never inside the repository UI.

## Validation

- Zod on every body/query/params; `.strict()` bodies reject unknown fields.
- File validation: size cap + allowed-file-types from the Configuration
  Engine (see `specification/configuration.md`) + per-requirement dynamic
  rules (FILE_TYPE, FILE_SIZE, PAGE_COUNT, EXPIRATION_DATE,
  NAMING_CONVENTION, METADATA — see `specification/aaccup.md`).
- MIME types: server infers from filename extension + client-provided type;
  enforce policy before presign.
- Protected storage: MinIO objects private; access only via short-lived
  presigned URLs (see `engineering/storage.md`).

## Emergency Root access

- ROOT is the hard `requireRole("ROOT")` gate; bootstrapped from
  `BOOTSTRAP_ROOT_*` env; ROOT accounts are protected from admin mutation
  (archive/status/password/update forbidden for admins).
- ROOT cannot be locked out by administrators.
- Root-granted time-limited **emergency repository access**
  (`repository.emergency_access` permission) is audited at HIGH severity
  (see `specification/repository.md`).

## Secrets

- Never log or commit secrets; `.env` is gitignored.

## Related documents

- `specification/users.md` — roles, permissions, repository ownership
- `specification/audit.md` — audit of security events
- `docs/security.md` — legacy deep dive
