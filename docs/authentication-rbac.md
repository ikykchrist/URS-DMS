# Authentication and RBAC

## Authentication

Login validates credentials and creates a `Session`. The server signs an HS256 access JWT containing user, role, session, type, issuer, and audience claims. Access-token verification enforces issuer/audience/type. Refresh tokens are opaque random values whose hashes are looked up in session state; the refresh value is set in the httpOnly `urs_refresh_token` cookie scoped to `/api/v1/auth` for seven days.

`authenticate` accepts a Bearer token or `urs_access_token` cookie, verifies the live session is not revoked/expired, requires an `ACTIVE` user, and loads current permissions from the database. Thus a role/permission change is evaluated on subsequent authenticated requests rather than relying only on token claims.

Password hashing uses Argon2. Login rate limiting is configured at five unsuccessful attempts per 15 minutes per rate-limit key; account lockout configuration also exists in environment validation.

## Roles and permissions

Declared roles are `ROOT`, `ADMINISTRATOR`, `QUALITY_ASSURANCE_OFFICER`, `DEPARTMENT_COORDINATOR`, `FACULTY`, `STAFF`, `READ_ONLY`, and `ACCREDITOR`. The permission catalog is `server/src/modules/permissions/permissions.constants.ts`. The default bindings are in `server/src/modules/roles/roles.constants.ts` and the seed script.

`ROOT` receives every catalog permission. `ADMINISTRATOR` receives every permission except the explicit ROOT-only codes. The remaining roles receive the documented default subsets in the role matrix. A custom database role can only exercise permissions assigned in `RolePermission` and allowed by route/service behavior.

## Enforcement points

The `ACCREDITOR` system role is provisioned by migration and is assignable in Admin User Management. It signs in to the Accreditation workspace and can browse active AACCUP and ISO areas and preview their current approved evidence. Preview access is tied to the submitted version. The role has fixed workspace access and no general permission bindings.

- API routes use `authenticate`, then `requirePermission`, `requireAnyPermission`, or `requireRole` where declared.
- Services also implement resource/ownership rules in areas such as documents, folders, repositories, and administration; route permission alone is not the complete access rule.
- Client routing checks `isAdminRole`/`isRootRole` and component guards, but these checks do not secure an API.
- Permission denials from guard middleware are written as security audit events. In this committed baseline, `requireRole` writes that event asynchronously while permission guards await it.

## Sensitive routes

Root configuration and management routes are permission-gated with ROOT-only codes. Root-only audit retention/archive/review operations use `requireRole("ROOT")`. Repository emergency grants require `repository.emergency_access`. Check each route file for the precise required permission.
