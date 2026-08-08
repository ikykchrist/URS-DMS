# Sprint 8.4 — Roles & Permissions Management: Completion Report

**Sprint:** 8.4
**Status:** COMPLETE
**Date:** 2026-08-08

---

## 1. Executive Summary

Sprint 8.4 delivered a complete ROOT-only Roles & Permissions Management
interface. The backend exposes a full permission matrix (all roles × all
permission codes) with atomic role-binding mutation under hard ROOT gating,
reusing the existing admin roles service. The client gained a new Root Console
page with per-role permission checkboxes grouped by module, search/filter,
confirmation diff, and save. The longstanding frontend/backend permission drift
(D-025 context) was resolved: new `hasServerPermission(user, code)` reads from
the server-authoritative granular permission array, while the legacy
`ROLE_PERMISSIONS` hardcoded matrix is retained for backward compatibility only.

## 2. Sprint Goal and Scope

Goal: create a ROOT-only Roles & Permissions Management page with
server-authoritative permissions that eliminates client-side permission drift.

In scope: ROOT-only matrix view + mutation, server-authoritative client
permission system, privilege-escalation guard, system role protection, audit.

Out of scope: LDAP/SSO/OAuth, custom role creation, MFA, new authentication
architecture, WebSocket permission invalidation.

## 3. Existing RBAC Architecture Reused

- Backend permission catalog (`permissions.constants.ts` — 119 codes)
- Role matrix (`roles.constants.ts` — 7 roles, `ROOT_ONLY_CODES`)
- Admin roles service + repository (`modules/admin/roles/*`)
- Middleware (`requireRole`, `requirePermission` — frozen)
- Audit service (`writeAudit` — fire-and-forget)
- `/auth/me` already returned `permissions: string[]` — leveraged directly

## 4. Backend Changes

**New files:**
- `server/src/modules/root/root.rolesPermissions.routes.ts` — 3 endpoints
  under `/root/roles-permissions`, hard `requireRole("ROOT")`.
- `server/src/modules/root/root.rolesPermissions.service.ts` — reads matrix
  from existing `rolesRepo`, mutation with escalation guard + catalog
  validation, reuses `rolesRepo.list/findById/setRolePermissions`.

**Modified:**
- `server/src/modules/root/root.routes.ts` — mount + import

**Endpoints:**
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/root/roles-permissions/matrix` | All roles × all permissions with ROOT-only codes |
| `GET` | `/root/roles-permissions/catalog` | Full permission catalog |
| `PATCH` | `/root/roles-permissions/roles/:id/permissions` | Atomic role binding replace |

## 5. Frontend Changes

**New files:**
- `client/src/pages/root/RootRolesPermissions.tsx` (~410 lines)

**Modified:**
- `client/src/lib/permissions.tsx` — added `hasServerPermission()`,
  `hasAnyServerPermission()`, `hasAllServerPermissions()`,
  `getUserPermissions()`, `isRootUser()`, `isAdminUser()`
- `client/src/services/admin.ts` — added `getRolesPermissionMatrix()`,
  `getPermissionCatalog()`, `updateRolePermissions()`
- `client/src/App.tsx` — lazy import, path mapping, page title, route mapping,
  conditional render, Route element
- `client/src/components/layout/Sidebar.tsx` — new sidebar entry with Shield icon

## 6. Permission Authority / Refactor

Before (Sprint 8.3):
- Client used hardcoded `ROLE_PERMISSIONS` boolean matrix
- ROOT and ADMINISTRATOR had identical flag sets
- `user.permissions` from server was stored but never used

After (Sprint 8.4):
- `hasServerPermission(user, code)` reads `user.permissions` array
- `isRootUser(user)` checks `root.access` code (not hardcoded role)
- `isAdminUser(user)` checks admin-portal-indicative permission set
- Legacy `ROLE_PERMISSIONS`, `isAdminRole()`, `isRootRole()` retained
  for backward compatibility across existing components
- Server is ALWAYS the authoritative gate — client checks are UX only

## 7. ROOT Protection

- ROOT role permissions are displayed as checked + disabled
- `PATCH /root/roles-permissions/roles/:id/permissions` rejects ROOT mutation
  with `ForbiddenError`
- `ROOT_ONLY_CODES` are displayed with "ROOT ONLY" badge
- The `/root/roles-permissions/*` route group has hard `requireRole("ROOT")`
- Escalation guard: actor must hold every permission code they attempt to grant

## 8. User Management Integration

- Existing User Management continues working unchanged
- `GET /admin/roles` still works for ADMINISTRATOR (AddUserModal dropdown)
- Permission changes take immediate server-side effect; affected users pick
  up new permissions on next page refresh/login

## 9. Database Changes

None. No new models, migrations, or schema changes.

## 10. Audit Verification

Every `PATCH /root/roles-permissions/roles/:id/permissions` writes exactly one
`role.permissions_updated` audit event with:
- Acting ROOT user ID
- Target role ID
- Added permission codes
- Removed permission codes
- Full new permission set
- Timestamp, IP, user agent

## 11. Security Verification

- ROOT-only access: ADMIN, FACULTY, anonymous all receive 403/401
- ROOT permission mutation is blocked server-side
- Escalation guard prevents granting unheld permissions
- Unknown permission codes are rejected with validation error
- System roles cannot be deleted through the management page
- Server validates every request — no client-side trust

## 12. Files Created/Modified

**New (5):**
- `server/src/modules/root/root.rolesPermissions.routes.ts`
- `server/src/modules/root/root.rolesPermissions.service.ts`
- `client/src/pages/root/RootRolesPermissions.tsx`
- `scripts/smoke-roles-permissions.ps1`
- `docs/sprint-8.4-completion-report.md`

**Modified (11):**
- `server/src/modules/root/root.routes.ts`
- `client/src/lib/permissions.tsx`
- `client/src/services/admin.ts`
- `client/src/App.tsx`
- `client/src/components/layout/Sidebar.tsx`
- `docs/engineering/security.md`
- `docs/specification/users.md`
- `docs/context/AI_CONTEXT.md`
- `docs/context/PROJECT_STATUS.md`
- `docs/context/DECISIONS.md`
- `CHANGELOG.md`

## 13. Smoke Test Results

| Suite | Results |
|---|---|
| `smoke-roles-permissions.ps1` | **28/28 passed** |
| `smoke-repository.ps1` (regression) | **49/49 passed** |

Key verifications:
- ROOT can read matrix + catalog; ADMIN/FACULTY/anon denied (403/401)
- Matrix has 6+ roles, 50+ catalog entries, 10+ rootOnlyCodes
- PATCH permissions succeeds, persists, restores
- ROOT permissions blocked from mutation
- Admin cannot PATCH permissions (403)
- `/auth/me` returns granular permissions array (ROOT 50+, faculty 5+)
- `root.access` in ROOT permissions, absent from faculty
- Permission change audited exactly once
- All smoke fixtures self-clean

## 14. Static Verification

- `server: npm run typecheck` — pass
- `server: npm run build` — pass
- `client: npx tsc -b` — pass
- `client: npm run build` — pass (2507 modules, RootRolesPermissions 10.49 kB)

## 15. Known Limitations

- Custom role creation not supported (Role.name is a Prisma enum — schema
  migration required).
- No WebSocket/permission-invalidation push — affected users pick up changes
  on next page refresh or login.
- No optimistic concurrency protection on role binding mutations — two ROOT
  users modifying the same role concurrently could overwrite each other.
  Low risk (single ROOT account expected in 1.0).
- Legacy `ROLE_PERMISSIONS` matrix still shared by existing components that
  haven't been refactored to `hasServerPermission()`. This is intentional
  backward compatibility.

## 16. Completion Percentage

**100%** — all 22 specification sections are implemented and verified.

## 17. Verdict

**COMPLETE**

All deliverables built, type-checked, build-verified, and smoke-tested.
Server-authoritative permission system eliminates the D-025 frontend/backend
drift. Regression suite (repository 49/49) remains green.
