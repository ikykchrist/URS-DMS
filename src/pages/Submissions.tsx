import { useState } from "react"
import {
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  RotateCcw,
  Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { DocumentPreviewModal } from "@/components/modals/DocumentPreviewModal"
import { ReturnSubmissionModal } from "@/components/modals/ReturnSubmissionModal"
import { submissions as allSubmissions, aaccupAreas } from "@/data/aaccupData"
import type { Submission } from "@/data/aaccupData"
import { BulkActionsToolbar, SelectAllCheckbox, RowCheckbox } from "@/components/ui/BulkActionsToolbar"
import { SavedFilterViews } from "@/components/ui/SavedFilterViews"
import { EmptyState } from "@/components/ui/EmptyState"
import type { SavedFilter } from "@/components/ui/SavedFilterViews"

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Approved":
      return <Badge variant="success">{status}</Badge>
    case "Pending":
      return <Badge variant="warning">{status}</Badge>
    case "Returned":
      return <Badge variant="danger">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface SubmissionsProps {
  sidebarCollapsed?: boolean
}

export default function Submissions({ sidebarCollapsed = false }: SubmissionsProps) {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission)
    setIsPreviewModalOpen(true)
  }

  const handleOpenReturnModal = () => {
    setIsPreviewModalOpen(false)
    setTimeout(() => setIsReturnModalOpen(true), 150)
  }

  const handleCloseReturnModal = () => {
    setIsReturnModalOpen(false)
  }

  const filteredSubmissions = allSubmissions.filter((s) => {
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase()) && !s.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (currentFilters.status && s.status.toLowerCase() !== currentFilters.status) return false
    if (currentFilters.area && s.aaccupArea !== parseInt(currentFilters.area)) return false
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

  const pendingCount = allSubmissions.filter(s => s.status === "Pending").length
  const approvedCount = allSubmissions.filter(s => s.status === "Approved").length
  const returnedCount = allSubmissions.filter(s => s.status === "Returned").length

  return (
    <>
      <main
        className="pt-16 pb-8 transition-all duration-200"
        style={{
          marginLeft: sidebarCollapsed ? "72px" : "260px",
        }}
      >
        <div className="p-8">
          <PageHeader
            title="Submissions Management"
            description="Review and manage document submissions from all departments."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="All Submissions"
              value={allSubmissions.length.toString()}
              icon={<FileText className="w-5 h-5" />}
            />
            <StatCard
              title="Pending"
              value={pendingCount.toString()}
              icon={<Clock className="w-5 h-5" />}
              trend={{ value: 5, positive: false }}
            />
            <StatCard
              title="Approved"
              value={approvedCount.toString()}
              icon={<CheckCircle className="w-5 h-5" />}
              trend={{ value: 12, positive: true }}
            />
            <StatCard
              title="Returned"
              value={returnedCount.toString()}
              icon={<RotateCcw className="w-5 h-5" />}
              trend={{ value: 3, positive: false }}
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
                  <Select value={currentFilters.area || "all"} onValueChange={(v) => handleFilterChange("area", v)}>
                    <SelectTrigger className="w-[160px] h-9">
                      <Filter className="w-3.5 h-3.5 mr-2" />
                      <SelectValue placeholder="AACCUP Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All AACCUP Areas</SelectItem>
                      {aaccupAreas.map(area => (
                        <SelectItem key={area.id} value={area.id.toString()}>
                          Area {area.id}
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
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                  <SavedFilterViews
                    onApplyFilter={handleApplyFilter}
                    currentFilters={currentFilters}
                  />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="cosi">College of Info Sciences</SelectItem>
                      <SelectItem value="coe">College of Engineering</SelectItem>
                      <SelectItem value="cas">College of Arts & Sciences</SelectItem>
                      <SelectItem value="dean">Dean Office</SelectItem>
                      <SelectItem value="sao">Student Affairs</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[150px] h-9">
                      <Calendar className="w-3.5 h-3.5 mr-2" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button variant="outline" size="sm" className="h-9">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/60 shadow-sm">
            <BulkActionsToolbar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              onBulkApprove={() => setSelectedIds(new Set())}
              onBulkReject={() => setSelectedIds(new Set())}
              onBulkExport={() => setSelectedIds(new Set())}
              onBulkAssign={() => setSelectedIds(new Set())}
              onBulkArchive={() => setSelectedIds(new Set())}
              onBulkDelete={() => setSelectedIds(new Set())}
            />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <SelectAllCheckbox
                        allVisible={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                        someSelected={selectedIds.size > 0 && selectedIds.size < filteredSubmissions.length}
                        onToggle={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Document Title</TableHead>
                    <TableHead>AACCUP Area</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <EmptyState
                          variant="search"
                          title="No submissions found"
                          description="Try adjusting your search or filter criteria"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell>
                          <RowCheckbox
                            checked={selectedIds.has(submission.id)}
                            onChange={() => toggleSelect(submission.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-[14px] font-medium text-gray-900 max-w-[240px] truncate">
                              {submission.title}
                            </p>
                            <p className="text-[12px] text-gray-500">{submission.id}</p>
                          </div>
                        </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-[11px] font-medium bg-gray-100 text-gray-700 rounded">
                          Area {submission.aaccupArea}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                              {submission.submittedBy.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[13px] text-gray-700">{submission.submittedBy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-gray-600">{submission.department}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-gray-500">{submission.dateSubmitted}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-[13px] text-gray-600 max-w-[120px] truncate">
                            {submission.fileName}
                          </span>
                          <span className="text-[11px] text-gray-400">{submission.fileSize}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      </TableRow>
))}
                  </TableBody>
              </Table>
              <div className="mt-4 px-5 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[13px] text-gray-500">
                  Showing {filteredSubmissions.length} of {allSubmissions.length} submissions
                </p>
                <Pagination>
                  <PaginationPrevious className="h-8" />
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink className="h-8 w-8">1</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink isActive className="h-8 w-8">
                        2
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink className="h-8 w-8">3</PaginationLink>
                    </PaginationItem>
                    <PaginationEllipsis className="h-8 w-8" />
                    <PaginationItem>
                      <PaginationLink className="h-8 w-8">31</PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                  <PaginationNext className="h-8" />
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <DocumentPreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        submission={selectedSubmission}
        onReturn={handleOpenReturnModal}
      />

      <ReturnSubmissionModal
        open={isReturnModalOpen}
        onOpenChange={handleCloseReturnModal}
        submissionTitle={selectedSubmission?.title}
      />
    </>
  )
}