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
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="w-11 h-11 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
            {icon}
          </div>
          {trend && (
            <span
              className={cn(
                "text-[12px] font-medium px-2 py-0.5 rounded-full",
                trend.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}
            >
              {trend.positive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-[13px] text-gray-500 font-medium">{title}</p>
          <p className="text-[28px] font-semibold text-gray-900 mt-0.5 tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}