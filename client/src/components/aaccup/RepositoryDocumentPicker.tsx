import { useEffect, useMemo, useState } from "react"
import { FileText, Loader2, Search, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { listOnlineDocuments } from "@/services/documents"
import type { Document } from "@/types/domain"
import { useAuth } from "@/context/AuthContext"

interface RepositoryDocumentPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (document: Document) => void
}

function formatSize(size: number): string {
  if (!size) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  return `${(size / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function RepositoryDocumentPicker({ open, onOpenChange, onSelect }: RepositoryDocumentPickerProps) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !user?.id) return
    setLoading(true)
    setError("")
    setSearch("")
    listOnlineDocuments({ ownerId: user.id, archived: false })
      .then(setDocuments)
      .catch((loadError) => {
        setDocuments([])
        setError(loadError instanceof Error ? loadError.message : "Unable to load your documents")
      })
      .finally(() => setLoading(false))
  }, [open, user?.id])

  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return documents
    return documents.filter((document) =>
      [document.name, document.type, document.categoryName, document.area]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [documents, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose from My Documents</DialogTitle>
          <DialogDescription>Select an existing document to submit without uploading a duplicate copy.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your documents" className="h-10 pl-9 pr-9" autoFocus />
          {search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </div>
        <div className="min-h-0 max-h-[55vh] overflow-y-auto rounded-lg border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your documents...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-600">{error}</div>
          ) : visibleDocuments.length === 0 ? (
            <div className="p-6"><EmptyState variant="documents" title={documents.length ? "No matching documents" : "No repository documents"} description={documents.length ? "Try a different search." : "Upload a document to your repository first."} /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleDocuments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => { onSelect(document); onOpenChange(false) }}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><FileText className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-800">{document.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500"><Badge variant="outline" className="text-[9px]">{document.type}</Badge>{formatSize(document.size)} · Modified {new Date(document.dateModified).toLocaleDateString()}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-primary-600">Select</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button></div>
      </DialogContent>
    </Dialog>
  )
}
