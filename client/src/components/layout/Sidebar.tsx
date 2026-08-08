import {
  LayoutDashboard,
  FileText,
  FolderArchive,
  Users,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Inbox,
  ServerCog,
  SlidersHorizontal,
  Rocket,
  ScrollText,
  Network,
  FolderTree,
  FileCheck2,
  Workflow,
  HardDrive,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { confirmLeaveIfUploading } from "@/lib/uploadBus"
import { Button } from "@/components/ui/Button"

interface SidebarItem {
  id: string
  icon: React.ElementType
  label: string
}

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "documents", icon: FolderArchive, label: "My Documents" },
  { id: "aaccup", icon: GraduationCap, label: "AACCUP" },
  { id: "requests", icon: Inbox, label: "Requests" },
  { id: "users", icon: Users, label: "User Management" },
  { id: "audit", icon: ClipboardList, label: "Audit Logs" },
  { id: "settings", icon: Settings, label: "Settings" },
]

const rootConsoleItems: SidebarItem[] = [
  { id: "root", icon: ServerCog, label: "Platform Overview" },
  { id: "root-organization", icon: Network, label: "Organization" },
  { id: "root-folder-builder", icon: FolderTree, label: "Folder Builder" },
  { id: "root-requirement-builder", icon: FileCheck2, label: "Requirement Builder" },
  { id: "root-workflow-builder", icon: Workflow, label: "Workflow Builder" },
  { id: "root-form-builder", icon: ClipboardList, label: "Form Builder" },
  { id: "root-setup-wizard", icon: Rocket, label: "Setup Wizard" },
  { id: "root-config", icon: SlidersHorizontal, label: "Configuration Engine" },
  { id: "root-maintenance", icon: HardDrive, label: "Storage Maintenance" },
  { id: "root-roles-permissions", icon: Shield, label: "Roles &amp; Permissions" },
  { id: "root-audit", icon: ScrollText, label: "System Audit" },
  { id: "root-users", icon: Users, label: "System Users" },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  activePage?: string
  onNavigate?: (page: string) => void
  showRoot?: boolean
}

export function Sidebar({ collapsed = false, onToggle, activePage = "dashboard", onNavigate, showRoot = false }: SidebarProps) {
  // Rule 6: warn before navigating away while uploads are active.
  const handleNavigate = (page: string) => {
    if (!confirmLeaveIfUploading()) return
    onNavigate?.(page)
  }
  return (
    <aside
      className={cn(
        "h-screen bg-white dark:bg-[#0F1520] border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex-shrink-0",
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
              onClick={() => handleNavigate("dashboard")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">URS-DMS</h1>
                <p className="text-[11px] text-gray-500 font-medium">Document System</p>
              </div>
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => handleNavigate("dashboard")}
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm hover:opacity-80 transition-opacity"
            >
              <FileText className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {(showRoot ? rootConsoleItems : sidebarItems).map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
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
            {showRoot && !collapsed && (
              <p className="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Root Console
              </p>
            )}
            {showRoot &&
              sidebarItems.map((item) => {
                const Icon = item.icon
                const isActive = activePage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
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
