import { useState } from "react"
import { Upload } from "lucide-react"
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
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Dropzone } from "@/components/ui/Dropzone"
import { toast } from "@/lib/toast"
import {
  uploadOnlineRequirementDocument,
  validateOnlineRequirementUpload,
  type OnlineAaccupTask,
} from "@/services/aaccup"
import { cn } from "@/lib/utils"

// =============================================================================
// TaskSubmitDialog — submit evidence into an assigned task. Shared by the
// user "My Tasks" tab and the admin area details modal so both surfaces act
// identically.
// =============================================================================

interface TaskSubmitDialogProps {
  task: OnlineAaccupTask | null
  onClose: () => void
  onSubmitted?: () => void
}

export function TaskSubmitDialog({ task, onClose, onSubmitted }: TaskSubmitDialogProps) {
  const [title, setTitle] = useState(task?.requirementTitle ?? task?.title ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [remarks, setRemarks] = useState("")
  const [uploading, setUploading] = useState(false)
  const [validationMessages, setValidationMessages] = useState<string[]>([])

  const handleSubmit = async () => {
    if (!task || !task.requirementId || !file || !title.trim()) return
    setUploading(true)
    setValidationMessages([])
    try {
      const input = {
        requirementId: task.requirementId,
        departmentId: task.departmentId ?? "",
        title: title.trim(),
        areaName: task.areaName,
        requirementCode: task.requirementCode ?? undefined,
        taskId: task.id,
        file,
        remarks: remarks.trim() || undefined,
      }
      const validation = await validateOnlineRequirementUpload(input)
      if (!validation.valid) {
        setValidationMessages(validation.errors.map((issue) => issue.message))
        return
      }
      if (validation.warnings.length > 0) {
        toast.warning(validation.warnings.map((issue) => issue.message).join(" "))
      }
      await uploadOnlineRequirementDocument(input)
      toast.success("Evidence submitted for this task")
      onSubmitted?.()
      onClose()
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed"
      setValidationMessages([message])
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Submit Evidence</DialogTitle>
          <DialogDescription>
            {task?.title} ({task?.requirementCode})
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[68vh] space-y-4 overflow-y-auto py-3">
          <div className="space-y-2">
            <Label>Document Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <Dropzone
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.csv,.txt"
              onChange={(files) => setFile(files[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional context for the reviewer"
            />
          </div>
          {validationMessages.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              {validationMessages.map((message) => (
                <p key={message} className={cn("text-[12px] text-red-700")}>{message}</p>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={uploading || !file || !title.trim() || !task?.requirementId}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Validating and Uploading..." : "Upload and Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
