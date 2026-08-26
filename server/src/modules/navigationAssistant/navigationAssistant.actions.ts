import type { NavigationAudience } from "@/modules/navigationAssistant/navigationAssistant.knowledge";

export type NavigationActionTarget =
  | "DASHBOARD"
  | "MY_DOCUMENTS"
  | "MY_REQUESTS"
  | "REQUESTS"
  | "AACCUP"
  | "ISO"
  | "NOTIFICATIONS"
  | "MY_ACTIVITY"
  | "PROFILE"
  | "SETTINGS"
  | "USER_MANAGEMENT"
  | "AUDIT_LOGS"
  | "ORGANIZATION"
  | "ROOT_CONSOLE"
  | "ROLES_PERMISSIONS";

export interface NavigationAction {
  label: string;
  target: NavigationActionTarget;
}

const ALLOWED_ACTIONS: Record<NavigationAudience, ReadonlySet<NavigationActionTarget>> = {
  USER: new Set(["DASHBOARD", "MY_DOCUMENTS", "MY_REQUESTS", "AACCUP", "ISO", "NOTIFICATIONS", "MY_ACTIVITY", "PROFILE", "SETTINGS"]),
  ADMIN: new Set(["DASHBOARD", "MY_DOCUMENTS", "REQUESTS", "AACCUP", "ISO", "USER_MANAGEMENT", "AUDIT_LOGS", "PROFILE", "SETTINGS"]),
  ROOT: new Set(["DASHBOARD", "MY_DOCUMENTS", "AACCUP", "ISO", "USER_MANAGEMENT", "AUDIT_LOGS", "PROFILE", "SETTINGS", "ORGANIZATION", "ROOT_CONSOLE", "ROLES_PERMISSIONS"]),
};

const ACTION_LABELS: Record<NavigationActionTarget, string> = {
  DASHBOARD: "Open Dashboard",
  MY_DOCUMENTS: "Open My Documents",
  MY_REQUESTS: "Open My Requests",
  REQUESTS: "Open Requests",
  AACCUP: "Open AACCUP",
  ISO: "Open ISO",
  NOTIFICATIONS: "Open Notifications",
  MY_ACTIVITY: "Open My Activity",
  PROFILE: "Open Profile",
  SETTINGS: "Open Settings",
  USER_MANAGEMENT: "Open User Management",
  AUDIT_LOGS: "Open Audit Logs",
  ORGANIZATION: "Open Organization",
  ROOT_CONSOLE: "Open Root Console",
  ROLES_PERMISSIONS: "Open Roles & Permissions",
};

export function allowedNavigationActions(audience: NavigationAudience): ReadonlySet<NavigationActionTarget> {
  return ALLOWED_ACTIONS[audience];
}

function action(target: NavigationActionTarget): NavigationAction {
  return { label: ACTION_LABELS[target], target };
}

/** Infer safe targets from the question; no route or URL can come from AI text. */
export function navigationActionsFor(audience: NavigationAudience, message: string): NavigationAction[] {
  const text = message.toLowerCase();
  const targets: NavigationActionTarget[] = [];
  const add = (target: NavigationActionTarget) => {
    if (ALLOWED_ACTIONS[audience].has(target) && !targets.includes(target) && targets.length < 3) targets.push(target);
  };

  if (/iso/.test(text)) add("ISO");
  else if (/aaccup|accreditation|submission|requirement|area/.test(text)) add("AACCUP");
  if (/upload|document|file|pdf|folder|recycle|preview|download/.test(text)) add("MY_DOCUMENTS");
  if (audience === "USER" && /request/.test(text)) add("MY_REQUESTS");
  if (audience !== "USER" && /request/.test(text)) add("REQUESTS");
  if (/notification/.test(text)) add("NOTIFICATIONS");
  if (/activity/.test(text)) add("MY_ACTIVITY");
  if (/profile|photo/.test(text)) add("PROFILE");
  if (/setting/.test(text)) add("SETTINGS");
  if (/manage user|user management|add user|invite user/.test(text)) add("USER_MANAGEMENT");
  if (/audit|login activity|security log/.test(text)) add("AUDIT_LOGS");
  if (/department|organization|college|office|program/.test(text)) add("ORGANIZATION");
  if (/root console|platform overview/.test(text)) add("ROOT_CONSOLE");
  if (/permission|role/.test(text)) add("ROLES_PERMISSIONS");

  return targets.map(action);
}
