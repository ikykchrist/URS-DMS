import { RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"

interface ServiceUnavailableProps {
  service?: string
  message?: string
  onRetry?: () => void
}

export function ServiceUnavailable({ service, message, onRetry }: ServiceUnavailableProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-3" />
        <p className="text-[14px] font-medium text-gray-700 mb-1">
          {service ? `${service} temporarily unavailable` : "Service temporarily unavailable"}
        </p>
        <p className="text-[13px] text-gray-500 mb-4">
          {message ?? "Please try again in a moment."}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
