import { useState } from "react"
import {
  Search,
  Upload,
  Grid,
  List,
  FolderPlus,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  MoreHorizontal,
  Eye,
  Download,
  Share2,
  Trash2,
  RefreshCw,
  ChevronRight,
  File,
  CheckCircle,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Label } from "@/components/ui/Label"
import { Dropzone } from "@/components/ui/Dropzone"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

const mockFolders = [
  { id: "all", name: "All Documents", count: 12 },
  { id: "aaccup", name: "AACCUP", count: 5 },
  { id: "faculty", name: "Faculty Files", count: 3 },
  { id: "curriculum", name: "Curriculum", count: 2 },
  { id: "research", name: "Research", count: 2 },
]

const mockDocuments = [
  { id: "doc-1", name: "Faculty Clearance Form", type: "pdf", size: "245 KB", date: "2026-06-20", folder: "faculty", status: "Approved" },
  { id: "doc-2", name: "Course Syllabus - CS101", type: "docx", size: "128 KB", date: "2026-06-18", folder: "curriculum", status: "Pending" },
  { id: "doc-3", name: "Research Proposal Draft", type: "docx", size: "512 KB", date: "2026-06-15", folder: "research", status: "Approved" },
  { id: "doc-4", name: "Area I Compliance Report", type: "xlsx", size: "1.2 MB", date: "2026-06-12", folder: "aaccup", status: "Approved" },
  { id: "doc-5", name: "Faculty Development Plan", type: "pdf", size: "890 KB", date: "2026-06-10", folder: "faculty", status: "Under Review" },
  { id: "doc-6", name: "Self-Study Report", type: "pdf", size: "2.5 MB", date: "2026-06-08", folder: "aaccup", status: "Pending" },
]

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-5 h-5 text-red-500" />
    case "docx":
    case "doc":
      return <FileText className="w-5 h-5 text-blue-500" />
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
    case "pptx":
    case "ppt":
      return <Presentation className="w-5 h-5 text-orange-500" />
    case "jpg":
    case "jpeg":
    case "png":
      return <Image className="w-5 h-5 text-purple-500" />
    default:
      return <File className="w-5 h-5 text-gray-400" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Approved":
      return <Badge variant="success">{status}</Badge>
    case "Pending":
      return <Badge variant="warning">{status}</Badge>
    case "Under Review":
      return <Badge variant="under_review">{status}</Badge>
    case "Rejected":
      return <Badge variant="danger">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface UserDocumentsProps {
  onPreview?: (docId: string) => void
}

export default function UserDocuments({ onPreview }: UserDocumentsProps) {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [selectedFolder, setSelectedFolder] = useState("all")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [documents, setDocuments] = useState(mockDocuments)
  const [folders, setFolders] = useState(mockFolders)
  const [uploadTitle, setUploadTitle] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderLocation, setNewFolderLocation] = useState("root")

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleRefresh = () => {
    showToast('success', 'Document list refreshed')
  }

  const handleDownload = (doc: typeof documents[0]) => {
    const content = `Document: ${doc.name}\nType: ${doc.type}\nSize: ${doc.size}\nDate: ${doc.date}\nStatus: ${doc.status}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.id}-${doc.name.substring(0, 20)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', `Downloading "${doc.name}"`)
  }

  const handleShare = (doc: typeof documents[0]) => {
    showToast('success', `Share link for "${doc.name}" copied to clipboard`)
  }

  const handleDeleteClick = (docId: string) => {
    setDocumentToDelete(docId)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (documentToDelete) {
      const docName = documents.find(d => d.id === documentToDelete)?.name
      setDocuments(documents.filter(d => d.id !== documentToDelete))
      setFolders(folders.map(f => {
        const doc = documents.find(d => d.id === documentToDelete)
        if (doc && f.id === doc.folder) {
          return { ...f, count: Math.max(0, f.count - 1) }
        }
        return f
      }))
      showToast('success', `"${docName}" has been deleted`)
      setDocumentToDelete(null)
      setIsDeleteConfirmOpen(false)
    }
  }

  const handleUpload = () => {
    if (!uploadTitle.trim()) {
      showToast('error', 'Please enter a document title')
      return
    }
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: uploadTitle,
      type: "pdf",
      size: "0 KB",
      date: new Date().toISOString().split('T')[0],
      folder: "all",
      status: "Pending"
    }
    setDocuments([newDoc, ...documents])
    showToast('success', `"${uploadTitle}" has been uploaded successfully`)
    setUploadTitle("")
    setIsUploadModalOpen(false)
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      showToast('error', 'Please enter a folder name')
      return
    }
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName,
      count: 0
    }
    setFolders([...folders, newFolder])
    showToast('success', `Folder "${newFolderName}" created successfully`)
    setNewFolderName("")
    setNewFolderLocation("root")
    setIsCreateFolderModalOpen(false)
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesFolder = selectedFolder === "all" || doc.folder === selectedFolder
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFolder && matchesSearch
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Documents"
        description="Manage your uploaded documents"
        actions={
          <>
            <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card className="border-gray-200/60 shadow-sm h-fit">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150",
                    selectedFolder === folder.id
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {selectedFolder === folder.id ? (
                      <FolderOpen className="w-[18px] h-[18px]" />
                    ) : (
                      <FolderOpen className="w-[18px] h-[18px] text-gray-400" />
                    )}
                    <span>{folder.name}</span>
                  </div>
                  <span
                    className={cn(
                      "text-[12px]",
                      selectedFolder === folder.id ? "text-gray-300" : "text-gray-400"
                    )}
                  >
                    {folder.count}
                  </span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-gray-200/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-lg border border-gray-200 bg-gray-50/50">
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        viewMode === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        viewMode === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {viewMode === "list" ? (
            <Card className="border-gray-200/60 shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">Type</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide hidden lg:table-cell">Size</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3 text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.type)}
                            <span className="text-[14px] font-medium text-gray-900">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-gray-500 uppercase hidden md:table-cell">{doc.type}</td>
                        <td className="px-4 py-3 text-[13px] text-gray-500 hidden lg:table-cell">{doc.size}</td>
                        <td className="px-4 py-3 text-[13px] text-gray-500 hidden sm:table-cell">{doc.date}</td>
                        <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPreview?.(doc.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShare(doc)}>
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteClick(doc.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredDocuments.length === 0 && (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-[14px] text-gray-500">No documents found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          {getFileIcon(doc.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-[12px] text-gray-500">{doc.size}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onPreview?.(doc.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(doc)}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(doc.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(doc.status)}
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview?.(doc.id)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleShare(doc)}>
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="border-gray-200/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-gray-500">2.4 GB of 10 GB used</p>
                <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[24%] h-full bg-primary rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription className="text-[14px]">
              Upload a new document to your repository. Supported formats: PDF, DOC, DOCX, XLSX, JPG, PNG.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="doc-title" className="text-[13px] font-medium">Document Title</Label>
              <Input id="doc-title" placeholder="Enter document title" className="h-10" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
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

      <Dialog open={isCreateFolderModalOpen} onOpenChange={setIsCreateFolderModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription className="text-[14px]">
              Create a new folder to organize your documents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name" className="text-[13px] font-medium">Folder Name</Label>
              <Input id="folder-name" placeholder="Enter folder name" className="h-10" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="folder-location" className="text-[13px] font-medium">Location</Label>
              <div className="relative">
                <select
                  id="folder-location"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-1.5 focus:ring-gray-400"
                  value={newFolderLocation}
                  onChange={(e) => setNewFolderLocation(e.target.value)}
                >
                  <option value="root">Root (My Documents)</option>
                  <option value="aaccup">AACCUP</option>
                  <option value="faculty">Faculty Files</option>
                  <option value="curriculum">Curriculum</option>
                  <option value="research">Research</option>
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} className="h-9 shadow-sm">
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Document
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="h-9">
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
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