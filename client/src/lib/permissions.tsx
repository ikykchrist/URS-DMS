import type { ReactNode } from "react"
import type { UserRole, RolePermissions } from "@/types/domain"

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
