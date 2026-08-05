import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Search,
  Download,
  RotateCcw,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { LogDetailsModal } from "@/components/modals/LogDetailsModal"
import { ExportLogsModal } from "@/components/modals/ExportLogsModal"
import { listAuditEntries, clearAuditLogs, type AuditEntry } from "@/services/admin"
import { toast } from "@/lib/toast"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  userRole: string
  initials: string
  action: string
  module: string
  ipAddress: string
  status: "Success" | "Warning" | "Failed"
  details: string
  device: string
  browser: string
  os: string
}

interface AuditLogsProps {
  sidebarCollapsed?: boolean
}

const actionColors: Record<string, string> = {
  Login: "bg-blue-50 text-blue-700",
  Logout: "bg-gray-100 text-gray-600",
  Upload: "bg-green-50 text-green-700",
  Download: "bg-emerald-50 text-emerald-700",
  Edit: "bg-yellow-50 text-yellow-700",
  Delete: "bg-red-50 text-red-700",
  Approve: "bg-emerald-50 text-emerald-700",
  Reject: "bg-orange-50 text-orange-700",
  Export: "bg-purple-50 text-purple-700",
}

function parseUserAgent(userAgent: string | null): { browser: string; os: string; device: string } {
  const agent = userAgent ?? ""
  const browser = agent.includes("Chrome")
    ? "Chrome"
    : agent.includes("Firefox")
    ? "Firefox"
    : agent.includes("Safari")
    ? "Safari"
    : agent.includes("Edg")
    ? "Edge"
    : agent
    ? "Unknown"
    : "—"
  const os = agent.includes("Windows")
    ? "Windows"
    : agent.includes("Mac")
    ? "macOS"
    : agent.includes("Linux")
    ? "Linux"
    : agent.includes("Android")
    ? "Android"
    : agent.includes("iPhone") || agent.includes("iOS")
    ? "iOS"
    : agent
    ? "Unknown"
    : "—"
  const device = /Android|iPhone|iPad|Mobile/i.test(agent) ? "Mobile" : agent ? "Desktop" : "—"
  return { browser, os, device }
}

function toAuditLog(entry: AuditEntry): AuditLog {
  const agent = parseUserAgent(entry.userAgent)
  const name = entry.user?.name ?? "Unknown User"
  return {
    id: entry.id,
    timestamp: new Date(entry.timestamp).toLocaleString(),
    user: name,
    userRole: entry.user?.role ?? "-",
    initials: name === "Unknown User" ? "??" : name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    action: entry.action,
    module: entry.module,
    ipAddress: entry.ipAddress ?? "—",
    status: entry.status === "FAILED" ? "Failed" : "Success",
    details: entry.entity?.type ? `${entry.entity.type} ${entry.entity.id ?? ""}`.trim() : "No additional details",
    device: agent.device,
    browser: agent.browser,
    os: agent.os,
  }
}

export default function AuditLogs({ sidebarCollapsed: _sidebarCollapsed = false }: AuditLogsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isLogDetailsModalOpen, setIsLogDetailsModalOpen] = useState(false)
  const [isExportLogsModalOpen, setIsExportLogsModalOpen] = useState(() => searchParams.get("modal") === "generate-report")
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [successTotal, setSuccessTotal] = useState(0)
  const [failedTotal, setFailedTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listAuditEntries({
      page: 1,
      pageSize: 10,
      q: searchQuery || undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      status: statusFilter === "all" ? undefined : statusFilter === "success" ? "SUCCESS" : "FAILED",
    })
      .then((page) => {
        if (cancelled) return
        setLogs(page.items.map(toAuditLog))
        setTotal(page.meta.total)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    listAuditEntries({ page: 1, pageSize: 1, status: "SUCCESS" })
      .then((page) => {
        if (!cancelled) setSuccessTotal(page.meta.total)
      })
      .catch(() => {})
    listAuditEntries({ page: 1, pageSize: 1, status: "FAILED" })
      .then((page) => {
        if (!cancelled) setFailedTotal(page.meta.total)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [searchQuery, actionFilter, statusFilter, reloadKey])

  const handleCloseExportLogsModal = (open: boolean) => {
    setIsExportLogsModalOpen(open)
    if (!open) {
      searchParams.delete("modal")
      setSearchParams(searchParams)
    }
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setActionFilter("all")
    setStatusFilter("all")
  }

  const handleClearLogs = async () => {
    setClearing(true)
    try {
      const cleared = await clearAuditLogs()
      toast.success(`Cleared ${cleared.toLocaleString()} audit log${cleared === 1 ? "" : "s"}`)
      setIsClearDialogOpen(false)
      setSearchQuery("")
      setActionFilter("all")
      setStatusFilter("all")
      setReloadKey((k) => k + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear audit logs")
    } finally {
      setClearing(false)
    }
  }

  const handleViewLog = (log: AuditLog) => {
    setSelectedLog(log)
    setIsLogDetailsModalOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Audit Logs"
        description="Track and monitor all system activities and user actions."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsExportLogsModalOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsClearDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Logs
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard
          title="Total Activities"
          value={total.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          title="Successful Actions"
          value={successTotal.toLocaleString()}
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Failed Actions"
          value={failedTotal.toLocaleString()}
          icon={<XCircle className="w-5 h-5" />}
        />
      </div>

      <Card className="border-gray-200/60 shadow-sm mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9" onClick={handleResetFilters}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200/60 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500 text-[14px]">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500 text-[14px]">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <span className="text-[13px] text-gray-600 font-mono">
                      {log.timestamp}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[11px] bg-gray-100 text-gray-700 font-medium">
                          {log.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[14px] font-medium text-gray-900">{log.user}</p>
                        <p className="text-[11px] text-gray-500">{log.userRole}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium ${
                        actionColors[log.action] || "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-gray-600">{log.module}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-gray-500 font-mono">
                      {log.ipAddress}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "Success"
                          ? "success"
                          : log.status === "Failed"
                          ? "danger"
                          : "warning"
                      }
                      className="font-medium"
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-gray-900"
                      onClick={() => handleViewLog(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 px-5 pb-5 flex items-center justify-between gap-4">
            <p className="text-[13px] text-gray-500">
              Showing {logs.length} of {total.toLocaleString()} logs
            </p>
          </div>
        </CardContent>
      </Card>

      <LogDetailsModal
        open={isLogDetailsModalOpen}
        onOpenChange={setIsLogDetailsModalOpen}
        log={selectedLog}
      />

      <ExportLogsModal
        open={isExportLogsModalOpen}
        onOpenChange={handleCloseExportLogsModal}
      />

      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Clear Audit Logs</DialogTitle>
            <DialogDescription className="text-[14px]">
              This will permanently delete every audit log entry. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="h-9" onClick={() => setIsClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-9"
              disabled={clearing}
              onClick={() => void handleClearLogs()}
            >
              {clearing ? "Clearing..." : "Clear Logs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}