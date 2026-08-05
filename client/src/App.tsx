import { useState, useEffect, lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  ArrowRight,
  FileCheck,
  RotateCcw,
  Folder,
  HardDrive,
  Award,
} from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopNav } from "@/components/layout/TopNav"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { ChartCard } from "@/components/layout/ChartCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import DocumentRepository from "@/pages/DocumentRepository"
import Submissions from "@/pages/Submissions"
import UserManagement from "@/pages/UserManagement"
import AuditLogs from "@/pages/AuditLogs"
import Settings from "@/pages/Settings"
import AACCUPManagement from "@/pages/AACCUPManagement"
import AACCUPManagementISO from "@/pages/AACCUPManagementISO"
import AACCUPManagementCert from "@/pages/AACCUPManagementCert"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { AuthProvider, useAuth } from "@/context/AuthContext"
import { ThemeProvider } from "@/lib/theme"
import { ToastContainer, toast } from "@/lib/toast"
import { isAdminRole, isRootRole } from "@/lib/permissions"
import { getDashboardOverview, type DashboardOverview } from "@/services/dashboard"
import { getUploadsAnalytics, type UploadsAnalytics } from "@/services/analytics"
import { listRequests } from "@/services/requests"
import type { DocumentRequest } from "@/types/domain"
import { notificationService } from "@/services/notifications"
import { listOnlineDocuments, openOnlineDocument } from "@/services/documents"
import LoginPage from "@/pages/Login"
import ForgotPasswordPage from "@/pages/ForgotPassword"
import ResetPasswordPage from "@/pages/ResetPassword"
const RootDashboard = lazy(() => import("@/pages/root/RootDashboard"))
const RootConfigurations = lazy(() => import("@/pages/root/RootConfigurations"))
const RootAudit = lazy(() => import("@/pages/root/RootAudit"))
const RootUsers = lazy(() => import("@/pages/root/RootUsers"))
const RootOrganization = lazy(() => import("@/pages/root/RootOrganization"))
const RootFolderBuilder = lazy(() => import("@/pages/root/RootFolderBuilder"))
const RootRequirementBuilder = lazy(() => import("@/pages/root/RootRequirementBuilder"))
const RootWorkflowBuilder = lazy(() => import("@/pages/root/RootWorkflowBuilder"))
const RootFormBuilder = lazy(() => import("@/pages/root/RootFormBuilder"))
const RootSetupWizard = lazy(() => import("@/pages/root/RootSetupWizard"))
import { UserSidebar } from "@/components/user/UserSidebar"
import { UserTopNav } from "@/components/user/UserTopNav"
import UserDashboard from "@/pages/user/UserDashboard"
import UserDocuments from "@/pages/user/UserDocuments"
import UserRequests from "@/pages/user/UserRequests"
import UserBrowseArchive from "@/pages/user/UserBrowseArchive"
import UserSubmitRequest from "@/pages/user/UserSubmitRequest"
import UserAACCUP from "@/pages/user/UserAACCUP"
import UserAACCUPISO from "@/pages/user/UserAACCUPISO"
import UserAACCUPCert from "@/pages/user/UserAACCUPCert"
import UserNotifications from "@/pages/user/UserNotifications"
import UserProfile from "@/pages/user/UserProfile"
import UserSettings from "@/pages/user/UserSettings"

function shortBucketLabel(label: string): string {
  const month = /^(\d{4})-(\d{2})$/.exec(label)
  if (month) {
    return new Date(Number(month[1]), Number(month[2]) - 1, 1).toLocaleString("en", { month: "short" })
  }
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label)
  if (day) {
    const d = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
    return d.toLocaleString("en", { month: "short", day: "numeric" })
  }
  return label
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} ${units[i]}`
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[13px] text-gray-400">{label}</p>
    </div>
  )
}

interface ActionWidgetProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  badge: string
  badgeVariant: "success" | "warning" | "danger" | "default" | "secondary"
  onClick: () => void
}

function ActionWidget({ icon, iconBg, iconColor, title, subtitle, badge, badgeVariant, onClick }: ActionWidgetProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-150 group"
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900">{title}</p>
        <p className="text-[12px] text-gray-500 truncate">{subtitle}</p>
      </div>
      <Badge variant={badgeVariant} className="text-[11px] flex-shrink-0">
        {badge}
      </Badge>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
    </button>
  )
}

function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [filterStatus, setFilterStatus] = useState("all")
  const [report, setReport] = useState<DashboardOverview | null>(null)
  const [uploads, setUploads] = useState<UploadsAnalytics | null>(null)
  const [recentRequests, setRecentRequests] = useState<DocumentRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)

  useEffect(() => {
    getDashboardOverview()
      .then(setReport)
      .catch(() => setReport(null))
    getUploadsAnalytics({ granularity: "monthly" })
      .then(setUploads)
      .catch(() => setUploads(null))
    listRequests()
      .then(setRecentRequests)
      .catch(() => setRecentRequests([]))
      .finally(() => setIsLoadingRequests(false))
  }, [])

  const statusDistribution = report
    ? [
        { name: "Approved", value: report.requests.approved, color: "#10B981" },
        { name: "Pending", value: report.requests.pending, color: "#F59E0B" },
        { name: "Rejected", value: report.requests.rejected, color: "#EF4444" },
        { name: "Fulfilled", value: report.requests.fulfilled, color: "#6366F1" },
      ]
    : []

  const submissionChartData = (uploads?.overTime ?? []).map((p) => ({
    name: shortBucketLabel(p.label),
    submissions: p.value,
  }))

  const categoryChartData = (uploads?.perDepartment ?? []).map((b) => ({
    category: b.label,
    count: b.value,
  }))

  const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

  const filteredRequests = recentRequests.filter((r) => {
    if (filterStatus === "all") return true
    const wanted = filterStatus === "review" ? "In Review" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)
    return r.status === wanted
  })

  const visibleRequests = filteredRequests.slice(0, 6)

  const handleDownload = async (submission: DocumentRequest) => {
    try {
      const allDocs = await listOnlineDocuments({ search: submission.title.slice(0, 10) })
      const doc = allDocs.find((d) => d.name.toLowerCase().includes(submission.title.toLowerCase().slice(0, 10)))
      if (doc) {
        await openOnlineDocument(doc)
      } else {
        toast.info(`Open Document Repository to download "${submission.title}"`)
      }
    } catch {
      toast.error("Download failed")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge variant="success">{status}</Badge>
      case "Pending":
        return <Badge variant="warning">{status}</Badge>
      case "Rejected":
        return <Badge variant="danger">{status}</Badge>
      case "In Review":
        return <Badge variant="default">{status}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's an overview of your document management system."
          actions={
            <Button className="shadow-sm" onClick={() => onNavigate('documents')}>
              <FileText className="w-4 h-4 mr-2" />
              Open Repository
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-8">
          <StatCard
            title="Total Folders"
            value={report ? String(report.documents.totalFolders) : "â€”"}
            icon={<Folder className="w-5 h-5" />}
          />
          <StatCard
            title="Total Documents"
            value={report ? String(report.documents.totalDocuments) : "â€”"}
            icon={<FileText className="w-5 h-5" />}
            trend={
              report
                ? {
                    value: share(report.documents.uploadedThisMonth, report.documents.totalDocuments),
                    positive: report.documents.uploadedThisMonth > 0,
                  }
                : undefined
            }
          />
          <StatCard
            title="Storage Used"
            value={report ? formatBytes(Number(report.storage.totalStorageUsedBytes)) : "â€”"}
            icon={<HardDrive className="w-5 h-5" />}
          />
          <StatCard
            title="Pending Review"
            value={report ? String(report.requests.pending) : "â€”"}
            icon={<Clock className="w-5 h-5" />}
            trend={
              report
                ? { value: share(report.requests.pending, report.requests.totalRequests), positive: false }
                : undefined
            }
          />
          <StatCard
            title="Approved"
            value={report ? String(report.requests.approved) : "â€”"}
            icon={<CheckCircle className="w-5 h-5" />}
            trend={
              report
                ? { value: share(report.requests.approved, report.requests.totalRequests), positive: true }
                : undefined
            }
          />
          <StatCard
            title="Active Users"
            value={report ? String(report.users.activeUsers) : "â€”"}
            icon={<Users className="w-5 h-5" />}
            trend={
              report
                ? { value: share(report.users.activeUsers, report.users.totalUsers), positive: true }
                : undefined
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-8">
          {(
            [
              { key: "AACCUP", label: "AACCUP Compliance", bg: "bg-amber-50", text: "text-amber-600" },
              { key: "ISO", label: "ISO Compliance", bg: "bg-blue-50", text: "text-blue-600" },
              { key: "CERT", label: "Certification Compliance", bg: "bg-emerald-50", text: "text-emerald-600" },
            ] as const
          ).map(({ key, label, bg, text }) => {
            const stats = report?.aaccup.byAreaSet[key]
            return (
              <Card
                key={key}
                className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onNavigate(key === "AACCUP" ? "aaccup" : key === "ISO" ? "iso" : "certification")}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg ${bg} flex items-center justify-center ${text}`}>
                      <Award className="w-5 h-5" />
                    </div>
                    {stats && (
                      <span className="text-[11px] md:text-[12px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        {stats.overallCompliancePercentage}%
                      </span>
                    )}
                  </div>
                  <div className="mt-3 md:mt-4">
                    <p className="text-[12px] md:text-[13px] text-gray-500 font-medium truncate">{label}</p>
                    <p className="text-[18px] md:text-[22px] font-semibold text-gray-900 mt-0.5 tracking-tight">
                      {stats ? `${stats.totalAreas} areas` : "â€”"}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {stats
                        ? `${stats.totalSubmissions} submissions Â· ${stats.approved} approved`
                        : "Loadingâ€¦"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 mb-6 lg:mb-8">
          <ChartCard
            title="Submission Trends"
            description="Monthly document submissions"
            className="lg:col-span-2"
          >
            <div className="h-[200px] sm:h-[240px] lg:h-[280px]">
              {submissionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={submissionChartData}>
                  <defs>
                    <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="submissions"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSubmissions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <ChartEmpty label="No upload activity recorded yet" />
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="Document Status"
            description="Current distribution"
          >
            <div className="h-[200px]">
              {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <ChartEmpty label="No requests recorded yet" />
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] text-gray-500 font-medium">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-6 lg:mb-8">
          <ChartCard title="Uploads by Department" description="Document uploads per department">
            <div className="h-[180px] sm:h-[200px] md:h-[220px]">
              {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="category" type="category" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={110} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <ChartEmpty label="No uploads recorded yet" />
              )}
            </div>
          </ChartCard>

          <ChartCard title="Action Center" description="Tasks needing your attention">
            {report ? (
            <div className="space-y-3">
              <ActionWidget
                icon={<Clock className="w-4 h-4" />}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                title="Pending Approvals"
                subtitle={`${report.requests.pending} requests awaiting review`}
                badge={String(report.requests.pending)}
                badgeVariant="warning"
                onClick={() => onNavigate('submissions')}
              />
              <ActionWidget
                icon={<RotateCcw className="w-4 h-4" />}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
                title="Needs Revision"
                subtitle={`${report.aaccup.needsRevision} submissions returned for revision`}
                badge={String(report.aaccup.needsRevision)}
                badgeVariant="warning"
                onClick={() => onNavigate('aaccup')}
              />
              <ActionWidget
                icon={<FileCheck className="w-4 h-4" />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                title="Recent Uploads"
                subtitle={`${report.documents.uploadedToday} new documents today`}
                badge={String(report.documents.uploadedToday)}
                badgeVariant="success"
                onClick={() => onNavigate('documents')}
              />
              <ActionWidget
                icon={<CheckCircle className="w-4 h-4" />}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                title="Compliance"
                subtitle="Overall AACCUP compliance"
                badge={`${report.aaccup.overallCompliancePercentage}%`}
                badgeVariant="default"
                onClick={() => onNavigate('aaccup')}
              />
            </div>
            ) : (
              <p className="text-[13px] text-gray-500">Loading overview dataâ€¦</p>
            )}
          </ChartCard>
        </div>

        <Card className="border-gray-200/60 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base md:text-[17px] font-semibold">Recent Submissions</CardTitle>
                <p className="text-[13px] text-gray-500 mt-1 hidden sm:block">
                  Latest document submissions awaiting review
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] md:w-[140px] h-9">
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="review">In Review</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-9 hidden sm:inline-flex" onClick={() => onNavigate('submissions')}>View All</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">ID</TableHead>
                  <TableHead className="whitespace-nowrap">Title</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Category</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell">Submitted By</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRequests.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium text-gray-700 whitespace-nowrap">{submission.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell className="max-w-[150px] md:max-w-[220px] truncate font-medium text-gray-900">
                      {submission.title}
                    </TableCell>
                    <TableCell className="text-gray-500 whitespace-nowrap hidden md:table-cell">{submission.documents[0]?.documentName ?? "General Request"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 md:h-7 md:w-7">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${submission.submittedByName}`} />
                          <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                            {submission.submittedByName.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] text-gray-700 whitespace-nowrap">{submission.submittedByName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-[13px] whitespace-nowrap hidden sm:table-cell">{formatDate(submission.dateSubmitted)}</TableCell>
                    <TableCell className="whitespace-nowrap">{getStatusBadge(submission.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-gray-500 hover:text-gray-900" onClick={() => onNavigate('submissions')}>
                          <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-gray-500 hover:text-gray-900" onClick={() => handleDownload(submission)}>
                          <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-gray-500 hover:text-gray-900">
                              <MoreHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onNavigate('submissions')}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(submission)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onNavigate('submissions')}>
                              <FileText className="w-4 h-4 mr-2" />
                              View in Submissions
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoadingRequests && visibleRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 text-[13px] py-8">
                      No submissions match your filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-4 px-4 md:px-5 pb-4 md:pb-5 flex items-center justify-between gap-3">
              <p className="text-[12px] md:text-[13px] text-gray-500">
                <span className="sm:hidden">{visibleRequests.length}/{recentRequests.length}</span>
                <span className="hidden sm:inline">
                  {isLoadingRequests
                    ? "Loading submissionsâ€¦"
                    : `Showing ${visibleRequests.length} of ${recentRequests.length} submissions`}
                </span>
              </p>
              <Button variant="outline" size="sm" className="h-8" onClick={() => onNavigate('submissions')}>
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    return saved ? JSON.parse(saved) : false
  })
  const [activePage, setActivePage] = useState(() => {
    const saved = localStorage.getItem("activePage")
    return saved || "dashboard"
  })
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const routeToPageMap: Record<string, string> = {
    "/": "dashboard",
    "/dashboard": "dashboard",
    "/documents": "documents",
    "/repository": "documents",
    "/submissions": "submissions",
    "/users": "users",
    "/user-management": "users",
    "/audit": "audit",
    "/audit-logs": "audit",
    "/settings": "settings",
    "/aaccup": "aaccup",
    "/aaccup-management": "aaccup",
    "/iso": "iso",
    "/certification": "certification",
    "/root": "root",
    "/root-organization": "root-organization",
    "/root-folder-builder": "root-folder-builder",
    "/root-requirement-builder": "root-requirement-builder",
    "/root-form-builder": "root-form-builder",
    "/root-setup-wizard": "root-setup-wizard",
    "/root-config": "root-config",
    "/root-audit": "root-audit",
    "/root-users": "root-users",
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    const page = routeToPageMap[path]
    if (page && page !== activePage) {
      setActivePage(page)
      localStorage.setItem("activePage", page)
    }
  }, [])

  const pageTitles: Record<string, string> = {
    dashboard: "Dashboard",
    documents: "Document Repository",
    submissions: "Submissions",
    users: "User Management",
    audit: "Audit Logs",
    settings: "Settings",
    aaccup: "AACCUP Management",
    iso: "ISO Management",
    certification: "Certification Management",
    root: "Platform Overview",
    "root-organization": "Organization",
    "root-folder-builder": "Folder Builder",
    "root-requirement-builder": "Requirement Builder",
    "root-form-builder": "Form Builder",
    "root-setup-wizard": "Setup Wizard",
    "root-config": "Configuration Engine",
    "root-audit": "System Audit",
    "root-users": "System Users",
  }

  useEffect(() => {
    document.title = pageTitles[activePage]
      ? `${pageTitles[activePage]} · URS-DMS`
      : "URS-DMS"
  }, [activePage])

  const handleNavigate = (page: string) => {
    setActivePage(page)
    localStorage.setItem("activePage", page)
    const pageToRouteMap: Record<string, string> = {
      dashboard: "/dashboard",
      documents: "/documents",
      submissions: "/submissions",
      users: "/users",
      audit: "/audit",
      settings: "/settings",
      aaccup: "/aaccup",
      iso: "/iso",
      certification: "/certification",
      root: "/root",
      "root-organization": "/root-organization",
      "root-folder-builder": "/root-folder-builder",
      "root-requirement-builder": "/root-requirement-builder",
      "root-form-builder": "/root-form-builder",
      "root-setup-wizard": "/root-setup-wizard",
      "root-config": "/root-config",
      "root-audit": "/root-audit",
      "root-users": "/root-users",
    }
    navigate(pageToRouteMap[page] || "/dashboard")
  }

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newValue))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user || !isAdminRole(user.role)) {
    return null
  }

  // AppContent return â€” admin sees this

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAFA]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        activePage={activePage}
        onNavigate={handleNavigate}
        showRoot={isRootRole(user.role)}
      />

      <div className="flex flex-col flex-1 min-w-0 w-full">
        <TopNav
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onNavigate={handleNavigate}
        />
        <CommandPalette
          open={isCommandPaletteOpen}
          onOpenChange={setIsCommandPaletteOpen}
          onNavigate={handleNavigate}
        />
        <main className="flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <div className="min-h-[320px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
          {activePage === "root" && <RootDashboard />}
          {activePage === "root-organization" && <RootOrganization />}
          {activePage === "root-folder-builder" && <RootFolderBuilder />}
          {activePage === "root-requirement-builder" && <RootRequirementBuilder />}
          {activePage === "root-workflow-builder" && <RootWorkflowBuilder />}
          {activePage === "root-form-builder" && <RootFormBuilder />}
          {activePage === "root-setup-wizard" && <RootSetupWizard />}
          {activePage === "root-config" && <RootConfigurations />}
          {activePage === "root-audit" && <RootAudit />}
          {activePage === "root-users" && <RootUsers />}
          {activePage === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
          {activePage === "documents" && <DocumentRepository />}
          {activePage === "submissions" && <Submissions />}
          {activePage === "users" && <UserManagement />}
          {activePage === "audit" && <AuditLogs />}
          {activePage === "settings" && <Settings />}
          {activePage === "aaccup" && <AACCUPManagement />}
          {activePage === "iso" && <AACCUPManagementISO />}
          {activePage === "certification" && <AACCUPManagementCert />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function UserAppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("userSidebarCollapsed")
    return saved ? JSON.parse(saved) : false
  })
  const [activePage, setActivePage] = useState("dashboard")
  const [showBrowseArchive, setShowBrowseArchive] = useState(false)
  const [showSubmitRequest, setShowSubmitRequest] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const unsub = notificationService.subscribeUnread(setUnreadCount)
    return unsub
  }, [user])

  const userRouteToPageMap: Record<string, string> = {
    "/user": "dashboard",
    "/user/dashboard": "dashboard",
    "/user/documents": "documents",
    "/user/requests": "requests",
    "/user/aaccup": "aaccup",
    "/user/iso": "iso",
    "/user/certification": "certification",
    "/user/notifications": "notifications",
    "/user/profile": "profile",
    "/user/settings": "settings",
  }

  useEffect(() => {
    const path = window.location.pathname
    const page = userRouteToPageMap[path]
    if (page) {
      setActivePage(page)
    }
  }, [])

  const handleNavigate = (page: string) => {
    setActivePage(page)
    setShowBrowseArchive(false)
    setShowSubmitRequest(false)
    const pageToRouteMap: Record<string, string> = {
      dashboard: "/user/dashboard",
      documents: "/user/documents",
      requests: "/user/requests",
      aaccup: "/user/aaccup",
      iso: "/user/iso",
      certification: "/user/certification",
      notifications: "/user/notifications",
      profile: "/user/profile",
      settings: "/user/settings",
    }
    navigate(pageToRouteMap[page] || "/user/dashboard")
  }

  const userPageTitles: Record<string, string> = {
    dashboard: "My Dashboard",
    documents: "My Documents",
    requests: "My Requests",
    aaccup: "AACCUP",
    iso: "ISO",
    certification: "Certification",
    notifications: "Notifications",
    profile: "My Profile",
    settings: "Settings",
  }

  useEffect(() => {
    document.title = userPageTitles[activePage]
      ? `${userPageTitles[activePage]} · URS-DMS`
      : "URS-DMS"
  }, [activePage])

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    localStorage.setItem("userSidebarCollapsed", JSON.stringify(newValue))
  }

  const handleBrowseArchive = () => {
    setShowBrowseArchive(true)
    setActivePage("requests")
  }

  const handleNewRequest = () => {
    setShowSubmitRequest(true)
    setActivePage("requests")
  }

  const handleSubmitRequest = (docIds: string[]) => {
    setSelectedDocIds(docIds)
    setShowBrowseArchive(false)
    setShowSubmitRequest(true)
  }

  const handleSubmitRequestSuccess = () => {
    setShowSubmitRequest(false)
    setSelectedDocIds([])
    handleNavigate("requests")
  }

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user || isAdminRole(user.role)) {
    return null
  }

  // UserAppContent return â€” non-admin sees this

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAFA]">
      <UserSidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        unreadNotifications={unreadCount}
      />

      <div className="flex flex-col flex-1 min-w-0 w-full">
        <UserTopNav
          onNavigate={handleNavigate}
          unreadNotifications={unreadCount}
        />
        <main className="flex-1 overflow-y-auto">
          {activePage === "dashboard" && <UserDashboard onNavigate={handleNavigate} />}
          {activePage === "documents" && <UserDocuments />}
          {activePage === "requests" && !showBrowseArchive && !showSubmitRequest && (
            <UserRequests onBrowseArchive={handleBrowseArchive} onNewRequest={handleNewRequest} />
          )}
          {activePage === "requests" && showBrowseArchive && !showSubmitRequest && (
            <UserBrowseArchive
              onBack={() => setShowBrowseArchive(false)}
              onSubmitRequest={handleSubmitRequest}
            />
          )}
          {activePage === "requests" && showSubmitRequest && (
            <UserSubmitRequest
              docIds={selectedDocIds}
              onBack={() => {
                setShowSubmitRequest(false)
                setSelectedDocIds([])
              }}
              onSuccess={handleSubmitRequestSuccess}
            />
          )}
          {activePage === "aaccup" && <UserAACCUP />}
          {activePage === "iso" && <UserAACCUPISO />}
          {activePage === "certification" && <UserAACCUPCert />}
          {activePage === "notifications" && <UserNotifications />}
          {activePage === "profile" && <UserProfile />}
          {activePage === "settings" && <UserSettings />}
        </main>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<LoginPage />}
      />
      <Route
        path="/login"
        element={<LoginPage />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated && user ? <Navigate to={isAdminRole(user.role) ? "/dashboard" : "/user/dashboard"} replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/reset-password"
        element={isAuthenticated && user ? <Navigate to={isAdminRole(user.role) ? "/dashboard" : "/user/dashboard"} replace /> : <ResetPasswordPage />}
      />
      <Route
        path="/dashboard"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/documents"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/submissions"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/users"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/user-management"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/audit"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/audit-logs"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/settings"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/aaccup"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/aaccup-management"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/iso"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/certification"
        element={isAuthenticated && isAdminRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/root"
        element={isAuthenticated && isRootRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/root-organization"
        element={isAuthenticated && isRootRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/root-folder-builder"
        element={isAuthenticated && isRootRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/root-requirement-builder"
        element={isAuthenticated && isRootRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/root-config"
        element={isAuthenticated && isRootRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/root-audit"
        element={isAuthenticated && isRootRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/root-users"
        element={isAuthenticated && isRootRole(user?.role) ? <AppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/user/*"
        element={isAuthenticated && !isAdminRole(user?.role) ? <UserAppContent /> : <Navigate to="/" replace />}
      />
      <Route
        path="/*"
        element={isAuthenticated && user ? <Navigate to={isAdminRole(user.role) ? "/dashboard" : "/user/dashboard"} replace /> : <Navigate to="/" replace />}
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastContainer />
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
