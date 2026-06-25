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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
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
}

export function UserSidebar({
  collapsed = false,
  onToggle,
  activePage = "dashboard",
  onNavigate,
  onLogout,
  unreadNotifications = 0,
}: UserSidebarProps) {
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    onLogout?.()
  }

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center border-b border-gray-100",
          collapsed ? "justify-center px-5 py-5" : "justify-between px-5 py-5"
        )}>
          {!collapsed && (
            <button
              onClick={() => onNavigate?.("dashboard")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">URS-DMS</h1>
                <p className="text-[11px] text-gray-500 font-medium">User Portal</p>
              </div>
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => onNavigate?.("dashboard")}
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm hover:opacity-80 transition-opacity"
            >
              <FileText className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              const showBadge = item.id === "notifications" && unreadNotifications > 0

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150 relative",
                    isActive
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-white")} />
                  {!collapsed && <span>{item.label}</span>}
                  {showBadge && !collapsed && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
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
            <LogOut className="w-[18px] h-[18px] mr-2.5" />
            {!collapsed && <span className="text-[13px]">Logout</span>}
            {collapsed && <LogOut className="w-[18px] h-[18px]" />}
          </Button>
        </div>
      </div>
    </aside>
  )
}