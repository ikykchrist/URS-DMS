export type UserRole = "super_admin" | "analyst" | "faculty" | "staff"

export interface RolePermissions {
  canUpload: boolean
  canApprove: boolean
  canReject: boolean
  canDelete: boolean
  canManageUsers: boolean
  canViewAuditLogs: boolean
  canManageAACCUP: boolean
  canExport: boolean
  canArchive: boolean
  canAssignTasks: boolean
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
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
  },
  analyst: {
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
  },
}

export function usePermissions(role: UserRole = "super_admin"): RolePermissions {
  return rolePermissions[role]
}

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return rolePermissions[role][permission]
}

export function RoleGuard({ role, permission, children }: { role: UserRole; permission: keyof RolePermissions; children: React.ReactNode }) {
  if (!hasPermission(role, permission)) return null
  return <>{children}</>
}
