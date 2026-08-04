import { useState, useEffect, useCallback } from "react"
import { Search, FileText, FilePlus, FolderArchive, Eye } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { useAuth } from "@/context/AuthContext"
import { listRequests } from "@/services/requests"
import type { DocumentRequest } from "@/types/domain"

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Approved": return <Badge variant="success">{status}</Badge>
    case "Rejected": return <Badge variant="danger">{status}</Badge>
    case "Pending": return <Badge variant="warning">{status}</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "Urgent": return <Badge variant="high">{priority}</Badge>
    case "Normal": return <Badge variant="low">{priority}</Badge>
    default: return <Badge variant="secondary">{priority}</Badge>
  }
}

interface UserRequestsProps {
  onBrowseArchive?: () => void
  onNewRequest?: () => void
  onViewDetails?: (reqId: string) => void
}

export default function UserRequests({ onBrowseArchive, onNewRequest, onViewDetails }: UserRequestsProps) {
  const { user } = useAuth()
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const data = await listRequests({ submittedBy: user.id })
      setRequests(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.purpose.toLowerCase().includes(searchQuery.toLowerCase())
    const tabMap: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" }
    const matchesTab = activeTab === "all" || req.status === tabMap[activeTab]
    return matchesSearch && matchesTab
  })

  const totalCount = requests.length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Requests"
        description="Track your document requests"
        actions={
          <>
            <Button variant="outline" onClick={onBrowseArchive}>
              <FolderArchive className="w-4 h-4 mr-2" />
              Browse Archive
            </Button>
            <Button onClick={onNewRequest}>
              <FilePlus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </>
        }
      />

      <Card className="border-gray-200/60 shadow-sm mb-6">
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-10 p-1 bg-gray-100 rounded-xl">
              <TabsTrigger value="all" className="text-[13px]">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-[13px]">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-[13px]">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-[13px]">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-gray-200/60 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-gray-200/60 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-[14px] text-gray-500">Loading requests...</p>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card className="border-gray-200/60 shadow-sm">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] text-gray-500 mb-4">No requests found</p>
            <Button variant="outline" onClick={onBrowseArchive}>
              <FolderArchive className="w-4 h-4 mr-2" />
              Browse Archive
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-[13px] text-gray-500 mt-1">Purpose: {request.purpose}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-[12px] text-gray-400">Submitted: {new Date(request.dateSubmitted).toLocaleDateString()}</span>
                        <span className="text-[12px] text-gray-300">|</span>
                        <span className="text-[12px] text-gray-400">Priority: {getPriorityBadge(request.priority)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetails?.(request.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-gray-200/60 shadow-sm mt-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[13px] text-gray-500">Showing {filteredRequests.length} of {totalCount} requests</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="h-8">Previous</Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-gray-900 text-white">1</Button>
              <Button variant="outline" size="sm" disabled className="h-8">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}