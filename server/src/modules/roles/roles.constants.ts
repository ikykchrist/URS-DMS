import { PERMISSIONS, type PermissionCode } from "@/modules/permissions/permissions.constants";

// =============================================================================
// URS-DMS — default role → permission matrix
// Single source of truth for the seed script. Adding a role? Add a row here.
//
// Sprint 7.4.1 — ROOT role. ROOT is the highest-privilege system role:
//   * it binds EVERY permission code in the catalog (all of PERMISSIONS),
//   * the root.* codes below are granted to NO other role (ADMINISTRATOR
//     excludes them — "ROOT_ONLY_CODES"), so only Root can reach /root/*,
//   * its permission bindings are never removed by the seed (seedRoleBindings
//     only upserts — it never deletes), and the admin surface refuses to
//     touch them (admin/roles guard).
// =============================================================================

export interface RolePermissionMatrix {
  name:
    | "ROOT"
    | "ADMINISTRATOR"
    | "QUALITY_ASSURANCE_OFFICER"
    | "DEPARTMENT_COORDINATOR"
    | "FACULTY"
    | "STAFF"
    | "READ_ONLY";
  description: string;
  permissions: PermissionCode[];
}

// Codes granted exclusively to the ROOT role. ADMINISTRATOR auto-inherits
// every OTHER code via PERMISSIONS.map (AI_CONTEXT §5) — this set is the one
// deliberate carve-out, mandated by the Sprint 7.4.1 spec ("Only Root may
// access these endpoints").
const ROOT_ONLY_CODES = new Set<string>([
  "root.access",
  "root.configuration.read",
  "root.configuration.update",
  "root.configuration.rollback",
  // Sprint 7.4.2 — Organization Management Engine. Colleges/departments may
  // still be managed by ADMINISTRATOR through the Sprint 7.1 admin surface
  // (college.* / department.* codes); the ROOT-only organization.* codes gate
  // the versioned /root/organization surface.
  "organization.read",
  "organization.create",
  "organization.update",
  "organization.archive",
  "organization.rollback",
  // Sprint 7.4.3 — Dynamic Folder Builder. Only Root may manage the folder
  // structure engine; every other role (including ADMINISTRATOR) can never
  // acquire these codes, so the /root/folder-builder surface is Root-only by
  // construction. Users still read the RESULT of assignments (the resolved
  // repository structure) through the Sprint 3 `folders.read` surface.
  "folder.read",
  "folder.create",
  "folder.update",
  "folder.archive",
  "folder.restore",
  "folder.assign",
  "folder.rollback",
  // Sprint 7.4.4 - Dynamic Requirement Builder.
  "requirement.read",
  "requirement.create",
  "requirement.update",
  "requirement.archive",
  "requirement.restore",
  "requirement.assign",
  "requirement.rollback",
  // Sprint 7.4.5 - Dynamic Workflow Builder. Only Root may author workflows.
  // The runtime codes (workflow.instance.read, workflow.action.perform,
  // workflow.review, workflow.override) are deliberately NOT in this set:
  // workflow.override stays Root-only, while instance/action/review codes are
  // bound to reviewer roles below so live instances can be advanced outside
  // the Root console.
  "workflow.read",
  "workflow.create",
  "workflow.update",
  "workflow.archive",
  "workflow.restore",
  "workflow.version",
  "workflow.validate",
  "workflow.publish",
  "workflow.rollback",
  "workflow.assign",
  "workflow.override",
  // Sprint 7.4.6 - Dynamic Form Builder.
  "form.read",
  "form.create",
  "form.update",
  "form.archive",
  "form.restore",
  "form.publish",
  "form.assign",
  "form.rollback",
  // Sprint 7.4.8 - Platform Setup Wizard.
  "setup.read",
  "setup.manage",
  // Personal Document Repository — Root-granted emergency repository access.
  "repository.emergency_access",
]);

export const DEFAULT_ROLE_MATRIX: RolePermissionMatrix[] = [
  {
    name: "ROOT",
    description: "System administrator with full platform control",
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    name: "ADMINISTRATOR",
    description: "Full system access",
    permissions: PERMISSIONS.map((p) => p.code).filter((c) => !ROOT_ONLY_CODES.has(c)),
  },
  {
    name: "QUALITY_ASSURANCE_OFFICER",
    description: "AACCUP and accreditation management",
    permissions: [
      "users.read",
      "users.self.update",
      "documents.create",
      "documents.read",
      "documents.update",
      "documents.delete",
      "folders.create",
      "folders.read",
      "folders.update",
      "folders.delete",
      "departments.read",
      "departments.update",
      "request.manage",
      "audit.read",
      "dashboard.read",
      "repository.manage",
      "aaccup.manage",
      "aaccup.read",
      "aaccup.create",
      "aaccup.update",
      "aaccup.archive",
      "aaccup.restore",
      "aaccup.requirement.read",
      "aaccup.requirement.create",
      "aaccup.requirement.update",
      "aaccup.requirement.archive",
      "aaccup.requirement.restore",
      "aaccup.submission.read",
      "aaccup.submission.create",
      "aaccup.submission.review",
      "aaccup.submission.update",
      "aaccup.submission.archive",
      "aaccup.analytics.read",
      "analytics.read",
      "reports.read",
      // Sprint 7.4.5 — workflow runtime: QAO advances live AACCUP-submission
      // workflow instances (step-level review + transitions).
      "workflow.instance.read",
      "workflow.action.perform",
      "workflow.review",
      // Sprint 7.1 — read-only access to the admin organisational surface
      // (departments + colleges) so the QAO dashboard's existing scope keeps
      // working. Mutations stay ADMINISTRATOR-only.
      "department.read",
      "college.read",
      "admin.settings.read",
      // Sprint 7.2 — every authenticated user reads their own inbox.
      "notification.read",
    ],
  },
  {
    name: "DEPARTMENT_COORDINATOR",
    description: "Department-level submission coordinator",
    permissions: [
      "users.read",
      "users.self.update",
      "documents.create",
      "documents.read",
      "documents.update",
      "documents.delete",
      "folders.create",
      "folders.read",
      "folders.update",
      "folders.delete",
      "request.create",
      "request.manage",
      "aaccup.read",
      "aaccup.requirement.read",
      "aaccup.submission.read",
      "aaccup.submission.create",
      "aaccup.submission.update",
      "aaccup.analytics.read",
      "dashboard.read",
      "analytics.read",
      "reports.read",
      "notification.read",
      // Sprint 7.4.5 — workflow runtime: department coordinators advance live
      // document-request workflow instances (step-level review + transitions).
      "workflow.instance.read",
      "workflow.action.perform",
      "workflow.review",
    ],
  },
  {
    name: "FACULTY",
    description: "Faculty member with personal submissions",
    permissions: [
      "users.read",
      "users.self.update",
      "documents.create",
      "documents.read",
      "documents.update",
      "documents.delete",
      "folders.create",
      "folders.read",
      "folders.update",
      "folders.delete",
      "request.create",
      "aaccup.read",
      "aaccup.requirement.read",
      "aaccup.submission.read",
      "aaccup.submission.create",
      "notification.read",
    ],
  },
  {
    name: "STAFF",
    description: "University staff",
    permissions: [
      "users.read",
      "users.self.update",
      "documents.create",
      "documents.read",
      "documents.update",
      "documents.delete",
      "folders.create",
      "folders.read",
      "folders.update",
      "folders.delete",
      "request.create",
      "aaccup.read",
      "aaccup.requirement.read",
      "aaccup.submission.read",
      "aaccup.submission.create",
      "notification.read",
    ],
  },
  {
    name: "READ_ONLY",
    description: "Read-only access to documents",
    permissions: [
      "users.read",
      "users.self.update",
      "documents.read",
      "folders.read",
      "departments.read",
      "notification.read",
    ],
  },
];
