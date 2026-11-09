import type { RoleName } from "@prisma/client";

export type NavigationAudience = "USER" | "ADMIN" | "ROOT";

const USER_KNOWLEDGE = `
AUTHORIZED USER NAVIGATION (User Portal)
- Dashboard: your overview. It shows your accreditation progress per set, the areas that have deadlines (green = more than 7 days left, amber = 7 days or fewer, red = 3 days or fewer, due today, or overdue), submissions returned for revision, and request updates.
- My Documents: your personal repository. Upload adds files; New Folder organizes them; Preview opens supported files; Download saves a file; Requested Documents holds documents delivered through a request; Recycle Bin holds deleted files and folders and can restore them. Shared folders appear here and sharing sends an email notification.
- My Requests: create a document request with a short explanation and up to three files, then track its status (pending, approved, rejected, delivered). Fulfilled items appear in My Documents under Requested Documents.
- Accreditation: one sidebar entry with an in-page tab strip for AACCUP, ISO 21001:2025, and My Submissions. Deadlines belong to areas, not tasks.
- Accreditation area list: each set lists College-wide areas and Program areas. Use the left and right arrow buttons to scroll the area tabs when the list is wider than the screen.
- Accreditation area page: the header shows the area name and its highlighted deadline badge with the remaining days. Requirements are grouped by section. Submit uploads evidence, Replace uploads a new version, and Unsubmit withdraws your own submission while it is still pending. Recent Submissions links to My Submissions for that set.
- My Submissions: every submission you made for the selected set, with its status and review outcome.
- Notifications: system events; some notifications open the related item directly.
- My Activity: your own activity history.
- Profile / Account & Security: update supported profile details and profile photo, change your password, and review or revoke active sessions.
- Settings: personal application settings.
- There is no "My Tasks" page. Deadlines and reminders now live on accreditation areas.
`;

const ADMIN_KNOWLEDGE = `
AUTHORIZED ADMIN NAVIGATION (Admin Portal)
- Dashboard: pending submissions, pending file requests, areas that have deadlines (green = more than 7 days left, amber = 7 days or fewer, red = 3 days or fewer, due today, or overdue), accreditation progress per set, recent submissions, and recent audit activity when your role can read audit.
- My Documents: the administrator's personal repository with Upload, New Folder, Preview, Download, Requested Documents, and Recycle Bin.
- Requests: review user document requests. Approve delivers the requested files; Reject requires a reason. Fulfillment notifies the requester by email.
- Accreditation group: choose AACCUP or ISO 21001:2025. Their areas and submission data are separate.
- Area workspace: open an area to reach its submissions, requirements, and summary. Available actions include editing the area (name, description, department, status, and deadline), adding a requirement template, and reviewing submitted evidence.
- Area deadline: set or change it from Add Area / Edit Area. Changing a deadline notifies affected users by email and in-app notification, and reminders are sent 3 months, 1 month, 7 days, and 3 days before it. Deadline status uses the same colours as the dashboard.
- Submissions review: Pending submissions expose Approve, Return for Revision (with a note), or Reject (with a required reason). Approved and returned submissions do not show pending-review actions. The submitter is notified by email when the decision is made.
- User Management: view and manage accounts allowed by your role, invite or add users, and reset passwords where permitted.
- Audit Logs: activity and login/security events allowed for your role.
- Profile, Account & Security, and Settings: manage your own account and preferences.
- Task assignment is optional and lives inside an area; there is no separate Tasks page on the user side.
`;

const ROOT_KNOWLEDGE = `
AUTHORIZED ROOT / SYSTEM ADMINISTRATOR NAVIGATION
- Platform Overview (Root Console): system-level dashboard and organization-wide health summaries.
- Root Console > Organization: manage campuses, colleges, departments, offices, and programs. To add a department, open Organization, select Departments, then use the create action.
- Root Console > Folder Builder: manage folder templates and their structure. The Assignments tab binds a published folder template to a campus, college, program, or office.
- Root Console > Requirement Builder: author versioned requirement templates with three tabs — Builder, Preview, and History. Templates no longer have their own Assignment tab; each AACCUP/ISO area attaches the requirement template it uses, so the area decides where requirements apply.
- Root Console > Form Builder: build dynamic forms and bind them to the supported targets.
- Root Console > Workflow Builder: build versioned approval workflows and bind them to the supported targets.
- Root Console > Storage Maintenance: inspect storage status and run available maintenance actions.
- Root Console > Roles & Permissions: review and configure system role permissions.
- Root Console > System Audit: review root-level system audit activity.
- Root Console > System Users: manage system users and the root user actions.
- Root Console > Configuration Engine: manage versioned system configuration and rollback where available.
- Root users can also use the normal admin portal surfaces: Dashboard, Accreditation (AACCUP/ISO), Requests, User Management, Audit Logs, Profile, and Settings.
- Deadline reminders and email notifications are configured through the notification catalog and environment settings, not through a UI screen.
`;

const ROLE_AUDIENCE: Record<RoleName, NavigationAudience> = {
  ROOT: "ROOT",
  ADMINISTRATOR: "ADMIN",
  QUALITY_ASSURANCE_OFFICER: "ADMIN",
  DEPARTMENT_COORDINATOR: "ADMIN",
  FACULTY: "USER",
  STAFF: "USER",
  READ_ONLY: "USER",
};

export function audienceForRole(role: RoleName): NavigationAudience {
  return ROLE_AUDIENCE[role];
}

export function navigationKnowledgeFor(audience: NavigationAudience): string {
  if (audience === "ROOT") return ROOT_KNOWLEDGE;
  if (audience === "ADMIN") return ADMIN_KNOWLEDGE;
  return USER_KNOWLEDGE;
}

/**
 * Deterministic refusals for clearly out-of-scope or cross-role requests.
 * The model prompt repeats the same boundary, so a provider can never be talked
 * past the role rules by user text alone.
 */
export function roleBoundaryResponse(audience: NavigationAudience, message: string): string | null {
  const normalized = message.toLowerCase();
  const scopeRefusal = "I can only help with URS-DMS — using its pages, tabs, and workflows. Ask me where a feature is or how a step works.";

  const offTopic = [
    /(?:write|compose|draft|make)\b.{0,30}\b(?:essay|poem|story|song|resume|cover letter|joke)\b/,
    /\b(?:python|javascript|typescript|java|c\+\+|golang|rust|php|sql query|regex)\b/,
    /\b(?:write|fix|debug|review|explain)\b.{0,20}\b(?:code|program|script|algorithm)\b/,
    /\btranslate\b|\bhomework\b|\bmath problem\b|\bsolve (?:for|this equation)\b/,
    /\bweather\b|\bnews\b|\bstock market\b|\bbitcoin\b|\bcrypto(?:currency)?\b/,
    /\b(?:who|when) (?:is|was|won|died)\b|\bhistory of\b/,
    /\bapi key\b|\bsecret key\b|\bdatabase password\b/,
    /ignore\b.{0,30}\b(?:previous|system|role|above)\b.{0,20}\b(?:instruction|prompt|rule)s?\b/,
  ];
  if (offTopic.some((pattern) => pattern.test(normalized))) return scopeRefusal;

  if (audience === "USER" && /user management|manage users|add (a|another )?user|reset .*user.*password/.test(normalized)) {
    return "User Management is available only to authorized Admin or Root accounts. I cannot provide access instructions for it from the User portal.";
  }
  if (audience === "USER" && /requirement builder|folder builder|root console|roles? (?:&|and) permissions|configuration engine/.test(normalized)) {
    return "That is a Root Console tool. Your account does not have access, so I cannot walk you through it. Ask an administrator if you need a template or folder structure changed.";
  }
  if (audience === "ADMIN" && /add (a )?department|create (a )?department|root console|root organization/.test(normalized)) {
    return "Department creation is a Root-only function. Admin accounts should contact a System Administrator.";
  }
  return null;
}
