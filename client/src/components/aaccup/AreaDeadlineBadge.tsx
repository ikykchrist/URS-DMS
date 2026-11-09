import { CalendarClock } from "lucide-react"

import { cn } from "@/lib/utils"

type DeadlineTone = "upcoming" | "month" | "week" | "critical"

export interface AreaDeadlineItem {
  id: string
  name: string
  dueDate: string | null
}

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
}

function getAreaDeadlineState(dueDate: string, now = new Date()): {
  daysRemaining: number
  label: string
  tone: DeadlineTone
} {
  const parsed = new Date(dueDate)
  if (Number.isNaN(parsed.getTime())) return { daysRemaining: 0, label: "Invalid deadline", tone: "critical" }

  const daysRemaining = Math.ceil((startOfLocalDay(parsed) - startOfLocalDay(now)) / 86_400_000)
  if (daysRemaining < 0) return { daysRemaining, label: `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} overdue`, tone: "critical" }
  if (daysRemaining === 0) return { daysRemaining, label: "Due today", tone: "critical" }
  if (daysRemaining <= 3) return { daysRemaining, label: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`, tone: "critical" }
  if (daysRemaining <= 7) return { daysRemaining, label: `${daysRemaining} days left`, tone: "week" }
  if (daysRemaining <= 31) return { daysRemaining, label: `${daysRemaining} days left`, tone: "month" }
  return { daysRemaining, label: `${daysRemaining} days left`, tone: "upcoming" }
}

const toneClasses: Record<DeadlineTone, string> = {
  upcoming: "border-blue-200 bg-blue-50 text-blue-800",
  month: "border-emerald-300 bg-emerald-50 text-emerald-800",
  week: "border-amber-300 bg-amber-50 text-amber-900",
  critical: "border-red-300 bg-red-50 text-red-800 ring-1 ring-red-200",
}

export function AreaDeadlineBadge({ area, prominent = false }: { area: AreaDeadlineItem; prominent?: boolean }) {
  if (!area.dueDate) return null
  const state = getAreaDeadlineState(area.dueDate)
  const formatted = new Date(area.dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className={cn("flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2", toneClasses[state.tone], prominent && "px-4 py-3 shadow-sm")}>
      <CalendarClock className={cn("shrink-0", prominent ? "h-5 w-5" : "h-4 w-4")} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-semibold", prominent ? "text-sm" : "text-xs")}>{area.name}</p>
        <p className="mt-0.5 text-[11px] font-medium opacity-90">Deadline {formatted} · {state.label}</p>
      </div>
      {state.tone === "critical" && <span className="shrink-0 rounded-full bg-red-600 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">Critical</span>}
    </div>
  )
}

export function AreaDeadlineList({ areas, emptyText }: { areas: AreaDeadlineItem[]; emptyText?: string }) {
  const deadlines = areas
    .filter((area): area is AreaDeadlineItem & { dueDate: string } => Boolean(area.dueDate))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  if (deadlines.length === 0) {
    return emptyText ? <p className="px-2 text-xs text-slate-400">{emptyText}</p> : null
  }
  return <div className="mt-3 grid gap-2 sm:grid-cols-2">{deadlines.map((area) => <AreaDeadlineBadge key={area.id} area={area} />)}</div>
}
