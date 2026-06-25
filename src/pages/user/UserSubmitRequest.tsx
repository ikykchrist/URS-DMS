import { useState } from "react"
import { ChevronLeft, FileText, CheckCircle } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/Textarea"
import { Badge } from "@/components/ui/Badge"

const selectedDocuments = [
  { id: "eng-1", name: "Engineering Program Report 2025", type: "pdf", department: "College of Engineering" },
  { id: "cis-1", name: "IT Program Compliance Report", type: "pdf", department: "College of Information Sciences" },
]

const getFileIcon = () => {
  return <FileText className="w-4 h-4 text-gray-400" />
}

interface UserSubmitRequestProps {
  onBack?: () => void
  onSuccess?: () => void
}

export default function UserSubmitRequest({ onBack, onSuccess }: UserSubmitRequestProps) {
  const [purpose, setPurpose] = useState("")
  const [remarks, setRemarks] = useState("")
  const [priority, setPriority] = useState("normal")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = () => {
    setShowSuccess(true)
    setTimeout(() => {
      onSuccess?.()
    }, 2000)
  }

  if (showSuccess) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card className="border-gray-200/60 shadow-sm max-w-xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-[18px] font-semibold text-gray-900 mb-2">Request Submitted Successfully!</h2>
            <p className="text-[14px] text-gray-500 mb-6">
              Your document request has been submitted and is pending approval.
            </p>
            <Button onClick={onSuccess}>View My Requests</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Submit Document Request"
        description="Review and submit your document request"
        actions={
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Selected Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon()}
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">{doc.name}</p>
                    <p className="text-[12px] text-gray-500">{doc.department}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="uppercase text-[10px]">{doc.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="purpose" className="text-[13px] font-medium">
                Purpose <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="purpose"
                placeholder="Explain why you need these documents..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remarks" className="text-[13px] font-medium">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Any additional information..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority" className="text-[13px] font-medium">Priority</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPriority("normal")}
                  className={`flex-1 py-2 px-4 rounded-lg border text-[13px] font-medium transition-colors ${
                    priority === "normal"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("urgent")}
                  className={`flex-1 py-2 px-4 rounded-lg border text-[13px] font-medium transition-colors ${
                    priority === "urgent"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 mt-6 max-w-4xl">
        <Button variant="outline" onClick={onBack} className="h-10">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="h-10 shadow-sm" disabled={!purpose.trim()}>
          Submit Request
        </Button>
      </div>
    </div>
  )
}