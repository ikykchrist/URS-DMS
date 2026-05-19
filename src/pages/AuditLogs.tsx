import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  Activity,
  CheckCircle,
  XCircle,
  Users,
  Eye,
  Calendar,
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { LogDetailsModal } from "@/components/modals/LogDetailsModal"
import { ExportLogsModal } from "@/components/modals/ExportLogsModal"

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

const auditLogs: AuditLog[] = [
  { id: "1", timestamp: "2024-01-15 09:23:45", user: "Dr. Maria Santos", userRole: "Super Admin", initials: "MS", action: "Login", module: "Authentication", ipAddress: "192.168.1.100", status: "Success", details: "Successful login via password", device: "Desktop", browser: "Chrome", os: "Windows" },
  { id: "2", timestamp: "2024-01-15 09:25:12", user: "Dr. Maria Santos", userRole: "Super Admin", initials: "MS", action: "Upload", module: "Documents", ipAddress: "192.168.1.100", status: "Success", details: "Uploaded Self-Study Report.pdf", device: "Desktop", browser: "Chrome", os: "Windows" },
  { id: "3", timestamp: "2024-01-15 10:15:33", user: "Prof. John Doe", userRole: "Analyst", initials: "JD", action: "Approve", module: "Submissions", ipAddress: "192.168.1.101", status: "Success", details: "Approved Area 5 submission", device: "Laptop", browser: "Firefox", os: "macOS" },
  { id: "4", timestamp: "2024-01-15 11:02:18", user: "Engr. Sarah Cruz", userRole: "Faculty", initials: "SC", action: "Upload", module: "Documents", ipAddress: "192.168.1.102", status: "Success", details: "Uploaded Curriculum Vitae", device: "Desktop", browser: "Safari", os: "macOS" },
  { id: "5", timestamp: "2024-01-15 11:45:55", user: "Dr. Peter Lim", userRole: "Analyst", initials: "PL", action: "Reject", module: "Submissions", ipAddress: "192.168.1.103", status: "Success", details: "Rejected incomplete submission", device: "Laptop", browser: "Edge", os: "Windows" },
  { id: "6", timestamp: "2024-01-15 12:30:22", user: "Ms. Lisa Chen", userRole: "Staff", initials: "LC", action: "Edit", module: "Users", ipAddress: "192.168.1.104", status: "Success", details: "Updated user permissions", device: "Desktop", browser: "Chrome", os: "Windows" },
  { id: "7", timestamp: "2024-01-15 13:15:08", user: "Unknown User", userRole: "-", initials: "??", action: "Login", module: "Authentication", ipAddress: "10.0.0.55", status: "Failed", details: "Failed login attempt - invalid credentials", device: "Unknown", browser: "Unknown", os: "Unknown" },
  { id: "8", timestamp: "2024-01-15 14:22:41", user: "Dr. Maria Santos", userRole: "Super Admin", initials: "MS", action: "Delete", module: "Documents", ipAddress: "192.168.1.100", status: "Success", details: "Deleted outdated document", device: "Desktop", browser: "Chrome", os: "Windows" },
  { id: "9", timestamp: "2024-01-15 15:05:17", user: "Prof. John Doe", userRole: "Analyst", initials: "JD", action: "Export", module: "Reports", ipAddress: "192.168.1.101", status: "Success", details: "Exported audit report", device: "Laptop", browser: "Firefox", os: "macOS" },
  { id: "10", timestamp: "2024-01-15 16:40:33", user: "Engr. Sarah Cruz", userRole: "Faculty", initials: "SC", action: "Upload", module: "Documents", ipAddress: "192.168.1.102", status: "Success", details: "Uploaded Annual Report 2023", device: "Desktop", browser: "Safari", os: "macOS" },
]

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

export default function AuditLogs({ sidebarCollapsed: _sidebarCollapsed = false }: AuditLogsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isLogDetailsModalOpen, setIsLogDetailsModalOpen] = useState(false)
  const [isExportLogsModalOpen, setIsExportLogsModalOpen] = useState(() => searchParams.get("modal") === "generate-report")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const handleCloseExportLogsModal = (open: boolean) => {
    setIsExportLogsModalOpen(open)
    if (!open) {
      searchParams.delete("modal")
      setSearchParams(searchParams)
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
          <Button
            variant="outline"
            onClick={() => setIsExportLogsModalOpen(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Activities"
          value="12,458"
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          title="Successful Actions"
          value="11,892"
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Failed Actions"
          value="156"
          icon={<XCircle className="w-5 h-5" />}
          trend={{ value: 12, positive: false }}
        />
        <StatCard
          title="Active Users Today"
          value="42"
          icon={<Users className="w-5 h-5" />}
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
                  className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select defaultValue="all">
                <SelectTrigger className="w-[160px] h-9">
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="maria">Dr. Maria Santos</SelectItem>
                  <SelectItem value="john">Prof. John Doe</SelectItem>
                  <SelectItem value="sarah">Engr. Sarah Cruz</SelectItem>
                  <SelectItem value="peter">Dr. Peter Lim</SelectItem>
                  <SelectItem value="lisa">Ms. Lisa Chen</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
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
              <Select defaultValue="all">
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9">
                <Calendar className="w-3.5 h-3.5 mr-2" />
                Date Range
              </Button>
              <Button variant="outline" size="sm" className="h-9">
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
              {auditLogs.map((log) => (
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
          <div className="mt-4 px-5 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-gray-500">
              Showing 10 of 12,458 logs
            </p>
            <Pagination>
              <PaginationPrevious className="h-8" />
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink className="h-8 w-8">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive className="h-8 w-8">
                    2
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="h-8 w-8">3</PaginationLink>
                </PaginationItem>
                <PaginationEllipsis className="h-8 w-8" />
                <PaginationItem>
                  <PaginationLink className="h-8 w-8">1,246</PaginationLink>
                </PaginationItem>
              </PaginationContent>
              <PaginationNext className="h-8" />
            </Pagination>
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
    </div>
  )
}