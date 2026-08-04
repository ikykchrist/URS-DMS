import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8",
      className
    )}>
      <div>
        <h1 className="text-xl sm:text-[24px] font-semibold text-gray-900 tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm sm:mt-1.5 text-[13px] sm:text-[14px] text-gray-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3 flex-wrap">{actions}</div>}
    </div>
  )
}