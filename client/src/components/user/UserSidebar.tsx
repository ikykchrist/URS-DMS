import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  GraduationCap,
  Bell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocation } from "react-router-dom"
import { confirmLeaveIfUploading } from "@/lib/uploadBus"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/layout/Logo"
import { useAuth } from "@/context/AuthContext"

interface SidebarItem {
  id: string
  icon: React.ElementType
  label: string
}

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "documents", icon: FolderOpen, label: "My Documents" },
  { id: "requests", icon: FileText, label: "My Requests" },
  { id: "aaccup", icon: GraduationCap, label: "AACCUP" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "activity", icon: Clock, label: "My Activity" },
  { id: "profile", icon: User, label: "Profile" },
  { id: "settings", icon: Settings, label: "Settings" },
]

interface UserSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  activePage?: string
  onNavigate?: (page: string) => void
  onLogout?: () => void
  unreadNotifications?: number
  attention?: { returned: number; tasks: number; requests: number; documents: number }
  className?: string
}

export function UserSidebar({
  collapsed = false,
  onToggle,
  activePage = "dashboard",
  onNavigate,
  onLogout,
  unreadNotifications = 0,
  attention,
  className,
}: UserSidebarProps) {
  const { logout } = useAuth()
  const location = useLocation()

  const isItemActive = (id: string) => {
    if (activePage === id) return true
    const path = location.pathname
    if (id === "dashboard") return path === "/user" || path === "/user/dashboard"
    if (id === "documents") return path.startsWith("/user/documents")
    if (id === "requests") return path.startsWith("/user/requests")
    if (id === "aaccup") {
      return ["/user/aaccup", "/user/iso", "/user/certification", "/user/submissions", "/user/tasks"].some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      )
    }
    if (id === "notifications") return path.startsWith("/user/notifications")
    if (id === "activity") return path.startsWith("/user/activity")
    if (id === "profile") return path.startsWith("/user/profile")
    if (id === "settings") return path.startsWith("/user/settings")
    return activePage === id
  }

  // Rule 6: warn before navigating away while uploads are active.
  const handleNavigate = (page: string) => {
    if (!confirmLeaveIfUploading()) return
    onNavigate?.(page)
  }

  const handleLogout = () => {
    if (!confirmLeaveIfUploading()) return
    logout()
    onLogout?.()
  }

  return (
    <aside
      className={cn(
        "h-screen bg-white dark:bg-[#0F1520] border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex-shrink-0",
        collapsed ? "w-20" : "w-64",
        className,
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center border-b border-gray-100 dark:border-gray-800",
          collapsed ? "justify-center px-5 py-5" : "justify-between px-5 py-5"
        )}>
          <button
            onClick={() => handleNavigate("dashboard")}
            className="hover:opacity-80 transition-opacity"
          >
            <Logo size="sm" showText={!collapsed} subtitle="User Portal" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item.id)
              let badgeCount = 0
              if (item.id === "notifications") badgeCount = unreadNotifications
              else if (item.id === "aaccup" && attention) badgeCount = attention.returned + attention.tasks
              else if (item.id === "requests" && attention) badgeCount = attention.requests
              else if (item.id === "documents" && attention) badgeCount = attention.documents
              const showBadge = badgeCount > 0

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150 relative",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm shadow-slate-300/40 dark:bg-slate-700 dark:shadow-none"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive ? "text-sky-300" : "text-slate-500")} />
                  {!collapsed && <span>{item.label}</span>}
                  {showBadge && !collapsed && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                  {showBadge && collapsed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3",
              collapsed && "justify-center px-2"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-[18px] h-[18px]" />
            ) : (
              <>
                <ChevronLeft className="w-[18px] h-[18px] mr-2.5" />
                <span className="text-[13px]">Collapse</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 px-3",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className={cn("w-[18px] h-[18px] flex-shrink-0", !collapsed && "mr-2.5")} />
            {!collapsed && <span className="text-[13px]">Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  )
}
