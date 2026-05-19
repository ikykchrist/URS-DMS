import { useState, useEffect } from "react"
import { BrowserRouter, useNavigate } from "react-router-dom"
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  Upload,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileCheck,
  RotateCcw,
} from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopNav } from "@/components/layout/TopNav"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { ChartCard } from "@/components/layout/ChartCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import { Label } from "@/components/ui/Label"
import { Dropzone } from "@/components/ui/Dropzone"
import { Switch } from "@/components/ui/Switch"
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
import { CommandPalette } from "@/components/layout/CommandPalette"

const submissionData = [
  { name: "Jan", submissions: 45 },
  { name: "Feb", submissions: 52 },
  { name: "Mar", submissions: 78 },
  { name: "Apr", submissions: 65 },
  { name: "May", submissions: 89 },
  { name: "Jun", submissions: 72 },
]

const documentStatusData = [
  { name: "Approved", value: 156, color: "#10B981" },
  { name: "Pending", value: 89, color: "#F59E0B" },
  { name: "Rejected", value: 23, color: "#EF4444" },
  { name: "In Review", value: 45, color: "#6366F1" },
]

interface ActionWidgetProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  badge: string
  badgeVariant: "success" | "warning" | "danger" | "default" | "secondary"
  href: string
}

function ActionWidget({ icon, iconBg, iconColor, title, subtitle, badge, badgeVariant, href }: ActionWidgetProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-150 group"
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
    </a>
  )
}

const recentSubmissions = [
  {
    id: "SUB-001",
    title: "Self-Study Report - College of Engineering",
    category: "AACCUP Phase I",
    submittedBy: "Dr. Maria Santos",
    date: "2024-01-15",
    status: "Pending",
  },
  {
    id: "SUB-002",
    title: "Faculty Credentials - Department of CS",
    category: "Faculty Files",
    submittedBy: "Prof. John Doe",
    date: "2024-01-14",
    status: "Approved",
  },
  {
    id: "SUB-003",
    title: "Infrastructure Assessment Report",
    category: "Facility Documents",
    submittedBy: "Engr. Sarah Cruz",
    date: "2024-01-13",
    status: "In Review",
  },
  {
    id: "SUB-004",
    title: "Curriculum Revision - BSIT",
    category: "Curriculum",
    submittedBy: "Dr. Peter Lim",
    date: "2024-01-12",
    status: "Rejected",
  },
  {
    id: "SUB-005",
    title: "Laboratory Equipment Inventory",
    category: "Resources",
    submittedBy: "Ms. Ana Reyes",
    date: "2024-01-11",
    status: "Pending",
  },
]

function Dashboard() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

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
            <>
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="shadow-sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[500px]">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-lg">Upload New Document</DialogTitle>
                  <DialogDescription className="text-[14px]">
                    Upload a new document to the repository. Supported formats: PDF, DOC, DOCX, JPG, PNG.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title" className="text-[13px] font-medium">Document Title</Label>
                    <Input id="title" placeholder="Enter document title" className="h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-[13px] font-medium">Category</Label>
                    <Select>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aaccup">AACCUP Documents</SelectItem>
                        <SelectItem value="faculty">Faculty Files</SelectItem>
                        <SelectItem value="curriculum">Curriculum</SelectItem>
                        <SelectItem value="facility">Facility Documents</SelectItem>
                        <SelectItem value="resources">Resources</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[13px] font-medium">Upload File</Label>
                    <Dropzone accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="notify" className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium text-gray-700">Notify reviewers</span>
                      <span className="text-[12px] font-normal text-gray-500">
                        Send notification when upload is complete
                      </span>
                    </Label>
                    <Switch id="notify" defaultChecked />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} className="h-9">
                    Cancel
                  </Button>
                  <Button onClick={() => setIsUploadDialogOpen(false)} className="h-9 shadow-sm">
                    Upload Document
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-8">
          <StatCard
            title="Total Documents"
            value="1,245"
            icon={<FileText className="w-5 h-5" />}
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Pending Review"
            value="89"
            icon={<Clock className="w-5 h-5" />}
            trend={{ value: 5, positive: false }}
          />
          <StatCard
            title="Approved"
            value="1,023"
            icon={<CheckCircle className="w-5 h-5" />}
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            title="Active Users"
            value="156"
            icon={<Users className="w-5 h-5" />}
            trend={{ value: 3, positive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 mb-6 lg:mb-8">
          <ChartCard
            title="Submission Trends"
            description="Monthly document submissions"
            className="lg:col-span-2"
          >
            <div className="h-[200px] sm:h-[240px] lg:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={submissionData}>
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
            </div>
          </ChartCard>

          <ChartCard
            title="Document Status"
            description="Current distribution"
          >
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {documentStatusData.map((entry, index) => (
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
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
              {documentStatusData.map((item) => (
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
          <ChartCard title="Category Distribution" description="Documents by category">
            <div className="h-[180px] sm:h-[200px] md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { category: "AACCUP", count: 345 },
                    { category: "Faculty", count: 289 },
                    { category: "Curriculum", count: 198 },
                    { category: "Facility", count: 156 },
                    { category: "Resources", count: 134 },
                  ]}
                  layout="vertical"
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="category" type="category" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={65} />
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
            </div>
          </ChartCard>

          <ChartCard title="Action Center" description="Tasks needing your attention">
            <div className="space-y-3">
              <ActionWidget
                icon={<Clock className="w-4 h-4" />}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                title="Pending Approvals"
                subtitle="3 documents awaiting review"
                badge="3"
                badgeVariant="warning"
                href="#"
              />
              <ActionWidget
                icon={<AlertTriangle className="w-4 h-4" />}
                iconBg="bg-red-50"
                iconColor="text-red-600"
                title="Overdue Tasks"
                subtitle="Area 6 is past due"
                badge="1"
                badgeVariant="danger"
                href="#"
              />
              <ActionWidget
                icon={<RotateCcw className="w-4 h-4" />}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
                title="Needs Revision"
                subtitle="2 submissions returned"
                badge="2"
                badgeVariant="warning"
                href="#"
              />
              <ActionWidget
                icon={<CalendarClock className="w-4 h-4" />}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                title="Upcoming Deadlines"
                subtitle="3 deadlines this week"
                badge="3"
                badgeVariant="default"
                href="#"
              />
              <ActionWidget
                icon={<FileCheck className="w-4 h-4" />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                title="Recent Uploads"
                subtitle="5 new documents today"
                badge="5"
                badgeVariant="success"
                href="#"
              />
            </div>
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
                <Select defaultValue="all">
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
                <Button variant="outline" size="sm" className="h-9 hidden sm:inline-flex">View All</Button>
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
                {recentSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium text-gray-700 whitespace-nowrap">{submission.id}</TableCell>
                    <TableCell className="max-w-[150px] md:max-w-[220px] truncate font-medium text-gray-900">
                      {submission.title}
                    </TableCell>
                    <TableCell className="text-gray-500 whitespace-nowrap hidden md:table-cell">{submission.category}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 md:h-7 md:w-7">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${submission.submittedBy}`} />
                          <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                            {submission.submittedBy.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] text-gray-700 whitespace-nowrap">{submission.submittedBy}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-[13px] whitespace-nowrap hidden sm:table-cell">{submission.date}</TableCell>
                    <TableCell className="whitespace-nowrap">{getStatusBadge(submission.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-gray-500 hover:text-gray-900">
                          <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-gray-500 hover:text-gray-900">
                          <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-gray-500 hover:text-gray-900">
                          <MoreHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 px-4 md:px-5 pb-4 md:pb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[12px] md:text-[13px] text-gray-500">
                <span className="sm:hidden">5/89</span>
                <span className="hidden sm:inline">Showing 5 of 89 submissions</span>
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
                    <PaginationLink className="h-8 w-8">17</PaginationLink>
                  </PaginationItem>
                </PaginationContent>
                <PaginationNext className="h-8" />
              </Pagination>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

function AppContent() {
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

  const handleNavigate = (page: string) => {
    setActivePage(page)
    localStorage.setItem("activePage", page)
    const pageToRouteMap: Record<string, string> = {
      dashboard: "/",
      documents: "/documents",
      submissions: "/submissions",
      users: "/users",
      audit: "/audit",
      settings: "/settings",
      aaccup: "/aaccup",
    }
    navigate(pageToRouteMap[page] || "/")
  }

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newValue))
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAFA]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        activePage={activePage}
        onNavigate={handleNavigate}
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
          {activePage === "dashboard" && <Dashboard />}
          {activePage === "documents" && <DocumentRepository />}
          {activePage === "submissions" && <Submissions />}
          {activePage === "users" && <UserManagement />}
          {activePage === "audit" && <AuditLogs />}
          {activePage === "settings" && <Settings />}
          {activePage === "aaccup" && <AACCUPManagement />}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App