import { useState } from "react"
import { ChevronLeft, Search, FolderOpen, FileText, Check } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

const departments = [
  { id: "eng", name: "College of Engineering", documents: 45 },
  { id: "cis", name: "College of Information Sciences", documents: 38 },
  { id: "business", name: "College of Business", documents: 32 },
  { id: "education", name: "College of Education", documents: 28 },
  { id: "nursing", name: "College of Nursing", documents: 22 },
  { id: "arts", name: "College of Arts and Sciences", documents: 35 },
]

const departmentDocuments: Record<string, Array<{ id: string; name: string; type: string; date: string }>> = {
  eng: [
    { id: "eng-1", name: "Engineering Program Report 2025", type: "pdf", date: "2025-12-15" },
    { id: "eng-2", name: "Faculty Loading Summary", type: "xlsx", date: "2025-12-10" },
    { id: "eng-3", name: "Laboratory Equipment Inventory", type: "pdf", date: "2025-12-05" },
  ],
  cis: [
    { id: "cis-1", name: "IT Program Compliance Report", type: "pdf", date: "2025-12-12" },
    { id: "cis-2", name: "Student Outcomes Assessment", type: "xlsx", date: "2025-12-08" },
    { id: "cis-3", name: "Faculty Credentials Summary", type: "docx", date: "2025-12-01" },
  ],
  business: [
    { id: "bus-1", name: "Business Program Review", type: "pdf", date: "2025-12-14" },
    { id: "bus-2", name: "Accreditation Self-Study", type: "pdf", date: "2025-12-06" },
  ],
  education: [
    { id: "edu-1", name: "Education Program Report", type: "pdf", date: "2025-12-11" },
    { id: "edu-2", name: "Faculty Development Plan", type: "docx", date: "2025-12-04" },
  ],
  nursing: [
    { id: "nur-1", name: "Nursing Program Compliance", type: "pdf", date: "2025-12-13" },
    { id: "nur-2", name: "Clinical Performance Data", type: "xlsx", date: "2025-12-07" },
  ],
  arts: [
    { id: "art-1", name: "Arts Program Assessment", type: "pdf", date: "2025-12-09" },
    { id: "art-2", name: "Faculty Credentials", type: "docx", date: "2025-12-03" },
    { id: "art-3", name: "Curriculum Map", type: "xlsx", date: "2025-11-28" },
  ],
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-4 h-4 text-red-500" />
    case "docx":
    case "doc":
      return <FileText className="w-4 h-4 text-blue-500" />
    case "xlsx":
    case "xls":
      return <FileText className="w-4 h-4 text-emerald-600" />
    default:
      return <FileText className="w-4 h-4 text-gray-400" />
  }
}

interface UserBrowseArchiveProps {
  onBack?: () => void
  onSubmitRequest?: (docIds: string[]) => void
}

export default function UserBrowseArchive({ onBack, onSubmitRequest }: UserBrowseArchiveProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  const documents = selectedDepartment ? departmentDocuments[selectedDepartment] || [] : []

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Browse Document Archive"
        description="Select documents to request access"
        actions={
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to My Requests
          </Button>
        }
      />

      {selectedDocs.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium text-gray-900">
                {selectedDocs.length} document{selectedDocs.length > 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setSelectedDocs([])}
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => onSubmitRequest?.(selectedDocs)}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card className="border-gray-200/60 shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Departments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1 px-4 pb-4">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => {
                    setSelectedDepartment(dept.id)
                    setSelectedDocs([])
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150",
                    selectedDepartment === dept.id
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className={cn("w-[18px] h-[18px]", selectedDepartment === dept.id ? "text-white" : "text-gray-400")} />
                    <span className="text-left truncate">{dept.name}</span>
                  </div>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedDepartment ? (
            <>
              <Card className="border-gray-200/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold text-gray-900">
                      {departments.find((d) => d.id === selectedDepartment)?.name}
                    </h2>
                    <Badge variant="secondary">{documents.length} documents</Badge>
                  </div>
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200/60 shadow-sm">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide w-12"></th>
                        <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">Type</th>
                        <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents
                        .filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((doc) => {
                        const isSelected = selectedDocs.includes(doc.id)
                        return (
                          <tr
                            key={doc.id}
                            className={cn(
                              "border-b border-gray-50 transition-colors cursor-pointer",
                              isSelected ? "bg-primary/5" : "hover:bg-gray-50/50"
                            )}
                            onClick={() => toggleDocSelection(doc.id)}
                          >
                            <td className="px-4 py-3">
                              <div
                                className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-gray-300 hover:border-gray-400"
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getFileIcon(doc.type)}
                                <span className="text-[14px] font-medium text-gray-900">{doc.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[13px] text-gray-500 uppercase hidden md:table-cell">{doc.type}</td>
                            <td className="px-4 py-3 text-[13px] text-gray-500 hidden sm:table-cell">{doc.date}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-gray-200/60 shadow-sm">
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[14px] text-gray-500">Select a department to view available documents</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}