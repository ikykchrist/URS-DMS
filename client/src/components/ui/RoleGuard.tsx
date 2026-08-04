import type { ReactNode } from "react"
import { hasPermission } from "@/lib/permissions"
import type { UserRole, RolePermissions } from "@/types/domain"

interface RoleGuardProps {
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