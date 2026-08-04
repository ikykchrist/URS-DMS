import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import type { UserRole, RolePermissions } from "@/types/domain"
import { hasPermission } from "@/lib/permissions"

interface ProtectedRouteProps {
  children: ReactNode
  requires?: UserRole | UserRole[]
  permission?: keyof RolePermissions
  redirectTo?: string
}

export function ProtectedRoute({ children, requires, permission, redirectTo: _redirectTo = "/" }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return null

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (requires) {
    const roles = Array.isArray(requires) ? requires : [requires]
    if (!roles.includes(user.role) && user.role !== "super_admin") {
      return <Navigate to="/user/dashboard" replace />
    }
  }

  if (permission && !hasPermission(user.role, permission)) {
    return <Navigate to={user.role === "super_admin" ? "/dashboard" : "/user/dashboard"} replace />
  }

  return <>{children}</>
}