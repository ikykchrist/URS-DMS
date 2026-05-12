import { useState } from "react"
import { MessageSquare, Send, CheckCircle, AlertCircle, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  author: string
  authorRole: string
  content: string
  timestamp: string
  type: "comment" | "approval" | "revision" | "status"
}

interface ReviewCommentsProps {
  comments: Comment[]
  onAddComment?: (content: string) => void
  className?: string
}

const typeConfig = {
  comment: { icon: MessageSquare, color: "text-gray-500", bg: "bg-gray-100", label: "" },
  approval: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", label: "Approved" },
  revision: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", label: "Revision Requested" },
  status: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50", label: "Status Updated" },
}

export function ReviewComments({ comments, onAddComment, className }: ReviewCommentsProps) {
  const [newComment, setNewComment] = useState("")

  const handleSubmit = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim())
      setNewComment("")
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 px-1 pb-3 border-b border-gray-100 mb-3">
        <MessageSquare className="w-4 h-4 text-gray-500" />
        <span className="text-[13px] font-semibold text-gray-900">
          Review Discussion
        </span>
        <span className="text-[12px] text-gray-400">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-h-80">
        {comments.map((comment) => {
          const config = typeConfig[comment.type]
          const Icon = config.icon
          return (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                <AvatarFallback className="text-[11px] bg-gray-100 text-gray-600 font-medium">
                  {comment.author.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-medium text-gray-900">{comment.author}</span>
                  <span className="text-[11px] text-gray-500">{comment.authorRole}</span>
                  {comment.type !== "comment" && (
                    <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", config.bg, config.color)}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </div>
                  )}
                  <span className="text-[11px] text-gray-400 ml-auto">{comment.timestamp}</span>
                </div>
                <div
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    comment.type === "comment"
                      ? "bg-gray-50 text-gray-700"
                      : cn(config.bg, config.color.replace("text-", "text-"))
                  )}
                >
                  {comment.content}
                </div>
              </div>
            </div>
          )
        })}

        {comments.length === 0 && (
          <div className="py-8 text-center text-[13px] text-gray-500">
            No review comments yet. Start the discussion below.
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-gray-100">
        <div className="flex items-end gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment or note..."
            rows={2}
            className="flex-1 text-[13px] resize-none border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-1.5 focus:ring-primary/20 focus:border-primary transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <Button
            size="icon"
            className="h-9 w-9 flex-shrink-0 shadow-sm"
            onClick={handleSubmit}
            disabled={!newComment.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
