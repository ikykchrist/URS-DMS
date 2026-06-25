import { FileText, Clock, CheckCircle, HardDrive, Upload, FilePlus, GraduationCap, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useAuth } from "@/context/AuthContext"

const myDocuments = [
  { id: "doc-1", name: "Faculty Clearance Form", type: "PDF", date: "2026-06-20", status: "Approved" },
  { id: "doc-2", name: "Course Syllabus - CS101", type: "DOCX", date: "2026-06-18", status: "Pending" },
  { id: "doc-3", name: "Research Proposal", type: "PDF", date: "2026-06-15", status: "Approved" },
]

const upcomingDeadlines = [
  { id: 1, area: "Area I - Mission and Goals", due: "2026-07-01", status: "due_soon" },
  { id: 2, area: "Area III - General Education", due: "2026-07-15", status: "pending" },
  { id: 3, area: "Area V - Faculty", due: "2026-07-20", status: "pending" },
]

const recentActivity = [
  { id: 1, action: "Document approved", doc: "Faculty Clearance Form", time: "2 hours ago", type: "success" },
  { id: 2, action: "Request submitted", doc: "Research Proposal", time: "1 day ago", type: "info" },
  { id: 3, action: "Revision requested", doc: "Course Syllabus", time: "2 days ago", type: "warning" },
  { id: 4, action: "Document uploaded", doc: "Research Proposal", time: "3 days ago", type: "info" },
]

interface UserDashboardProps {
  onNavigate?: (page: string) => void
}

export default function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { user } = useAuth()

  const getFirstName = (name: string) => {
    return name.split(" ")[0]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge variant="success">Approved</Badge>
      case "Pending":
        return <Badge variant="warning">Pending</Badge>
      case "Rejected":
        return <Badge variant="danger">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDeadlineBadge = (status: string) => {
    switch (status) {
      case "due_soon":
        return <Badge variant="due_soon">Due Soon</Badge>
      case "overdue":
        return <Badge variant="overdue">Overdue</Badge>
      default:
        return <Badge variant="pending">Upcoming</Badge>
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case "warning":
        return <Clock className="w-4 h-4 text-amber-500" />
      default:
        return <FileText className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`Welcome back, ${user?.name ? getFirstName(user.name) : "User"}!`}
        description="Here's an overview of your document management activities."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-8">
        <StatCard
          title="My Documents"
          value="12"
          icon={<FileText className="w-5 h-5" />}
          trend={{ value: 2, positive: true }}
        />
        <StatCard
          title="Pending Requests"
          value="3"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Approved Requests"
          value="8"
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{ value: 15, positive: true }}
        />
        <StatCard
          title="Storage Used"
          value="2.4 GB"
          icon={<HardDrive className="w-5 h-5" />}
          trend={{ value: 5, positive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-6 lg:mb-8">
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Upcoming Deadlines</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[12px] text-primary"
                onClick={() => onNavigate?.("aaccup")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">{deadline.area}</p>
                    <p className="text-[12px] text-gray-500">Due: {deadline.due}</p>
                  </div>
                </div>
                {getDeadlineBadge(deadline.status)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[12px] text-primary"
                onClick={() => onNavigate?.("notifications")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/50 transition-colors"
              >
                <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900">
                    {activity.action}
                    <span className="text-gray-500"> - {activity.doc}</span>
                  </p>
                  <p className="text-[12px] text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-[15px] font-semibold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              className="h-auto py-4 px-4 justify-start bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              variant="outline"
              onClick={() => onNavigate?.("documents")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-gray-900">Upload Document</p>
                  <p className="text-[12px] text-gray-500">Add new documents</p>
                </div>
              </div>
            </Button>

            <Button
              className="h-auto py-4 px-4 justify-start bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              variant="outline"
              onClick={() => onNavigate?.("requests")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FilePlus className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-gray-900">Submit Request</p>
                  <p className="text-[12px] text-gray-500">Request documents</p>
                </div>
              </div>
            </Button>

            <Button
              className="h-auto py-4 px-4 justify-start bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              variant="outline"
              onClick={() => onNavigate?.("aaccup")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-gray-900">AACCUP Areas</p>
                  <p className="text-[12px] text-gray-500">View requirements</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200/60 shadow-sm mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-[15px] font-semibold text-gray-900">My Recent Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {myDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-[14px] font-medium text-gray-900">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-500 hidden md:table-cell">{doc.type}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-500 hidden sm:table-cell">{doc.date}</td>
                    <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => onNavigate?.("documents")}
            >
              View All My Documents
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}