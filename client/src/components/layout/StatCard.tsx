import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/Card"

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    positive: boolean
  }
  className?: string
  onClick?: () => void
}

export function StatCard({ title, value, icon, trend, className, onClick }: StatCardProps) {
  return (
    <Card className={cn(
      "group min-h-[132px] border-border/70 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200",
      onClick && "cursor-pointer",
      className
    )}>
      <CardContent className="flex min-h-[132px] flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[12px] font-medium text-gray-500 md:text-[13px]">{title}</p>
          <span className="text-primary-600">{icon}</span>
          {trend && (
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                trend.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}
            >
              {trend.positive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-navy-900 dark:text-gray-100 md:text-3xl">{value}</p>
      </CardContent>
    </Card>
  )
}
