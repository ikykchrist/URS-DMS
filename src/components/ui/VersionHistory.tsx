import { Calendar } from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"

interface VersionEntry {
  version: string
  updatedBy: string
  updatedAt: string
  summary: string
  size?: string
}

interface VersionHistoryProps {
  versions: VersionEntry[]
  className?: string
}

export function VersionHistory({ versions, className }: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <div className={cn("py-6 text-center text-[13px] text-gray-500", className)}>
        No version history available
      </div>
    )
  }

  return (
    <div className={cn("space-y-0", className)}>
      {versions.map((v, index) => (
        <div
          key={v.version}
          className="flex items-start gap-3 py-3 relative"
        >
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold",
                index === 0
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {v.version.split(".").pop()}
            </div>
            {index < versions.length - 1 && (
              <div className="w-px h-8 bg-gray-200 mt-1" />
            )}
          </div>

          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-medium text-gray-900">
                Version {v.version}
              </span>
              {index === 0 && (
                <Badge variant="default" className="text-[10px]">Latest</Badge>
              )}
              {v.size && (
                <span className="text-[11px] text-gray-400">{v.size}</span>
              )}
            </div>
            <p className="text-[12px] text-gray-600 leading-relaxed">{v.summary}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-gray-100">
                    {v.updatedBy.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span>{v.updatedBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{v.updatedAt}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
