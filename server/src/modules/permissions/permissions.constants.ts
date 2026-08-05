// =============================================================================
// URS-DMS — permission catalog (single source of truth)
// Adding a new permission = add one entry here + (optionally) bind it to a
// role in prisma/seed.ts. Nothing else in the codebase needs to change.
// =============================================================================

export const PERMISSIONS = [
  { code: "users.create", module: "users", description: "Create users" },
  { code: "users.read", module: "users", description: "View users" },
  { code: "users.update", module: "users", description: "Update users" },
  { code: "users.delete", module: "users", description: "Soft-delete users" },
  {
    code: "users.self.update",
    module: "users",
    description: "Update own profile / change own password",
  },

  { code: "documents.create", module: "documents", description: "Upload documents" },
  { code: "documents.read", module: "documents", description: "View documents" },
  { code: "documents.update", module: "documents", description: "Modify documents" },
  { code: "documents.delete", module: "documents", description: "Delete documents" },

  { code: "folders.create", module: "folders", description: "Create folders" },
  { code: "folders.read", module: "folders", description: "View folders" },
  { code: "folders.update", module: "folders", description: "Rename / move folders" },
  { code: "folders.delete", module: "folders", description: "Delete folders" },

  { code: "departments.create", module: "departments", description: "Create departments" },
  { code: "departments.read", module: "departments", description: "View departments" },
  { code: "departments.update", module: "departments", description: "Update departments" },
  { code: "departments.delete", module: "departments", description: "Delete departments" },

  // Sprint 7.1 — Administration Backend (granular RBAC surfaced from the
  // existing `departments.*` group; ADMINISTRATOR-only per the sprint spec).
  { code: "department.read", module: "admin", description: "View departments (admin surface)" },
  { code: "department.create", module: "admin", description: "Create departments (admin surface)" },
  { code: "department.update", module: "admin", description: "Update departments (admin surface)" },
  {
    code: "department.archive",
    module: "admin",
    description: "Archive / restore departments (admin surface)",
  },

  { code: "college.read", module: "admin", description: "View colleges (admin surface)" },
  { code: "college.create", module: "admin", description: "Create colleges (admin surface)" },
  { code: "college.update", module: "admin", description: "Update colleges (admin surface)" },
  {
    code: "college.archive",
    module: "admin",
    description: "Archive / restore colleges (admin surface)",
  },

  { code: "admin.settings.read", module: "admin", description: "View system settings" },
  { code: "admin.settings.update", module: "admin", description: "Update system settings" },

  // Sprint 7.2 — User & Role Administration. Distinct from the legacy
  // `users.*` codes (Sprint 2): the admin surface gates the new
  // `/api/v1/admin/users` + `/api/v1/admin/roles` + `/api/v1/admin/permissions`
  // endpoints. ADMINISTRATOR auto-inherits via PERMISSIONS.map; no other role
  // is granted these by default.
  { code: "user.read", module: "admin", description: "View users (admin surface)" },
  { code: "user.create", module: "admin", description: "Create users (admin surface)" },
  { code: "user.update", module: "admin", description: "Update users (admin surface)" },
  { code: "user.archive", module: "admin", description: "Archive / restore users (admin surface)" },
  { code: "user.restore", module: "admin", description: "Restore archived users (admin surface)" },
  { code: "user.status.update", module: "admin", description: "Activate / deactivate users" },
  { code: "user.password.reset", module: "admin", description: "Reset a user's password" },

  { code: "role.read", module: "admin", description: "View roles (admin surface)" },
  {
    code: "role.create",
    module: "admin",
    description: "Create roles (admin surface — system-roleguarded)",
  },
  { code: "role.update", module: "admin", description: "Update roles (admin surface)" },
  { code: "role.archive", module: "admin", description: "Archive roles (admin surface)" },
  { code: "role.restore", module: "admin", description: "Restore archived roles (admin surface)" },
  {
    code: "role.permission.manage",
    module: "admin",
    description: "Assign / remove permissions on a role",
  },

  { code: "permission.read", module: "admin", description: "View the permission catalog" },

  { code: "request.create", module: "request", description: "Create document access requests" },
  { code: "request.manage", module: "request", description: "Approve / reject document requests" },

  { code: "audit.read", module: "audit", description: "View audit log" },
  { code: "audit.export", module: "audit", description: "Export audit log (administrator-only)" },

  { code: "reports.read", module: "reports", description: "View centralized reports" },
  {
    code: "reports.export",
    module: "reports",
    description: "Export centralized reports (administrator-only)",
  },

  { code: "dashboard.read", module: "dashboard", description: "View dashboard statistics" },

  { code: "analytics.read", module: "analytics", description: "View analytics & trend reports" },

  { code: "settings.manage", module: "settings", description: "Manage system settings" },
  { code: "repository.manage", module: "repository", description: "Manage document repository" },
  { code: "aaccup.manage", module: "aaccup", description: "Manage AACCUP accreditation" },
  { code: "aaccup.read", module: "aaccup", description: "View AACCUP accreditation areas" },
  { code: "aaccup.create", module: "aaccup", description: "Create AACCUP accreditation areas" },
  { code: "aaccup.update", module: "aaccup", description: "Edit AACCUP accreditation areas" },
  { code: "aaccup.archive", module: "aaccup", description: "Archive AACCUP accreditation areas" },
  {
    code: "aaccup.restore",
    module: "aaccup",
    description: "Restore archived AACCUP accreditation areas",
  },
  {
    code: "aaccup.requirement.read",
    module: "aaccup",
    description: "View AACCUP accreditation requirements",
  },
  {
    code: "aaccup.requirement.create",
    module: "aaccup",
    description: "Create AACCUP accreditation requirements",
  },
  {
    code: "aaccup.requirement.update",
    module: "aaccup",
    description: "Edit AACCUP accreditation requirements",
  },
  {
    code: "aaccup.requirement.archive",
    module: "aaccup",
    description: "Archive AACCUP accreditation requirements",
  },
  {
    code: "aaccup.requirement.restore",
    module: "aaccup",
    description: "Restore archived AACCUP accreditation requirements",
  },
  {
    code: "aaccup.submission.read",
    module: "aaccup",
    description: "View AACCUP document submissions",
  },
  {
    code: "aaccup.submission.create",
    module: "aaccup",
    description: "Submit documents to AACCUP requirements",
  },
  {
    code: "aaccup.submission.review",
    module: "aaccup",
    description: "Review (approve / reject / needs-revision) AACCUP submissions",
  },
  { code: "aaccup.submission.update", module: "aaccup", description: "Edit AACCUP submissions" },
  {
    code: "aaccup.submission.archive",
    module: "aaccup",
    description: "Archive AACCUP submissions",
  },
  {
    code: "aaccup.analytics.read",
    module: "aaccup",
    description: "View AACCUP compliance analytics & progress",
  },
  { code: "storage.manage", module: "storage", description: "Manage object storage" },

  // Sprint 7.2 — Notifications Backend. `notification.read` is the per-user
  // inbox read path (every authenticated user has it via the JWT context —
  // ADMINISTRATOR auto-inherits; everyone else is granted explicitly in
  // DEFAULT_ROLE_MATRIX). `notification.manage` is the admin surface for
  // cross-user inbox inspection (debug / support); ADMINISTRATOR-only.
  { code: "notification.read", module: "notification", description: "View own notification inbox" },
  {
    code: "notification.manage",
    module: "notification",
    description: "Cross-user notification inbox (admin surface)",
  },

  // Sprint 7.4.1 — System Administrator (ROOT) surface. These codes are
  // ROOT-ONLY: the ROOT role in DEFAULT_ROLE_MATRIX binds every catalog code
  // (including these), while ADMINISTRATOR deliberately excludes them (see
  // roles.constants.ts — `ROOT_ONLY_CODES`). Combined with the privilege-
  // escalation guard (`_shared/admin.guard.ts`), no other role can ever
  // acquire them, so the /root endpoints stay Root-only by construction.
  { code: "root.access", module: "root", description: "Access the Root Console surface" },
  { code: "root.configuration.read", module: "root", description: "Read the configuration engine" },
  {
    code: "root.configuration.update",
    module: "root",
    description: "Create / update / delete / restore configurations",
  },
  {
    code: "root.configuration.rollback",
    module: "root",
    description: "Roll back a configuration to a previous version",
  },

  // Sprint 7.4.2 — Organization Management Engine (ROOT-only master data).
  // Same treatment as root.*: these codes live in `ROOT_ONLY_CODES`
  // (roles.constants.ts), so ADMINISTRATOR and every other role can never
  // acquire them — the /root/organization surface stays Root-only by
  // construction (plus the hard requireRole("ROOT") gate on the router).
  // Colleges/departments share the Sprint 7.1 physical rows; offices and
  // programs are the new 7.4.2 tables.
  {
    code: "organization.read",
    module: "root",
    description: "Read organization master data (colleges, departments, offices, programs)",
  },
  { code: "organization.create", module: "root", description: "Create organization records" },
  { code: "organization.update", module: "root", description: "Update organization records" },
  {
    code: "organization.archive",
    module: "root",
    description: "Archive / restore organization records",
  },
  {
    code: "organization.rollback",
    module: "root",
    description: "Roll back an organization record to a previous version",
  },

  // Sprint 7.4.3 — Dynamic Folder Builder (ROOT-only folder structure engine).
  // Distinct from the Sprint 3 `folders.*` codes (plural — the user-facing
  // document repository surface): the `folder.*` codes (singular) gate the
  // /root/folder-builder management surface. They live in `ROOT_ONLY_CODES`
  // (roles.constants.ts) so no other role can ever acquire them — Root-only
  // by construction, on top of the hard requireRole("ROOT") router gate.
  {
    code: "folder.read",
    module: "root",
    description: "Read folder templates, trees, assignments and history",
  },
  { code: "folder.create", module: "root", description: "Create folder templates / nodes" },
  {
    code: "folder.update",
    module: "root",
    description: "Update folder templates / nodes (rename, move, reorder)",
  },
  { code: "folder.archive", module: "root", description: "Archive folder templates / nodes" },
  {
    code: "folder.restore",
    module: "root",
    description: "Restore archived folder templates / nodes",
  },
  {
    code: "folder.assign",
    module: "root",
    description:
      "Assign folder templates to scopes (university / college / department / program / office / AACCUP area)",
  },
  {
    code: "folder.rollback",
    module: "root",
    description: "Roll a folder template back to a previous version",
  },

  // Sprint 7.4.4 - Dynamic Requirement Builder. These singular requirement.*
  // codes gate only the ROOT authoring engine; the existing
  // aaccup.requirement.* permissions continue to gate runtime catalog reads.
  {
    code: "requirement.read",
    module: "root",
    description: "Read requirement templates, nodes, validations, assignments and history",
  },
  {
    code: "requirement.create",
    module: "root",
    description: "Create requirement templates, nodes, validations and accreditation cycles",
  },
  {
    code: "requirement.update",
    module: "root",
    description: "Update and reorder requirement templates, nodes, validations and cycles",
  },
  {
    code: "requirement.archive",
    module: "root",
    description: "Archive requirement templates, nodes, validations and cycles",
  },
  {
    code: "requirement.restore",
    module: "root",
    description: "Restore requirement templates, nodes, validations and cycles",
  },
  {
    code: "requirement.assign",
    module: "root",
    description: "Assign requirement templates to organization, AACCUP and cycle scopes",
  },
  {
    code: "requirement.rollback",
    module: "root",
    description: "Roll a requirement template back to a previous version",
  },

  // Sprint 7.4.5 - Dynamic Workflow Builder. The singular workflow.* codes
  // gate only the ROOT authoring engine (/root/workflows); the runtime
  // instance codes (workflow.instance.* / workflow.action.* / workflow.review
  // / workflow.override) live in the same catalog and are granted to
  // reviewer roles so they can advance live workflow instances.
  {
    code: "workflow.read",
    module: "root",
    description: "Read workflow definitions, steps, transitions, assignments, versions and history",
  },
  {
    code: "workflow.create",
    module: "root",
    description: "Create workflow definitions, steps and transitions",
  },
  {
    code: "workflow.update",
    module: "root",
    description: "Update workflow definitions, steps and transitions",
  },
  {
    code: "workflow.archive",
    module: "root",
    description: "Archive workflow definitions, steps and transitions",
  },
  {
    code: "workflow.restore",
    module: "root",
    description: "Restore archived workflow definitions, steps and transitions",
  },
  {
    code: "workflow.version",
    module: "root",
    description: "Manage workflow definition versions",
  },
  {
    code: "workflow.validate",
    module: "root",
    description: "Run workflow definition validation rules",
  },
  {
    code: "workflow.publish",
    module: "root",
    description: "Publish a validated workflow definition",
  },
  {
    code: "workflow.rollback",
    module: "root",
    description: "Roll a workflow definition back to a previous version",
  },
  {
    code: "workflow.assign",
    module: "root",
    description: "Assign workflow definitions to organization, AACCUP and cycle scopes",
  },
  {
    code: "workflow.instance.read",
    module: "workflow",
    description: "Read workflow instances, actions and current step",
  },
  {
    code: "workflow.action.perform",
    module: "workflow",
    description: "Perform a transition action on a running workflow instance",
  },
  {
    code: "workflow.review",
    module: "workflow",
    description: "Review workflow instances at step level",
  },
  {
    code: "workflow.override",
    module: "root",
    description: "Override or terminate a workflow instance",
  },

  // Sprint 7.4.6 — Dynamic Form Builder. The singular form.* codes gate only
  // the ROOT authoring engine (/root/forms). They live in ROOT_ONLY_CODES
  // (roles.constants.ts) so no other role can ever acquire them — Root-only
  // by construction, on top of the hard requireRole("ROOT") router gate.
  {
    code: "form.read",
    module: "root",
    description: "Read form templates, fields, assignments, versions and history",
  },
  {
    code: "form.create",
    module: "root",
    description: "Create form templates and fields",
  },
  {
    code: "form.update",
    module: "root",
    description: "Update form templates and fields",
  },
  {
    code: "form.archive",
    module: "root",
    description: "Archive / restore form templates and fields",
  },
  {
    code: "form.restore",
    module: "root",
    description: "Restore archived form templates",
  },
  {
    code: "form.publish",
    module: "root",
    description: "Publish a validated form template",
  },
  {
    code: "form.assign",
    module: "root",
    description: "Assign form templates to requirements, workflow steps, AACCUP areas, folder templates or future scopes",
  },
  {
    code: "form.rollback",
    module: "root",
    description: "Roll a form template back to a previous version",
  },

  // Sprint 7.4.8 — Platform Setup Wizard. setup.* codes gate the /root/setup
  // surface (wizard state, logo upload, summary). ROOT-only by construction
  // (ROOT_ONLY_CODES) on top of the hard requireRole("ROOT") router gate; all
  // business data the wizard creates flows through the existing engines.
  {
    code: "setup.read",
    module: "root",
    description: "Read the platform setup wizard state and summary",
  },
  {
    code: "setup.manage",
    module: "root",
    description: "Run the platform setup wizard (start, save progress, complete, reopen, upload logo)",
  },

  // Personal Document Repository & File Lifecycle. Emergency repository
  // access is ROOT-granted, time-limited, reason-required and audited at
  // high severity. ROOT-only by construction.
  {
    code: "repository.emergency_access",
    module: "repository",
    description: "Grant time-limited emergency access to another account's repository",
  },
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.code) as readonly PermissionCode[];
