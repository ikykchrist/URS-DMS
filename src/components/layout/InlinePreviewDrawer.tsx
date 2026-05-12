import { useState } from "react"
import { X, Eye, FileText, Calendar, User, Download, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"
import { VersionHistory } from "@/components/ui/VersionHistory"
import { ReviewComments } from "@/components/ui/ReviewComments"

interface PreviewItem {
  id: string
  title: string
  fileName: string
  fileSize: string
  submittedBy: string
  department: string
  dateSubmitted: string
  status: string
  area?: string
  description?: string
  versions?: VersionEntry[]
  comments?: Comment[]
}

interface VersionEntry {
  version: string
  updatedBy: string
  updatedAt: string
  summary: string
  size?: string
}

interface Comment {
  id: string
  author: string
  authorRole: string
  content: string
  timestamp: string
  type: "comment" | "approval" | "revision" | "status"
}

interface InlinePreviewDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PreviewItem | null
}

const sampleVersions: VersionEntry[] = [
  { version: "1.3", updatedBy: "Dr. Maria Santos", updatedAt: "Jan 15, 2024", summary: "Added executive summary section and revised methodology" },
  { version: "1.2", updatedBy: "Prof. John Doe", updatedAt: "Jan 12, 2024", summary: "Updated data tables and added references" },
  { version: "1.1", updatedBy: "Dr. Maria Santos", updatedAt: "Jan 8, 2024", summary: "Added introduction and initial findings" },
  { version: "1.0", updatedBy: "Dr. Maria Santos", updatedAt: "Jan 5, 2024", summary: "Initial draft submitted for review" },
]

const sampleComments: Comment[] = [
  { id: "c1", author: "Prof. John Doe", authorRole: "Reviewer", content: "Section 3 needs more detail on the methodology used.", timestamp: "2 hours ago", type: "comment" },
  { id: "c2", author: "Dr. Maria Santos", authorRole: "Author", content: "I've added the methodology details. Please review again.", timestamp: "1 hour ago", type: "comment" },
  { id: "c3", author: "Prof. John Doe", authorRole: "Reviewer", content: "Looks good! Ready for final approval.", timestamp: "30 min ago", type: "approval" },
]

export function InlinePreviewDrawer({ open, onOpenChange, item }: InlinePreviewDrawerProps) {
  const [activeTab, setActiveTab] = useState<"details" | "versions" | "comments">("details")

  if (!open || !item) return null

  const statusVariant = {
    Approved: "success",
    Pending: "warning",
    Returned: "danger",
    Submitted: "submitted",
    "Under Review": "under_review",
    Draft: "draft",
  } as const

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Eye className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Document Preview</h3>
              <p className="text-[12px] text-gray-500">Quick view panel</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
          {(["details", "versions", "comments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-medium capitalize transition-colors",
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab}
              {tab === "comments" && (
                <span className="ml-1.5 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {sampleComments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "details" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-gray-900 truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={statusVariant[item.status as keyof typeof statusVariant] || "default"} className="text-[10px]">
                        {item.status}
                      </Badge>
                      {item.area && (
                        <span className="text-[11px] text-gray-500">Area {item.area}</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  {item.description || `${item.fileName} submitted by ${item.submittedBy} from ${item.department}. Document is currently ${item.status.toLowerCase()}.`}
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">File Information</h5>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-[13px] text-gray-500">File name</span>
                    <span className="text-[13px] font-medium text-gray-900">{item.fileName}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-[13px] text-gray-500">File size</span>
                    <span className="text-[13px] font-medium text-gray-900">{item.fileSize}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-[13px] text-gray-500">Submitted by</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-gray-100">
                          {item.submittedBy.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-medium text-gray-900">{item.submittedBy}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-[13px] text-gray-500">Department</span>
                    <span className="text-[13px] font-medium text-gray-900">{item.department}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-gray-500">Date submitted</span>
                    <span className="text-[13px] font-medium text-gray-900">{item.dateSubmitted}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "versions" && (
            <VersionHistory versions={sampleVersions} />
          )}

          {activeTab === "comments" && (
            <ReviewComments comments={sampleComments} />
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-9 gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button size="sm" className="flex-1 h-9 shadow-sm gap-2">
            <Eye className="w-4 h-4" />
            Open Full View
          </Button>
        </div>
      </div>
    </>
  )
}
