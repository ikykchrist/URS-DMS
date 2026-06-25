import { useState } from "react"
import { Upload, CheckCircle, Clock, AlertCircle, FileText, Eye, CheckCircle as CheckCircleIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { Dropzone } from "@/components/ui/Dropzone"

const areas = [
  { id: "area-1", name: "Area I - Mission and Goals", status: "completed" },
  { id: "area-2", name: "Area II - Faculty", status: "in_progress" },
  { id: "area-3", name: "Area III - Curriculum", status: "pending" },
  { id: "area-4", name: "Area IV - Students", status: "pending" },
  { id: "area-5", name: "Area V - General Education", status: "pending" },
  { id: "area-6", name: "Area VI - Library", status: "pending" },
  { id: "area-7", name: "Area VII - Physical Facilities", status: "pending" },
  { id: "area-8", name: "Area VIII - Research", status: "pending" },
  { id: "area-9", name: "Area IX - Extension", status: "pending" },
  { id: "area-10", name: "Area X - Administration", status: "pending" },
]

const areaRequirements: Record<string, Array<{ id: string; name: string; status: string; uploadedAt?: string }>> = {
  "area-1": [
    { id: "r1", name: "Institutional Mission Statement", status: "approved", uploadedAt: "2026-06-15" },
    { id: "r2", name: "Strategic Plan", status: "approved", uploadedAt: "2026-06-10" },
    { id: "r3", name: "Goal Alignment Matrix", status: "approved", uploadedAt: "2026-06-05" },
  ],
  "area-2": [
    { id: "r1", name: "Faculty Qualifications Matrix", status: "approved", uploadedAt: "2026-06-12" },
    { id: "r2", name: "Faculty Development Plan", status: "pending" },
    { id: "r3", name: "Teaching Load Summary", status: "approved", uploadedAt: "2026-06-08" },
    { id: "r4", name: "Faculty Credentials Summary", status: "needs_revision", uploadedAt: "2026-06-01" },
  ],
}

const submissionHistory = [
  { id: "sub-1", title: "Faculty Qualifications Matrix", submittedAt: "2026-06-12", status: "Approved", reviewedBy: "Dr. Santos" },
  { id: "sub-2", title: "Teaching Load Summary", submittedAt: "2026-06-08", status: "Approved", reviewedBy: "Dr. Santos" },
  { id: "sub-3", title: "Faculty Credentials Summary", submittedAt: "2026-06-01", status: "Needs Revision", reviewedBy: "Dr. Santos" },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge variant="success">Approved</Badge>
    case "pending":
      return <Badge variant="pending">Pending</Badge>
    case "needs_revision":
      return <Badge variant="needs_revision">Needs Revision</Badge>
    case "submitted":
      return <Badge variant="submitted">Submitted</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return <CheckCircle className="w-4 h-4 text-emerald-500" />
    case "needs_revision":
      return <AlertCircle className="w-4 h-4 text-orange-500" />
    case "pending":
      return <Clock className="w-4 h-4 text-amber-500" />
    default:
      return <Clock className="w-4 h-4 text-gray-400" />
  }
}

export default function UserAACCUP() {
  const [activeTab, setActiveTab] = useState("area-2")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedRequirement, setSelectedRequirement] = useState<{ id: string; name: string } | null>(null)
  const [uploadTitle, setUploadTitle] = useState("")
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const currentArea = areas.find((a) => a.id === activeTab)
  const requirements = areaRequirements[activeTab] || []

  const completedCount = requirements.filter((r) => r.status === "approved").length
  const progress = requirements.length > 0 ? (completedCount / requirements.length) * 100 : 0

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleUploadClick = (req?: { id: string; name: string }) => {
    setSelectedRequirement(req || null)
    setUploadTitle(req?.name || "")
    setIsUploadModalOpen(true)
  }

  const handleUpload = () => {
    if (!uploadTitle.trim()) {
      showToast('error', 'Please enter a document title')
      return
    }
    showToast('success', `"${uploadTitle}" uploaded successfully for ${currentArea?.name}`)
    setUploadTitle("")
    setIsUploadModalOpen(false)
  }

  const handlePreview = (req: { id: string; name: string; status: string }) => {
    showToast('success', `Previewing "${req.name}"`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="AACCUP Accreditation"
        description="Manage your AACCUP document submissions"
      />

      <Card className="border-gray-200/60 shadow-sm mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-[15px] font-semibold text-gray-900">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-gray-500">10 Areas</span>
            <span className="text-[13px] font-medium text-gray-900">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200/60 shadow-sm">
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-gray-100 rounded-xl overflow-x-auto">
              {areas.map((area) => (
                <TabsTrigger
                  key={area.id}
                  value={area.id}
                  className="text-[11px] py-2 px-2 data-[state=active]:bg-white"
                >
                  {area.name.split(" - ")[0]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] font-semibold text-gray-900">{currentArea?.name}</CardTitle>
                  <p className="text-[12px] text-gray-500 mt-1">
                    {completedCount} of {requirements.length} requirements completed
                  </p>
                </div>
                <Button size="sm" onClick={() => handleUploadClick()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(req.status)}
                    <span className="text-[13px] font-medium text-gray-900">{req.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {req.uploadedAt && (
                      <span className="text-[12px] text-gray-400 hidden sm:inline">{req.uploadedAt}</span>
                    )}
                    {getStatusBadge(req.status)}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(req)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Submission History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {submissionHistory.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{sub.title}</p>
                      <p className="text-[12px] text-gray-500">Submitted: {sub.submittedAt} | Reviewed by: {sub.reviewedBy}</p>
                    </div>
                  </div>
                  {sub.status === "Approved" ? (
                    <Badge variant="success">{sub.status}</Badge>
                  ) : (
                    <Badge variant="needs_revision">{sub.status}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-[13px] font-medium text-gray-900">Approved</span>
                </div>
                <span className="text-[14px] font-semibold text-emerald-600">12</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-[13px] font-medium text-gray-900">Pending</span>
                </div>
                <span className="text-[14px] font-semibold text-amber-600">5</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-[13px] font-medium text-gray-900">Needs Revision</span>
                </div>
                <span className="text-[14px] font-semibold text-orange-600">2</span>
              </div>
</CardContent>
      </Card>
      </div>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document for {currentArea?.name}</DialogTitle>
            <DialogDescription className="text-[14px]">
              Upload a document to meet the requirements for this area.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="aaccup-title" className="text-[13px] font-medium">Document Title</Label>
              <Input id="aaccup-title" placeholder="Enter document title" className="h-10" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Upload File</Label>
              <Dropzone accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button onClick={handleUpload} className="h-9 shadow-sm">
              Upload Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
          ) : (
            <div className="w-5 h-5 text-red-600 flex items-center justify-center">!</div>
          )}
          <span className="text-[14px] font-medium">{toastMessage.message}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70 text-lg">×</button>
        </div>
      )}
    </div>
  )
}