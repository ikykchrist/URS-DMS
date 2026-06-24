import { Search, User, LogOut, Settings, ChevronDown, Command } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/Input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { QuickActionButton } from "@/components/layout/QuickActionButton"
import { NotificationCenter } from "@/components/layout/NotificationCenter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"

interface TopNavProps {
  onOpenCommandPalette?: () => void
  onNavigate?: (page: string) => void
}

export function TopNav({ onOpenCommandPalette, onNavigate }: TopNavProps) {
  const { logout } = useAuth()
  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1 max-w-xl">
          <button
            onClick={onOpenCommandPalette}
            className="w-full max-w-md group"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors pointer-events-none" />
              <Input
                placeholder="Search documents, users, submissions..."
                className="pl-10 pr-16 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200 focus:border-gray-200 transition-all text-[14px] cursor-pointer"
                readOnly
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 font-mono text-[10px] font-medium text-gray-400 shadow-sm">
                  <Command className="w-2.5 h-2.5" />
                </kbd>
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-gray-200 bg-white px-1 font-mono text-[10px] font-medium text-gray-400 shadow-sm">
                  K
                </kbd>
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <QuickActionButton onNavigate={onNavigate} />

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-gray-100 transition-colors ml-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-[12px] font-semibold">AD</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-[13px] font-medium text-gray-900">Admin User</p>
                  <p className="text-[11px] text-gray-500">Administrator</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1.5">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">admin@urs.edu</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[13px]">
                <User className="mr-2.5 w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]">
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