import { useState } from "react"
import {
  FileText,
  Calendar,
  MessageSquare,
  Clock,
  Upload,
  Send,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { Textarea } from "@/components/ui/Textarea"

interface Task {
  id: string
  name: string
  assignedTo: string
  initials: string
  dueDate: string
  documents: number
  status: "Completed" | "In Progress" | "Pending" | "Overdue"
  progress: number
}

interface TaskDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onUploadDocuments: () => void
}

const statusVariant = {
  Completed: "success",
  "In Progress": "default",
  Pending: "warning",
  Overdue: "danger",
} as const

const activityLog = [
  { user: "Dr. Maria Santos", action: "created this task", time: "Jan 10, 2024 09:00 AM" },
  { user: "Dr. Maria Santos", action: "assigned to Prof. John Doe", time: "Jan 10, 2024 09:15 AM" },
  { user: "Prof. John Doe", action: "uploaded 2 documents", time: "Jan 12, 2024 02:30 PM" },
  { user: "Dr. Maria Santos", action: "added comment", time: "Jan 14, 2024 11:00 AM" },
  { user: "Prof. John Doe", action: "updated progress to 75%", time: "Jan 15, 2024 03:45 PM" },
]

const comments = [
  {
    user: "Dr. Maria Santos",
    initials: "MS",
    text: "Please ensure all supporting documents are properly organized and labeled according to the AACCUP guidelines.",
    time: "Jan 14, 2024 11:00 AM",
  },
  {
    user: "Prof. John Doe",
    initials: "JD",
    text: "I've started working on the documentation. Will upload the first draft by end of this week.",
    time: "Jan 14, 2024 02:30 PM",
  },
]

export function TaskDetailsModal({ open, onOpenChange, task, onUploadDocuments }: TaskDetailsModalProps) {
  const [newComment, setNewComment] = useState("")

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">{task.name}</DialogTitle>
          <DialogDescription className="text-[14px]">
            View task details, track progress, and collaborate with your team
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-[12px] bg-primary text-white">{task.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-medium text-gray-900">{task.assignedTo}</h3>
                <Badge variant={statusVariant[task.status]} className="text-[10px]">{task.status}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1 text-[12px] text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  Due: {task.dueDate}
                </div>
                <div className="flex items-center gap-1 text-[12px] text-gray-500">
                  <FileText className="w-3.5 h-3.5" />
                  {task.documents} documents
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={onUploadDocuments}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Progress</p>
              <div className="flex items-center gap-2">
                <span className="text-[20px] font-bold text-primary">{task.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Documents</p>
              <p className="text-[20px] font-bold text-gray-900">{task.documents}</p>
              <p className="text-[11px] text-gray-400 mt-1">files attached</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Days Left</p>
              <p className="text-[20px] font-bold text-gray-900">12</p>
              <p className="text-[11px] text-gray-400 mt-1">until deadline</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Activity Timeline
            </p>
            <div className="space-y-3">
              {activityLog.map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-[13px] text-gray-700">
                      <span className="font-medium">{log.user}</span> {log.action}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments
            </p>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {comments.map((comment, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50/50">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">{comment.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-gray-900">{comment.user}</span>
                      <span className="text-[11px] text-gray-400">{comment.time}</span>
                    </div>
                    <p className="text-[13px] text-gray-600">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none text-[13px]"
              />
              <Button size="sm" className="h-[60px] px-3 shadow-sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
