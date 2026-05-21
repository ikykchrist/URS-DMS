import { X, Download, Share2, Maximize2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import type { DocumentFile } from "./types"

interface PreviewHeaderProps {
  file: DocumentFile
  onClose: () => void
  onDownload?: () => void
  onShare?: () => void
  onFullscreen?: () => void
}

const getFileTypeBadge = (type: DocumentFile["type"]) => {
  switch (type) {
    case "PDF":
      return <Badge variant="danger" className="text-[10px] px-2 py-0.5">PDF</Badge>
    case "DOCX":
    case "DOC":
      return <Badge className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5">DOCX</Badge>
    case "XLSX":
    case "XLS":
      return <Badge className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5">XLSX</Badge>
    case "PPTX":
    case "PPT":
      return <Badge className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5">PPTX</Badge>
    case "JPG":
    case "PNG":
    case "JPEG":
    case "WEBP":
      return <Badge className="bg-purple-50 text-purple-600 text-[10px] px-2 py-0.5">IMAGE</Badge>
    default:
      return <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{type}</Badge>
  }
}

export function PreviewHeader({ file, onClose, onDownload, onShare, onFullscreen }: PreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-[15px] font-semibold text-gray-900 truncate">
            {file.name}
          </h2>
          {getFileTypeBadge(file.type)}
        </div>
        
        {file.folderPath && file.folderPath.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-[12px] text-gray-500">
            <ChevronRight className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{file.folderPath.join(" / ")}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 ml-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={onDownload}
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={onShare}
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={onFullscreen}
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          onClick={onClose}
          title="Close"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}