import { CheckSquare, Square, X, CheckCircle, XCircle, Download, Users, Archive, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface BulkActionsToolbarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkApprove?: () => void
  onBulkReject?: () => void
  onBulkExport?: () => void
  onBulkAssign?: () => void
  onBulkArchive?: () => void
  onBulkDelete?: () => void
  className?: string
}

const bulkActions = [
  { label: "Approve", icon: CheckCircle, variant: "success" as const, onClick: () => {} },
  { label: "Reject", icon: XCircle, variant: "danger" as const, onClick: () => {} },
  { label: "Export", icon: Download, variant: "secondary" as const, onClick: () => {} },
  { label: "Assign", icon: Users, variant: "secondary" as const, onClick: () => {} },
  { label: "Archive", icon: Archive, variant: "secondary" as const, onClick: () => {} },
  { label: "Delete", icon: Trash2, variant: "danger" as const, onClick: () => {} },
]

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkApprove,
  onBulkReject,
  onBulkExport,
  onBulkAssign,
  onBulkArchive,
  onBulkDelete,
  className,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null

  const handlers = {
    Approve: onBulkApprove,
    Reject: onBulkReject,
    Export: onBulkExport,
    Assign: onBulkAssign,
    Archive: onBulkArchive,
    Delete: onBulkDelete,
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <CheckSquare className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[13px] font-medium text-gray-900">
          {selectedCount} selected
        </span>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <div className="flex items-center gap-1">
        {bulkActions.map((action) => {
          const Icon = action.icon
          const handler = handlers[action.label as keyof typeof handlers]
          return (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 text-[12px]",
                action.variant === "success" && "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
                action.variant === "danger" && "text-red-600 hover:text-red-700 hover:bg-red-50",
                action.variant === "secondary" && "text-gray-600 hover:text-gray-900"
              )}
              onClick={handler}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" />
              {action.label}
            </Button>
          )
        })}
      </div>

      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[12px] text-gray-500 hover:text-gray-900"
          onClick={onClearSelection}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  )
}

interface SelectAllCheckboxProps {
  allVisible: boolean
  someSelected: boolean
  onToggle: () => void
  label?: string
}

export function SelectAllCheckbox({ allVisible, someSelected, onToggle, label }: SelectAllCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors group"
    >
      {allVisible ? (
        <CheckSquare className="w-4 h-4 text-primary" />
      ) : someSelected ? (
        <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
        </div>
      ) : (
        <Square className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
      )}
      {label && <span className="text-[12px] text-gray-600 font-medium">{label}</span>}
    </button>
  )
}

interface RowCheckboxProps {
  checked: boolean
  onChange: () => void
}

export function RowCheckbox({ checked, onChange }: RowCheckboxProps) {
  return (
    <button
      onClick={onChange}
      className="flex items-center justify-center w-5 h-5 transition-colors"
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 text-primary" />
      ) : (
        <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
      )}
    </button>
  )
}
