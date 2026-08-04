import { useState, useEffect, useCallback } from "react"
import { FileText, Clock, CheckCircle, HardDrive, Upload, FilePlus, GraduationCap, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useAuth } from "@/context/AuthContext"
import { listOnlineAaccupAreas } from "@/services/aaccup"
import { listOnlineDocuments } from "@/services/documents"
import { listRequests } from "@/services/requests"
import type { Document, DocumentRequest } from "@/types/domain"

interface UserDashboardProps {
  onNavigate?: (page: string) => void
}

interface DeadlineArea {
  id: string
  number: string
  title: string
  dueDate: string
  status: string
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0)} ${units[i]}`
}

export default function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { user } = useAuth()
  const [docs, setDocs] = useState<Document[]>([])
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [areas, setAreas] = useState<DeadlineArea[]>([])
  const [myStats, setMyStats] = useState({ total: 0, pending: 0, approved: 0, storageUsed: 0, storageReadable: "0 B" })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [docsData, reqData, areasData] = await Promise.all([
        listOnlineDocuments({ ownerId: user.id, archived: false }),
        listRequests({ submittedBy: user.id }),
        listOnlineAaccupAreas(),
      ])
      const storage = docsData.reduce((sum, doc) => sum + (Number(doc.size) || 0), 0)
      setDocs(docsData)
      setRequests(reqData)
      setAreas(areasData.map((area) => ({
        id: area.id,
        number: area.code,
        title: area.name,
        dueDate: "",
        status: "",
      })))
      setMyStats({
        total: docsData.length,
        pending: docsData.filter((doc) => ["Pending", "Department Review", "QA Review"].includes(doc.status)).length,
        approved: docsData.filter((doc) => doc.status === "Approved").length,
        storageUsed: storage,
        storageReadable: formatBytes(storage),
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const getFirstName = (name: string) => name.split(" ")[0]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved": return <Badge variant="success">{status}</Badge>
      case "Pending":
      case "Department Review":
      case "QA Review": return <Badge variant="warning">{status}</Badge>
      case "Rejected": return <Badge variant="danger">{status}</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDeadlineBadge = (dueDate: string, status: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (status === "Completed") return <Badge variant="success">Completed</Badge>
    if (diffDays < 0) return <Badge variant="overdue">Overdue</Badge>
    if (diffDays <= 7) return <Badge variant="due_soon">Due Soon</Badge>
    return <Badge variant="pending">Upcoming</Badge>
  }

  const activityTypeFromStatus = (status: string): "success" | "warning" | "info" => {
    if (status === "Approved") return "success"
    if (status === "Rejected" || status === "Returned") return "warning"
    return "info"
  }

  const recentDocs = docs.slice(0, 5)
  const upcomingAreas = areas.slice(0, 3)
  const recentReqActivity = requests.slice(0, 4).map((r) => ({
    id: r.id,
    action: r.status === "Approved" ? "Request approved" : r.status === "Rejected" ? "Request rejected" : r.status === "Pending" ? "Request submitted" : "Request updated",
    doc: r.title,
    time: new Date(r.dateSubmitted).toLocaleDateString(),
    type: activityTypeFromStatus(r.status),
  }))

  const pendingCount = requests.filter((r) => r.status === "Pending").length
  const approvedCount = requests.filter((r) => r.status === "Approved").length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`Welcome back, ${user?.name ? getFirstName(user.name) : "User"}!`}
        description="Here's an overview of your document management activities."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-8">
        <StatCard title="My Documents" value={loading ? "..." : myStats.total.toString()} icon={<FileText className="w-5 h-5" />} trend={{ value: 2, positive: true }} />
        <StatCard title="Pending Requests" value={loading ? "..." : pendingCount.toString()} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Approved Requests" value={loading ? "..." : approvedCount.toString()} icon={<CheckCircle className="w-5 h-5" />} trend={{ value: 15, positive: true }} />
        <StatCard title="Storage Used" value={loading ? "..." : myStats.storageReadable} icon={<HardDrive className="w-5 h-5" />} trend={{ value: 5, positive: false }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-6 lg:mb-8">
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Upcoming Deadlines</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] text-primary" onClick={() => onNavigate?.("aaccup")}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-[13px] text-gray-400">Loading...</p>
            ) : upcomingAreas.length === 0 ? (
              <p className="text-[13px] text-gray-400">No areas found</p>
            ) : (
              upcomingAreas.map((area) => (
                <div key={area.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">Area {area.number}: {area.title}</p>
                      {area.dueDate && <p className="text-[12px] text-gray-500">Due: {area.dueDate}</p>}
                    </div>
                  </div>
                  {area.dueDate && getDeadlineBadge(area.dueDate, area.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] text-primary" onClick={() => onNavigate?.("notifications")}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-[13px] text-gray-400">Loading...</p>
            ) : recentReqActivity.length === 0 ? (
              <p className="text-[13px] text-gray-400">No recent activity</p>
            ) : (
              recentReqActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                  <div className="mt-0.5">
                    {activity.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                     activity.type === "warning" ? <Clock className="w-4 h-4 text-amber-500" /> :
                     <FileText className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900">{activity.action}<span className="text-gray-500"> - {activity.doc}</span></p>
                    <p className="text-[12px] text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-[15px] font-semibold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button className="h-auto py-4 px-4 justify-start bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300" variant="outline" onClick={() => onNavigate?.("documents")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Upload className="w-5 h-5 text-primary" /></div>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-gray-900">Upload Document</p>
                  <p className="text-[12px] text-gray-500">Add new documents</p>
                </div>
              </div>
            </Button>
            <Button className="h-auto py-4 px-4 justify-start bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300" variant="outline" onClick={() => onNavigate?.("requests")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><FilePlus className="w-5 h-5 text-amber-600" /></div>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-gray-900">Submit Request</p>
                  <p className="text-[12px] text-gray-500">Request documents</p>
                </div>
              </div>
            </Button>
            <Button className="h-auto py-4 px-4 justify-start bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300" variant="outline" onClick={() => onNavigate?.("aaccup")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-emerald-600" /></div>
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
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-gray-400">Loading...</td></tr>
                ) : recentDocs.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-gray-400">No documents found</td></tr>
                ) : (
                  recentDocs.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-[14px] font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-500 hidden md:table-cell">{doc.type}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-500 hidden sm:table-cell">{new Date(doc.dateModified).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100">
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate?.("documents")}>
              View All My Documents<ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}