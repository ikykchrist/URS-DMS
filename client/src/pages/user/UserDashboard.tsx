import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Clock3, RotateCcw, Send, ClipboardList, Folder, FileText, Star, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/Skeleton"
import { useAuth } from "@/context/AuthContext"
import { listOnlineDocuments } from "@/services/documents"
import { listRepositoryFolders } from "@/services/documents"
import { listFavoriteOnlineDocuments } from "@/services/documents"
import { listMyActivity, type AuditEntry } from "@/services/admin"
import { refreshUserAttention, subscribeUserAttention, type UserAttention } from "@/lib/userAttention"

interface UserDashboardProps {
  onNavigate?: (page: string, query?: Record<string, string>) => void
}

type SectionState<T> = { data: T | null; error: boolean }

function activityDest(entry: AuditEntry): { page: string; query?: Record<string, string> } | null {
  const entity = entry.entity?.type?.toLowerCase()
  const id = entry.entity?.id ?? entry.targetId ?? undefined
  if ((entity === "submission" || entity === "aaccup_submission") && id) return { page: "aaccup", query: { tab: "submissions", highlight: id } }
  if ((entity === "request" || entity === "document_request") && id) return { page: "requests", query: { highlight: id } }
  if ((entity === "task" || entity === "aaccup_task") && id) return { page: "aaccup", query: { tab: "tasks", highlight: id } }
  if (entity === "document" && id) return { page: "documents" }
  if (entity === "folder" && id) return { page: "documents" }
  return null
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { user } = useAuth()
  const [attention, setAttention] = useState<UserAttention>({
    returnedSubmissions: 0, dueSoonTasks: 0, overdueTasks: 0, openTasks: 0,
    pendingRequests: 0, fulfilledRequests: 0, refusedRequests: 0,
    allSubmissions: [], returnedSubmissionsList: [], overdueTasksList: [], dueSoonTasksList: [], recentRequestUpdates: [],
    loading: true,
  })
  const [docCount, setDocCount] = useState<SectionState<{ files: number; folders: number; favorites: number }>>({ data: null, error: false })
  const [activity, setActivity] = useState<SectionState<AuditEntry[]>>({ data: null, error: false })

  const firstName = user?.name?.split(" ")[0] ?? "User"

  useEffect(() => {
    const unsub = subscribeUserAttention(setAttention)
    if (user) refreshUserAttention(user.id)
    return unsub
  }, [user])

  useEffect(() => {
    if (!user) return
    const poll = setInterval(() => refreshUserAttention(user.id), 30000)
    return () => clearInterval(poll)
  }, [user])

  useEffect(() => {
    void Promise.all([
      listOnlineDocuments({ ownerId: user!.id, archived: false }),
      listRepositoryFolders({ ownerId: user!.id }),
      listFavoriteOnlineDocuments(),
    ]).then(([docs, folders, favs]) => {
      setDocCount({ data: { files: docs.length, folders: folders.length, favorites: favs.length }, error: false })
    }).catch(() => setDocCount({ data: null, error: true }))

    void listMyActivity({ page: 1, pageSize: 8 }).then((page) => {
      setActivity({ data: page.items, error: false })
    }).catch(() => setActivity({ data: null, error: true }))
  }, [user])

  const progressRows = useMemo(() => {
    const sets: Array<{ key: "AACCUP" | "ISO" | "CERT"; label: string; page: string }> = [
      { key: "AACCUP", label: "AACCUP", page: "aaccup" },
      { key: "ISO", label: "ISO", page: "iso" },
      { key: "CERT", label: "Certification", page: "cert" },
    ]
    return sets.map((set) => {
      const subs = attention.allSubmissions.filter((s) => s.areaSet === set.key)
      const total = subs.length
      const approved = subs.filter((s) => s.status === "APPROVED").length
      const pending = subs.filter((s) => s.status === "PENDING").length
      const returned = subs.filter((s) => s.status === "NEEDS_REVISION").length
      const pct = total > 0 ? Math.round((approved / total) * 100) : 0
      return { ...set, subs, total, approved, pending, returned, pct }
    })
  }, [attention.allSubmissions])

  const attentionItems = useMemo(() => {
    const items: Array<{ type: string; title: string; subtitle: string; badge: string; badgeVariant: "warning" | "danger" | "default" | "success" | "secondary"; page: string; query: Record<string, string> }> = []
    for (const sub of attention.returnedSubmissionsList.slice(0, 5)) {
      items.push({ type: "returned", title: sub.documentTitle, subtitle: `${sub.areaSet} · ${sub.areaName} · Returned`, badge: "Returned", badgeVariant: "warning", page: "aaccup", query: { tab: "submissions", highlight: sub.id, status: "NEEDS_REVISION" } })
    }
    for (const task of attention.overdueTasksList.slice(0, 5)) {
      items.push({ type: "overdue", title: task.title, subtitle: `${task.areaSet} · Due ${formatDate(task.dueDate)}`, badge: "Overdue", badgeVariant: "danger", page: "aaccup", query: { tab: "tasks", highlight: task.id, taskFilter: "overdue" } })
    }
    for (const task of attention.dueSoonTasksList.slice(0, 5)) {
      items.push({ type: "dueSoonn", title: task.title, subtitle: `${task.areaSet} · Due ${formatDate(task.dueDate)}`, badge: "Due Soon", badgeVariant: "warning", page: "aaccup", query: { tab: "tasks", highlight: task.id, taskFilter: "due-soon" } })
    }
    for (const req of attention.recentRequestUpdates.slice(0, 5)) {
      items.push({ type: "request", title: req.title, subtitle: `${req.status} · ${req.documents.length} file(s)`, badge: req.status, badgeVariant: req.status === "Approved" || req.status === "Fulfilled" ? "success" : req.status === "Rejected" ? "danger" : "secondary", page: "requests", query: { highlight: req.id, tab: req.status === "Pending" ? "pending" : req.status === "Approved" ? "approved" : req.status === "Fulfilled" ? "fulfilled" : req.status === "Rejected" ? "rejected" : "all" } })
    }
    return items.slice(0, 10)
  }, [attention])

  const nav = (page: string, query?: Record<string, string>) => onNavigate?.(page, query)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title={`Good morning, ${firstName}`} description="Here's what needs your attention." />

      <section aria-labelledby="uh-attn" className="mb-7">
        <h2 id="uh-attn" className="mb-3 text-sm font-semibold text-gray-900 sr-only">Needs Your Attention</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <button type="button" className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => nav("aaccup", { tab: "tasks", taskFilter: "due-soon" })}>
            <div className="flex items-start justify-between"><Clock3 className="h-5 w-5 text-blue-600" /><Badge variant="warning">Due Soon</Badge></div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{attention.loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-200" /> : attention.dueSoonTasks}</p>
            <p className="text-sm text-gray-500">Tasks</p><span className="mt-3 flex items-center text-xs font-medium text-blue-600">View <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
          </button>
          <button type="button" className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500" onClick={() => nav("aaccup", { tab: "submissions", status: "NEEDS_REVISION" })}>
            <div className="flex items-start justify-between"><RotateCcw className="h-5 w-5 text-amber-600" /><Badge variant="warning">Returned</Badge></div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{attention.loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-200" /> : attention.returnedSubmissions}</p>
            <p className="text-sm text-gray-500">Submissions</p><span className="mt-3 flex items-center text-xs font-medium text-amber-700">Fix <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
          </button>
          <button type="button" className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500" onClick={() => nav("requests", { tab: attention.pendingRequests > 0 ? "pending" : "all" })}>
            <div className="flex items-start justify-between"><Send className="h-5 w-5 text-emerald-600" /><Badge variant="default">Updates</Badge></div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{attention.loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-200" /> : attention.pendingRequests + attention.fulfilledRequests}</p>
            <p className="text-sm text-gray-500">Requests</p><span className="mt-3 flex items-center text-xs font-medium text-emerald-700">View <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
          </button>
        </div>
      </section>

      <Card className="mb-7 border-gray-200/70 shadow-sm">
        <CardHeader><CardTitle className="text-base">My Accreditation Progress</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {attention.loading && attention.allSubmissions.length === 0 ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-12" />)}</div>
          ) : progressRows.map((row) => (
            <button type="button" key={row.key} className="block w-full rounded-lg p-2 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => nav(row.page)}>
              <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium text-gray-800">{row.label}</span><span className="font-semibold text-gray-900">{row.pct}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${row.pct}%` }} /></div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <button type="button" className="text-green-700 hover:underline" onClick={(e) => { e.stopPropagation(); nav("aaccup", { tab: "submissions", status: "APPROVED" }) }}>Approved {row.approved}</button>
                <button type="button" className="text-amber-700 hover:underline" onClick={(e) => { e.stopPropagation(); nav("aaccup", { tab: "submissions", status: "PENDING" }) }}>Pending {row.pending}</button>
                <button type="button" className="text-orange-700 hover:underline" onClick={(e) => { e.stopPropagation(); nav("aaccup", { tab: "submissions", status: "NEEDS_REVISION" }) }}>Returned {row.returned}</button>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-7 border-gray-200/70 shadow-sm">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Needs Your Attention</CardTitle><Button variant="ghost" size="sm" onClick={() => nav("aaccup", { tab: "tasks" })}>View All <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader>
        <CardContent className="p-0">
          {attentionItems.length === 0 && !attention.loading ? (
            <p className="p-5 text-sm text-gray-500">Nothing needs your attention right now.</p>
          ) : attention.loading ? (
            <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-10" />)}</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {attentionItems.map((item: typeof attentionItems[number], idx: number) => (
                <button type="button" key={`${item.type}-${idx}`} className="grid w-full grid-cols-[minmax(0,2fr)_auto] gap-3 px-5 py-3 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]" onClick={() => nav(item.page, item.query)}>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-800">{item.title}</span>
                    <span className="text-xs text-gray-500">{item.subtitle}</span>
                  </div>
                  <span className="hidden sm:block text-xs text-gray-500" />
                  <Badge variant={item.badgeVariant} className="whitespace-nowrap text-[11px]">{item.badge}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-7 grid gap-5 lg:grid-cols-2">
        <Card className="border-gray-200/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">My Documents</CardTitle><Button variant="ghost" size="sm" onClick={() => nav("documents")}>Open Documents <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader>
          <CardContent>
            {docCount.error ? <p className="text-sm text-red-600">Documents are unavailable.</p> : docCount.data === null ? <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-8" />)}</div> : <div className="space-y-2">
              <div className="flex items-center justify-between rounded px-2 py-2 text-sm"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" />Files</span><span className="font-semibold text-gray-900">{docCount.data.files}</span></div>
              <div className="flex items-center justify-between rounded px-2 py-2 text-sm"><span className="flex items-center gap-2"><Folder className="h-4 w-4 text-amber-500" />Folders</span><span className="font-semibold text-gray-900">{docCount.data.folders}</span></div>
              <div className="flex items-center justify-between rounded px-2 py-2 text-sm"><span className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Favorites</span><span className="font-semibold text-gray-900">{docCount.data.favorites}</span></div>
              {attention.fulfilledRequests > 0 && <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><AlertCircle className="mr-1 inline h-3 w-3" />{attention.fulfilledRequests} requested document(s) delivered</div>}
            </div>}
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">My Requests</CardTitle><Button variant="ghost" size="sm" onClick={() => nav("requests")}>View Requests <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader>
          <CardContent className="space-y-2">
            <button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => nav("requests", { tab: "pending" })}><span>Pending</span><span className="font-semibold text-amber-700">{attention.loading ? "…" : attention.pendingRequests}</span></button>
            <button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => nav("requests", { tab: "approved" })}><span>Approved</span><span className="font-semibold text-green-700">{attention.loading ? "…" : attention.pendingRequests}</span></button>
            <button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => nav("requests", { tab: "fulfilled" })}><span>Fulfilled</span><span className="font-semibold text-blue-700">{attention.loading ? "…" : attention.fulfilledRequests}</span></button>
            <button type="button" className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-gray-50" onClick={() => nav("requests", { tab: "rejected" })}><span>Rejected</span><span className="font-semibold text-red-700">{attention.loading ? "…" : attention.refusedRequests}</span></button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/70 shadow-sm">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Recent Activity</CardTitle><Button variant="ghost" size="sm" onClick={() => nav("activity")}>My Activity <ArrowRight className="ml-1 h-4 w-4" /></Button></CardHeader>
        <CardContent className="p-0">
          {activity.error ? (
            <div className="p-5"><p className="text-sm text-red-600">Recent activity is unavailable.</p></div>
          ) : activity.data === null ? (
            <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-9" />)}</div>
          ) : activity.data.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No recent activity.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {activity.data.slice(0, 8).map((entry) => {
                const dest = activityDest(entry)
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-800">{entry.description ?? entry.action}</p>
                      <p className="text-xs text-gray-500">{entry.actorName ?? "System"} · {formatDate(entry.timestamp)}</p>
                    </div>
                    {dest ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" title="Open" onClick={() => nav(dest.page, dest.query)}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" title="Open" onClick={() => nav("activity")}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
