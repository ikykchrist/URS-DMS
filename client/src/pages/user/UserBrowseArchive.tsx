import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, Search, FolderOpen, FileText, Check } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { listSystemDepartments } from "@/services/admin"
import { listOnlineDocuments } from "@/services/documents"
import type { Document, Department } from "@/types/domain"

interface UserBrowseArchiveProps {
  onBack?: () => void
  onSubmitRequest?: (docIds: string[]) => void
}

const getFileIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case "PDF": return <FileText className="w-4 h-4 text-red-500" />
    case "DOCX":
    case "DOC": return <FileText className="w-4 h-4 text-blue-500" />
    case "XLSX":
    case "XLS": return <FileText className="w-4 h-4 text-emerald-600" />
    default: return <FileText className="w-4 h-4 text-gray-400" />
  }
}

export default function UserBrowseArchive({ onBack, onSubmitRequest }: UserBrowseArchiveProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [archivedDocs, setArchivedDocs] = useState<Document[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [deptPage, docs] = await Promise.all([
        listSystemDepartments({ pageSize: 100 }),
        listOnlineDocuments({ archived: true }),
      ])
      setDepartments(deptPage.items.map((dept) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        headUserId: dept.headId ?? undefined,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt,
      })))
      setArchivedDocs(docs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const docsByDept: Record<string, Document[]> = {}
  for (const doc of archivedDocs) {
    const dept = doc.department
    if (!docsByDept[dept]) docsByDept[dept] = []
    docsByDept[dept].push(doc)
  }

  const docsInSelectedDept = selectedDepartment ? (docsByDept[selectedDepartment] ?? []) : []
  const filteredDocs = docsInSelectedDept.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) => prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId])
  }

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
              <p className="text-[14px] font-medium text-gray-900">{selectedDocs.length} document{selectedDocs.length > 1 ? "s" : ""} selected</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedDocs([])}>Clear Selection</Button>
                <Button size="sm" className="h-8" onClick={() => onSubmitRequest?.(selectedDocs)}>Submit Request</Button>
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
            {loading ? (
              <p className="text-[13px] text-gray-400 px-4 pb-4">Loading...</p>
            ) : (
              <nav className="space-y-1 px-4 pb-4">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => { setSelectedDepartment(dept.name); setSelectedDocs([]) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150",
                      selectedDepartment === dept.name ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className={cn("w-[18px] h-[18px]", selectedDepartment === dept.name ? "text-white" : "text-gray-400")} />
                      <span className="text-left truncate">{dept.name}</span>
                    </div>
                    <span className={cn("text-[12px]", selectedDepartment === dept.name ? "text-gray-300" : "text-gray-400")}>
                      {docsByDept[dept.name]?.length ?? 0}
                    </span>
                  </button>
                ))}
              </nav>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedDepartment ? (
            <>
              <Card className="border-gray-200/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold text-gray-900">{selectedDepartment}</h2>
                    <Badge variant="secondary">{filteredDocs.length} documents</Badge>
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
                      {filteredDocs.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-gray-400">No documents found</td></tr>
                      ) : (
                        filteredDocs.map((doc) => {
                          const isSelected = selectedDocs.includes(doc.id)
                          return (
                            <tr key={doc.id} className={cn("border-b border-gray-50 transition-colors cursor-pointer", isSelected ? "bg-primary/5" : "hover:bg-gray-50/50")} onClick={() => toggleDocSelection(doc.id)}>
                              <td className="px-4 py-3">
                                <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors", isSelected ? "bg-primary border-primary" : "border-gray-300 hover:border-gray-400")}>
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
                              <td className="px-4 py-3 text-[13px] text-gray-500 hidden sm:table-cell">{new Date(doc.dateModified).toLocaleDateString()}</td>
                            </tr>
                          )
                        })
                      )}
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