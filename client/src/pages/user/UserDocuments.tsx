import { useState, useEffect, useCallback } from "react"
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
  Trash2,
  RefreshCw,
  File,
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
import { DocumentPreviewModal } from "@/components/modals/DocumentPreviewModal"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { toast } from "@/lib/toast"
import { deleteOnlineDocument, listOnlineDocuments, openOnlineDocument, uploadOnlineDocument, resolveRepositoryStructure, createRepositoryFolder, type RepositoryFolderNode } from "@/services/documents"
import type { Document, DocumentStatus } from "@/types/domain"

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0)} ${units[i]}`
}

const getFileIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case "PDF": return <FileText className="w-5 h-5 text-red-500" />
    case "DOCX":
    case "DOC": return <FileText className="w-5 h-5 text-blue-500" />
    case "XLSX":
    case "XLS": return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
    case "PPTX":
    case "PPT": return <Presentation className="w-5 h-5 text-orange-500" />
    case "JPG":
    case "JPEG":
    case "PNG": return <Image className="w-5 h-5 text-purple-500" />
    default: return <File className="w-5 h-5 text-gray-400" />
  }
}

const getStatusBadge = (status: DocumentStatus) => {
  switch (status) {
    case "Approved": return <Badge variant="success">{status}</Badge>
    case "Pending":
    case "Department Review":
    case "QA Review":
    case "In Review": return <Badge variant="warning">{status}</Badge>
    case "Rejected": return <Badge variant="danger">{status}</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

export default function UserDocuments() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [selectedFolder, setSelectedFolder] = useState("all")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewDocId, setPreviewDocId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [documents, setDocuments] = useState<Document[]>([])
  const [folderList, setFolderList] = useState<Array<{ id: string; name: string }>>([])
  const [folderName, setFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageQuota] = useState(10 * 1e9)

  const canCreateFolder = user?.permissions?.includes("folders.create") ?? false

  const previewDoc = previewDocId ? documents.find((d) => d.id === previewDocId) ?? null : null

  const handlePreview = (docId: string) => {
    setPreviewDocId(docId)
    setIsPreviewModalOpen(true)
  }

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const docs = await listOnlineDocuments({ ownerId: user.id, archived: false })
      setDocuments(docs)
      setStorageUsed(docs.reduce((sum, doc) => sum + (Number(doc.size) || 0), 0))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const loadFolders = useCallback(async () => {
    try {
      const structure = await resolveRepositoryStructure()
      if (structure.source === "legacy") {
        setFolderList(structure.legacyFolders.map((f) => ({ id: f.id, name: f.name })))
      } else if (structure.source === "template") {
        const flat: Array<{ id: string; name: string }> = []
        const walk = (nodes: RepositoryFolderNode[]) => {
          for (const node of nodes) {
            if (node.status === "ACTIVE" && node.visibility === "VISIBLE") {
              flat.push({ id: node.id, name: node.name })
            }
            walk(node.children)
          }
        }
        walk(structure.tree)
        setFolderList(flat)
      } else {
        setFolderList([])
      }
    } catch {
      setFolderList([])
    }
  }, [])

  useEffect(() => { void loadFolders() }, [loadFolders])

  const getFolderCount = (folderId: string) => {
    if (folderId === "all") return documents.length
    const folder = folderList.find((f) => f.id === folderId)
    if (!folder) return 0
    return documents.filter((d) => d.area === folder.name || d.categoryName === folder.name).length
  }

  const folders = folderList.map((f) => ({ ...f, count: getFolderCount(f.id) }))

  const handleCreateFolder = async () => {
    const name = folderName.trim()
    if (!name) return
    setCreatingFolder(true)
    try {
      await createRepositoryFolder({ name })
      setFolderName("")
      setIsCreateFolderModalOpen(false)
      await loadFolders()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create folder")
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    try { await openOnlineDocument(doc) } catch { }
  }

  const handleDeleteClick = (docId: string) => {
    setDocumentToDelete(docId)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!documentToDelete) return
    try {
      await deleteOnlineDocument(documentToDelete)
      await refresh()
    } catch { }
    setDocumentToDelete(null)
    setIsDeleteConfirmOpen(false)
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) return
    setUploading(true)
    try {
      await uploadOnlineDocument({
        title: uploadTitle,
        departmentId: user?.departmentId ?? null,
        classification: "INTERNAL",
        file: uploadFile,
      })
      setUploadTitle("")
      setUploadFile(null)
      setIsUploadModalOpen(false)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    if (selectedFolder !== "all") {
      const folder = folderList.find((f) => f.id === selectedFolder)
      if (folder && doc.area !== folder.name && doc.categoryName !== folder.name) return false
    }
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const storagePercent = Math.min(100, Math.round((storageUsed / storageQuota) * 100))

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Documents"
        description="Manage your uploaded documents"
        actions={
          <>
            {canCreateFolder && (
              <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Folder
              </Button>
            )}
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
              <button
                onClick={() => setSelectedFolder("all")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150",
                  selectedFolder === "all" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className={cn("w-[18px] h-[18px]", selectedFolder === "all" ? "text-white" : "text-gray-400")} />
                  <span>All Documents</span>
                </div>
                <span className={cn("text-[12px]", selectedFolder === "all" ? "text-gray-300" : "text-gray-400")}>
                  {documents.length}
                </span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150",
                    selectedFolder === folder.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className={cn("w-[18px] h-[18px]", selectedFolder === folder.id ? "text-white" : "text-gray-400")} />
                    <span>{folder.name}</span>
                  </div>
                  <span className={cn("text-[12px]", selectedFolder === folder.id ? "text-gray-300" : "text-gray-400")}>
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
                    <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                      <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                      <Grid className="w-4 h-4" />
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={refresh}>
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
                    {loading ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-[13px] text-gray-400">Loading...</td></tr>
                    ) : filteredDocuments.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-[14px] text-gray-500">No documents found</p></td></tr>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getFileIcon(doc.type)}
                              <span className="text-[14px] font-medium text-gray-900">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-gray-500 uppercase hidden md:table-cell">{doc.type}</td>
                          <td className="px-4 py-3 text-[13px] text-gray-500 hidden lg:table-cell">{formatBytes(doc.size)}</td>
                          <td className="px-4 py-3 text-[13px] text-gray-500 hidden sm:table-cell">{new Date(doc.dateModified).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc.id)}><Eye className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}><Download className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteClick(doc.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <p className="col-span-full text-center py-8 text-[13px] text-gray-400">Loading...</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="col-span-full text-center py-8 text-[13px] text-gray-400">No documents found</p>
              ) : (
                filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">{getFileIcon(doc.type)}</div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-[12px] text-gray-500">{formatBytes(doc.size)}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handlePreview(doc.id)}><Eye className="w-4 h-4 mr-2" />Preview</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}><Download className="w-4 h-4 mr-2" />Download</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(doc.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(doc.status)}
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(doc.id)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}><Download className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          <Card className="border-gray-200/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-gray-500">{formatBytes(storageUsed)} of {formatBytes(storageQuota)} used</p>
                <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${storagePercent}%` }} />
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
            <DialogDescription className="text-[14px]">Upload a new document to your repository.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Document Title</Label>
              <Input placeholder="Enter document title" className="h-10" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Upload File</Label>
              <Dropzone accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" onChange={(files) => { if (files[0]) setUploadFile(files[0]) }} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadTitle.trim() || uploading} className="h-9 shadow-sm">{uploading ? "Uploading..." : "Upload Document"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateFolderModalOpen} onOpenChange={setIsCreateFolderModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription className="text-[14px]">Create a new folder to organize your documents.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Folder Name</Label>
              <Input
                placeholder="Enter folder name"
                className="h-10"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={creatingFolder || !folderName.trim()} className="h-9 shadow-sm">
              {creatingFolder ? "Creating..." : "Create Folder"}
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
            <DialogDescription className="text-[14px]">Are you sure you want to delete this document? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="h-9">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="h-9">Delete Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentPreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        document={previewDoc}
      />
    </div>
  )
}