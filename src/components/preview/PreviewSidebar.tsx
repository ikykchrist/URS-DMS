import { FileText, FileSpreadsheet, Presentation, Image, File, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { DocumentFile } from "./types"

interface PreviewSidebarProps {
  files: DocumentFile[]
  currentFileId: string
  onSelectFile: (file: DocumentFile) => void
  onPrevFile?: () => void
  onNextFile?: () => void
  canGoPrev?: boolean
  canGoNext?: boolean
}

const getFileTypeIcon = (type: DocumentFile["type"]) => {
  switch (type) {
    case "PDF":
      return <FileText className="w-4 h-4 text-red-500" />
    case "DOCX":
    case "DOC":
      return <FileText className="w-4 h-4 text-blue-500" />
    case "XLSX":
    case "XLS":
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
    case "PPTX":
    case "PPT":
      return <Presentation className="w-4 h-4 text-orange-500" />
    case "JPG":
    case "PNG":
    case "JPEG":
    case "WEBP":
      return <Image className="w-4 h-4 text-purple-500" />
    default:
      return <File className="w-4 h-4 text-gray-400" />
  }
}

const getFileTypeBgColor = (type: DocumentFile["type"]) => {
  switch (type) {
    case "PDF":
      return "bg-red-50"
    case "DOCX":
    case "DOC":
      return "bg-blue-50"
    case "XLSX":
    case "XLS":
      return "bg-emerald-50"
    case "PPTX":
    case "PPT":
      return "bg-orange-50"
    case "JPG":
    case "PNG":
    case "JPEG":
    case "WEBP":
      return "bg-purple-50"
    default:
      return "bg-gray-50"
  }
}

export function PreviewSidebar({
  files,
  currentFileId,
  onSelectFile,
  onPrevFile,
  onNextFile,
  canGoPrev,
  canGoNext,
}: PreviewSidebarProps) {
  return (
    <div className="w-[200px] bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-gray-200 bg-white">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          Files in folder
        </h3>
        <p className="text-[10px] text-gray-400 mt-0.5">{files.length} documents</p>
      </div>

      {canGoPrev !== undefined && canGoNext !== undefined && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 bg-white">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500"
            onClick={onPrevFile}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] text-gray-500">
            {files.findIndex(f => f.id === currentFileId) + 1} of {files.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500"
            onClick={onNextFile}
            disabled={!canGoNext}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map((file) => {
          const isActive = file.id === currentFileId
          return (
            <button
              key={file.id}
              onClick={() => onSelectFile(file)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 text-left",
                isActive
                  ? "bg-white shadow-sm border border-gray-200"
                  : "hover:bg-white hover:shadow-sm"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                getFileTypeBgColor(file.type)
              )}>
                {getFileTypeIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[11px] font-medium truncate",
                  isActive ? "text-gray-900" : "text-gray-700"
                )}>
                  {file.name}
                </p>
                <p className="text-[10px] text-gray-400">{file.size}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}