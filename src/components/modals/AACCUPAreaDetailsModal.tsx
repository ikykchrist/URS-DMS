import React, { useState } from "react"
import {
  X,
  Plus,
  Upload,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  Paperclip,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"
import { getSubmissionsByArea, getAACCUPAreaStats, AACCUPArea } from "@/data/aaccupData"
import { cn } from "@/lib/utils"

interface AACCUPAreaDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  area: AACCUPArea | null
  onCreateTask: () => void
  onUploadDocuments: () => void
}

const submissionStatusVariant = {
  Approved: "success",
  Pending: "warning",
  Returned: "danger",
} as const

const areaStatusVariant = {
  Completed: "success",
  "In Progress": "default",
  Pending: "warning",
  Overdue: "danger",
} as const

const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-gray-400" />
    </div>
    <p className="text-[13px] text-gray-500">{message}</p>
  </div>
)

export function AACCUPAreaDetailsModal({
  open,
  onOpenChange,
  area,
  onCreateTask,
  onUploadDocuments,
}: AACCUPAreaDetailsModalProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  if (!area) return null

  const submissions = getSubmissionsByArea(area.id)
  const stats = getAACCUPAreaStats(area.id)

  const recentActivity = [
    { user: "Dr. Maria Santos", action: "submitted document", time: "2 hours ago" },
    { user: "Prof. John Doe", action: "uploaded file", time: "4 hours ago" },
    { user: "Engr. Sarah Cruz", action: "approved submission", time: "Yesterday" },
    { user: "Dr. Peter Lim", action: "returned for revision", time: "2 days ago" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-[14px]">
                  {area.id}
                </div>
                <div>
                  <DialogTitle className="text-lg">Area {area.id}: {area.title}</DialogTitle>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${area.completion}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-medium text-primary">{area.completion}%</span>
                    </div>
                    <Badge variant={areaStatusVariant[area.status]} className="text-[10px]">
                      {area.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={onUploadDocuments}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button size="sm" className="h-9 shadow-sm" onClick={onCreateTask}>
                <Plus className="w-4 h-4 mr-2" />
                Add Submission
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden bg-gray-50/30">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[13px] font-medium text-emerald-700">{stats.completed} Approved</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/50 border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-[13px] font-medium text-amber-700">{stats.pending} Pending</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50/50 border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-[13px] font-medium text-red-700">{stats.returned} Returned</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-6"></TableHead>
                    <TableHead>Submission</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState icon={FileText} message="No submissions for this area yet" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((submission) => (
                      <React.Fragment key={submission.id}>
                        <TableRow
                          className={cn(
                            "border-b border-gray-100 transition-colors cursor-pointer",
                            expandedRow === submission.id && "bg-primary/5"
                          )}
                        >
                          <TableCell>
                            <button
                              onClick={() => setExpandedRow(expandedRow === submission.id ? null : submission.id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {expandedRow === submission.id ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-[14px] font-medium text-gray-900">{submission.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[12px] text-gray-500">
                                  <FileText className="w-3 h-3" />
                                  {submission.fileName}
                                </span>
                                <span className="text-[12px] text-gray-400">{submission.fileSize}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[11px] bg-gray-100 text-gray-700">
                                  {submission.submittedBy.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-[13px] text-gray-700">{submission.submittedBy}</p>
                                <p className="text-[11px] text-gray-500">{submission.department}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                              <Calendar className="w-3.5 h-3.5" />
                              {submission.dateSubmitted}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={submissionStatusVariant[submission.status]} className="text-[11px]">
                              {submission.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[13px] text-primary hover:text-primary"
                              onClick={() => setExpandedRow(expandedRow === submission.id ? null : submission.id)}
                            >
                              {expandedRow === submission.id ? "Hide" : "View"}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {expandedRow === submission.id && (
                          <TableRow key={`${submission.id}-expanded`} className="bg-gray-50/50">
                            <TableCell colSpan={6}>
                              <div className="p-6 pl-14 grid grid-cols-3 gap-6">
                                <div>
                                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Document Details</p>
                                  <p className="text-[14px] text-gray-700 leading-relaxed">
                                    {submission.title} submitted to Area {area.id}: {area.title}
                                  </p>
                                  <p className="text-[13px] text-gray-500 mt-2">
                                    File: {submission.fileName} ({submission.fileSize})
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">File Information</p>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-gray-400" />
                                      <span className="text-[13px] text-gray-700">{submission.fileName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <span className="text-[13px] text-gray-700">Submitted: {submission.dateSubmitted}</span>
                                    </div>
                                  </div>

                                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-4 mb-2">Department</p>
                                  <p className="text-[13px] text-gray-700">{submission.department}</p>
                                </div>

                                <div>
                                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3">Activity</p>
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                                      <div>
                                        <p className="text-[13px] text-gray-700">
                                          <span className="font-medium">{submission.submittedBy}</span> submitted this document
                                        </p>
                                        <p className="text-[11px] text-gray-400">{submission.dateSubmitted}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                                      <div>
                                        <p className="text-[13px] text-gray-700">
                                          Document under review by {submission.department}
                                        </p>
                                        <p className="text-[11px] text-gray-400">Awaiting review</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div
            className={cn(
              "w-72 border-l border-gray-200 bg-white flex-shrink-0 flex flex-col transition-all duration-200",
              isPanelCollapsed && "w-10"
            )}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              {!isPanelCollapsed && (
                <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Summary</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              >
                <ChevronRight className={cn("w-4 h-4 transition-transform", !isPanelCollapsed && "rotate-180")} />
              </Button>
            </div>

            {!isPanelCollapsed && (
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium text-gray-700">Area Completion</span>
                    <span className="text-[20px] font-bold text-primary">{area.completion}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${area.completion}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-center">
                    <p className="text-[18px] font-bold text-emerald-600">{stats.completed}</p>
                    <p className="text-[11px] text-emerald-600/80">Approved</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 text-center">
                    <p className="text-[18px] font-bold text-amber-600">{stats.pending}</p>
                    <p className="text-[11px] text-amber-600/80">Pending</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50/50 border border-red-100 text-center">
                    <p className="text-[18px] font-bold text-red-600">{stats.returned}</p>
                    <p className="text-[11px] text-red-600/80">Returned</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-center">
                    <p className="text-[18px] font-bold text-blue-600">{stats.total}</p>
                    <p className="text-[11px] text-blue-600/80">Total</p>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border",
                  area.completion >= 80 ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className={cn(
                      "w-4 h-4",
                      area.completion >= 80 ? "text-emerald-600" : "text-amber-600"
                    )} />
                    <span className={cn(
                      "text-[13px] font-medium",
                      area.completion >= 80 ? "text-emerald-700" : "text-amber-700"
                    )}>
                      {area.completion >= 80 ? "Ready for Review" : "In Progress"}
                    </span>
                  </div>
                  <p className={cn(
                    "text-[12px]",
                    area.completion >= 80 ? "text-emerald-600/80" : "text-amber-600/80"
                  )}>
                    {area.completion >= 80
                      ? "This area meets the minimum requirements for accreditation review."
                      : "Additional documentation required before submission."}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Recent Activity
                  </p>
                  {recentActivity.length === 0 ? (
                    <EmptyState icon={Activity} message="No recent activity" />
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                          <div>
                            <p className="text-[13px] text-gray-700">
                              <span className="font-medium">{item.user}</span> {item.action}
                            </p>
                            <p className="text-[11px] text-gray-400">{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
