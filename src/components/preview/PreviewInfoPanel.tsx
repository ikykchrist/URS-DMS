import { Calendar, User, HardDrive, MapPin, Building2, Tag as TagIcon, Clock, FileText, Download, Eye, Edit, CheckCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"
import type { DocumentFile, PreviewFileActivity, PreviewFileVersion } from "./types"

interface PreviewInfoPanelProps {
  file: DocumentFile
  activities?: PreviewFileActivity[]
  versions?: PreviewFileVersion[]
}

const getStatusBadge = (status: DocumentFile["status"]) => {
  switch (status) {
    case "Published":
      return <Badge variant="success" className="text-[10px] px-2 py-0.5">{status}</Badge>
    case "Draft":
      return <Badge variant="warning" className="text-[10px] px-2 py-0.5">{status}</Badge>
    case "Archived":
      return <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{status}</Badge>
    default:
      return <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{status}</Badge>
  }
}

const getActivityIcon = (action: string) => {
  if (action.toLowerCase().includes("upload")) return <Download className="w-3 h-3 text-blue-500" />
  if (action.toLowerCase().includes("modif")) return <Edit className="w-3 h-3 text-amber-500" />
  if (action.toLowerCase().includes("view")) return <Eye className="w-3 h-3 text-purple-500" />
  if (action.toLowerCase().includes("download")) return <Download className="w-3 h-3 text-green-500" />
  return <CheckCircle className="w-3 h-3 text-gray-400" />
}

export function PreviewInfoPanel({ file, activities, versions }: PreviewInfoPanelProps) {
  const hasActivities = activities && activities.length > 0
  const hasVersions = versions && versions.length > 0
  const fileTags = file.tags || []
  const uploadedBy = file.uploadedBy || "Unknown"
  const uploadDate = file.uploadDate || file.dateModified
  const lastModifiedDate = file.lastModifiedDate || file.dateModified

  return (
    <div className="w-[280px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-[13px] font-semibold text-gray-900">File Details</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <FileText className="w-3 h-3" />
              File Name
            </label>
            <p className="text-[13px] font-medium text-gray-900 leading-snug">
              {file.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" />
                Area
              </label>
              <p className="text-[12px] text-gray-700">{file.area}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <Building2 className="w-3 h-3" />
                Dept
              </label>
              <p className="text-[12px] text-gray-700 truncate">{file.department}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <User className="w-3 h-3" />
                Uploaded By
              </label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${uploadedBy}`} />
                  <AvatarFallback className="text-[8px]">
                    {uploadedBy.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-gray-700 truncate">{uploadedBy}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" />
                Upload Date
              </label>
              <p className="text-[12px] text-gray-700">{uploadDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                Last Modified
              </label>
              <p className="text-[12px] text-gray-700">{lastModifiedDate}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <HardDrive className="w-3 h-3" />
                Size
              </label>
              <p className="text-[12px] text-gray-700">{file.size}</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
              <TagIcon className="w-3 h-3" />
              Status
            </label>
            <div className="mt-1">
              {getStatusBadge(file.status)}
            </div>
          </div>

          {fileTags.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                <TagIcon className="w-3 h-3" />
                Tags
              </label>
              <div className="flex flex-wrap gap-1">
                {fileTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {hasActivities && (
          <div className="border-t border-gray-100">
            <div className="p-4 pb-2">
              <h4 className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                Recent Activity
              </h4>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-gray-50">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-700">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-gray-500">{activity.action.toLowerCase()}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasVersions && (
          <div className="border-t border-gray-100">
            <div className="p-4 pb-2">
              <h4 className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                Version History
              </h4>
            </div>
            <div className="px-4 pb-4 space-y-2.5">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-2.5 rounded-lg bg-gray-50/50 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-gray-900">
                      v{version.version}
                    </span>
                    <span className="text-[10px] text-gray-400">{version.date}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-1">{version.changes}</p>
                  <p className="text-[10px] text-gray-400">by {version.user}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}