// =============================================================================
// URS-DMS — global constants & error codes
// =============================================================================

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",

  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  REFRESH_REUSE_DETECTED: "REFRESH_REUSE_DETECTED",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  EMPLOYEE_ID_TAKEN: "EMPLOYEE_ID_TAKEN",
  PASSWORD_TOO_WEAK: "PASSWORD_TOO_WEAK",

  UPLOAD_FAILED: "UPLOAD_FAILED",
  DOWNLOAD_FAILED: "DOWNLOAD_FAILED",
  STORAGE_UNAVAILABLE: "STORAGE_UNAVAILABLE",
  OBJECT_NOT_FOUND: "OBJECT_NOT_FOUND",
  CHECKSUM_MISMATCH: "CHECKSUM_MISMATCH",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_MIME_TYPE: "UNSUPPORTED_MIME_TYPE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const COOKIE_NAMES = {
  REFRESH: "urs_refresh_token",
} as const;

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILED: "auth.login.failed",
  LOGOUT: "auth.logout",
  REFRESH_SUCCESS: "auth.refresh.success",
  REFRESH_FAILED: "auth.refresh.failed",
  REFRESH_REUSE: "auth.refresh.reuse_detected",
  PASSWORD_CHANGED: "auth.password.changed",
  PASSWORD_RESET: "auth.password.reset",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_STATUS_CHANGED: "user.status_changed",
  USER_DELETED: "user.deleted",
  PERMISSION_DENIED: "auth.permission_denied",

  // Sprint 7.2 — User & Role Administration
  USER_ARCHIVED: "user.archived",
  USER_RESTORED: "user.restored",
  USER_ACTIVATED: "user.activated",
  USER_DEACTIVATED: "user.deactivated",
  FORCE_PASSWORD_CHANGE: "user.force_password_change",
  ROLE_CREATED: "role.created",
  ROLE_UPDATED: "role.updated",
  ROLE_ARCHIVED: "role.archived",
  ROLE_RESTORED: "role.restored",
  PERMISSIONS_UPDATED: "role.permissions_updated",

  DOCUMENT_CREATED: "document.created",
  DOCUMENT_UPDATED: "document.updated",
  DOCUMENT_DELETED: "document.deleted",
  DOCUMENT_VERSION_ADDED: "document.version_added",
  DOCUMENT_DOWNLOADED: "document.downloaded",
  DOCUMENT_SHARED: "document.shared",
  DOCUMENT_UNSHARED: "document.unshared",
  DOCUMENT_RESTORED: "document.restored",

  FOLDER_CREATED: "folder.created",
  FOLDER_UPDATED: "folder.updated",
  FOLDER_DELETED: "folder.deleted",

  REQUEST_CREATED: "request.created",
  REQUEST_APPROVED: "request.approved",
  REQUEST_REJECTED: "request.rejected",
  REQUEST_FULFILLED: "request.fulfilled",
  REQUEST_CANCELLED: "request.cancelled",

  DEPARTMENT_CREATED: "department.created",
  DEPARTMENT_UPDATED: "department.updated",
  DEPARTMENT_DELETED: "department.deleted",
  DEPARTMENT_ARCHIVED: "department.archived",
  DEPARTMENT_RESTORED: "department.restored",

  COLLEGE_CREATED: "college.created",
  COLLEGE_UPDATED: "college.updated",
  COLLEGE_ARCHIVED: "college.archived",
  COLLEGE_RESTORED: "college.restored",

  SETTINGS_UPDATED: "settings.updated",

  AACCUP_AREA_CREATED: "aaccup_area.created",
  AACCUP_AREA_UPDATED: "aaccup_area.updated",
  AACCUP_AREA_ARCHIVED: "aaccup_area.archived",
  AACCUP_AREA_RESTORED: "aaccup_area.restored",

  AACCUP_REQUIREMENT_CREATED: "aaccup_requirement.created",
  AACCUP_REQUIREMENT_UPDATED: "aaccup_requirement.updated",
  AACCUP_REQUIREMENT_ARCHIVED: "aaccup_requirement.archived",
  AACCUP_REQUIREMENT_RESTORED: "aaccup_requirement.restored",

  AACCUP_SUBMISSION_CREATED: "aaccup_submission.created",
  AACCUP_SUBMISSION_UPDATED: "aaccup_submission.updated",
  AACCUP_SUBMISSION_REVIEWED: "aaccup_submission.reviewed",
  AACCUP_SUBMISSION_ARCHIVED: "aaccup_submission.archived",
  AACCUP_SUBMISSION_RESTORED: "aaccup_submission.restored",

  // Sprint 7.3 — Notification & Email Service. `notification.read` is skipped
  // for programmatic (system-generated) notifications — they are not actor
  // actions and would flood the log; the admin announcement surface writes
  // NOTIFICATION_CREATED instead. Email failures audit only when terminal
  // (maxAttempts exhausted) — transient retries are worker-internal.
  NOTIFICATION_CREATED: "notification.created",
  NOTIFICATION_MARKED_READ: "notification.marked_read",
  NOTIFICATION_DELETED: "notification.deleted",
  EMAIL_SENT: "email.sent",
  EMAIL_FAILED: "email.failed",

  // Sprint 7.4.1 — System Administrator (ROOT) Foundation + Configuration
  // Engine. Configuration lifecycle + rollback actions are written by the
  // root config service on every mutation; ROOT_LOGIN / ROOT_LOGOUT are
  // emitted by the root session watcher (modules/root/root.session.ts) — the
  // auth module itself stays untouched (AI_CONTEXT §10), so root-session
  // lifecycle is observed via the Session table instead.
  CONFIG_CREATED: "config.created",
  CONFIG_UPDATED: "config.updated",
  CONFIG_DELETED: "config.deleted",
  CONFIG_RESTORED: "config.restored",
  CONFIG_ROLLED_BACK: "config.rolled_back",
  ROOT_LOGIN: "root.login",
  ROOT_LOGOUT: "root.logout",

  // Sprint 7.4.2 — Organization Management Engine (ROOT-only master data).
  // Colleges and departments reuse the Sprint 7.1 action constants above
  // (same physical rows); offices and programs get their own. The rollback
  // actions are written by the root organization service when a record is
  // rolled back to an earlier version snapshot.
  OFFICE_CREATED: "office.created",
  OFFICE_UPDATED: "office.updated",
  OFFICE_ARCHIVED: "office.archived",
  OFFICE_RESTORED: "office.restored",
  PROGRAM_CREATED: "program.created",
  PROGRAM_UPDATED: "program.updated",
  PROGRAM_ARCHIVED: "program.archived",
  PROGRAM_RESTORED: "program.restored",
  ORGANIZATION_COLLEGE_ROLLED_BACK: "organization.college.rolled_back",
  ORGANIZATION_DEPARTMENT_ROLLED_BACK: "organization.department.rolled_back",
  ORGANIZATION_OFFICE_ROLLED_BACK: "organization.office.rolled_back",
  ORGANIZATION_PROGRAM_ROLLED_BACK: "organization.program.rolled_back",

  // Sprint 7.4.3 — Dynamic Folder Builder. Template lifecycle actions are
  // written by the root folder-builder service; node actions cover tree
  // mutations (create / update / move / duplicate / archive / restore) on
  // both template and node rows.
  FOLDER_TEMPLATE_CREATED: "folder_template.created",
  FOLDER_TEMPLATE_UPDATED: "folder_template.updated",
  FOLDER_TEMPLATE_ASSIGNED: "folder_template.assigned",
  FOLDER_TEMPLATE_ARCHIVED: "folder_template.archived",
  FOLDER_TEMPLATE_RESTORED: "folder_template.restored",
  FOLDER_TEMPLATE_ROLLED_BACK: "folder_template.rolled_back",
  FOLDER_NODE_CREATED: "folder_node.created",
  FOLDER_NODE_UPDATED: "folder_node.updated",
  FOLDER_NODE_MOVED: "folder_node.moved",
  FOLDER_NODE_DELETED: "folder_node.deleted",
  FOLDER_NODE_RESTORED: "folder_node.restored",
  FOLDER_NODE_DUPLICATED: "folder_node.duplicated",

  // Sprint 7.4.4 - Dynamic Requirement Builder.
  REQUIREMENT_TEMPLATE_CREATED: "requirement_template.created",
  REQUIREMENT_TEMPLATE_UPDATED: "requirement_template.updated",
  REQUIREMENT_TEMPLATE_ASSIGNED: "requirement_template.assigned",
  REQUIREMENT_TEMPLATE_ARCHIVED: "requirement_template.archived",
  REQUIREMENT_TEMPLATE_RESTORED: "requirement_template.restored",
  REQUIREMENT_TEMPLATE_ROLLED_BACK: "requirement_template.rolled_back",
  REQUIREMENT_NODE_CREATED: "requirement_node.created",
  REQUIREMENT_NODE_UPDATED: "requirement_node.updated",
  REQUIREMENT_NODE_MOVED: "requirement_node.moved",
  REQUIREMENT_NODE_ARCHIVED: "requirement_node.archived",
  REQUIREMENT_NODE_RESTORED: "requirement_node.restored",
  REQUIREMENT_VALIDATION_CREATED: "requirement_validation.created",
  REQUIREMENT_VALIDATION_UPDATED: "requirement_validation.updated",
  REQUIREMENT_VALIDATION_ARCHIVED: "requirement_validation.archived",
  REQUIREMENT_VALIDATION_RESTORED: "requirement_validation.restored",
  ACCREDITATION_CYCLE_CREATED: "accreditation_cycle.created",
  ACCREDITATION_CYCLE_UPDATED: "accreditation_cycle.updated",
  ACCREDITATION_CYCLE_ARCHIVED: "accreditation_cycle.archived",
  ACCREDITATION_CYCLE_RESTORED: "accreditation_cycle.restored",

  // Sprint 7.4.5 — Dynamic Workflow Builder. Definition lifecycle actions are
  // written by the root workflow service; instance actions are written by the
  // workflow engine (bind / transition / complete / override) when a published
  // workflow controls a runtime entity.
  WORKFLOW_DEFINITION_CREATED: "workflow_definition.created",
  WORKFLOW_DEFINITION_UPDATED: "workflow_definition.updated",
  WORKFLOW_DEFINITION_VALIDATED: "workflow_definition.validated",
  WORKFLOW_DEFINITION_PUBLISHED: "workflow_definition.published",
  WORKFLOW_DEFINITION_ARCHIVED: "workflow_definition.archived",
  WORKFLOW_DEFINITION_RESTORED: "workflow_definition.restored",
  WORKFLOW_DEFINITION_ROLLED_BACK: "workflow_definition.rolled_back",
  WORKFLOW_STEP_CREATED: "workflow_step.created",
  WORKFLOW_STEP_UPDATED: "workflow_step.updated",
  WORKFLOW_STEP_ARCHIVED: "workflow_step.archived",
  WORKFLOW_STEP_RESTORED: "workflow_step.restored",
  WORKFLOW_TRANSITION_CREATED: "workflow_transition.created",
  WORKFLOW_TRANSITION_UPDATED: "workflow_transition.updated",
  WORKFLOW_TRANSITION_ARCHIVED: "workflow_transition.archived",
  WORKFLOW_TRANSITION_RESTORED: "workflow_transition.restored",
  WORKFLOW_ASSIGNMENT_CREATED: "workflow_assignment.created",
  WORKFLOW_ASSIGNMENT_REMOVED: "workflow_assignment.removed",
  WORKFLOW_INSTANCE_STARTED: "workflow_instance.started",
  WORKFLOW_INSTANCE_TRANSITIONED: "workflow_instance.transitioned",
  WORKFLOW_INSTANCE_COMPLETED: "workflow_instance.completed",
  WORKFLOW_INSTANCE_OVERRIDDEN: "workflow_instance.overridden",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
