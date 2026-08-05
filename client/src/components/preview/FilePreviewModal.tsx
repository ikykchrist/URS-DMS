import { useEffect, useRef, useState } from "react"
import {
  X,
  Download,
  Pencil,
  Move,
  Trash2,
  Info,
  Loader2,
  FileText,
  Printer,
  Activity,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { openOnlineDocument, getOnlineDocumentUrl, getDocumentActivity, type DocumentActivity } from "@/services/documents"
import type { Document } from "@/types/domain"
import { cn } from "@/lib/utils"

// =============================================================================
// FilePreviewModal — the ONE shared preview surface for the repository.
// Supports PDF, images, video (native controls), audio and text. Preview tab
// renders the file; Details & Activity tab (rule 18) shows metadata, download
// count, submission status and the file's own audit timeline. Secure
// short-lived presigned URLs are used after the server validates ownership.
// =============================================================================

interface FilePreviewModalProps {
  document: Document | null
  onClose: () => void
  onRename?: (document: Document, title: string) => Promise<void>
  onMove?: (document: Document) => void
  onDelete?: (document: Document) => void
}

function formatSize(bytes: number): string {
  if (!bytes) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

function submissionBadge(doc: Document) {
  if (!doc.submissionStatus) return null
  const config = {
    PENDING: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
    NEEDS_REVISION: { label: "Returned", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  } as const
  const cfg = config[doc.submissionStatus]
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap", cfg.cls)}
      title={`AACCUP submission: ${cfg.label}`}>
      {cfg.label}
    </span>
  )
}

export function FilePreviewModal({ document, onClose, onRename, onMove, onDelete }: FilePreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"preview" | "activity">("preview")
  const [activity, setActivity] = useState<DocumentActivity | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setUrl(null)
    setError(null)
    setEditing(false)
    setTab("preview")
    setActivity(null)
    if (!document) return
    setLoading(true)
    getOnlineDocumentUrl(document, true)
      .then(setUrl)
      .catch(() => setError("Unable to generate a preview link"))
      .finally(() => setLoading(false))
  }, [document])

  useEffect(() => {
    if (!document || tab !== "activity") return
    setActivityLoading(true)
    getDocumentActivity(document.id)
      .then(setActivity)
      .catch(() => setActivity(null))
      .finally(() => setActivityLoading(false))
  }, [document, tab])

  if (!document) return null

  const type = document.type?.toLowerCase() ?? ""
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(type)
  const isVideo = ["mp4", "webm", "mov", "avi", "mkv"].includes(type)
  const isAudio = ["mp3", "wav", "ogg", "m4a", "aac"].includes(type)
  const isPdf = type === "pdf"
  const printable = isPdf || isImage || ["txt", "csv"].includes(type)

  const submitRename = async () => {
    if (!title.trim() || !document) return
    setSaving(true)
    try {
      await onRename?.(document, title.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const printPreview = () => {
    try {
      iframeRef.current?.contentWindow?.print()
    } catch {
      // printing is best-effort
    }
  }

  const renderActivityTab = () => (
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-2 gap-3 max-w-lg mb-4">
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Name</p>
          <p className="text-[13px] text-gray-900 font-medium mt-0.5 break-all">{document.name}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Type</p>
          <p className="text-[13px] text-gray-900 font-medium mt-0.5">{document.type} · {formatSize(document.size)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Owner</p>
          <p className="text-[13px] text-gray-900 font-medium mt-0.5">{document.ownerName}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Location</p>
          <p className="text-[13px] text-gray-900 font-medium mt-0.5">{document.folderId ? "Filed in a folder" : "Repository root"}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Created</p>
          <p className="text-[13px] text-gray-900 font-medium mt-0.5">{new Date(document.dateCreated).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Modified</p>
          <p className="text-[13px] text-gray-900 font-medium mt-0.5">{new Date(document.dateModified).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Submission</p>
          <div className="mt-1">{submissionBadge(document) ?? <p className="text-[13px] text-gray-400">Not submitted</p>}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Downloads</p>
          <p className="text-[13px] text-gray-900 font-medium mt-0.5">{activity?.downloadCount ?? "—"}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((prev) => !prev)}
        className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-700 mb-3"
      >
        {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Advanced
      </button>
      {showAdvanced && (
        <div className="rounded-lg border border-gray-100 bg-white p-3 mb-4 max-w-lg">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">SHA-256 checksum</p>
          <p className="text-[11px] text-gray-500 break-all font-mono">{document.checksum ?? "—"}</p>
        </div>
      )}

      <p className="text-[12px] font-semibold text-gray-700 mb-2">Activity timeline</p>
      {activityLoading ? (
        <div className="flex items-center gap-2 text-[12px] text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading activity…
        </div>
      ) : !activity || activity.events.length === 0 ? (
        <p className="text-[12px] text-gray-400 py-4">No activity recorded for this file yet.</p>
      ) : (
        <div className="space-y-0">
          {activity.events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0",
                event.status === "FAILURE" ? "bg-red-400" : "bg-blue-400")} />
              <div className="min-w-0">
                <p className="text-[12px] text-gray-800 font-medium break-all">{event.action}</p>
                <p className="text-[11px] text-gray-400">
                  {event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}
                  {event.actorName ? ` · ${event.actorName}` : ""}
                  {event.status === "FAILURE" ? " · FAILED" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={Boolean(document)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[92vw] w-[92vw] h-[88vh] max-h-[88vh] p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between gap-4 pr-10">
            <div className="min-w-0">
              <DialogTitle className="text-[15px] truncate flex items-center gap-2">
                {document.name}
                {submissionBadge(document)}
              </DialogTitle>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {document.type} · {document.categoryName} · {new Date(document.dateModified).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 mr-1">
                <button type="button" onClick={() => setTab("preview")}
                  className={cn("px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors",
                    tab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                  Preview
                </button>
                <button type="button" onClick={() => setTab("activity")}
                  className={cn("px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors",
                    tab === "activity" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                  Details & Activity
                </button>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => void openOnlineDocument(document)}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </Button>
              {tab === "preview" && printable && (
                <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={printPreview}>
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => { setTitle(document.name); setEditing(true) }}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Rename
              </Button>
              {onMove && (
                <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => onMove(document)}>
                  <Move className="w-3.5 h-3.5 mr-1.5" /> Move
                </Button>
              )}
              {onDelete && (
                <Button variant="outline" size="sm" className="h-8 text-[12px] text-red-600 hover:text-red-700" onClick={() => onDelete(document)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          {editing && (
            <div className="mb-4 flex items-end gap-2 max-w-md">
              <div className="grid gap-1.5 flex-1">
                <Label className="text-[12px] text-gray-500">File name</Label>
                <Input className="h-9" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <Button size="sm" className="h-9" onClick={() => void submitRename()} disabled={saving || !title.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" className="h-9" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          )}

          {tab === "activity" ? (
            renderActivityTab()
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <FileText className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-[14px] text-gray-600">{error}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => void openOnlineDocument(document, true)}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Open file instead
              </Button>
            </div>
          ) : loading || !url ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
          ) : isVideo ? (
            <video src={url} controls className="max-w-full max-h-full mx-auto rounded-lg bg-black shadow-sm" />
          ) : isAudio ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-[14px] text-gray-700 font-medium mb-3">{document.name}</p>
              <audio src={url} controls className="w-full max-w-md" />
            </div>
          ) : isImage ? (
            <img src={url} alt={document.name} className="max-w-full max-h-full mx-auto rounded-lg shadow-sm" />
          ) : (
            <iframe ref={iframeRef} src={url} title={document.name} className="w-full h-full min-h-[60vh] rounded-lg bg-white shadow-sm" />
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 flex items-center gap-2 text-[12px] text-gray-400">
          <Info className="w-3.5 h-3.5" />
          Version {document.versionCount} · Modified {new Date(document.dateModified).toLocaleString()}
          {document.folderId ? ` · Filed in a folder` : " · At repository root"}
          <Activity className="w-3.5 h-3.5 ml-2" />
          {activity?.downloadCount ?? "—"} downloads
        </div>
      </DialogContent>
    </Dialog>
  )
}
