import { useState } from "react"
import { RotateCcw, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { cn } from "@/lib/utils"

interface ReturnSubmissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submissionTitle?: string
  onReturn?: (reason: string, files: File[]) => void
}

export function ReturnSubmissionModal({
  open,
  onOpenChange,
  submissionTitle,
  onReturn,
}: ReturnSubmissionModalProps) {
  const [returnReason, setReturnReason] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const maxCharacters = 500

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReturn = () => {
    if (!returnReason.trim()) return
    onReturn?.(returnReason, files)
    setReturnReason("")
    setFiles([])
    onOpenChange(false)
  }

  const getFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            Return Submission
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Specify the reason for returning{submissionTitle ? ` "${submissionTitle}"` : " this submission"} for revision.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="returnReason" className="text-[13px] font-medium text-gray-700">
                Return Reason
              </Label>
              <span
                className={cn(
                  "text-[11px]",
                  returnReason.length > maxCharacters ? "text-red-500" : "text-gray-400"
                )}
              >
                {returnReason.length} / {maxCharacters}
              </span>
            </div>
            <textarea
              id="returnReason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value.slice(0, maxCharacters))}
              placeholder="Enter the reason for returning this submission. Please provide specific details about what needs to be revised..."
              className={cn(
                "flex min-h-[140px] w-full rounded-xl border bg-white px-4 py-3 text-[14px] placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-150 resize-none",
                returnReason.length > maxCharacters
                  ? "border-red-300 focus:ring-red-200 focus:border-red-300"
                  : "border-gray-200 focus:ring-gray-200 focus:border-gray-300"
              )}
            />
            {returnReason.length > maxCharacters && (
              <p className="text-[11px] text-red-500 mt-1">
                Character limit exceeded. Please reduce your response.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700">
              Upload Reference File
              <span className="text-gray-400 font-normal ml-1">(Optional)</span>
            </Label>

            <div
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-upload-return")?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150",
                isDragging
                  ? "border-primary bg-primary-5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <input
                id="file-upload-return"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center">
                <div
                  className={cn(
                    "w-10 h-10 mb-2.5 rounded-xl flex items-center justify-center transition-colors duration-150",
                    isDragging ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                  )}
                >
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-[13px] text-gray-600">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  PDF, DOC, DOCX, JPG, PNG up to 10MB
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg
                          className="w-[18px] h-[18px] text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-700 truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-gray-400">{getFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                      className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-gray-400 mt-2">
              Attach supporting documents or reference files to help the submitter understand the required changes.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setReturnReason("")
              setFiles([])
              onOpenChange(false)
            }}
            className="h-10 px-5"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-amber-500 text-amber-600 hover:bg-amber-50 h-10 px-5"
            disabled={!returnReason.trim()}
            onClick={handleReturn}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Return Submission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
