import type { ReactNode } from "react"
import type { UserRole, RolePermissions, User } from "@/types/domain"

// =============================================================================
// URS-DMS — Permission helpers (Sprint 8.4: server-authoritative refactor)
//
// The ROLE_PERMISSIONS matrix below is a LEGACY mapping retained for backward
// compatibility. New code should prefer `hasServerPermission(user, code)` which
// reads the granular permission array from the server (user.permissions).
// The server is always the authoritative gate — client permission checks are
// UX only.
// =============================================================================

/**
 * Checks whether the current user holds a specific server permission code.
 * This is the PREFERRED method for new code. It reads from user.permissions
 * which is populated by GET /auth/me at login time.
 *
 * Examples:
 *   hasServerPermission(user, "users.create")
 *   hasServerPermission(user, "root.access")
 *   hasServerPermission(user, "role.read")
 */
export function hasServerPermission(user: User | null | undefined, code: string): boolean {
  if (!user) return false
  if (!user.permissions) return false
  return user.permissions.includes(code)
}

/**
 * Checks whether the current user holds ANY of the specified server permission codes.
 */
export function hasAnyServerPermission(user: User | null | undefined, codes: string[]): boolean {
  if (!user || !user.permissions) return false
  return codes.some((c) => user.permissions!.includes(c))
}

/**
 * Checks whether the current user holds ALL of the specified server permission codes.
 */
export function hasAllServerPermissions(user: User | null | undefined, codes: string[]): boolean {
  if (!user || !user.permissions) return false
  return codes.every((c) => user.permissions!.includes(c))
}

/**
 * Returns the full set of server permission codes held by the user, or an
 * empty array if the user is not loaded. Use for batch checks.
 */
export function getUserPermissions(user: User | null | undefined): string[] {
  return user?.permissions ?? []
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  qa_office: "QA Office",
  department_head: "Department Head",
  faculty: "Faculty",
  staff: "Staff",
  student: "Student",
  root: "System Root",
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: "Full access to all system features",
  qa_office: "Manages accreditation review and quality assurance",
  department_head: "Reviews and approves departmental submissions",
  faculty: "Uploads and manages own documents",
  staff: "Supports document handling operations",
  student: "Limited browsing and request access",
  root: "Platform-level system administrator (Root Console)",
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  root: {
    canUpload: true,
    canApprove: true,
    canReject: true,
    canDelete: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canManageAACCUP: true,
    canExport: true,
    canArchive: true,
    canAssignTasks: true,
    canRestore: true,
    canManageSettings: true,
    canViewReports: true,
  },
  super_admin: {
    canUpload: true,
    canApprove: true,
    canReject: true,
    canDelete: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canManageAACCUP: true,
    canExport: true,
    canArchive: true,
    canAssignTasks: true,
    canRestore: true,
    canManageSettings: true,
    canViewReports: true,
  },
  qa_office: {
    canUpload: true,
    canApprove: true,
    canReject: true,
    canDelete: false,
    canManageUsers: false,
    canViewAuditLogs: true,
    canManageAACCUP: true,
    canExport: true,
    canArchive: true,
    canAssignTasks: true,
    canRestore: true,
    canManageSettings: false,
    canViewReports: true,
  },
  department_head: {
    canUpload: true,
    canApprove: true,
    canReject: true,
    canDelete: false,
    canManageUsers: false,
    canViewAuditLogs: true,
    canManageAACCUP: false,
    canExport: true,
    canArchive: false,
    canAssignTasks: true,
    canRestore: true,
    canManageSettings: false,
    canViewReports: true,
  },
  faculty: {
    canUpload: true,
    canApprove: false,
    canReject: false,
    canDelete: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageAACCUP: false,
    canExport: false,
    canArchive: false,
    canAssignTasks: false,
    canRestore: false,
    canManageSettings: false,
    canViewReports: false,
  },
  staff: {
    canUpload: true,
    canApprove: false,
    canReject: false,
    canDelete: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageAACCUP: false,
    canExport: true,
    canArchive: false,
    canAssignTasks: false,
    canRestore: false,
    canManageSettings: false,
    canViewReports: false,
  },
  student: {
    canUpload: false,
    canApprove: false,
    canReject: false,
    canDelete: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageAACCUP: false,
    canExport: false,
    canArchive: false,
    canAssignTasks: false,
    canRestore: false,
    canManageSettings: false,
    canViewReports: false,
  },
}

export function rolePermissionsOf(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role]
}

export function hasPermission(role: UserRole | undefined, permission: keyof RolePermissions): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role][permission]
}

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "super_admin" || role === "qa_office" || role === "department_head" || role === "root"
}

export function isRootRole(role: UserRole | undefined): boolean {
  return role === "root"
}

/**
 * Server-authoritative ROOT check. Prefer this over isRootRole() in new code
 * because it validates against the actual permission set, not a hardcoded role.
 */
export function isRootUser(user: User | null | undefined): boolean {
  return hasServerPermission(user, "root.access")
}

/**
 * Server-authoritative admin-gate check. Returns true when the user holds
 * permissions that indicate admin-portal access (e.g. user.read from the admin
 * surface, or root.access).
 */
export function isAdminUser(user: User | null | undefined): boolean {
  return hasAnyServerPermission(user, [
    "root.access",
    "user.read",
    "role.read",
    "permission.read",
  ])
}

export function isReviewerRole(role: UserRole | undefined): boolean {
  return role === "super_admin" || role === "qa_office" || role === "department_head"
}

export function isPortalRole(role: UserRole | undefined): boolean {
  return role !== "super_admin"
}

export interface RoleGuardProps {
  role: UserRole | undefined
  permission?: keyof RolePermissions
  fallback?: ReactNode
  children: ReactNode
}

export function RoleGuard({ role, permission, fallback = null, children }: RoleGuardProps) {
  if (!role) return <>{fallback}</>
  if (permission && !hasPermission(role, permission)) return <>{fallback}</>
  return <>{children}</>
}
