import { useState, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  PreviewDialogContent,
} from "@/components/preview/PreviewDialog"
import { PreviewHeader } from "./PreviewHeader"
import { PreviewSidebar } from "./PreviewSidebar"
import { PreviewInfoPanel } from "./PreviewInfoPanel"
import { FilePreviewRenderer } from "./FilePreviewRenderer"
import type { DocumentFile } from "./types"
import { mockFileActivities, mockFileVersions } from "./types"

interface DocumentRepositoryPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: DocumentFile | null
  allFiles?: DocumentFile[]
  onSelectFile?: (file: DocumentFile) => void
}

export function DocumentRepositoryPreviewModal({
  open,
  onOpenChange,
  file,
  allFiles = [],
  onSelectFile,
}: DocumentRepositoryPreviewModalProps) {
const [activeFile, setActiveFile] = useState<DocumentFile | null>(file)
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])
  
  useEffect(() => {
    setActiveFile(file)
  }, [file])

  const handleSelectFile = useCallback((selectedFile: DocumentFile) => {
    setIsLoading(true)
    setTimeout(() => {
      setActiveFile(selectedFile)
      onSelectFile?.(selectedFile)
      setIsLoading(false)
    }, 150)
  }, [onSelectFile])

  const currentIndex = allFiles.findIndex(f => f.id === activeFile?.id)
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < allFiles.length - 1

  const handlePrevFile = useCallback(() => {
    if (canGoPrev && allFiles[currentIndex - 1]) {
      handleSelectFile(allFiles[currentIndex - 1])
    }
  }, [canGoPrev, currentIndex, allFiles, handleSelectFile])

  const handleNextFile = useCallback(() => {
    if (canGoNext && allFiles[currentIndex + 1]) {
      handleSelectFile(allFiles[currentIndex + 1])
    }
  }, [canGoNext, currentIndex, allFiles, handleSelectFile])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      
      if (e.key === "Escape") {
        handleClose()
      } else if (e.key === "ArrowLeft" && canGoPrev) {
        handlePrevFile()
      } else if (e.key === "ArrowRight" && canGoNext) {
        handleNextFile()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, handleClose, handlePrevFile, handleNextFile, canGoPrev, canGoNext])

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow || ""
    }
  }, [open])

  if (!activeFile) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PreviewDialogContent 
        className="p-0 max-w-[95vw] w-[95vw] h-[92vh] overflow-hidden flex flex-col rounded-2xl"
      >
        <PreviewHeader
          file={activeFile}
          onClose={handleClose}
        />

        <div className="flex flex-1 overflow-hidden">
          {allFiles.length > 1 && (
            <PreviewSidebar
              files={allFiles}
              currentFileId={activeFile.id}
              onSelectFile={handleSelectFile}
              onPrevFile={handlePrevFile}
              onNextFile={handleNextFile}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
            />
          )}

          <div className="flex-1 overflow-hidden bg-gray-100 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            )}
            <FilePreviewRenderer file={activeFile} />
          </div>

          <PreviewInfoPanel
            file={activeFile}
            activities={mockFileActivities}
            versions={mockFileVersions}
          />
        </div>
      </PreviewDialogContent>
    </Dialog>
  )
}

export { PreviewHeader } from "./PreviewHeader"
export { PreviewSidebar } from "./PreviewSidebar"
export { PreviewInfoPanel } from "./PreviewInfoPanel"
export { FilePreviewRenderer } from "./FilePreviewRenderer"
export * from "./types"