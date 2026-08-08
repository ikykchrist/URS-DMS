# Module Index (URS-DMS)

> The complete module map. Every sprint reads this to know exactly which
> files, models, APIs and docs a module touches — read ONLY the module row
> you need. Behavior: `docs/specification/`. Standards: `docs/engineering/`.

## 1. Auth

| | |
|---|---|
| **Backend** | `modules/auth/` (auth.controller/service/routes/validator, auth.cookies, auth.password, auth.tokens) — **FROZEN** (D-030: session-revoke audits + `/auth/me` additive fields are the only 8.1 exception); `modules/passwordReset/` (8.2: forgot/reset-password on `/auth`, `PasswordResetToken`) |
| **Frontend** | `components/auth/` (LoginForm, AuthCard, AuthLayout, PasswordInput, PasswordStrength, Forgot/ResetPasswordForm), `pages/Login.tsx`, `pages/ForgotPassword.tsx`, `pages/ResetPassword.tsx`, `context/AuthContext.tsx`, `lib/http.ts`, `services/auth.ts` (account/session/password-recovery service: `meRaw`, `updateProfile`, `getUserSessions`, `killSession`, `killAllOtherSessions`, `changePassword`, `forgotPassword`, `resetPassword`) |
| **Database** | `User` (session/lockout fields), `Session`, `PasswordResetToken` |
| **Dependencies** | argon2, JWT, env (PASSWORD_MIN_LENGTH, BOOTSTRAP_ROOT_*), email queue (reset links) |
| **Public APIs** | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/sessions`, `/auth/sessions/:id/kill`, `/auth/sessions/kill-all`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/dev/reset-link` (dev only), `PATCH /users/me` (self-service profile) |
| **Docs** | `engineering/security.md`, `specification/users.md` |

## 2. Users / Roles / Permissions (RBAC)

| | |
|---|---|
| **Backend** | `modules/users/`, `modules/roles/roles.constants.ts`, `modules/permissions/permissions.constants.ts` + `permissions.repository.ts` |
| **Frontend** | `pages/UserManagement.tsx`, `pages/AccountSecurity.tsx` (shared Account & Security, both portals), `pages/user/UserProfile.tsx` (wrapper), `components/modals/AddUserModal.tsx`, `components/modals/UserDetailsModal.tsx`, `components/modals/ChangePasswordModal.tsx`, `components/modals/SessionManagementModal.tsx`, `lib/permissions.ts`, `services/admin.ts` |
| **Database** | `User`, `Role`, `Permission`, `RolePermission`, `Session` |
| **Dependencies** | Auth, audit |
| **Public APIs** | `/users`, `/users/me` (PATCH self-service), `/admin/users`, `/admin/roles`, `/admin/permissions` |
| **Docs** | `specification/users.md`, `engineering/security.md` |

## 3. Repository (personal file management)

| | |
|---|---|
| **Backend** | `modules/repositories/` (repository.controller/service/repository/routes/types/validator — provisioning, storage summary, emergency access), `modules/documents/`, `modules/folders/` (incl. streaming ZIP in folders.service, background copy jobs) |
| **Frontend** | `components/repository/RepositoryExplorer.tsx`, `components/preview/FilePreviewModal.tsx`, `lib/uploadBus.ts` (upload leave-guard), `pages/DocumentRepository.tsx`, `pages/user/UserDocuments.tsx`, `services/documents.ts`, `services/repository.ts` |
| **Database** | `Repository`, `RepositoryFavorite`, `RepositoryRecent`, `RepositoryPin`, `EmergencyAccess`, `RepositoryCopyJob`, `Folder`, `Document`, `DocumentVersion`, `DocumentShare`, `DocumentTag` |
| **Dependencies** | Auth, RBAC, MinIO (`lib/storage`), Configuration Engine (upload policy), Audit, Notifications (rule 19 emitters) |
| **Public APIs** | `/repositories/*` (me, storage, backfill, emergency access), `/folders` (+`/deleted` `/pins` `/jobs` `/jobs/:id` `/resolve` `/restore` `/copy` `/info` `/zip` `/permanent` `/pin`), `/documents` (+`/deleted` `/requested` `/favorites` `/recents` `/activity` `/restore` `/copy` `/permanent` `/favorite` `/versions` `/download` `/preview` `/share`) |
| **Docs** | `specification/repository.md`, `engineering/storage.md`, `engineering/frontend.md` |

## 4. Document Requests

| | |
|---|---|
| **Backend** | `modules/requests/` (requests.controller/service/repository/routes/types/validator) |
| **Frontend** | `pages/RequestsReview.tsx` (admin review), `pages/user/UserRequests.tsx` + `pages/user/UserBrowseArchive.tsx` (browse + request), `services/requests.ts` |
| **Database** | `DocumentRequest` (no soft-delete column — documented gap, D-013), `DocumentRequestItem` (multi-file, 1–3 per request, D-022; documentId FK CASCADE, D-026) |
| **Dependencies** | Auth, RBAC, Documents (delivery copy → Repository), Workflow (DOCUMENT_REQUEST instances), Audit |
| **Public APIs** | `/requests` (create/list/get — create accepts `documentIds[1–3]`), `GET /requests/browse` (department bucket, list-only), `POST /requests/:id/approve|reject|fulfill|cancel` (reject requires `decisionNote`) |
| **Docs** | `specification/repository.md` (Requested Documents), `specification/workflow.md` |

## 5. AACCUP / Accreditation (AACCUP | ISO | CERT)

| | |
|---|---|
| **Backend** | `modules/aaccup/` (core + `requirements/`, `submissions/`, `tasks/`, `analytics/`, `services/compliance.service.ts`), `modules/requirements/requirement.runtime.ts` |
| **Frontend** | `pages/AACCUPGroupPage.tsx` (admin group) + `pages/user/UserAACCUPGroup.tsx` (user group) with shared `components/aaccup/` (AACCUPGroupTabs, SubmissionsTable, TaskSubmitDialog); `pages/AACCUPManagement.tsx` (per-set areas), `pages/Submissions.tsx`, `pages/user/UserAccreditationView.tsx`, `pages/user/UserSubmissionsTab.tsx`, `pages/user/UserTasksTab.tsx`, `components/modals/AACCUPAreaDetailsModal.tsx` (Submissions/Tasks/Requirements tabs), `AddAreaModal.tsx` (create+edit), `RequirementModal.tsx`, `AddSubmissionModal.tsx`, `CreateTaskModal.tsx`, `ReturnSubmissionModal.tsx`, `services/aaccup.ts` |
| **Database** | `AaccupArea`, `AaccupRequirement`, `AaccupSubmission` (snapshot columns + `taskId`), `AaccupTask`, `AccreditationCycle` + requirement template projection tables |
| **Dependencies** | Auth, RBAC (`aaccup.*`), Documents (evidence uploads), Workflow (AACCUP_SUBMISSION instances), Requirement Builder runtime, Audit |
| **Public APIs** | `/aaccup/areas|requirements|submissions|tasks` (full CRUD + assignee picker `GET /tasks/assignees` + `mine=true`), `/aaccup/analytics/overview`, `/requirements/*` (runtime), `/dashboard/aaccup` |
| **Docs** | `specification/aaccup.md`, `specification/workflow.md`, `specification/configuration.md` |

## 6. Workflow Engine

| | |
|---|---|
| **Backend** | `modules/workflow/` (workflow.engine, workflow.service, workflow.cache, workflow.repository, controller/routes/types/validator) |
| **Frontend** | Root: `pages/root/RootWorkflowBuilder.tsx`; runtime via `services/root.ts` |
| **Database** | `WorkflowDefinition`, `WorkflowStep`, `WorkflowTransition`, `WorkflowAssignment`, `WorkflowVersion`, `WorkflowHistory`, `WorkflowInstance`, `WorkflowStepInstance`, `WorkflowAction` |
| **Dependencies** | Auth, RBAC (ROOT authoring; `workflow.*` runtime codes), Requests/AACCUP/Documents adapters, Audit |
| **Public APIs** | `/root/workflows/*` (builder), `/workflows/instances/*` (runtime: bind, actions, override) |
| **Docs** | `specification/workflow.md`, `specification/configuration.md` |

## 7. Dashboard / Analytics / Reports

| | |
|---|---|
| **Backend** | `modules/dashboard/`, `modules/analytics/`, `modules/reports/` |
| **Frontend** | `pages/root/RootDashboard.tsx`, `pages/user/UserDashboard.tsx`, `pages/AuditLogs.tsx` (admin dashboard lives in admin pages), `components/layout/ChartCard.tsx` + `StatCard.tsx`, `services/dashboard.ts`, `services/analytics.ts` |
| **Database** | Read-only aggregations over Users, Documents, DocumentVersion, Aaccup*, Requests, Sessions |
| **Dependencies** | Auth, RBAC, AACCUP compliance service, Storage stats |
| **Public APIs** | `/dashboard/overview`, `/dashboard/aaccup`, `/dashboard/storage`, `/analytics/*`, `/reports/*` |
| **Docs** | `specification/dashboard.md`, `specification/aaccup.md` |

## 8. Audit

| | |
|---|---|
| **Backend** | `modules/audit/` (audit.service/repository/controller/routes/types/validator) |
| **Frontend** | `pages/AuditLogs.tsx`, `components/modals/ExportLogsModal.tsx` + `LogDetailsModal.tsx`, `services/admin.ts` |
| **Database** | `AuditLog` (append-only) |
| **Dependencies** | Auth, RBAC (`audit.read`) |
| **Public APIs** | `/audit` (list/search/filter), `/audit/:id`, `/audit/export?format=csv`, admin clear endpoint |
| **Docs** | `specification/audit.md` |

## 9. Notifications / Email

| | |
|---|---|
| **Backend** | `modules/notifications/`, `modules/email/` |
| **Frontend** | `components/layout/NotificationCenter.tsx`, `pages/user/UserNotifications.tsx`, `services/notifications.ts` |
| **Database** | `Notification`, `EmailQueueItem` (durable queue), `Announcement` |
| **Dependencies** | Auth, RBAC, users |
| **Public APIs** | `/notifications` (inbox, unread, mark-read, mark-all-read, delete), `/admin/announcements` |
| **Docs** | `specification/audit.md` (events), `AI_CONTEXT.md` §6 (emitters not yet wired) |

## 10. Admin surface

| | |
|---|---|
| **Backend** | `modules/admin/` (users/, roles/, permissions/, departments/, colleges/, settings/, `_shared/admin.guard.ts`) |
| **Frontend** | `pages/UserManagement.tsx`, `pages/Settings.tsx`, `components/modals/*` (AddUser, ResetPassword, ChangePassword, SessionManagement), `services/admin.ts` |
| **Database** | `User`, `Role`, `Permission`, `Department`, `College`, `SystemSetting` |
| **Dependencies** | Auth, RBAC, audit |
| **Public APIs** | `/admin/users`, `/admin/roles`, `/admin/permissions`, `/admin/departments`, `/admin/colleges`, `/admin/settings` |
| **Docs** | `specification/users.md`, `engineering/security.md` |

## 11. Root Console (Configuration Engine + Builders + Setup)

| | |
|---|---|
| **Backend** | `modules/root/` — root.config.*, root.organization.*, root.folderBuilder.*, root.requirement.*, root.form.*, root.setup.*, root.overview.service, root.session, root.controller/routes |
| **Frontend** | `pages/root/` — RootDashboard, RootConfigurations, RootOrganization, RootFolderBuilder, RootRequirementBuilder, RootWorkflowBuilder, RootFormBuilder, RootSetupWizard, RootUsers, RootAudit; `services/root.ts` |
| **Database** | `ConfigurationCategory`, `Configuration`, `ConfigurationVersion`, `ConfigurationHistory`, `College`/`Department`/`Office`/`Program` (+`organization_versions`), `FolderTemplate`/`FolderTemplateNode`/`FolderTemplateAssignment` (+versions/histories), `RequirementTemplate`/nodes/validations/assignments/versions/histories, `Workflow*` (see 6), `FormTemplate`/`FormField`/`FormAssignment`/`FormVersion`/`FormHistory`, `SetupState` |
| **Dependencies** | Auth (hard `requireRole("ROOT")`), RBAC (root.* + builder codes), MinIO (logo), Email (admin credentials), Audit |
| **Public APIs** | `/root/overview`, `/root/config*`, `/root/organization*`, `/root/folder-templates*`, `/root/requirements*`, `/root/workflows*`, `/root/forms*`, `/root/setup*` |
| **Docs** | `specification/configuration.md`, `specification/workflow.md`, `engineering/backend.md` |

## 12. Maintenance (storage integrity)

| | |
|---|---|
| **Backend** | `modules/maintenance/` (maintenance.service, maintenance.routes, maintenance.jobs — recycle-bin retention cleanup, orphan scan/cleanup, consistency check, storage stats) |
| **Frontend** | `pages/root/RootMaintenance.tsx` (storage overview, job history, orphan browser, controlled cleanup actions with dry-run/confirm) |
| **Database** | `MaintenanceJob`, `MaintenanceOrphanCandidate`, `MaintenanceLock` |
| **Dependencies** | Auth (ROOT), RBAC (`root.access`), MinIO, Audit, Notifications |
| **Public APIs** | `/root/maintenance/status`, `/root/maintenance/storage`, `/root/maintenance/check`, `/root/maintenance/orphans`, `/root/maintenance/scan`, `/root/maintenance/cleanup-recycle`, `/root/maintenance/cleanup-orphans` |
| **Docs** | `engineering/storage.md` (Maintenance section), `specification/repository.md` (Recycle Bin), `DECISIONS.md` (D-032, D-033) |

## 13. Health

| | |
|---|---|
| **Backend** | `health/health.routes.ts` |
| **Frontend** | — (used by scripts/dev tooling) |
| **Database** | — (live probes only) |
| **Dependencies** | Prisma, MinIO |
| **Public APIs** | `/health` |
| **Docs** | `engineering/architecture.md` |

## 14. Shared infrastructure (cross-cutting)

| | |
|---|---|
| **Backend** | `lib/prisma.ts`, `lib/storage.ts` (**FROZEN**), `middlewares/authenticate.ts` + `authorize.ts` (**FROZEN**) + `validate.ts` + `rateLimiter.ts`, `utils/errors.ts`, `utils/apiResponse.ts`, `utils/asyncHandler.ts`, `config/env.ts`, `config/constants.ts` (audit actions + error codes), `routes/index.ts` |
| **Frontend** | `lib/http.ts`, `lib/toast.ts`, `lib/utils.ts`, `lib/permissions.ts`, `types/domain.ts`, `components/ui/*` (design system), `components/ErrorBoundary.tsx` |
| **Docs** | `engineering/coding.md`, `engineering/backend.md`, `engineering/security.md`, `engineering/database.md`, `engineering/storage.md` |

## Cross-reference quick table

| Concern | Module | Specification |
|---|---|---|
| Repository | 3 | `specification/repository.md` |
| Requests | 4 | `specification/repository.md` §Requested Documents |
| Accreditation | 5 | `specification/aaccup.md` |
| Workflows | 6 | `specification/workflow.md` |
| Dashboards | 7 | `specification/dashboard.md` |
| Users/RBAC | 2 | `specification/users.md` |
| Config/Root | 11 | `specification/configuration.md` |
| Audit | 8 | `specification/audit.md` |
| Auth | 1 | `engineering/security.md` |
| Storage | 3 | `engineering/storage.md` |
| Maintenance | 12 | `engineering/storage.md` §Maintenance |
