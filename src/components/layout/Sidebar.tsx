import {
  LayoutDashboard,
  FileText,
  Award,
  FolderArchive,
  Users,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

interface SidebarItem {
  id: string
  icon: React.ElementType
  label: string
}

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "submissions", icon: FileText, label: "Submissions" },
  { id: "documents", icon: FolderArchive, label: "Document Repository" },
  { id: "aaccup", icon: Award, label: "AACCUP Management" },
  { id: "users", icon: Users, label: "User Management" },
  { id: "audit", icon: ClipboardList, label: "Audit Logs" },
  { id: "settings", icon: Settings, label: "Settings" },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  activePage?: string
  onNavigate?: (page: string) => void
}

export function Sidebar({ collapsed = false, onToggle, activePage = "dashboard", onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center border-b border-gray-100",
          collapsed ? "justify-center px-5 py-5" : "justify-between px-5 py-5"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">URS-DMS</h1>
                <p className="text-[11px] text-gray-500 font-medium">Document System</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-white")} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
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
        </div>
      </div>
    </aside>
  )
}