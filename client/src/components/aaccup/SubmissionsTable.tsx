import { toast } from "@/lib/toast"
import { runBulkAction } from "@/lib/actionFeedback"
import { UnsubmitEvidenceButton } from "./UnsubmitEvidenceButton"
import { useState, useEffect, useCallback, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  RotateCcw,
  XCircle,
  Calendar,
} from "lucide-react"
import { StatCard } from "@/components/layout/StatCard"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { FilePreviewModal } from "@/components/preview/FilePreviewModal"
import { ReturnSubmissionModal } from "@/components/modals/ReturnSubmissionModal"
import {
  listAllOnlineSubmissions,
  reviewOnlineSubmission,
  archiveOnlineSubmission,
  type AreaSet,
  type OnlineSubmissionListItem,
} from "@/services/aaccup"
import { getOnlineDocument, openOnlineDocument, deleteOnlineDocument } from "@/services/documents"
import type { Document, DocumentStatus } from "@/types/domain"
import { BulkActionsToolbar, SelectAllCheckbox, RowCheckbox } from "@/components/ui/BulkActionsToolbar"
import { SavedFilterViews } from "@/components/ui/SavedFilterViews"
import { EmptyState } from "@/components/ui/EmptyState"
import type { SavedFilter } from "@/components/ui/SavedFilterViews"
import { useAuth } from "@/context/AuthContext"
import { hasPermission } from "@/lib/permissions"
import { cn } from "@/lib/utils"

// =============================================================================
// SubmissionsTable — the shared submission review/view table.
// `mode="review"` (admin): full review actions + bulk toolbar.
// `mode="view"`   (user):  the same table, read-only (own rows via server
// scoping), single-click select + double-click preview.
// =============================================================================

const toSubmissionDocument = (s: OnlineSubmissionListItem): Document => {
  const status: DocumentStatus =
    s.status === "APPROVED"
      ? "Approved"
      : s.status === "REJECTED"
      ? "Rejected"
      : s.status === "NEEDS_REVISION"
      ? "Returned"
      : "Pending"
  return {
    id: s.documentId,
    submissionId: s.id,
    name: s.documentTitle,
    type: "FILE",
    categoryId: s.requirementId,
    categoryName: s.requirementCode,
    area: s.areaName,
    program: s.programName ?? "Unassigned",
    ownerId: s.submittedById ?? "",
    ownerName: s.submittedByName ?? "Unknown",
    size: 0,
    status,
    blobId: `submission:${s.id}`,
    currentVersionId: "",
    versionCount: 1,
    archived: false,
    dateModified: s.submittedAt,
    dateCreated: s.submittedAt,
    mimeType: "",
    tags: [],
    createdAt: s.submittedAt,
    updatedAt: s.submittedAt,
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Approved":
      return <Badge variant="success">{status}</Badge>
    case "Pending":
      return <Badge variant="warning">{status}</Badge>
    case "Returned":
      return <Badge variant="warning">{status}</Badge>
    case "Rejected":
      return <Badge variant="danger">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function UserSubmissionStatCard({ title, value, icon, detail }: { title: string; value: string; icon: ReactNode; detail?: string }) {
  return (
    <Card className="h-full border-border/70">
      <CardContent className="flex h-full min-h-[156px] flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[12px] font-medium text-slate-500">{title}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <p className="mt-2 text-2xl font-semibold text-navy-900">{value}</p>
        {detail && <p className="mt-3 text-[11px] text-slate-500">{detail}</p>}
      </CardContent>
    </Card>
  )
}

type SetFilter = AreaSet | "ALL"

interface SubmissionsTableProps {
  mode: "review" | "view"
  areaSet?: AreaSet
}

export function SubmissionsTable({ mode, areaSet }: SubmissionsTableProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rawSubmissions, setRawSubmissions] = useState<OnlineSubmissionListItem[]>([])
  const [submissions, setSubmissions] = useState<Document[]>([])
  const [setFilter, setSetFilter] = useState<SetFilter>(areaSet ?? "ALL")
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [_previewOpen, setPreviewOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<Document | null>(null)
  const [returnSubmissionId, setReturnSubmissionId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>((): Record<string, string> => {
    const initialStatus = searchParams.get("status")
    const normalized = initialStatus?.toUpperCase() === "NEEDS_REVISION" ? "returned" : initialStatus?.toLowerCase()
    return normalized && ["pending", "approved", "rejected", "returned"].includes(normalized) ? { status: normalized } : {}
  })
  const [searchQuery, setSearchQuery] = useState("")
  const highlightId = searchParams.get("highlight")
  const queryStatus = searchParams.get("status")

  useEffect(() => {
    const status = queryStatus?.toUpperCase() === "NEEDS_REVISION" ? "returned" : queryStatus?.toLowerCase()
    setCurrentFilters((previous) => {
      const next = { ...previous }
      if (status && ["pending", "approved", "rejected", "returned"].includes(status)) next.status = status
      else delete next.status
      return next
    })
  }, [queryStatus])

  const updateQueryStatus = (status?: string) => {
    const next = new URLSearchParams(searchParams)
    if (status && status !== "all") next.set("status", status === "returned" ? "NEEDS_REVISION" : status.toUpperCase())
    else next.delete("status")
    setSearchParams(next, { replace: true })
  }

  const isReview = mode === "review"
  const canReview = Boolean(user && (hasPermission(user.role, "canApprove") || hasPermission(user.role, "canReject")))

  const load = useCallback(async () => {
    // Contextual views show the originating set only; all views sort oldest
    // first so reviewers work through the queue in submission order.
    const query =
      setFilter === "ALL"
        ? { sort: "submittedAt" as const, order: "asc" as const }
        : { areaSet: setFilter, sort: "submittedAt" as const, order: "asc" as const }
    const items = await listAllOnlineSubmissions(query)
    setRawSubmissions(items)
    setSubmissions(items.map(toSubmissionDocument))
  }, [setFilter])

  useEffect(() => {
    load().catch(() => {
      setRawSubmissions([])
      setSubmissions([])
    })
  }, [load])

  useEffect(() => {
    setSetFilter(areaSet ?? "ALL")
  }, [areaSet])

  useEffect(() => {
    setSelectedSubmission((current) => {
      if (!current?.submissionId) return current
      const latest = rawSubmissions.find((row) => row.id === current.submissionId)
      if (!latest) return null
      const status = toSubmissionDocument(latest).status
      return current.status === status && current.submissionStatus === latest.status
        ? current
        : { ...current, status, submissionStatus: latest.status }
    })
  }, [rawSubmissions])

  useEffect(() => {
    if (!highlightId) return
    const highlighted = rawSubmissions.find((submission) => submission.id === highlightId || submission.documentId === highlightId)
    if (highlighted) {
      const document = toSubmissionDocument(highlighted)
      setSelectedId(highlighted.id)
      setSelectedSubmission(document)
      setPreviewOpen(true)
    }
  }, [highlightId, rawSubmissions])

  // A file can have multiple review attempts. Keys, selections and decisions
  // identify the submission; preview/download still identify the document.
  const rawById = (id?: string) => rawSubmissions.find((s) => s.id === id)

  const refresh = () => {
    load().catch(() => {})
  }

  const handleViewSubmission = (submission: Document) => {
    setSelectedSubmission(submission)
    setPreviewOpen(true)
    const raw = rawById(submission.submissionId)
    if (!raw) return
    void getOnlineDocument(submission.id).then((document) => {
      if (document) {
        setSelectedSubmission((current) => current?.submissionId === raw.id ? { ...document, submissionId: raw.id, status: submission.status, submissionStatus: raw.status } : current)
      }
    })
  }

  const handleOpenReturnModal = (doc?: Document) => {
    if (doc) {
      const sid = doc.submissionId
      setReturnSubmissionId(sid ?? null)
      setSelectedSubmission(null)
    }
    setPreviewOpen(false)
    setTimeout(() => setIsReturnModalOpen(true), 150)
  }

  const handleCloseReturnModal = () => {
    setIsReturnModalOpen(false)
    setReturnSubmissionId(null)
    refresh()
  }

  const handleApprove = async (document: Document) => {
    const raw = rawById(document.submissionId)
    if (!raw || raw.status !== "PENDING") return
    try {
      await reviewOnlineSubmission(raw.id, { decision: "APPROVED" })
      refresh()
      toast.success("Submission approved")
    } catch {
      window.alert("Failed to approve submission.")
    }
  }

  const handleReject = async (document: Document) => {
    if (!window.confirm("Reject this submission? This closes the review and notifies the submitter.")) return
    const raw = rawById(document.submissionId)
    if (!raw || raw.status !== "PENDING") return
    try {
      await reviewOnlineSubmission(raw.id, { decision: "REJECTED" })
      refresh()
      toast.success("Submission rejected")
    } catch {
      window.alert("Failed to reject submission.")
    }
  }

  const filteredSubmissions = submissions.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    const requestedStatus = currentFilters.status
    if (requestedStatus && requestedStatus !== "all") {
      const normalizedStatus = requestedStatus === "NEEDS_REVISION" || requestedStatus === "returned" ? "Returned" : requestedStatus === "REJECTED" ? "Rejected" : requestedStatus === "APPROVED" ? "Approved" : requestedStatus
      if (s.status.toLowerCase() !== normalizedStatus.toLowerCase()) return false
    }
    if (currentFilters.area && currentFilters.area !== "all" && s.area !== currentFilters.area) return false
    if (currentFilters.program && currentFilters.program !== "all" && s.program !== currentFilters.program) return false
    return true
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSubmissions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredSubmissions.map((s) => s.submissionId!)))
    }
  }

  const handleApplyFilter = (filter: SavedFilter) => {
    updateQueryStatus(filter.filters.status)
    setCurrentFilters(filter.filters)
  }

  const handleFilterChange = (key: string, value: string) => {
    if (key === "status") updateQueryStatus(value)
    setCurrentFilters((prev) => {
      const next = { ...prev }
      if (value === "all") delete next[key]
      else next[key] = value
      return next
    })
  }

  const exportCsv = () => {
    const rows = filteredSubmissions
    const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = "Title,Area,Submitted By,Program,Date,Status\n" +
      rows.map((s) => [s.name, s.area, s.ownerName, s.program, s.dateModified.slice(0, 10), s.status].map(csvCell).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `submissions-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Export prepared: ${rows.length} submission(s). Download started.`)
  }

  const pendingCount = submissions.filter((s) => s.status === "Pending").length
  const approvedCount = submissions.filter((s) => s.status === "Approved").length
  const returnedCount = submissions.filter((s) => s.status === "Returned").length

  return (
    <div>
      <div className={cn("mb-6 lg:mb-8", isReview ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 responsive-gap" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 responsive-gap")}>
        {isReview ? (
          <>
            <StatCard title="All Submissions" value={submissions.length.toString()} icon={<span className="inline-flex rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-50/30 dark:text-blue-400"><FileText className="w-4 h-4" /></span>} />
            <StatCard title="Pending" value={String(pendingCount)} icon={<span className="inline-flex rounded-lg bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-50/30 dark:text-amber-400"><Clock className="w-4 h-4" /></span>} />
            <StatCard title="Approved" value={String(approvedCount)} icon={<span className="inline-flex rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-50/30 dark:text-emerald-400"><CheckCircle className="w-4 h-4" /></span>} />
            <StatCard title="Returned" value={String(returnedCount)} icon={<span className="inline-flex rounded-lg bg-red-50 p-1.5 text-red-600 dark:bg-red-50/30 dark:text-red-400"><RotateCcw className="w-4 h-4" /></span>} />
          </>
        ) : (
          <>
            <UserSubmissionStatCard title="All Submissions" value={submissions.length.toString()} icon={<FileText className="h-4 w-4" />} detail="Your submitted evidence" />
            <UserSubmissionStatCard title="Pending" value={String(pendingCount)} icon={<Clock className="h-4 w-4" />} detail="Awaiting review" />
            <UserSubmissionStatCard title="Approved" value={String(approvedCount)} icon={<CheckCircle className="h-4 w-4" />} detail="Approved submissions" />
            <UserSubmissionStatCard title="Returned" value={String(returnedCount)} icon={<RotateCcw className="h-4 w-4" />} detail="Needs your attention" />
          </>
        )}
      </div>

      <Card className="border-border/70 shadow-soft mb-6">
        <CardContent className="p-0 md:p-0">
          <div className="flex w-full flex-col gap-3 p-4">
            <div className="w-full">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {!areaSet && (
                <Select value={setFilter} onValueChange={(v) => setSetFilter(v as SetFilter)}>
                  <SelectTrigger className="w-[150px] h-9">
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    <SelectValue placeholder="Set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sets</SelectItem>
                    <SelectItem value="AACCUP">AACCUP</SelectItem>
                    <SelectItem value="ISO">ISO</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={currentFilters.area || "all"} onValueChange={(v) => handleFilterChange("area", v)}>
                <SelectTrigger className="w-[160px] h-9">
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  <SelectValue placeholder="AACCUP Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All AACCUP Areas</SelectItem>
                  {[...new Set(submissions.map((s) => s.area).filter(Boolean))].map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={currentFilters.status || "all"} onValueChange={(v) => handleFilterChange("status", v)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
              <SavedFilterViews
                onApplyFilter={handleApplyFilter}
                currentFilters={currentFilters}
              />
              <Select value={currentFilters.program || "all"} onValueChange={(v) => handleFilterChange("program", v)}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {Array.from(new Set(submissions.map((submission) => submission.program).filter(Boolean))).map((program) => (
                    <SelectItem key={program} value={program}>{program}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  updateQueryStatus()
                  setCurrentFilters({})
                  setSearchQuery("")
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={exportCsv}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-soft overflow-hidden">
        {isReview && (
          <BulkActionsToolbar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onBulkApprove={async () => {
              await runBulkAction(selectedIds, async (id) => {
                const raw = rawById(id)
                if (raw?.status !== "PENDING") return false
                await reviewOnlineSubmission(raw.id, { decision: "APPROVED" })
                return true
              }, "submission(s) approved")
              setSelectedIds(new Set())
              refresh()
            }}
            onBulkReject={async () => {
              await runBulkAction(selectedIds, async (id) => {
                const raw = rawById(id)
                if (raw?.status !== "PENDING") return false
                await reviewOnlineSubmission(raw.id, { decision: "REJECTED" })
                return true
              }, "submission(s) rejected")
              setSelectedIds(new Set())
              refresh()
            }}
            onBulkExport={exportCsv}
            onBulkArchive={async () => {
              await runBulkAction(selectedIds, async (id) => {
                await archiveOnlineSubmission(id)
                return true
              }, "submission(s) archived")
              setSelectedIds(new Set())
              refresh()
            }}
            onBulkDelete={async () => {
              if (!window.confirm(`Delete ${selectedIds.size} submission(s) and their documents?`)) return
              await runBulkAction(selectedIds, async (id) => {
                const raw = rawById(id)
                if (!raw) return false
                await archiveOnlineSubmission(raw.id)
                await deleteOnlineDocument(raw.documentId)
                return true
              }, "submission(s) and document(s) archived")
              setSelectedIds(new Set())
              refresh()
            }}
          />
        )}
        <div className="px-5 pt-3 pb-0 flex items-center justify-between">
          <p className="text-[11px] text-gray-400 select-none">
            Single click selects · double click opens
          </p>
          <p className="text-[11px] text-gray-400">
            {setFilter === "ALL" ? "All accreditation sets" : `Set: ${setFilter}`}
          </p>
        </div>
        <CardContent className="p-0 md:p-0">
          <Table className={isReview ? "submission-review-table" : undefined}>
            <TableHeader>
              <TableRow>
                {isReview && (
                  <TableHead className="w-10">
                    <SelectAllCheckbox
                      allVisible={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                      someSelected={selectedIds.size > 0 && selectedIds.size < filteredSubmissions.length}
                      onToggle={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Document / Date</TableHead>
                <TableHead>AACCUP Area</TableHead>
                <TableHead>Submitted By / Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isReview ? 6 : 5}>
                    <EmptyState
                      variant="search"
                      title="No submissions found"
                      description="Try adjusting your search or filter criteria"
                    />
                  </TableCell>
                </TableRow>
              )}
              {filteredSubmissions.map((submission) => {
                const reviewable =
                  isReview &&
                  canReview &&
                  submission.status === "Pending"
                return (
                  <TableRow
                    key={submission.submissionId}
                    className={cn(
                      "hover:bg-gray-50/50 transition-colors cursor-pointer select-none",
                      selectedId === submission.submissionId && "bg-primary/5"
                    )}
                    onClick={() => setSelectedId(submission.submissionId ?? null)}
                    onDoubleClick={() => handleViewSubmission(submission)}
                  >
                    {isReview && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <RowCheckbox
                          checked={selectedIds.has(submission.submissionId!)}
                          onChange={() => toggleSelect(submission.submissionId!)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div>
                        <p className="max-w-[180px] truncate text-[14px] font-medium text-gray-900" title={submission.name}>
                          {submission.name}
                        </p>
                        <p className="mt-1 whitespace-nowrap text-[12px] text-gray-500">{submission.dateModified.slice(0, 10)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-[11px] font-medium bg-gray-100 text-gray-700 rounded">
                        {submission.area || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                            {(submission.ownerName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 max-w-[150px]">
                          <p className="text-[13px] text-gray-700">{submission.ownerName}</p>
                          <p className="mt-1 text-[12px] text-gray-500">{submission.program}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    {isReview && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {submission.status === "Pending" && <div className="record-actions record-actions-table w-[190px]">
                          {reviewable && (
                            <>
                              <Button
                                variant="outline"
                                size="action"
                                className="text-emerald-600 hover:bg-emerald-50"
                                title="Approve"
                                onClick={() => void handleApprove(submission)}
                              >
                                <CheckCircle className="w-4 h-4" /> <span>Approve</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="action"
                                className="text-amber-600 hover:bg-amber-50"
                                title="Return for revision"
                                onClick={() => handleOpenReturnModal(submission)}
                              >
                                <RotateCcw className="w-4 h-4" /> <span>Return</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="action"
                                className="text-red-600 hover:bg-red-50"
                                title="Reject"
                                onClick={() => void handleReject(submission)}
                              >
                                <XCircle className="w-4 h-4" /> <span>Reject</span>
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="action"
                            className="text-gray-600 hover:text-gray-900"
                            title="Preview"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="w-4 h-4" /> <span>View</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="action"
                            className="text-gray-600 hover:text-gray-900"
                            title="Download"
                            onClick={() => openOnlineDocument(submission)}
                          >
                            <Download className="w-4 h-4" /> <span>Download</span>
                          </Button>
                        </div>}
                      </TableCell>
                    )}
                    {!isReview && <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      {(() => { const ownSubmission = rawById(submission.submissionId); return ownSubmission ? <UnsubmitEvidenceButton submission={ownSubmission} onSuccess={load} /> : null })()}
                    </TableCell>}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="table-footer">
            <p className="text-[13px] text-gray-500">
              Showing {filteredSubmissions.length} of {submissions.length} submissions
            </p>
            <p className="text-[12px] text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {isReview ? "Review closes once a submission is approved or rejected" : "Statuses update after admin review"}
            </p>
          </div>
        </CardContent>
      </Card>

      {selectedSubmission && (
        <FilePreviewModal
          document={selectedSubmission}
          onClose={() => { setSelectedSubmission(null) }}
          showAdminActions={isReview && canReview && selectedSubmission.status === "Pending"}
          onApprove={(doc) => void handleApprove(doc)}
          onReject={(doc) => void handleReject(doc)}
          onReturn={handleOpenReturnModal}
        />
      )}

      {isReview && (() => {
        const sid = returnSubmissionId ?? selectedSubmission?.submissionId
        return sid ? (
        <ReturnSubmissionModal
          open={isReturnModalOpen}
          onOpenChange={handleCloseReturnModal}
          submissionId={sid}
          submissionTitle={selectedSubmission?.name}
          onSuccess={refresh}
        />
      ) : null})()}
    </div>
  )
}
