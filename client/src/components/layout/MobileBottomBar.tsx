import {
  LayoutDashboard,
  FolderArchive,
  FolderOpen,
  GraduationCap,
  Bell,
  Inbox,
  User,
  Users,
  Settings,
  ClipboardList,
  Clock,
  Shield,
  Ellipsis,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"

interface BottomTab {
  id: string
  icon: React.ElementType
  label: string
  badge?: number
}

interface MobileBottomBarProps {
  activePage: string
  onNavigate: (page: string) => void
  showRoot?: boolean
  unreadNotifications?: number
}

const adminMainTabs: BottomTab[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "documents", icon: FolderArchive, label: "Documents" },
  { id: "aaccup", icon: GraduationCap, label: "AACCUP" },
  { id: "requests", icon: Inbox, label: "Requests" },
]

const adminMoreTabs: BottomTab[] = [
  { id: "users", icon: Users, label: "User Management" },
  { id: "audit", icon: ClipboardList, label: "Audit Logs" },
  { id: "profile", icon: User, label: "Account" },
  { id: "settings", icon: Settings, label: "Settings" },
]

const rootMoreTabs: BottomTab[] = [
  { id: "root", icon: Shield, label: "Root Console" },
  { id: "root-config", icon: Settings, label: "Config" },
  { id: "root-roles-permissions", icon: Shield, label: "Roles" },
]

const userMainTabs: BottomTab[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Home" },
  { id: "documents", icon: FolderOpen, label: "Docs" },
  { id: "aaccup", icon: GraduationCap, label: "AACCUP" },
  { id: "notifications", icon: Bell, label: "Alerts" },
]

const userMoreTabs: BottomTab[] = [
  { id: "requests", icon: Inbox, label: "My Requests" },
  { id: "activity", icon: Clock, label: "My Activity" },
  { id: "profile", icon: User, label: "Profile" },
  { id: "settings", icon: Settings, label: "Settings" },
]

export function MobileBottomBar({ activePage, onNavigate, showRoot, unreadNotifications = 0 }: MobileBottomBarProps) {
  const isUser = !showRoot && activePage !== "users" && activePage !== "audit" && activePage !== "settings"
  const mainTabs = isUser ? userMainTabs : adminMainTabs
  const moreTabs = isUser
    ? userMoreTabs
    : showRoot
      ? [...adminMoreTabs, ...rootMoreTabs]
      : adminMoreTabs

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0F1520] border-t border-gray-200 dark:border-gray-700 safe-bottom">
      <div className="flex justify-around items-center h-16 px-1">
        {mainTabs.map((tab) => {
          const isActive = activePage === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full py-1 transition-colors",
                isActive
                  ? "text-primary dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
              )}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.id === "notifications" && unreadNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          )
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full py-1 transition-colors",
                moreTabs.some((t) => t.id === activePage)
                  ? "text-primary dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
              )}
            >
              <Ellipsis className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2 w-48">
            {moreTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className={cn("text-[13px]", activePage === tab.id && "bg-primary/10 dark:bg-primary/20")}
              >
                <tab.icon className="w-4 h-4 mr-2.5" />
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
