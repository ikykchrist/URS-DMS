import { useState } from "react"
import { Upload, X, FileText, Image, File } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { cn } from "@/lib/utils"

interface UploadDocumentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadDocumentsModal({ open, onOpenChange }: UploadDocumentsModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

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

  const getFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image
    if (type.includes("pdf")) return FileText
    return File
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Supporting Documents
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Upload required documents for this task
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700">
              Document Category
            </Label>
            <Select defaultValue="annual-report">
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual-report">Annual Report</SelectItem>
                <SelectItem value="supporting">Supporting Documents</SelectItem>
                <SelectItem value="evidence">Evidence Files</SelectItem>
                <SelectItem value="statistics">Statistics</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-upload-aaccup")?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150",
              isDragging
                ? "border-primary bg-primary-5"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <input
              id="file-upload-aaccup"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              <div
                className={cn(
                  "w-12 h-12 mb-3 rounded-xl flex items-center justify-center transition-colors duration-150",
                  isDragging ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                )}
              >
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-[14px] text-gray-700">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-[12px] text-gray-400 mt-1">
                PDF, DOC, DOCX, XLS, XLSX, JPG, PNG up to 25MB
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-gray-500">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </p>
              {files.map((file, index) => {
                const Icon = getFileIcon(file.type)
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-gray-700 truncate max-w-[200px]">
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
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-5">
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)} className="h-10 px-5 shadow-sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
