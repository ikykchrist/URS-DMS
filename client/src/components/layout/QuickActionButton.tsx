import { useNavigate } from "react-router-dom"
import {
  FileText,
  Users,
  BarChart3,
  Plus,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { cn } from "@/lib/utils"

interface QuickActionButtonProps {
  className?: string
  onNavigate?: (page: string) => void
  actions?: QuickAction[]
}

interface QuickAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  route: string
  page: string
}

const adminQuickActions: QuickAction[] = [
  {
    label: "Create Task",
    icon: FileText,
    description: "Assign a new AACCUP task",
    route: "/aaccup?modal=create-task",
    page: "aaccup",
  },
  {
    label: "Add User",
    icon: Users,
    description: "Register new user",
    route: "/users?modal=add-user",
    page: "users",
  },
  {
    label: "Generate Report",
    icon: BarChart3,
    description: "Export system report",
    route: "/audit?modal=generate-report",
    page: "audit",
  },
]

export function QuickActionButton({ className, onNavigate, actions = adminQuickActions }: QuickActionButtonProps) {
  const navigate = useNavigate()

  const handleActionClick = (action: QuickAction) => {
    if (onNavigate) {
      onNavigate(action.page)
    }
    navigate(action.route)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={cn("shadow-soft gap-1.5", className)}>
          <Plus className="w-4 h-4" />
          New
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1.5">
        <DropdownMenuLabel className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
          Quick Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <DropdownMenuItem
              key={action.label}
              className="flex items-center gap-3 py-2.5 px-3 cursor-pointer"
              onClick={() => handleActionClick(action)}
            >
              <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{action.label}</p>
                <p className="text-[11px] text-gray-500">{action.description}</p>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
