import * as React from "react"
import { Upload, X, File, Image, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./Button"

interface DropzoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  accept?: string
  multiple?: boolean
  onChange?: (files: File[]) => void
  maxFiles?: number
}

const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
  ({ className, accept, multiple = false, onChange, maxFiles = 1, ...props }, ref) => {
    const [files, setFiles] = React.useState<File[]>([])
    const [isDragging, setIsDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

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
      handleFiles(droppedFiles)
    }

    const handleFiles = (newFiles: File[]) => {
      let validFiles = newFiles
      if (maxFiles > 1) {
        validFiles = newFiles.slice(0, maxFiles)
      }
      setFiles(validFiles)
      onChange?.(validFiles)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files)
        handleFiles(selectedFiles)
      }
    }

    const removeFile = (index: number) => {
      const newFiles = files.filter((_, i) => i !== index)
      setFiles(newFiles)
      onChange?.(newFiles)
    }

    const getFileIcon = (type: string) => {
      if (type.startsWith("image/")) return Image
      if (type.includes("pdf")) return FileText
      return File
    }

    return (
      <div className={cn("space-y-3", className)}>
        <div
          ref={ref}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150",
            isDragging
              ? "border-primary bg-primary-5"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
            className
          )}
          {...props}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center">
            <div className={cn(
              "w-11 h-11 mb-3 rounded-xl flex items-center justify-center transition-colors duration-150",
              isDragging ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
            )}>
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-[14px] text-gray-700">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              PDF, DOC, DOCX, JPG, PNG up to 10MB
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => {
              const Icon = getFileIcon(file.type)
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className="w-[18px] h-[18px] text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-gray-700 truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-[12px] text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
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
                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)
Dropzone.displayName = "Dropzone"

export { Dropzone }