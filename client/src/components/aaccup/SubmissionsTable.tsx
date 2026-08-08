import { useState, useEffect, useCallback } from "react"
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
import { DocumentPreviewModal } from "@/components/modals/DocumentPreviewModal"
import { ReturnSubmissionModal } from "@/components/modals/ReturnSubmissionModal"
import {
  listAllOnlineSubmissions,
  reviewOnlineSubmission,
  archiveOnlineSubmission,
  type AreaSet,
  type OnlineSubmissionListItem,
} from "@/services/aaccup"
import { openOnlineDocument, deleteOnlineDocument } from "@/services/documents"
import { listSystemDepartments } from "@/services/admin"
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
    id: s.id,
    name: s.documentTitle,
    type: "FILE",
    categoryId: s.requirementId,
    categoryName: s.requirementCode,
    area: s.areaName,
    department: s.departmentName ?? "Unassigned",
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

type SetFilter = AreaSet | "ALL"

interface SubmissionsTableProps {
  mode: "review" | "view"
  areaSet?: AreaSet
}

export function SubmissionsTable({ mode, areaSet }: SubmissionsTableProps) {
  const { user } = useAuth()
  const [rawSubmissions, setRawSubmissions] = useState<OnlineSubmissionListItem[]>([])
  const [submissions, setSubmissions] = useState<Document[]>([])
  const [setFilter, setSetFilter] = useState<SetFilter>(areaSet ?? "ALL")
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<Document | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [systemDepartments, setSystemDepartments] = useState<Array<{ id: string; name: string }>>([])

  const isReview = mode === "review"
  const canReview = Boolean(user && (hasPermission(user.role, "canApprove") || hasPermission(user.role, "canReject")))

  const load = useCallback(async () => {
    const query = setFilter === "ALL" ? {} : { areaSet: setFilter }
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
    listSystemDepartments({ pageSize: 100 })
      .then((page) => setSystemDepartments(page.items.map((d) => ({ id: d.id, name: d.name }))))
      .catch(() => setSystemDepartments([]))
  }, [])

  const rawById = (id: string) => rawSubmissions.find((s) => s.id === id)

  const refresh = () => {
    load().catch(() => {})
  }

  const handleViewSubmission = (submission: Document) => {
    setSelectedSubmission(submission)
    setIsPreviewModalOpen(true)
  }

  const handleOpenReturnModal = () => {
    setIsPreviewModalOpen(false)
    setTimeout(() => setIsReturnModalOpen(true), 150)
  }

  const handleCloseReturnModal = () => {
    setIsReturnModalOpen(false)
    refresh()
  }

  const handleApprove = async (documentId: string) => {
    try {
      await reviewOnlineSubmission(documentId, { decision: "APPROVED" })
      refresh()
    } catch {
      window.alert("Failed to approve submission.")
    }
  }

  const handleReject = async (documentId: string) => {
    if (!window.confirm("Reject this submission? This closes the review and notifies the submitter.")) return
    try {
      await reviewOnlineSubmission(documentId, { decision: "REJECTED" })
      refresh()
    } catch {
      window.alert("Failed to reject submission.")
    }
  }

  const filteredSubmissions = submissions.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (currentFilters.status && currentFilters.status !== "all" && s.status.toLowerCase() !== currentFilters.status.toLowerCase()) return false
    if (currentFilters.area && currentFilters.area !== "all" && s.area !== currentFilters.area) return false
    if (currentFilters.department && currentFilters.department !== "all" && s.department !== currentFilters.department) return false
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
      setSelectedIds(new Set(filteredSubmissions.map((s) => s.id)))
    }
  }

  const handleApplyFilter = (filter: SavedFilter) => {
    setCurrentFilters(filter.filters)
  }

  const handleFilterChange = (key: string, value: string) => {
    setCurrentFilters((prev) => {
      const next = { ...prev }
      if (value === "all") delete next[key]
      else next[key] = value
      return next
    })
  }

  const exportCsv = () => {
    const rows = filteredSubmissions.length > 0 ? filteredSubmissions : submissions
    const csv = "Title,Area,Submitted By,Department,Date,Status\n" +
      rows.map((s) => `"${s.name}","${s.area}","${s.ownerName}","${s.department}","${s.dateModified.slice(0, 10)}","${s.status}"`).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `submissions-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const pendingCount = submissions.filter((s) => s.status === "Pending").length
  const approvedCount = submissions.filter((s) => s.status === "Approved").length
  const returnedCount = submissions.filter((s) => s.status === "Returned").length

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-8">
        <StatCard
          title="All Submissions"
          value={submissions.length.toString()}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          title="Pending"
          value={String(pendingCount)}
          icon={<Clock className="w-5 h-5" />}
          trend={{
            value: submissions.length > 0 ? Math.round((pendingCount / submissions.length) * 100) : 0,
            positive: false,
          }}
        />
        <StatCard
          title="Approved"
          value={String(approvedCount)}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{
            value: submissions.length > 0 ? Math.round((approvedCount / submissions.length) * 100) : 0,
            positive: approvedCount > 0,
          }}
        />
        <StatCard
          title="Returned"
          value={String(returnedCount)}
          icon={<RotateCcw className="w-5 h-5" />}
        />
      </div>

      <Card className="border-gray-200/60 shadow-sm mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200"
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
                    <SelectItem value="CERT">Certification</SelectItem>
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
              <Select value={currentFilters.department || "all"} onValueChange={(v) => handleFilterChange("department", v)}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {systemDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
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

      <Card className="border-gray-200/60 shadow-sm">
        {isReview && (
          <BulkActionsToolbar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onBulkApprove={async () => {
              for (const id of selectedIds) {
                try { await reviewOnlineSubmission(id, { decision: "APPROVED" }) } catch {}
              }
              setSelectedIds(new Set())
              refresh()
            }}
            onBulkReject={async () => {
              for (const id of selectedIds) {
                try { await reviewOnlineSubmission(id, { decision: "REJECTED" }) } catch {}
              }
              setSelectedIds(new Set())
              refresh()
            }}
            onBulkExport={exportCsv}
            onBulkArchive={async () => {
              for (const id of selectedIds) {
                try { await archiveOnlineSubmission(id) } catch {}
              }
              setSelectedIds(new Set())
              refresh()
            }}
            onBulkDelete={async () => {
              if (!window.confirm(`Delete ${selectedIds.size} submission(s) and their documents?`)) return
              for (const id of selectedIds) {
                try {
                  await archiveOnlineSubmission(id)
                  const raw = rawById(id)
                  if (raw) await deleteOnlineDocument(raw.documentId)
                } catch {}
              }
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
        <CardContent className="p-0">
          <Table>
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
                <TableHead>Document Title</TableHead>
                <TableHead>AACCUP Area</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {isReview && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isReview ? 8 : 6}>
                    <EmptyState
                      variant="search"
                      title="No submissions found"
                      description="Try adjusting your search or filter criteria"
                    />
                  </TableCell>
                </TableRow>
              )}
              {filteredSubmissions.map((submission) => {
                const raw = rawById(submission.id)
                const reviewable =
                  isReview &&
                  canReview &&
                  raw &&
                  (raw.status === "PENDING" || raw.status === "NEEDS_REVISION")
                return (
                  <TableRow
                    key={submission.id}
                    className={cn(
                      "hover:bg-gray-50/50 transition-colors cursor-pointer select-none",
                      selectedId === submission.id && "bg-primary/5"
                    )}
                    onClick={() => setSelectedId(submission.id)}
                    onDoubleClick={() => handleViewSubmission(submission)}
                  >
                    {isReview && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <RowCheckbox
                          checked={selectedIds.has(submission.id)}
                          onChange={() => toggleSelect(submission.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div>
                        <p className="text-[14px] font-medium text-gray-900 max-w-[240px] truncate">
                          {submission.name}
                        </p>
                        <p className="text-[12px] text-gray-500">{submission.id}</p>
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
                        <span className="text-[13px] text-gray-700">{submission.ownerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-gray-600">{submission.department}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-gray-500">{submission.dateModified.slice(0, 10)}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    {isReview && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {reviewable && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                title="Approve"
                                onClick={() => void handleApprove(submission.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                title="Return for revision"
                                onClick={handleOpenReturnModal}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                title="Reject"
                                onClick={() => void handleReject(submission.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900"
                            title="Preview"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900"
                            title="Download"
                            onClick={() => openOnlineDocument(submission)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="mt-4 px-5 pb-5 flex items-center justify-between">
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

      <DocumentPreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        document={selectedSubmission}
        showAdminActions={isReview && canReview}
        onApprove={(id) => void handleApprove(id)}
        onReject={(id) => void handleReject(id)}
        onReturn={handleOpenReturnModal}
      />

      {isReview && (
        <ReturnSubmissionModal
          open={isReturnModalOpen}
          onOpenChange={handleCloseReturnModal}
          submissionId={selectedSubmission?.id ?? ""}
          submissionTitle={selectedSubmission?.name}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
