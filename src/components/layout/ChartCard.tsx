import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { cn } from "@/lib/utils"

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <Card className={cn("border-gray-200/60 shadow-sm", className)}>
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-[15px] font-semibold text-gray-900">{title}</CardTitle>
        {description && (
          <p className="text-[13px] text-gray-500 mt-0.5">{description}</p>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-5">{children}</CardContent>
    </Card>
  )
}