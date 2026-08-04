import { Loader2, CheckCircle, AlertCircle, RefreshCw, Upload, CloudOff } from "lucide-react"
import { cn } from "@/lib/utils"

type FeedbackState = "idle" | "saving" | "uploading" | "processing" | "syncing" | "completed" | "error" | "offline"

interface FeedbackStateConfig {
  icon: React.ReactNode
  label: string
  color: string
  bg: string
}

const feedbackConfig: Record<FeedbackState, FeedbackStateConfig> = {
  idle: { icon: null, label: "", color: "", bg: "" },
  saving: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    label: "Saving...",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  uploading: {
    icon: <Upload className="w-3.5 h-3.5 animate-pulse" />,
    label: "Uploading...",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  processing: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    label: "Processing...",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  syncing: {
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    label: "Syncing...",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  completed: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: "Completed",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  error: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: "Error occurred",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  offline: {
    icon: <CloudOff className="w-3.5 h-3.5" />,
    label: "Offline",
    color: "text-gray-600",
    bg: "bg-gray-100",
  },
}

interface FeedbackIndicatorProps {
  state: FeedbackState
  label?: string
  showLabel?: boolean
  className?: string
}

export function FeedbackIndicator({ state, label, showLabel = true, className }: FeedbackIndicatorProps) {
  if (state === "idle") return null

  const config = feedbackConfig[state]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-all",
        config.color,
        config.bg,
        className
      )}
    >
      {config.icon}
      {showLabel && <span>{label || config.label}</span>}
    </div>
  )
}

interface LoadingOverlayProps {
  state: FeedbackState
  label?: string
  className?: string
}

export function LoadingOverlay({ state, label, className }: LoadingOverlayProps) {
  if (state === "idle" || state === "completed" || state === "error" || state === "offline") return null

  const config = feedbackConfig[state]

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-[2px]",
        className
      )}
    >
      <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm border", config.bg, "border-opacity-50")}>
        {config.icon}
        <span className={cn("text-[13px] font-medium", config.color)}>
          {label || config.label}
        </span>
      </div>
    </div>
  )
}

interface ToastFeedbackProps {
  state: FeedbackState
  message?: string
  onDismiss?: () => void
}

export function ToastFeedback({ state, message, onDismiss }: ToastFeedbackProps) {
  if (state === "idle") return null

  const config = feedbackConfig[state]

  const bgMap = {
    saving: "bg-blue-50 border-blue-200",
    uploading: "bg-blue-50 border-blue-200",
    processing: "bg-violet-50 border-violet-200",
    syncing: "bg-amber-50 border-amber-200",
    completed: "bg-emerald-50 border-emerald-200",
    error: "bg-red-50 border-red-200",
    offline: "bg-gray-100 border-gray-200",
  }

  const textMap = {
    saving: "text-blue-700",
    uploading: "text-blue-700",
    processing: "text-violet-700",
    syncing: "text-amber-700",
    completed: "text-emerald-700",
    error: "text-red-700",
    offline: "text-gray-700",
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm min-w-64",
        bgMap[state]
      )}
    >
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", config.bg)}>
        {config.icon}
      </div>
      <span className={cn("text-[13px] font-medium", textMap[state])}>
        {message || config.label}
      </span>
      {state === "completed" && onDismiss && (
        <button onClick={onDismiss} className="ml-2 p-1 hover:bg-white/50 rounded">
          <span className="text-[18px] leading-none text-gray-400">&times;</span>
        </button>
      )}
    </div>
  )
}
