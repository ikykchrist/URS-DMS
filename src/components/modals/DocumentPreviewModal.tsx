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
import { cn } from "@/lib/utils"

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
  onReturn: () => void
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
}: DocumentPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const totalPages = 12

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50))
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1))
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] h-[88vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-lg">Preview Submission</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[280px] bg-[#1a1a2e] flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between text-white">
                <span className="text-[12px] text-white/60">Thumbnails</span>
                <span className="text-[11px] text-white/40">{currentPage} / {totalPages}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-full aspect-[3/4] rounded-lg transition-all duration-150 flex items-center justify-center text-[10px] font-medium",
                    currentPage === i + 1
                      ? "bg-primary ring-2 ring-primary ring-offset-2 ring-offset-[#1a1a2e]"
                      : "bg-white/10 hover:bg-white/20 text-white/60"
                  )}
                >
                  <div className="transform" style={{ fontSize: `${Math.max(8, zoomLevel / 12)}px` }}>
                    <FileText className="w-6 h-6 opacity-40" />
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-white/10">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[12px] text-white/60 min-w-[50px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-100">
            <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[13px] text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
                  <Printer className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
              <div
                className="bg-white shadow-xl w-full max-w-[600px] aspect-[8.5/11] flex items-center justify-center text-gray-300 relative"
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

          <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
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
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-emerald-700">Approve</p>
                    <p className="text-[11px] text-emerald-600/70 truncate">Accept this submission</p>
                  </div>
                </button>

                <button
                  onClick={onReturn}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-amber-700">Return</p>
                    <p className="text-[11px] text-amber-600/70 truncate">Request revisions</p>
                  </div>
                </button>

                <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-red-700">Reject</p>
                    <p className="text-[11px] text-red-600/70 truncate">Reject this submission</p>
                  </div>
                </button>
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
