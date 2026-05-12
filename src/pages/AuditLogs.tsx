import { useState } from "react"
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  ChevronDown,
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
  {
    id: "LOG-001",
    timestamp: "2024-01-15 09:45:23",
    user: "Dr. Maria Santos",
    userRole: "System Administrator",
    initials: "MS",
    action: "Login",
    module: "Authentication",
    ipAddress: "192.168.1.100",
    status: "Success",
    details: "User successfully logged in to the system using email authentication with MFA verification.",
    device: "Desktop",
    browser: "Chrome 120.0",
    os: "Windows 11",
  },
  {
    id: "LOG-002",
    timestamp: "2024-01-15 09:50:12",
    user: "Prof. John Doe",
    userRole: "Document Manager",
    initials: "JD",
    action: "Upload",
    module: "Document Repository",
    ipAddress: "192.168.1.105",
    status: "Success",
    details: "Uploaded file 'Annual_Report_2024.pdf' to AACCUP Documents/Phase II folder.",
    device: "Laptop",
    browser: "Firefox 121.0",
    os: "macOS Sonoma",
  },
  {
    id: "LOG-003",
    timestamp: "2024-01-15 10:15:34",
    user: "Engr. Sarah Cruz",
    userRole: "Reviewer",
    initials: "SC",
    action: "Approve",
    module: "Submissions",
    ipAddress: "192.168.1.110",
    status: "Success",
    details: "Approved submission SUB-002 'Faculty Credentials - Dr. John Doe' with comments.",
    device: "Desktop",
    browser: "Edge 120.0",
    os: "Windows 10",
  },
  {
    id: "LOG-004",
    timestamp: "2024-01-15 10:30:45",
    user: "Dr. Peter Lim",
    userRole: "Editor",
    initials: "PL",
    action: "Edit",
    module: "Document Repository",
    ipAddress: "192.168.1.115",
    status: "Warning",
    details: "Attempted to edit restricted document 'Budget_2024.xlsx' without sufficient permissions.",
    device: "Tablet",
    browser: "Safari 17.2",
    os: "iPadOS 17",
  },
  {
    id: "LOG-005",
    timestamp: "2024-01-15 11:00:18",
    user: "Mr. James Wilson",
    userRole: "Department User",
    initials: "JW",
    action: "Login",
    module: "Authentication",
    ipAddress: "192.168.1.120",
    status: "Failed",
    details: "Failed login attempt due to incorrect password. Account locked after 3 failed attempts.",
    device: "Mobile",
    browser: "Chrome Mobile 120.0",
    os: "Android 14",
  },
  {
    id: "LOG-006",
    timestamp: "2024-01-15 11:20:09",
    user: "Ms. Lisa Chen",
    userRole: "Reviewer",
    initials: "LC",
    action: "Reject",
    module: "Submissions",
    ipAddress: "192.168.1.125",
    status: "Success",
    details: "Rejected submission SUB-006 'Budget Allocation Request' with reason: incomplete documentation.",
    device: "Desktop",
    browser: "Chrome 120.0",
    os: "Ubuntu 22.04",
  },
  {
    id: "LOG-007",
    timestamp: "2024-01-15 11:45:33",
    user: "Dr. Maria Santos",
    userRole: "System Administrator",
    initials: "MS",
    action: "Update Settings",
    module: "System Settings",
    ipAddress: "192.168.1.100",
    status: "Success",
    details: "Updated system settings: enabled two-factor authentication for all users.",
    device: "Desktop",
    browser: "Chrome 120.0",
    os: "Windows 11",
  },
  {
    id: "LOG-008",
    timestamp: "2024-01-15 12:00:00",
    user: "Prof. John Doe",
    userRole: "Document Manager",
    initials: "JD",
    action: "Create Folder",
    module: "Document Repository",
    ipAddress: "192.168.1.105",
    status: "Success",
    details: "Created new folder 'Q1_Reports_2024' in Faculty Files/Engineering department.",
    device: "Laptop",
    browser: "Firefox 121.0",
    os: "macOS Sonoma",
  },
  {
    id: "LOG-009",
    timestamp: "2024-01-15 13:15:22",
    user: "Dr. Robert Garcia",
    userRole: "Editor",
    initials: "RG",
    action: "Return Submission",
    module: "Submissions",
    ipAddress: "192.168.1.130",
    status: "Success",
    details: "Returned submission SUB-008 for revision with comments on missing attachments.",
    device: "Desktop",
    browser: "Chrome 120.0",
    os: "Windows 10",
  },
  {
    id: "LOG-010",
    timestamp: "2024-01-15 14:00:00",
    user: "Ms. Ana Reyes",
    userRole: "Viewer",
    initials: "AR",
    action: "Logout",
    module: "Authentication",
    ipAddress: "192.168.1.135",
    status: "Success",
    details: "User logged out of the system. Session duration: 2 hours 30 minutes.",
    device: "Desktop",
    browser: "Chrome 120.0",
    os: "Windows 11",
  },
]

const actionColors: Record<string, string> = {
  Login: "bg-blue-50 text-blue-700",
  Logout: "bg-gray-50 text-gray-600",
  Upload: "bg-green-50 text-green-700",
  Edit: "bg-amber-50 text-amber-700",
  Delete: "bg-red-50 text-red-700",
  Approve: "bg-emerald-50 text-emerald-700",
  Reject: "bg-red-50 text-red-700",
  "Return Submission": "bg-orange-50 text-orange-700",
  "Create Folder": "bg-purple-50 text-purple-700",
  "Update Settings": "bg-indigo-50 text-indigo-700",
}

export default function AuditLogs({ sidebarCollapsed = false }: AuditLogsProps) {
  const [isLogDetailsModalOpen, setIsLogDetailsModalOpen] = useState(false)
  const [isExportLogsModalOpen, setIsExportLogsModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const handleViewLog = (log: AuditLog) => {
    setSelectedLog(log)
    setIsLogDetailsModalOpen(true)
  }

  return (
    <>
      <main
        className="pt-16 pb-8 transition-all duration-200"
        style={{
          marginLeft: sidebarCollapsed ? "72px" : "260px",
        }}
      >
        <div className="p-8">
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
                              : log.status === "Warning"
                              ? "warning"
                              : "danger"
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
        </div>
      </main>

      <LogDetailsModal
        open={isLogDetailsModalOpen}
        onOpenChange={setIsLogDetailsModalOpen}
        log={selectedLog}
      />

      <ExportLogsModal
        open={isExportLogsModalOpen}
        onOpenChange={setIsExportLogsModalOpen}
      />
    </>
  )
}
