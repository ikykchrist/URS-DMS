export type DeadlineStatus = "overdue" | "due_soon" | "upcoming" | "safe"

export interface DeadlineInfo {
  status: DeadlineStatus
  daysRemaining: number
  label: string
  urgency: "none" | "low" | "medium" | "high" | "critical"
}

const OVERDUE_DAYS = 1
const DUE_SOON_DAYS = 3
const UPCOMING_DAYS = 7

export function getDeadlineStatus(dueDate: string): DeadlineInfo {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      status: "overdue",
      daysRemaining: Math.abs(diffDays),
      label: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`,
      urgency: Math.abs(diffDays) >= OVERDUE_DAYS ? "critical" : "high",
    }
  } else if (diffDays <= DUE_SOON_DAYS) {
    return {
      status: "due_soon",
      daysRemaining: diffDays,
      label: diffDays === 0 ? "Due today" : `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`,
      urgency: diffDays <= 1 ? "critical" : "high",
    }
  } else if (diffDays <= UPCOMING_DAYS) {
    return {
      status: "upcoming",
      daysRemaining: diffDays,
      label: `Due in ${diffDays} days`,
      urgency: "medium",
    }
  } else {
    return {
      status: "safe",
      daysRemaining: diffDays,
      label: `${diffDays} days remaining`,
      urgency: "none",
    }
  }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}
