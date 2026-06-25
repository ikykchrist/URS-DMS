import { useState } from "react"
import { Search, User, LogOut, Settings, ChevronDown, Bell } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { Button } from "@/components/ui/Button"

interface UserTopNavProps {
  onNavigate?: (page: string) => void
  unreadNotifications?: number
}

export function UserTopNav({ onNavigate, unreadNotifications = 0 }: UserTopNavProps) {
  const { user, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "faculty":
        return "Faculty"
      case "department":
        return "Department Head"
      default:
        return "User"
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1 max-w-xl">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search my documents..."
              className="w-full h-10 pl-10 pr-4 bg-gray-50/50 border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-300 transition-all"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => onNavigate?.("notifications")}
          >
            <Bell className="w-4 h-4 text-gray-500" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-gray-100 transition-colors ml-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatar || user?.name}`} />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-[12px] font-semibold">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-[13px] font-medium text-gray-900">{user?.name || "User"}</p>
                  <p className="text-[11px] text-gray-500">{user?.role ? getRoleLabel(user.role) : "User"}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1.5">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[13px]" onClick={() => onNavigate?.("profile")}>
                <User className="mr-2.5 w-4 h-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]" onClick={() => onNavigate?.("settings")}>
                <Settings className="mr-2.5 w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[13px] text-red-600 cursor-pointer" onClick={logout}>
                <LogOut className="mr-2.5 w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}