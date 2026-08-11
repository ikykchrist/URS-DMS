import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, FileText, FilePlus, FolderArchive, Eye, XCircle, FileCheck2 } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { toast } from "@/lib/toast"
import { useAuth } from "@/context/AuthContext"
import { listRequests, cancelRequest } from "@/services/requests"
import type { DocumentRequest } from "@/types/domain"
import { cn } from "@/lib/utils"

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Approved": return <Badge variant="success">{status}</Badge>
    case "Fulfilled": return <Badge variant="default">{status}</Badge>
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
}

export default function UserRequests({ onBrowseArchive }: UserRequestsProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const urlTab = searchParams.get("tab")
  const highlightId = searchParams.get("highlight")
  const [activeTab, setActiveTab] = useState<string>(urlTab && ["all", "pending", "approved", "fulfilled", "rejected"].includes(urlTab) ? urlTab : "all")
  const [selected, setSelected] = useState<DocumentRequest | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const data = await listRequests({ submittedBy: user.id })
      setRequests(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (activeTab === "all") next.delete("tab")
      else next.set("tab", activeTab)
      return next
    }, { replace: true })
  }, [activeTab, setSearchParams])

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.purpose.toLowerCase().includes(searchQuery.toLowerCase())
    const tabMap: Record<string, string> = { pending: "Pending", approved: "Approved", fulfilled: "Fulfilled", rejected: "Rejected" }
    const matchesTab = activeTab === "all" || req.status === tabMap[activeTab]
    return matchesSearch && matchesTab
  })

  const handleCancel = async (request: DocumentRequest) => {
    if (!window.confirm(`Cancel request "${request.title}"?`)) return
    setCancelling(true)
    try {
      await cancelRequest(request.id)
      toast.success("Request cancelled")
      setSelected(null)
      await refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel the request")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Requests"
        description="Track your document access requests"
        actions={
          <Button onClick={onBrowseArchive}>
            <FilePlus className="w-4 h-4 mr-2" />
            Request Files
          </Button>
        }
      />

      <Card className="border-gray-200/60 shadow-sm mb-6">
        <CardContent className="p-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(["all", "pending", "approved", "fulfilled", "rejected"] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap",
                      activeTab === tab
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                    )}
                  >
                    {tab === "all" ? "All" : tab === "pending" ? "Pending" : tab === "approved" ? "Approved" : tab === "fulfilled" ? "Fulfilled" : "Rejected"}
                  </button>
                ))}
              </div>
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
              <Card key={request.id} className={cn("border-gray-200/60 shadow-sm hover:shadow-md transition-shadow", request.id === highlightId && "ring-2 ring-blue-300 bg-blue-50")}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-[13px] text-gray-500 mt-1">Explanation: {request.purpose}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-[12px] text-gray-400">Submitted: {new Date(request.dateSubmitted).toLocaleDateString()}</span>
                        <span className="text-[12px] text-gray-300">|</span>
                        <span className="text-[12px] text-gray-400">Priority: {getPriorityBadge(request.priority)}</span>
                        {request.documents.length > 0 && (
                          <>
                            <span className="text-[12px] text-gray-300">|</span>
                            <span className="text-[12px] text-gray-400">
                              {request.documents.length} file{request.documents.length > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                      {request.remarks && request.status === "Rejected" && (
                        <p className="text-[12px] text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          Decision: {request.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View details" onClick={() => setSelected(request)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {request.status === "Pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        title="Cancel request"
                        onClick={() => void handleCancel(request)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-gray-200/60 shadow-sm mt-6">
        <CardContent className="p-4">
          <p className="text-[13px] text-gray-500">Showing {filteredRequests.length} of {requests.length} requests</p>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="text-lg">{selected?.title}</DialogTitle>
            <DialogDescription className="text-[14px]">
              Submitted {selected ? new Date(selected.dateSubmitted).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {selected && (
              <>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selected.status)}
                  {getPriorityBadge(selected.priority)}
                </div>
                {selected.documents.length > 0 && (
                  <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Requested Files ({selected.documents.length})
                    </p>
                    <div className="flex flex-col gap-1">
                      {selected.documents.map((doc) => (
                        <p key={doc.documentId} className="text-[13px] text-gray-700 truncate flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-gray-400 shrink-0" />
                          {doc.documentName}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Explanation</p>
                  <p className="text-[13px] text-gray-700 whitespace-pre-line">{selected.purpose}</p>
                </div>
                {selected.handledByName && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {selected.status === "Approved" ? "Approved by" : "Decision by"}
                    </p>
                    <p className="text-[13px] text-gray-700">{selected.handledByName}</p>
                    {selected.remarks && <p className="text-[12px] text-gray-500 mt-1 whitespace-pre-line">{selected.remarks}</p>}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            {selected?.status === "Pending" && (
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                disabled={cancelling}
                onClick={() => void handleCancel(selected)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {cancelling ? "Cancelling..." : "Cancel Request"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelected(null)} className="h-10 px-5">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
