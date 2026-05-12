import {
  Upload,
  FileText,
  Users,
  FolderPlus,
  BarChart3,
  Award,
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
}

const quickActions = [
  {
    label: "Upload Document",
    icon: Upload,
    description: "Upload new document",
    shortcut: "U",
  },
  {
    label: "Create Task",
    icon: FileText,
    description: "Assign a new task",
    shortcut: "T",
  },
  {
    label: "Add User",
    icon: Users,
    description: "Register new user",
    shortcut: "N",
  },
  {
    label: "Create Folder",
    icon: FolderPlus,
    description: "New folder in repository",
    shortcut: "F",
  },
  {
    label: "Generate Report",
    icon: BarChart3,
    description: "Export system report",
    shortcut: "R",
  },
  {
    label: "Assign Area",
    icon: Award,
    description: "Assign AACCUP area",
    shortcut: "A",
  },
]

export function QuickActionButton({ className }: QuickActionButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={cn("shadow-sm gap-1.5", className)}>
          <Plus className="w-4 h-4" />
          New
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1.5">
        <DropdownMenuLabel className="text-[11px] text-gray-400 font-medium">
          Quick Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <DropdownMenuItem
              key={action.label}
              className="flex items-center gap-3 py-2 px-3 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900">{action.label}</p>
                <p className="text-[11px] text-gray-500">{action.description}</p>
              </div>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-500">
                {action.shortcut}
              </kbd>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
