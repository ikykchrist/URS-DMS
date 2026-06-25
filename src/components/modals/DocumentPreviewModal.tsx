import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Download,
  MoreHorizontal,
  CheckCircle,
  RotateCcw,
  XCircle,
  FileText,
  User,
  Building2,
  Calendar,
  HardDrive,
  Layout,
  MapPin,
  Info,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"

interface Submission {
  id: string
  title: string
  area: string
  submittedBy: string
  department: string
  dateSubmitted: string
  fileName: string
  fileSize: string
  status: "Pending" | "Approved" | "Returned"
  template?: string
}

interface DocumentPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: Submission | null
  onReturn?: () => void
  onApprove?: (submissionId: string) => void
  onReject?: (submissionId: string) => void
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Approved":
      return <Badge variant="success">{status}</Badge>
    case "Pending":
      return <Badge variant="warning">{status}</Badge>
    case "Returned":
      return <Badge variant="danger">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  submission,
  onReturn,
  onApprove,
  onReject,
}: DocumentPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [rotation, setRotation] = useState(0)
  const totalPages = 12

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50))
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1))
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)
  const handlePrint = () => window.print()
  const handleDownload = () => {
    if (!submission) return
    const content = `Document: ${submission.title}\nID: ${submission.id}\nArea: ${submission.area}\nSubmitted By: ${submission.submittedBy}\nDate: ${submission.dateSubmitted}\nStatus: ${submission.status}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${submission.id}-${submission.title.substring(0, 20)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const handleApprove = () => {
    if (!submission) return
    onApprove?.(submission.id)
    onOpenChange(false)
  }
  const handleReject = () => {
    if (!submission) return
    onReject?.(submission.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-lg">Preview Submission</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          <div className="flex-1 flex flex-col bg-gray-100 min-h-[300px] lg:min-h-0 overflow-hidden">
            <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-600"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[13px] text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-600"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-600"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-[13px] text-gray-600 px-2 min-w-[50px] text-center">{zoomLevel}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-600"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600" onClick={handleRotate}>
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600" onClick={handlePrint}>
                  <Printer className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex items-start justify-center">
              <div
                className="bg-white shadow-xl w-full max-w-[700px] aspect-[8.5/11] flex items-center justify-center text-gray-300 relative"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white p-12">
                  <div className="h-full flex flex-col">
                    <div className="border-b-2 border-gray-900 pb-4 mb-6">
                      <h1 className="text-2xl font-bold text-gray-900 text-center">
                        {submission?.title || "Document Title"}
                      </h1>
                      <p className="text-sm text-gray-500 text-center mt-2">
                        University Document Management System
                      </p>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-11/12" />
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-10/12" />
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-9/12" />
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-11/12" />
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-8/12" />
                      <div className="mt-8 border-t-2 border-gray-200 pt-4">
                        <p className="text-xs text-gray-400 text-center">Page {currentPage} of {totalPages}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[340px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Submission Details</h3>
              <p className="text-[12px] text-gray-400">ID: {submission?.id}</p>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3 h-3" />
                  Document Title
                </label>
                <p className="text-[14px] font-medium text-gray-900 leading-snug">
                  {submission?.title}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <Layout className="w-3 h-3" />
                    Template
                  </label>
                  <p className="text-[13px] text-gray-700">SSR Template</p>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-3 h-3" />
                    Area
                  </label>
                  <p className="text-[13px] text-gray-700">{submission?.area}</p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-3 h-3" />
                  Department
                </label>
                <p className="text-[13px] text-gray-700">{submission?.department}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <User className="w-3 h-3" />
                    Submitted By
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${submission?.submittedBy}`} />
                      <AvatarFallback className="text-[10px]">
                        {submission?.submittedBy?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] text-gray-700 truncate">{submission?.submittedBy}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3 h-3" />
                    Date Submitted
                  </label>
                  <p className="text-[13px] text-gray-700">{submission?.dateSubmitted}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3 h-3" />
                    File Name
                  </label>
                  <p className="text-[13px] text-gray-700 truncate" title={submission?.fileName}>
                    {submission?.fileName}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <HardDrive className="w-3 h-3" />
                    File Size
                  </label>
                  <p className="text-[13px] text-gray-700">{submission?.fileSize}</p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2 block">
                  Status
                </label>
                {submission && getStatusBadge(submission.status)}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[12px] font-medium text-gray-700 mb-3">Admin Actions</p>
              <div className="flex flex-col gap-2">
                <Button className="w-full h-10 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleApprove}>
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={onReturn}
                >
                  <RotateCcw className="w-4 h-4" />
                  Return
                </Button>
                <Button variant="outline" className="w-full h-10 flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50" onClick={handleReject}>
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-blue-50/50 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-blue-800">Review Reminder</p>
              <p className="text-[12px] text-blue-600/80 mt-0.5">
                Please ensure all documents meet the required standards before taking action. Review the complete document carefully.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
