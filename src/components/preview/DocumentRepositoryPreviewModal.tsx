import { useState, useEffect, useCallback } from "react"
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
  
  useEffect(() => {
    setActiveFile(file)
  }, [file])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleSelectFile = useCallback((selectedFile: DocumentFile) => {
    setActiveFile(selectedFile)
    onSelectFile?.(selectedFile)
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
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!activeFile) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PreviewDialogContent 
        className="p-0 max-w-[95vw] w-[95vw] h-[92vh] overflow-hidden flex flex-col rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <PreviewHeader
          file={activeFile}
          onClose={handleClose}
          onDownload={() => console.log("Download", activeFile.id)}
          onShare={() => console.log("Share", activeFile.id)}
          onFullscreen={() => console.log("Fullscreen", activeFile.id)}
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

          <div className="flex-1 overflow-hidden bg-gray-100">
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