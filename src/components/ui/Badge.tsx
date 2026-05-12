import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-gray-100 text-gray-600",
        success: "bg-emerald-50 text-emerald-700",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-700",
        outline: "border border-gray-200 text-gray-600",
        draft: "bg-gray-100 text-gray-500",
        submitted: "bg-blue-50 text-blue-700",
        under_review: "bg-violet-50 text-violet-700",
        needs_revision: "bg-orange-50 text-orange-700",
        resubmitted: "bg-cyan-50 text-cyan-700",
        archived: "bg-gray-100 text-gray-500",
        expired: "bg-red-50 text-red-600",
        low: "bg-gray-100 text-gray-500",
        medium: "bg-blue-50 text-blue-700",
        high: "bg-amber-50 text-amber-700",
        critical: "bg-red-50 text-red-700",
        due_soon: "bg-orange-50 text-orange-700",
        overdue: "bg-red-50 text-red-700",
        completed: "bg-emerald-50 text-emerald-700",
        in_progress: "bg-blue-50 text-blue-700",
        pending: "bg-amber-50 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
