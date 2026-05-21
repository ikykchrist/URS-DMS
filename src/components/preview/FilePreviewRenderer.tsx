import { useState } from "react"
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  File,
  FileX,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { DocumentFile } from "./types"

interface FilePreviewRendererProps {
  file: DocumentFile
  className?: string
}

const getFileTypeIcon = (type: DocumentFile["type"]) => {
  switch (type) {
    case "PDF":
      return <FileText className="w-16 h-16 text-red-500" />
    case "DOCX":
    case "DOC":
      return <FileText className="w-16 h-16 text-blue-500" />
    case "XLSX":
    case "XLS":
      return <FileSpreadsheet className="w-16 h-16 text-emerald-600" />
    case "PPTX":
    case "PPT":
      return <Presentation className="w-16 h-16 text-orange-500" />
    case "JPG":
    case "PNG":
    case "JPEG":
    case "WEBP":
      return <Image className="w-16 h-16 text-purple-500" />
    default:
      return <File className="w-16 h-16 text-gray-400" />
  }
}

const getFileTypeColor = (type: DocumentFile["type"]) => {
  switch (type) {
    case "PDF":
      return "bg-red-50 text-red-600"
    case "DOCX":
    case "DOC":
      return "bg-blue-50 text-blue-600"
    case "XLSX":
    case "XLS":
      return "bg-emerald-50 text-emerald-600"
    case "PPTX":
    case "PPT":
      return "bg-orange-50 text-orange-600"
    case "JPG":
    case "PNG":
    case "JPEG":
    case "WEBP":
      return "bg-purple-50 text-purple-600"
    default:
      return "bg-gray-50 text-gray-600"
  }
}

function PdfPreview({ file }: { file: DocumentFile }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const totalPages = 12

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50))
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1))
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-[12px] text-gray-600 px-2 min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[12px] text-gray-600 px-1.5 min-w-[45px] text-center">
            {zoomLevel}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600" aria-label="Maximize">
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-start justify-center">
        <div
          className="bg-white shadow-lg relative overflow-hidden"
          style={{
            width: `${(8.5 * zoomLevel) / 100 * 82.5}px`,
            height: `${(11 * zoomLevel) / 100 * 82.5}px`,
            minWidth: "640px",
            minHeight: "825px",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white p-8">
            <div className="h-full flex flex-col">
              <div className="border-b-2 border-gray-900 pb-4 mb-6">
                <h1 className="text-xl font-bold text-gray-900 text-center">
                  {file.name}
                </h1>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Document Management System
                </p>
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-11/12" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-10/12" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-9/12" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-11/12" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-8/12" />
                <div className="h-3 bg-gray-200 rounded w-10/12" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <p className="text-[10px] text-gray-400 text-center">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImagePreview({ file }: { file: DocumentFile }) {
  const [zoomLevel, setZoomLevel] = useState(100)

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 25))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 25}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[12px] text-gray-600 px-1.5 min-w-[45px] text-center">
            {zoomLevel}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-600" aria-label="Maximize">
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 p-6 flex items-start justify-center">
        <div
          className="bg-white shadow-lg transition-all duration-200 flex items-center justify-center"
          style={{
            width: `${Math.min(800 * zoomLevel / 100, 800)}px`,
            height: `${Math.min(600 * zoomLevel / 100, 600)}px`,
          }}
        >
          <div className="text-center p-8">
            <Image className="w-24 h-24 text-purple-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-2">{file.name}</p>
            <p className="text-xs text-gray-400">{file.type} Image</p>
            <p className="text-xs text-gray-400 mt-1">{file.size}</p>
            <p className="text-[10px] text-gray-400 mt-4 italic">
              (Image preview placeholder - connect backend for actual images)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function OfficePreview({ file }: { file: DocumentFile }) {
  return (
    <div className="flex flex-col h-full items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mb-4", getFileTypeColor(file.type))}>
            {getFileTypeIcon(file.type)}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Preview Not Available
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            This file type cannot be previewed directly. You can download the file to view it on your device.
          </p>
          
          <div className="w-full p-4 bg-gray-50 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getFileTypeColor(file.type))}>
                {getFileTypeIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                <p className="text-xs text-gray-500">{file.size}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full">
            <Button variant="outline" className="flex-1 h-10" aria-label="Download file">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UnsupportedPreview() {
  return (
    <div className="flex flex-col h-full items-center justify-center bg-gray-50 p-8">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FileX className="w-10 h-10 text-gray-400" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Preview Unavailable
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            This file type is not supported for preview. Please download the file to view it.
          </p>

          <Button variant="outline" className="h-10" aria-label="Download file">
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    </div>
  )
}

export function FilePreviewRenderer({ file, className }: FilePreviewRendererProps) {
  const renderPreview = () => {
    switch (file.type) {
      case "PDF":
        return <PdfPreview file={file} />
      case "JPG":
      case "PNG":
      case "JPEG":
      case "WEBP":
        return <ImagePreview file={file} />
      case "DOCX":
      case "DOC":
      case "XLSX":
      case "XLS":
      case "PPTX":
      case "PPT":
        return <OfficePreview file={file} />
      default:
        return <UnsupportedPreview />
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {renderPreview()}
    </div>
  )
}

export { getFileTypeIcon, getFileTypeColor }