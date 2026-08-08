import { useState, useEffect, useCallback } from "react"
import { FileText, Clock, CheckCircle, HardDrive, Upload, FilePlus, GraduationCap, ArrowRight, Award, Inbox } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useAuth } from "@/context/AuthContext"
import { listAllOnlineAaccupAreas, listAllOnlineSubmissions } from "@/services/aaccup"
import { listOnlineDocuments } from "@/services/documents"
import { listRequests } from "@/services/requests"
import type { Document, DocumentRequest } from "@/types/domain"

interface UserDashboardProps {
  onNavigate?: (page: string) => void
}

interface SetStats {
  areas: number
  submissions: number
  approved: number
  pending: number
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
  const [myStats, setMyStats] = useState({ total: 0, pending: 0, approved: 0, storageUsed: 0, storageReadable: "0 B" })
  const [setStats, setSetStats] = useState<Record<"AACCUP" | "ISO" | "CERT", SetStats>>({
    AACCUP: { areas: 0, submissions: 0, approved: 0, pending: 0 },
    ISO: { areas: 0, submissions: 0, approved: 0, pending: 0 },
    CERT: { areas: 0, submissions: 0, approved: 0, pending: 0 },
  })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [docsData, reqData, ...setData] = await Promise.all([
        listOnlineDocuments({ ownerId: user.id, archived: false }),
        listRequests({ submittedBy: user.id }),
        ...(["AACCUP", "ISO", "CERT"] as const).map((areaSet) =>
          Promise.all([
            listAllOnlineAaccupAreas({ areaSet }),
            listAllOnlineSubmissions({ areaSet }),
          ]),
        ),
      ])
      const storage = docsData.reduce((sum, doc) => sum + (Number(doc.size) || 0), 0)
      setDocs(docsData)
      setRequests(reqData)
      const nextSetStats = { ...setStats }
      ;(["AACCUP", "ISO", "CERT"] as const).forEach((areaSet, index) => {
        const [setAreas, setSubs] = setData[index]
        nextSetStats[areaSet] = {
          areas: setAreas.length,
          submissions: setSubs.length,
          approved: setSubs.filter((s) => s.status === "APPROVED").length,
          pending: setSubs.filter((s) => s.status === "PENDING" || s.status === "NEEDS_REVISION").length,
        }
      })
      setSetStats(nextSetStats)
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

  useEffect(() => {
    fetchData()
    const poll = setInterval(fetchData, 20000)
    return () => clearInterval(poll)
  }, [fetchData])

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

  const activityTypeFromStatus = (status: string): "success" | "warning" | "info" => {
    if (status === "Approved") return "success"
    if (status === "Rejected" || status === "Returned") return "warning"
    return "info"
  }

  const recentDocs = docs.slice(0, 5)
  const recentRequests = requests.slice(0, 3)
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
        <StatCard
          title="My Documents"
          value={loading ? "..." : myStats.total.toString()}
          icon={<FileText className="w-5 h-5" />}
          trend={{
            value: myStats.total > 0 ? Math.round((myStats.approved / myStats.total) * 100) : 0,
            positive: myStats.approved > 0,
          }}
        />
        <StatCard title="Pending Requests" value={loading ? "..." : pendingCount.toString()} icon={<Clock className="w-5 h-5" />} />
        <StatCard
          title="Approved Requests"
          value={loading ? "..." : approvedCount.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{
            value: requests.length > 0 ? Math.round((approvedCount / requests.length) * 100) : 0,
            positive: approvedCount > 0,
          }}
        />
        <StatCard title="Storage Used" value={loading ? "..." : myStats.storageReadable} icon={<HardDrive className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-8">
        {(
          [
            { key: "AACCUP", label: "AACCUP", bg: "bg-amber-50", text: "text-amber-600" },
            { key: "ISO", label: "ISO", bg: "bg-blue-50", text: "text-blue-600" },
            { key: "CERT", label: "Certification", bg: "bg-emerald-50", text: "text-emerald-600" },
          ] as const
        ).map(({ key, label, bg, text }) => {
          const stats = setStats[key]
          return (
            <Card
              key={key}
              className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigate?.("aaccup")}
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg ${bg} flex items-center justify-center ${text}`}>
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] md:text-[12px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">
                    My contributions
                  </span>
                </div>
                <div className="mt-3 md:mt-4">
                  <p className="text-[12px] md:text-[13px] text-gray-500 font-medium">{label} Accreditation</p>
                  <p className="text-[18px] md:text-[22px] font-semibold text-gray-900 mt-0.5 tracking-tight">
                    {loading ? "..." : `${stats.areas} areas`}
                  </p>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    {loading
                      ? "Loading…"
                      : `${stats.submissions} submissions · ${stats.approved} approved`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-6 lg:mb-8">
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Recent Requests</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-[12px] text-primary" onClick={() => onNavigate?.("requests")}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-[13px] text-gray-400">Loading...</p>
            ) : recentRequests.length === 0 ? (
              <p className="text-[13px] text-gray-400">No requests yet</p>
            ) : (
              recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Inbox className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{request.title}</p>
                      <p className="text-[12px] text-gray-500">{request.documents.length} file{request.documents.length > 1 ? "s" : ""} · {new Date(request.dateSubmitted).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Type</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-[13px] text-gray-400 py-6">Loading...</TableCell>
                  </TableRow>
                ) : recentDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-[13px] text-gray-400 py-6">No documents found</TableCell>
                  </TableRow>
                ) : (
                  recentDocs.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-[14px] font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-gray-500 hidden md:table-cell">{doc.type}</TableCell>
                      <TableCell className="text-[13px] text-gray-500 hidden sm:table-cell">{new Date(doc.dateModified).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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