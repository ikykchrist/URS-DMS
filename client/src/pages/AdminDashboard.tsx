import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Clock3, FileCheck2, Send, ClipboardList } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/Skeleton"
import { getDashboardOverview, type DashboardOverview } from "@/services/dashboard"
import { listAllOnlineSubmissions, listOnlineTasks, type OnlineAaccupTask, type OnlineSubmissionListItem } from "@/services/aaccup"
import { listRequests } from "@/services/requests"
import { listAuditEntries, type AuditEntry } from "@/services/admin"
import type { DocumentRequest } from "@/types/domain"

interface AdminDashboardProps {
  onNavigate: (page: string, query?: Record<string, string>) => void
}

type SectionState<T> = { data: T | null; error: boolean }

const statusLabel: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  NEEDS_REVISION: "Returned",
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function actionButton(onClick: () => void, label: string, children: React.ReactNode) {
  return <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500" onClick={onClick}>{children}<span className="sr-only">{label}</span></Button>
}

function isDueSoon(task: OnlineAaccupTask, now = Date.now()): boolean {
  if (!task.dueDate || task.status === "COMPLETED" || task.status === "CANCELLED") return false
  const due = new Date(task.dueDate).getTime()
  return due >= now && due <= now + 7 * 24 * 60 * 60 * 1000
}

function isOverdue(task: OnlineAaccupTask, now = Date.now()): boolean {
  if (!task.dueDate || task.status === "COMPLETED" || task.status === "CANCELLED") return false
  return new Date(task.dueDate).getTime() < now
}

function activityDestination(entry: AuditEntry): { page: string; query?: Record<string, string> } | null {
  const entity = entry.entity?.type?.toLowerCase()
  const id = entry.entity?.id ?? entry.targetId ?? undefined
  if ((entity === "submission" || entity === "aaccup_submission") && id) return { page: "submissions", query: { tab: "submissions", highlight: id } }
  if ((entity === "request" || entity === "document_request") && id) return { page: "requests", query: { highlight: id } }
  if ((entity === "task" || entity === "aaccup_task") && id) return { page: "aaccup", query: { tab: "tasks", highlight: id } }
  if (entity === "document" && id) return { page: "documents" }
  if (entity === "user" && id) return { page: "users", query: { highlight: id } }
  return null
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [overview, setOverview] = useState<SectionState<DashboardOverview>>({ data: null, error: false })
  const [submissions, setSubmissions] = useState<SectionState<OnlineSubmissionListItem[]>>({ data: null, error: false })
  const [requests, setRequests] = useState<SectionState<DocumentRequest[]>>({ data: null, error: false })
  const [tasks, setTasks] = useState<SectionState<OnlineAaccupTask[]>>({ data: null, error: false })
  const [activity, setActivity] = useState<SectionState<AuditEntry[]>>({ data: null, error: false })

  useEffect(() => {
    void Promise.all([
      getDashboardOverview().then((data) => setOverview({ data, error: false })).catch(() => setOverview({ data: null, error: true })),
      listAllOnlineSubmissions().then((data) => setSubmissions({ data, error: false })).catch(() => setSubmissions({ data: null, error: true })),
      listRequests().then((data) => setRequests({ data, error: false })).catch(() => setRequests({ data: null, error: true })),
      listOnlineTasks().then((data) => setTasks({ data, error: false })).catch(() => setTasks({ data: null, error: true })),
      listAuditEntries({ page: 1, pageSize: 8 }).then((page) => setActivity({ data: page.items, error: false })).catch(() => setActivity({ data: null, error: true })),
    ])
  }, [])

  const pendingSubmissions = submissions.data?.filter((item) => item.status === "PENDING").length ?? 0
  const pendingRequests = requests.data?.filter((item) => item.status === "Pending").length ?? 0
  const now = Date.now()
  const overdueTasks = tasks.data?.filter((task) => isOverdue(task, now)).length ?? 0
  const dueSoonTasks = tasks.data?.filter((task) => isDueSoon(task, now)).length ?? 0
  const completedTasks = tasks.data?.filter((task) => task.status === "COMPLETED").length ?? 0

  const recentSubmissions = useMemo(
    () => [...(submissions.data ?? [])].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 5),
    [submissions.data],
  )
  const progressRows = [
    { key: "AACCUP" as const, label: "AACCUP", page: "aaccup" },
    { key: "ISO" as const, label: "ISO", page: "iso" },
    { key: "CERT" as const, label: "Certification", page: "certification" },
  ]

  const renderError = (message: string) => <p className="text-sm text-red-600">{message}</p>
  const count = (value: number, loaded: boolean) => loaded ? String(value) : <span className="inline-block h-7 w-10 animate-pulse rounded bg-gray-200" aria-label="Loading" />

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Good morning, Admin" description="Review what needs attention and monitor accreditation progress." />

      <section aria-labelledby="attention-heading" className="mb-7">
        <h2 id="attention-heading" className="mb-3 text-sm font-semibold text-gray-900">Needs Your Attention</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <button type="button" className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => onNavigate("submissions", { tab: "submissions", status: "PENDING" })}>
            <div className="flex items-start justify-between"><FileCheck2 className="h-5 w-5 text-blue-600" /><Badge variant="warning">Pending</Badge></div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{count(pendingSubmissions, submissions.data !== null)}</p>
            <p className="text-sm text-gray-500">Submissions</p><span className="mt-3 flex items-center text-xs font-medium text-blue-600">Review <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
          </button>
          <button type="button" className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500" onClick={() => onNavigate("requests", { status: "PENDING" })}>
            <div className="flex items-start justify-between"><Send className="h-5 w-5 text-amber-600" /><Badge variant="warning">Pending</Badge></div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{count(pendingRequests, requests.data !== null)}</p>
            <p className="text-sm text-gray-500">Requests</p><span className="mt-3 flex items-center text-xs font-medium text-amber-700">Review <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
          </button>
          <button type="button" className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500" onClick={() => onNavigate("aaccup", { tab: "tasks", taskFilter: "due-soon" })}>
            <div className="flex items-start justify-between"><Clock3 className="h-5 w-5 text-red-600" /><Badge variant="danger">Due Soon</Badge></div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{count(dueSoonTasks, tasks.data !== null)}</p>
            <p className="text-sm text-gray-500">Tasks due within 7 days</p><span className="mt-3 flex items-center text-xs font-medium text-red-600">View <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
          </button>
        </div>
      </section>

      <Card className="mb-7 border-gray-200/70 shadow-sm">
        <CardHeader><CardTitle className="text-base">Accreditation Progress</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {overview.error ? renderError("Accreditation progress is unavailable.") : progressRows.map((row) => {
            const stats = overview.data?.aaccup.byAreaSet[row.key]
            return <button type="button" key={row.key} className="block w-full rounded-lg p-2 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => onNavigate(row.page)}>
              <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium text-gray-800">{row.label}</span><span className="font-semibold text-gray-900">{stats ? `${stats.overallCompliancePercentage}%` : "—"}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${stats?.overallCompliancePercentage ?? 0}%` }} /></div>
            </button>
          })}
          {overview.data && <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-4 text-sm">
            <button type="button" className="text-green-700 hover:underline" onClick={() => onNavigate("submissions", { status: "APPROVED" })}>Approved {overview.data.aaccup.approved}</button>
            <button type="button" className="text-amber-700 hover:underline" onClick={() => onNavigate("submissions", { status: "PENDING" })}>Pending {overview.data.aaccup.pending}</button>
            <button type="button" className="text-orange-700 hover:underline" onClick={() => onNavigate("submissions", { status: "NEEDS_REVISION" })}>Returned {overview.data.aaccup.needsRevision}</button>
          </div>}
        </CardContent>
      </Card>

      <Card className="mb-7 border-gray-200/70 shadow-sm">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Recent Submissions</CardTitle><Button variant="ghost" size="sm" onClick={() => onNavigate("submissions", { tab: "submissions" })}>View All <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader>
        <CardContent className="p-0">
          {submissions.error ? <div className="p-5">{renderError("Recent submissions are unavailable.")}</div> : submissions.data === null ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} variant="rectangular" className="h-10" />)}</div> : recentSubmissions.length === 0 ? <p className="p-5 text-sm text-gray-500">No submissions recorded yet.</p> : <div className="divide-y divide-gray-100">{recentSubmissions.map((item) => <button type="button" key={item.id} className="grid w-full grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-3 px-5 py-3 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" onClick={() => onNavigate("submissions", { tab: "submissions", highlight: item.id, areaSet: item.areaSet })}><span className="min-w-0 truncate text-sm font-medium text-gray-800">{item.documentTitle}</span><span className="hidden truncate text-sm text-gray-500 sm:block">{item.submittedByName ?? "Unknown"}</span><span className="hidden text-sm text-gray-500 sm:block">{item.areaSet} · {item.areaName}</span><span className="whitespace-nowrap text-xs text-gray-500">{statusLabel[item.status]} · {formatDate(item.submittedAt)}</span></button>)}</div>}
        </CardContent>
      </Card>

      <div className="mb-7 grid gap-5 lg:grid-cols-2">
        <Card className="border-gray-200/70 shadow-sm"><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Requests</CardTitle><Button variant="ghost" size="sm" onClick={() => onNavigate("requests")}>Manage Requests <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader><CardContent className="space-y-2">{requests.error ? renderError("Requests are unavailable.") : (<><button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => onNavigate("requests", { status: "PENDING" })}><span>Pending</span><span className="font-semibold text-amber-700">{count(pendingRequests, requests.data !== null)}</span></button><button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => onNavigate("requests", { status: "APPROVED" })}><span>Approved</span><span className="font-semibold text-green-700">{count(requests.data?.filter((item) => item.status === "Approved").length ?? 0, requests.data !== null)}</span></button><button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => onNavigate("requests", { status: "FULFILLED" })}><span>Fulfilled</span><span className="font-semibold text-blue-700">{count(requests.data?.filter((item) => item.status === "Fulfilled").length ?? 0, requests.data !== null)}</span></button></>)}</CardContent></Card>
        <Card className="border-gray-200/70 shadow-sm"><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Tasks</CardTitle><Button variant="ghost" size="sm" onClick={() => onNavigate("aaccup", { tab: "tasks" })}>View Tasks <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader><CardContent className="space-y-2"><button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => onNavigate("aaccup", { tab: "tasks", taskFilter: "overdue" })}><span>Overdue</span><span className="font-semibold text-red-700">{count(overdueTasks, tasks.data !== null)}</span></button><button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => onNavigate("aaccup", { tab: "tasks", taskFilter: "due-soon" })}><span>Due Soon</span><span className="font-semibold text-amber-700">{count(dueSoonTasks, tasks.data !== null)}</span></button><button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => onNavigate("aaccup", { tab: "tasks", taskFilter: "completed" })}><span>Completed</span><span className="font-semibold text-green-700">{count(completedTasks, tasks.data !== null)}</span></button></CardContent></Card>
      </div>

      <Card className="border-gray-200/70 shadow-sm"><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Recent Activity</CardTitle><Button variant="ghost" size="sm" onClick={() => onNavigate("audit")}>View Audit <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader><CardContent className="p-0">{activity.error ? <div className="p-5">{renderError("Recent activity is unavailable.")}</div> : activity.data === null ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} variant="rectangular" className="h-9" />)}</div> : activity.data.length === 0 ? <p className="p-5 text-sm text-gray-500">No recent activity.</p> : <div className="divide-y divide-gray-100">{activity.data.slice(0, 8).map((entry) => { const destination = activityDestination(entry); return <div key={entry.id} className="flex items-center gap-3 px-5 py-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"><ClipboardList className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm text-gray-800">{entry.description ?? entry.action}</p><p className="text-xs text-gray-500">{entry.actorName ?? "System"} · {formatDate(entry.timestamp)}</p></div>{destination ? actionButton(() => onNavigate(destination.page, destination.query), "Open activity", <ArrowRight className="h-4 w-4" />) : actionButton(() => onNavigate("audit"), "Open audit entry", <ArrowRight className="h-4 w-4" />)}</div> })}</div>}</CardContent></Card>
    </div>
  )
}
