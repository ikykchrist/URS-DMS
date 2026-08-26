import { useState, useEffect, useCallback } from "react"
import { Search, Filter, RotateCcw, Clock, CheckCircle, XCircle, ShieldAlert } from "lucide-react"
import { listMyActivity, type AuditEntry } from "@/services/admin"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { cn } from "@/lib/utils"

const CATEGORY_COLORS: Record<string, string> = {
  AUTHENTICATION: "bg-primary-50 text-blue-700 border-blue-200",
  SUBMISSION: "bg-purple-50 text-purple-700 border-purple-200",
  REQUEST: "bg-amber-50 text-amber-700 border-amber-200",
  SECURITY: "bg-red-50 text-red-700 border-red-200",
  ACCESS_CONTROL: "bg-orange-50 text-orange-700 border-orange-200",
  SYSTEM: "bg-gray-50 text-gray-700 border-border",
  REPOSITORY: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

const RESULT_BADGES: Record<string, { color: string; icon: React.ReactNode }> = {
  SUCCESS: { color: "bg-emerald-50 text-emerald-700", icon: <CheckCircle className="w-3 h-3" /> },
  FAILED: { color: "bg-red-50 text-red-700", icon: <XCircle className="w-3 h-3" /> },
  DENIED: { color: "bg-amber-50 text-amber-700", icon: <ShieldAlert className="w-3 h-3" /> },
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
  } catch {
    return iso
  }
}

function actionLabel(action: string): string {
  return action
    .split(".")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default function MyActivity() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [result, setResult] = useState("")
  const [detailId, setDetailId] = useState<string | null>(null)

  const fetch = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await listMyActivity({
          page: p,
          pageSize: 20,
          q: q || undefined,
          category: category || undefined,
          result: result || undefined,
        })
        setEntries(res.items)
        setTotalPages(res.meta.totalPages)
        setTotal(res.meta.total)
      } catch {
        setEntries([])
      } finally {
        setLoading(false)
      }
    },
    [q, category, result],
  )

  useEffect(() => {
    fetch(page)
  }, [page, fetch])

  const handleSearch = () => {
    setPage(1)
    fetch(1)
  }

  const handleReset = () => {
    setQ("")
    setCategory("")
    setResult("")
    setPage(1)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="My Activity"
        description={`Your recent activity across URS-DMS${total > 0 ? ` · ${total} entries` : ""}`}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search activity..."
            className="pl-9 h-9 text-[13px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
          <SelectTrigger className="w-[160px] h-9 text-[13px]">
            <Filter className="w-3.5 h-3.5 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
            <SelectItem value="SUBMISSION">Submission</SelectItem>
            <SelectItem value="REQUEST">Request</SelectItem>
            <SelectItem value="SECURITY">Security</SelectItem>
            <SelectItem value="ACCESS_CONTROL">Access Control</SelectItem>
            <SelectItem value="REPOSITORY">Repository</SelectItem>
            <SelectItem value="SYSTEM">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={result} onValueChange={(v) => { setResult(v); setPage(1) }}>
          <SelectTrigger className="w-[140px] h-9 text-[13px]">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="DENIED">Denied</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 text-[13px]">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[13px] text-gray-500">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading activity...
        </div>
      ) : entries.length === 0 ? (
        <div className="py-20 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No activity found</p>
          <p className="text-[12px] text-gray-400 mt-1">
            {q || category || result ? "Try adjusting your filters." : "Your actions will appear here as you use URS-DMS."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className={cn(
                  "border-border/70 shadow-soft hover:shadow-lift transition-shadow cursor-pointer",
                  detailId === entry.id && "ring-2 ring-[#2563EB]",
                )}
                onClick={() => setDetailId(detailId === entry.id ? null : entry.id)}
              >
                <CardContent className="p-4 pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {RESULT_BADGES[entry.result] && (
                          <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full", RESULT_BADGES[entry.result].color)}>
                            {RESULT_BADGES[entry.result].icon}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 truncate">
                          {actionLabel(entry.action)}
                        </p>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {formatTimestamp(entry.timestamp)}
                          {entry.targetName && <span> &middot; {entry.targetName}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.category && (
                        <Badge variant="secondary" className={cn("text-[11px] border", CATEGORY_COLORS[entry.category] ?? "bg-gray-50 text-gray-600")}>
                          {entry.category.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <Badge variant={entry.result === "SUCCESS" ? "success" : entry.result === "FAILED" ? "danger" : "warning"} className="text-[11px]">
                        {entry.result}
                      </Badge>
                    </div>
                  </div>
                  {detailId === entry.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
                      <div>
                        <p className="text-gray-400">Action</p>
                        <p className="text-gray-700 font-medium">{actionLabel(entry.action)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Category</p>
                        <p className="text-gray-700">{entry.category || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Result</p>
                        <p className="text-gray-700">{entry.result}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Timestamp</p>
                        <p className="text-gray-700">{formatTimestamp(entry.timestamp)}</p>
                      </div>
                      {entry.targetType && (
                        <div>
                          <p className="text-gray-400">Target</p>
                          <p className="text-gray-700">{entry.targetType}{entry.targetId ? `: ${entry.targetId.slice(0, 8)}...` : ""}</p>
                        </div>
                      )}
                      {entry.ipAddress && (
                        <div>
                          <p className="text-gray-400">IP Address</p>
                          <p className="text-gray-700">{entry.ipAddress}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[12px] text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-[12px]" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[12px]" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
