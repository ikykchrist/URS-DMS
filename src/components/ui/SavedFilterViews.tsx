import { useState } from "react"
import { Bookmark, BookmarkCheck, Filter, ChevronDown, Plus, Star } from "lucide-react"
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

interface SavedFilter {
  id: string
  label: string
  icon?: string
  filters: Record<string, string>
  isDefault?: boolean
}

interface SavedFilterViewsProps {
  onApplyFilter: (filter: SavedFilter) => void
  onSaveFilter?: (label: string, filters: Record<string, string>) => void
  currentFilters?: Record<string, string>
  className?: string
}

const defaultFilters: SavedFilter[] = [
  { id: "all", label: "All Submissions", filters: {}, isDefault: true },
  { id: "pending", label: "Pending Approvals", filters: { status: "pending" } },
  { id: "overdue", label: "Overdue Tasks", filters: { status: "overdue" } },
  { id: "area1", label: "Area I Files", filters: { area: "1" } },
  { id: "returned", label: "Needs Revision", filters: { status: "returned" } },
  { id: "recent", label: "Recent Uploads", filters: { dateRange: "week" } },
]

export function SavedFilterViews({ onApplyFilter, onSaveFilter, currentFilters, className }: SavedFilterViewsProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveLabel, setSaveLabel] = useState("")
  const [customFilters, setCustomFilters] = useState<SavedFilter[]>([])

  const allFilters = [...defaultFilters, ...customFilters]

  const handleApply = (filter: SavedFilter) => {
    setActiveFilter(filter.id)
    onApplyFilter(filter)
  }

  const handleSave = () => {
    if (saveLabel.trim() && currentFilters && onSaveFilter) {
      const newFilter: SavedFilter = {
        id: `custom-${Date.now()}`,
        label: saveLabel.trim(),
        filters: currentFilters,
      }
      setCustomFilters((prev) => [...prev, newFilter])
      onSaveFilter(saveLabel.trim(), currentFilters)
      setSaveLabel("")
      setShowSaveDialog(false)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-2",
              activeFilter !== "all" && "border-primary text-primary bg-primary/5"
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[13px]">
              {allFilters.find((f) => f.id === activeFilter)?.label || "Views"}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-[11px] text-gray-400 font-medium">
            Saved Views
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allFilters.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              onClick={() => handleApply(filter)}
              className={cn(
                "flex items-center gap-2 py-2 px-3 cursor-pointer",
                activeFilter === filter.id && "bg-gray-50"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center",
                  activeFilter === filter.id ? "bg-primary/10" : "bg-gray-100"
                )}
              >
                <BookmarkCheck
                  className={cn(
                    "w-3 h-3",
                    activeFilter === filter.id ? "text-primary" : "text-gray-400"
                  )}
                />
              </div>
              <div className="flex-1">
                <span
                  className={cn(
                    "text-[13px]",
                    activeFilter === filter.id ? "font-medium text-gray-900" : "text-gray-700"
                  )}
                >
                  {filter.label}
                </span>
                {filter.isDefault && (
                  <span className="ml-1.5 text-[10px] text-gray-400">Default</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          {currentFilters && Object.keys(currentFilters).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 py-2 px-3 cursor-pointer text-primary"
              >
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                  <Plus className="w-3 h-3 text-primary" />
                </div>
                <span className="text-[13px] font-medium">Save current view</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showSaveDialog && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowSaveDialog(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50">
            <p className="text-[12px] font-medium text-gray-700 mb-2">Save Filter View</p>
            <input
              type="text"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="e.g., My Reviews"
              className="w-full h-9 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:ring-1.5 focus:ring-primary/20 focus:border-primary"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" className="h-8 flex-1 text-[12px]" onClick={handleSave}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[12px]"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
