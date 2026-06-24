import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Search,
  Filter,
  Download,
  Award,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Calendar,
  Plus,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { AACCUPAreaDetailsModal } from "@/components/modals/AACCUPAreaDetailsModal"
import { CreateTaskModal } from "@/components/modals/CreateTaskModal"
import { UploadDocumentsModal } from "@/components/modals/UploadDocumentsModal"
import { AddAreaModal } from "@/components/modals/AddAreaModal"
import { aaccupAreas, submissions, getAACCUPAreaStats, getSubmissionsByArea, AACCUPArea } from "@/data/aaccupData"
import { cn } from "@/lib/utils"

interface AACCUPManagementCertProps {
  sidebarCollapsed?: boolean
}

const statusColors = {
  Completed: "bg-emerald-500",
  "In Progress": "bg-blue-500",
  Pending: "bg-amber-500",
  Overdue: "bg-red-500",
}

const statusBadge = {
  Completed: "success",
  "In Progress": "default",
  Pending: "warning",
  Overdue: "danger",
} as const

export default function AACCUPManagementCert({ sidebarCollapsed: _sidebarCollapsed = false }: AACCUPManagementCertProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedArea, setSelectedArea] = useState<AACCUPArea | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(() => searchParams.get("modal") === "create-task")
  const [isUploadDocumentsOpen, setIsUploadDocumentsOpen] = useState(() => searchParams.get("modal") === "assign-area")
  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false)

  const handleCloseCreateTaskModal = (open: boolean) => {
    setIsCreateTaskOpen(open)
    if (!open) {
      searchParams.delete("modal")
      setSearchParams(searchParams)
    }
  }

  const handleCloseUploadDocumentsModal = (open: boolean) => {
    setIsUploadDocumentsOpen(open)
    if (!open) {
      searchParams.delete("modal")
      setSearchParams(searchParams)
    }
  }

  const handleViewArea = (area: AACCUPArea) => {
    setSelectedArea(area)
    setIsDetailsOpen(true)
  }

  const totalSubmissions = submissions.length
  const completedSubmissions = submissions.filter(s => s.status === "Approved").length
  const pendingSubmissions = submissions.filter(s => s.status === "Pending").length

  const calculateOverallCompliance = () => {
    const totalCompletion = aaccupAreas.reduce((sum, area) => sum + area.completion, 0)
    return Math.round(totalCompletion / aaccupAreas.length)
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Certification Management"
          description="Manage certification areas, submissions, and compliance tracking"
          actions={
            <Button className="shadow-sm" onClick={() => setIsAddAreaModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Area
            </Button>
          }
        />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-8">
            <StatCard
              title="Total Submissions"
              value={totalSubmissions.toString()}
              icon={<Award className="w-5 h-5" />}
            />
            <StatCard
              title="Approved"
              value={completedSubmissions.toString()}
              icon={<CheckCircle className="w-5 h-5" />}
              trend={{ value: 12, positive: true }}
            />
            <StatCard
              title="Pending Review"
              value={pendingSubmissions.toString()}
              icon={<Clock className="w-5 h-5" />}
              trend={{ value: 8, positive: false }}
            />
            <StatCard
              title="Compliance Rate"
              value={`${calculateOverallCompliance()}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              trend={{ value: 5, positive: true }}
            />
          </div>

          <Card className="border-gray-200/60 shadow-sm mb-6">
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search areas or submissions..."
                      className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px] h-9">
                      <Filter className="w-3.5 h-3.5 mr-2" />
                      <SelectValue placeholder="Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      {aaccupAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id.toString()}>
                          Area {area.id}: {area.title.substring(0, 20)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue placeholder="Submission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Submissions</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {aaccupAreas.map((area) => {
              const stats = getAACCUPAreaStats(area.id)
              const areaSubmissions = getSubmissionsByArea(area.id)
              
              return (
                <Card
                  key={area.id}
                  className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewArea(area)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[14px]",
                          statusColors[area.status]
                        )}>
                          {area.id}
                        </div>
                        <div>
                          <h3 className="text-[14px] font-semibold text-gray-900">Area {area.id}</h3>
                          <p className="text-[12px] text-gray-500 line-clamp-1">{area.title}</p>
                        </div>
                      </div>
                      <Badge variant={statusBadge[area.status]} className="text-[10px]">
                        {area.status}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] text-gray-500">Progress</span>
                        <span className="text-[14px] font-semibold text-primary">{area.completion}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", statusColors[area.status])}
                          style={{ width: `${area.completion}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{stats.total} Submissions</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {stats.completed}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {stats.pending}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          {stats.returned}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex -space-x-2">
                        {[...new Set(areaSubmissions.map(s => s.submittedBy))].slice(0, 3).map((name, i) => (
                          <Avatar key={i} className="h-7 w-7 border-2 border-white bg-primary/10">
                            <AvatarFallback className="text-[10px] text-primary font-medium">
                              {name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {areaSubmissions.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-[10px] text-gray-500">+{areaSubmissions.length - 3}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[12px] text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{area.dueDate}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
</div>

      <AACCUPAreaDetailsModal
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        area={selectedArea}
        onCreateTask={() => setIsCreateTaskOpen(true)}
        onUploadDocuments={() => setIsUploadDocumentsOpen(true)}
      />

      <CreateTaskModal
        open={isCreateTaskOpen}
        onOpenChange={handleCloseCreateTaskModal}
        areaTitle={selectedArea?.title}
      />

      <UploadDocumentsModal
        open={isUploadDocumentsOpen}
        onOpenChange={handleCloseUploadDocumentsModal}
      />

      <AddAreaModal
        open={isAddAreaModalOpen}
        onOpenChange={setIsAddAreaModalOpen}
      />
    </>
  )
}