import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight, Clock3, RotateCcw, Send, ClipboardList,
  Folder, FileText, Star, AlertCircle,
} from "lucide-react"
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
import { cn } from "@/lib/utils"

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
    pendingRequests: 0, fulfilledRequests: 0, refusedRequests: 0, approvedRequests: 0,
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
    if (!user) return
    void Promise.all([
      listOnlineDocuments({ ownerId: user.id, archived: false }),
      listRepositoryFolders({ ownerId: user.id }),
      listFavoriteOnlineDocuments(),
    ]).then(([docs, folders, favs]) => {
      setDocCount({ data: { files: docs.length, folders: folders.length, favorites: favs.length }, error: false })
    }).catch(() => setDocCount({ data: null, error: true }))

    void listMyActivity({ page: 1, pageSize: 8 }).then((page) => {
      setActivity({ data: page.items, error: false })
    }).catch(() => setActivity({ data: null, error: true }))
  }, [user])

  const progressRows = useMemo(() => (
    (["AACCUP", "ISO", "CERT"] as const).map((set) => {
      const subs = attention.allSubmissions.filter((s) => s.areaSet === set)
      const total = subs.length
      const approved = subs.filter((s) => s.status === "APPROVED").length
      const pending = subs.filter((s) => s.status === "PENDING").length
      const returned = subs.filter((s) => s.status === "NEEDS_REVISION").length
      const pct = total > 0 ? Math.round((approved / total) * 100) : 0
      const label = set === "AACCUP" ? "AACCUP" : set === "ISO" ? "ISO" : "Certification"
      const page = set === "AACCUP" ? "aaccup" : set === "ISO" ? "iso" : "cert"
      return { key: set, label, page, subs, total, approved, pending, returned, pct }
    })
  ), [attention.allSubmissions])

  const nav = (page: string, query?: Record<string, string>) => onNavigate?.(page, query)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`Good morning, ${firstName}`}
        description="Here's what needs your attention."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-8">
        <Card className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => nav("aaccup", { tab: "tasks", taskFilter: "due-soon" })}>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock3 className="w-5 h-5" />
              </div>
              {attention.dueSoonTasks + attention.overdueTasks > 0 && (
                <Badge variant="warning" className="text-[10px]">Due Soon</Badge>
              )}
            </div>
            <div className="mt-3 md:mt-4">
              <p className="text-[12px] md:text-[13px] text-gray-500 font-medium">Tasks</p>
              <p className="text-[22px] md:text-[28px] font-semibold text-gray-900 mt-0.5 tracking-tight">
                {attention.loading ? "…" : attention.dueSoonTasks + attention.overdueTasks}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => nav("aaccup", { tab: "submissions", status: "NEEDS_REVISION" })}>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              {attention.returnedSubmissions > 0 && (
                <Badge variant="warning" className="text-[10px]">Returned</Badge>
              )}
            </div>
            <div className="mt-3 md:mt-4">
              <p className="text-[12px] md:text-[13px] text-gray-500 font-medium">Submissions</p>
              <p className="text-[22px] md:text-[28px] font-semibold text-gray-900 mt-0.5 tracking-tight">
                {attention.loading ? "…" : attention.returnedSubmissions}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => nav("requests", { tab: "pending" })}>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Send className="w-5 h-5" />
              </div>
              {attention.pendingRequests + attention.fulfilledRequests > 0 && (
                <Badge variant="default" className="text-[10px]">Updates</Badge>
              )}
            </div>
            <div className="mt-3 md:mt-4">
              <p className="text-[12px] md:text-[13px] text-gray-500 font-medium">Requests</p>
              <p className="text-[22px] md:text-[28px] font-semibold text-gray-900 mt-0.5 tracking-tight">
                {attention.loading ? "…" : attention.pendingRequests + attention.fulfilledRequests}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/60 shadow-sm mb-6 lg:mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="text-[15px] font-semibold">My Accreditation Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {attention.loading && attention.allSubmissions.length === 0 ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-12" />)}</div>
          ) : (
            progressRows.map((row) => (
              <div key={row.key}>
                <button
                  type="button"
                  className="block w-full rounded-lg p-2 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => nav(row.page)}
                >
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{row.label}</span>
                    <span className="font-semibold text-gray-900">{row.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${row.pct}%` }} />
                  </div>
                </button>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-2 text-xs">
                  <button type="button" className="text-emerald-600 hover:underline font-medium" onClick={() => nav("aaccup", { tab: "submissions", status: "APPROVED" })}>Approved {row.approved}</button>
                  <button type="button" className="text-amber-600 hover:underline font-medium" onClick={() => nav("aaccup", { tab: "submissions", status: "PENDING" })}>Pending {row.pending}</button>
                  <button type="button" className="text-orange-600 hover:underline font-medium" onClick={() => nav("aaccup", { tab: "submissions", status: "NEEDS_REVISION" })}>Returned {row.returned}</button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200/60 shadow-sm mb-6 lg:mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">Needs Your Attention</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] text-primary" onClick={() => nav("aaccup", { tab: "tasks" })}>View All</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {attention.loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-10" />)}</div>
          ) : attention.returnedSubmissionsList.length + attention.overdueTasksList.length + attention.dueSoonTasksList.length + attention.recentRequestUpdates.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-3 text-center">Nothing needs your attention right now.</p>
          ) : (
            <>
              {attention.returnedSubmissionsList.slice(0, 3).map((sub) => (
                <button key={`ret-${sub.id}`} type="button" onClick={() => nav("aaccup", { tab: "submissions", highlight: sub.id, status: "NEEDS_REVISION" })} className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50/50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{sub.documentTitle}</p>
                      <p className="text-[12px] text-gray-500">{sub.areaSet} · {sub.areaName}</p>
                    </div>
                  </div>
                  <Badge variant="warning" className="text-[10px]">Returned</Badge>
                </button>
              ))}
              {attention.overdueTasksList.slice(0, 2).map((task) => (
                <button key={`ovr-${task.id}`} type="button" onClick={() => nav("aaccup", { tab: "tasks", highlight: task.id, taskFilter: "overdue" })} className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50/50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Clock3 className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-[12px] text-gray-500">{task.areaSet} · Overdue {formatDate(task.dueDate)}</p>
                    </div>
                  </div>
                  <Badge variant="danger" className="text-[10px]">Overdue</Badge>
                </button>
              ))}
              {attention.dueSoonTasksList.slice(0, 2).map((task) => (
                <button key={`soon-${task.id}`} type="button" onClick={() => nav("aaccup", { tab: "tasks", highlight: task.id, taskFilter: "due-soon" })} className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50/50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Clock3 className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-[12px] text-gray-500">{task.areaSet} · Due {formatDate(task.dueDate)}</p>
                    </div>
                  </div>
                  <Badge variant="warning" className="text-[10px]">Due Soon</Badge>
                </button>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-6 lg:mb-8">
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold">My Documents</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] text-primary" onClick={() => nav("documents")}>Open<ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {docCount.error ? (
              <p className="text-[13px] text-red-500">Documents are unavailable.</p>
            ) : docCount.data === null ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-7" />)}</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2.5 text-gray-600"><FileText className="w-4 h-4 text-gray-400" />Files</span><span className="font-semibold text-gray-900">{docCount.data.files}</span></div>
                <div className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2.5 text-gray-600"><Folder className="w-4 h-4 text-amber-500" />Folders</span><span className="font-semibold text-gray-900">{docCount.data.folders}</span></div>
                <div className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2.5 text-gray-600"><Star className="w-4 h-4 text-amber-500" />Favorites</span><span className="font-semibold text-gray-900">{docCount.data.favorites}</span></div>
                {attention.fulfilledRequests > 0 && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{attention.fulfilledRequests} requested document(s) delivered
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold">My Requests</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] text-primary" onClick={() => nav("requests")}>View All<ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {attention.loading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rectangular" className="h-8" />)}</div>
            ) : (
              <div className="space-y-1">
                <button type="button" onClick={() => nav("requests", { tab: "pending" })} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] hover:bg-gray-50 transition-colors">
                  <span className="text-gray-600">Pending</span>
                  <span className={cn("font-semibold", attention.pendingRequests > 0 ? "text-amber-600" : "text-gray-400")}>{attention.pendingRequests}</span>
                </button>
                <button type="button" onClick={() => nav("requests", { tab: "approved" })} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] hover:bg-gray-50 transition-colors">
                  <span className="text-gray-600">Approved</span>
                  <span className={cn("font-semibold", attention.approvedRequests > 0 ? "text-emerald-600" : "text-gray-400")}>{attention.approvedRequests}</span>
                </button>
                <button type="button" onClick={() => nav("requests", { tab: "fulfilled" })} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] hover:bg-gray-50 transition-colors">
                  <span className="text-gray-600">Fulfilled</span>
                  <span className={cn("font-semibold", attention.fulfilledRequests > 0 ? "text-blue-600" : "text-gray-400")}>{attention.fulfilledRequests}</span>
                </button>
                <button type="button" onClick={() => nav("requests", { tab: "rejected" })} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] hover:bg-gray-50 transition-colors">
                  <span className="text-gray-600">Rejected</span>
                  <span className={cn("font-semibold", attention.refusedRequests > 0 ? "text-red-600" : "text-gray-400")}>{attention.refusedRequests}</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px] font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] text-primary" onClick={() => nav("activity")}>My Activity<ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {activity.error ? (
            <p className="text-[13px] text-red-500 py-2">Recent activity is unavailable.</p>
          ) : activity.data === null ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-9" />)}</div>
          ) : activity.data.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-2 text-center">No recent activity.</p>
          ) : (
            activity.data.slice(0, 5).map((entry) => {
              const dest = activityDest(entry)
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => dest ? nav(dest.page, dest.query) : nav("activity")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-gray-900 truncate">{entry.description ?? entry.action}</p>
                    <p className="text-[12px] text-gray-400">{entry.actorName ?? "System"} · {formatDate(entry.timestamp)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
