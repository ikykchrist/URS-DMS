import { useEffect, useState, useCallback } from "react"
import { Search, RefreshCw, ScrollText } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination"
import { listSystemAudit, type RootAuditEntry } from "@/services/root"

const PAGE_SIZE = 15

const PRESETS = [
  { label: "Today", key: "today", params: {} },
  { label: "Last 7 Days", key: "last7", params: {} },
  { label: "Last 30 Days", key: "last30", params: {} },
  { label: "Login Activity", key: "login_activity", params: { category: "AUTHENTICATION" } },
  { label: "Failed Security", key: "failed_security", params: { category: "SECURITY", result: "FAILED" } },
  { label: "Submissions", key: "submissions", params: { category: "SUBMISSION" } },
  { label: "Requests", key: "requests", params: { category: "REQUEST" } },
  { label: "Role/Permission", key: "role_changes", params: { category: "ACCESS_CONTROL" } },
  { label: "Critical Events", key: "critical", params: { severity: "CRITICAL" } },
]

const SEV_BADGES: Record<string, "success" | "warning" | "danger" | "default"> = {
  INFO: "success",
  WARNING: "warning",
  CRITICAL: "danger",
}

export default function RootAudit() {
  const [entries, setEntries] = useState<RootAuditEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [module, setModule] = useState("all")
  const [status, setStatus] = useState("all")
  const [activePreset, setActivePreset] = useState("")
  const [loading, setLoading] = useState(true)

  function presetDates(key?: string) {
    if (!key) return {}
    const now = new Date()
    const start = new Date(now)
    if (key === "today") {
      start.setHours(0, 0, 0, 0)
    } else {
      start.setDate(start.getDate() - (key === "last7" ? 7 : 30))
    }
    return { from: start.toISOString(), to: now.toISOString() }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
    const preset = PRESETS.find((p) => p.label === activePreset)
    const dates = presetDates(preset?.key)
    const result = await listSystemAudit({
        page,
        pageSize: PAGE_SIZE,
        q: search.trim() || undefined,
        module: module === "all" ? undefined : module,
        status: status === "all" ? undefined : status,
         ...dates,
         ...preset?.params,
       })
      setEntries(result.items)
      setTotal(result.meta.total)
      setTotalPages(Math.max(1, result.meta.totalPages))
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [page, search, module, status, activePreset])

  useEffect(() => {
    void load()
  }, [load])

  const handlePreset = (label: string) => {
    if (activePreset === label) {
      setActivePreset("")
    } else {
      setActivePreset(label)
      setPage(1)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="System Audit"
        description="Full platform audit trail"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} className="shadow-sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant={activePreset === p.label ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => handlePreset(p.label)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Card className="border-gray-200/60 shadow-sm mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="h-10 pl-9"
              placeholder="Search actions, users, entities…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select value={module} onValueChange={(v) => { setModule(v); setPage(1) }}>
            <SelectTrigger className="h-10 w-full sm:w-[160px]">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              <SelectItem value="auth">auth</SelectItem>
              <SelectItem value="root">root</SelectItem>
              <SelectItem value="configuration">configuration</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
              <SelectItem value="documents">documents</SelectItem>
              <SelectItem value="requests">requests</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="h-10 w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
               <SelectItem value="FAILED">Failure</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-gray-200/60 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="min-h-[280px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-gray-500">
              <ScrollText className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              No audit entries found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entries as RootAuditEntry[]).map((entry) => {
                  return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-[12px] text-gray-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-[13px] font-medium text-gray-900 max-w-[180px] truncate">
                      {entry.action}
                    </TableCell>
                    <TableCell>
                      {entry.category ? (
                        <Badge variant="secondary" className="text-[11px]">{entry.category}</Badge>
                      ) : (
                        <Badge variant="secondary">{entry.module}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.severity ? (
                        <Badge variant={SEV_BADGES[entry.severity] ?? "default"} className="text-[11px]">{entry.severity}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600">
                      {entry.user?.name || entry.actorName ? (
                        <div>
                          <div>{entry.actorName || entry.user?.name || "Unknown actor"}</div>
                          <div className="text-[11px] text-gray-400">{entry.actorRole || entry.user?.role || "—"}</div>
                        </div>
                      ) : <span className="text-gray-400">Unknown actor</span>}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600">
                      {entry.entity ? (
                        <div>
                          <div>{entry.entity.type}</div>
                          <div className="text-[11px] text-gray-400 truncate max-w-[120px]">
                            {entry.targetName || entry.entity.id}
                          </div>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.result === "SUCCESS" ? "success"
                          : entry.result === "FAILED" ? "danger"
                          : entry.result === "DENIED" ? "warning"
                          : entry.status === "SUCCESS" ? "success"
                           : entry.status === "FAILED" ? "danger"
                          : "default"
                        }
                        className="text-[11px]"
                      >
                        {entry.result || entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[12px] text-gray-500">{total} entries</span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem><PaginationLink isActive>{page}</PaginationLink></PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <span className="text-[12px] text-gray-500">page {page} of {totalPages}</span>
        </div>
      </Card>
    </div>
  )
}
