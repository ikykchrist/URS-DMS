import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  FileText,
  Folder,
  FolderOpen,
  Search,
  Filter,
  ArrowUpDown,
  Upload,
  Plus,
  MoreHorizontal,
  Eye,
  Download,
  Share2,
  ChevronRight,
  ChevronDown,
  Home,
  File,
  Image,
  FileSpreadsheet,
  Presentation,
  LayoutGrid,
  List,
  Tag,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import { Label } from "@/components/ui/Label"
import { Dropzone } from "@/components/ui/Dropzone"
import { cn } from "@/lib/utils"
import { DocumentRepositoryPreviewModal } from "@/components/preview/DocumentRepositoryPreviewModal"

interface FolderItem {
  id: string
  name: string
  children?: FolderItem[]
}

interface DocumentItem {
  id: string
  name: string
  type: string
  area: string
  department: string
  dateModified: string
  size: string
  status: string
}

const folderTree: FolderItem[] = [
  {
    id: "root",
    name: "All Documents",
    children: [
      {
        id: "aaccup",
        name: "AACCUP Documents",
        children: [
          { id: "aaccup-phase1", name: "Phase I - SSR" },
          { id: "aaccup-phase2", name: "Phase II - SSR" },
          { id: "aaccup-reports", name: "Annual Reports" },
        ],
      },
      {
        id: "faculty",
        name: "Faculty Files",
        children: [
          { id: "faculty-credentials", name: "Credentials" },
          { id: "faculty-evaluations", name: "Performance Evaluations" },
          { id: "faculty-training", name: "Training Records" },
        ],
      },
      {
        id: "curriculum",
        name: "Curriculum",
        children: [
          { id: "curriculum-cosi", name: "BS-COSI" },
          { id: "curriculum-cs", name: "BS-CS" },
          { id: "curriculum-it", name: "BS-IT" },
        ],
      },
      {
        id: "facility",
        name: "Facility Documents",
        children: [
          { id: "facility-rooms", name: "Room Layouts" },
          { id: "facility-equipment", name: "Equipment Inventory" },
        ],
      },
      {
        id: "resources",
        name: "Resources",
        children: [
          { id: "resources-library", name: "Library" },
          { id: "resources-labs", name: "Laboratory" },
        ],
      },
    ],
  },
]

const documents: DocumentItem[] = [
  {
    id: "DOC-001",
    name: "Self-Study Report - COSI Department",
    type: "PDF",
    area: "Academic",
    department: "College of Information Sciences",
    dateModified: "2024-01-15",
    size: "2.4 MB",
    status: "Published",
  },
  {
    id: "DOC-002",
    name: "Faculty Credentials - Dr. Maria Santos",
    type: "DOCX",
    area: "Faculty",
    department: "College of Engineering",
    dateModified: "2024-01-14",
    size: "1.1 MB",
    status: "Draft",
  },
  {
    id: "DOC-003",
    name: "Curriculum Blueprint - BSIT",
    type: "XLSX",
    area: "Curriculum",
    department: "College of Information Sciences",
    dateModified: "2024-01-13",
    size: "856 KB",
    status: "Published",
  },
  {
    id: "DOC-004",
    name: "Annual Report 2023",
    type: "PPTX",
    area: "Administrative",
    department: "Dean Office",
    dateModified: "2024-01-12",
    size: "5.2 MB",
    status: "Published",
  },
  {
    id: "DOC-005",
    name: "Laboratory Equipment Inventory",
    type: "XLSX",
    area: "Resources",
    department: "College of Engineering",
    dateModified: "2024-01-11",
    size: "420 KB",
    status: "Draft",
  },
  {
    id: "DOC-006",
    name: "Room Layout - Building A",
    type: "PDF",
    area: "Facility",
    department: "Facilities Management",
    dateModified: "2024-01-10",
    size: "3.8 MB",
    status: "Published",
  },
  {
    id: "DOC-007",
    name: "Student Handbook 2024",
    type: "PDF",
    area: "Academic",
    department: "Student Affairs",
    dateModified: "2024-01-09",
    size: "1.9 MB",
    status: "Published",
  },
  {
    id: "DOC-008",
    name: "Accreditation Timeline",
    type: "XLSX",
    area: "Academic",
    department: "College of Information Sciences",
    dateModified: "2024-01-08",
    size: "234 KB",
    status: "Draft",
  },
]

const getFileIcon = (type: string) => {
  switch (type) {
    case "PDF":
      return <FileText className="w-5 h-5 text-red-500" />
    case "DOCX":
    case "DOC":
      return <FileText className="w-5 h-5 text-blue-500" />
    case "XLSX":
    case "XLS":
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
    case "PPTX":
    case "PPT":
      return <Presentation className="w-5 h-5 text-orange-500" />
    case "JPG":
    case "PNG":
    case "JPEG":
      return <Image className="w-5 h-5 text-purple-500" />
    default:
      return <File className="w-5 h-5 text-gray-500" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Published":
      return <Badge variant="success">Published</Badge>
    case "Draft":
      return <Badge variant="warning">Draft</Badge>
    case "Archived":
      return <Badge variant="secondary">Archived</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface FolderTreeItemProps {
  item: FolderItem
  level: number
  selectedFolder: string
  onSelectFolder: (id: string) => void
  expandedFolders: Set<string>
  onToggleExpand: (id: string) => void
}

function FolderTreeItem({ item, level, selectedFolder, onSelectFolder, expandedFolders, onToggleExpand }: FolderTreeItemProps) {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedFolders.has(item.id)
  const isSelected = selectedFolder === item.id

  return (
    <div>
      <button
        onClick={() => onSelectFolder(item.id)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
          isSelected
            ? "bg-gray-900 text-white"
            : "text-gray-700 hover:bg-gray-100",
          level > 0 && "ml-4"
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(item.id)
            }}
            className={cn("p-0.5 hover:bg-gray-200 rounded", isSelected && "hover:bg-gray-700")}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {isSelected || isExpanded ? (
          <FolderOpen className="w-4 h-4" />
        ) : (
          <Folder className="w-4 h-4" />
        )}
        <span className="truncate">{item.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              selectedFolder={selectedFolder}
              onSelectFolder={onSelectFolder}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface DocumentRepositoryProps {
  sidebarCollapsed?: boolean
}

export default function DocumentRepository({ sidebarCollapsed: _sidebarCollapsed = false }: DocumentRepositoryProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedFolder, setSelectedFolder] = useState("root")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root", "aaccup", "faculty"]))
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(() => searchParams.get("modal") === "upload")
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(() => searchParams.get("modal") === "create-folder")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [previewFileId, setPreviewFileId] = useState<string | null>(null)
  const selectedDocument = documents.find((doc) => doc.id === previewFileId) || null

  const handleCloseUploadModal = (open: boolean) => {
    setIsUploadModalOpen(open)
    if (!open) {
      searchParams.delete("modal")
      setSearchParams(searchParams)
    }
  }

  const handleCloseCreateFolderModal = (open: boolean) => {
    setIsCreateFolderModalOpen(open)
    if (!open) {
      searchParams.delete("modal")
      setSearchParams(searchParams)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
            title="Document Repository"
            description="Manage and organize all your documents in one place."
            actions={
              <div className="flex items-center gap-3">
                <Dialog open={isCreateFolderModalOpen} onOpenChange={handleCloseCreateFolderModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader className="pb-2">
                      <DialogTitle className="text-lg">Create New Folder</DialogTitle>
                      <DialogDescription className="text-[14px]">
                        Create a new folder to organize your documents.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="folderName" className="text-[13px] font-medium">Folder Name</Label>
                        <Input id="folderName" placeholder="Enter folder name" className="h-10" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="parentFolder" className="text-[13px] font-medium">Parent Folder</Label>
                        <Select defaultValue="root">
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select parent folder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="root">All Documents</SelectItem>
                            <SelectItem value="aaccup">AACCUP Documents</SelectItem>
                            <SelectItem value="faculty">Faculty Files</SelectItem>
                            <SelectItem value="curriculum">Curriculum</SelectItem>
                            <SelectItem value="facility">Facility Documents</SelectItem>
                            <SelectItem value="resources">Resources</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(false)} className="h-9">
                        Cancel
                      </Button>
                      <Button onClick={() => setIsCreateFolderModalOpen(false)} className="h-9 shadow-sm">
                        Create Folder
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isUploadModalOpen} onOpenChange={handleCloseUploadModal}>
                  <DialogTrigger asChild>
                    <Button className="shadow-sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader className="pb-2">
                      <DialogTitle className="text-lg">Upload Document</DialogTitle>
                      <DialogDescription className="text-[14px]">
                        Upload a document to the selected folder.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="docTitle" className="text-[13px] font-medium">Document Title</Label>
                        <Input id="docTitle" placeholder="Enter document title" className="h-10" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="docType" className="text-[13px] font-medium">Document Type</Label>
                        <Select>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="docx">DOCX</SelectItem>
                            <SelectItem value="xlsx">XLSX</SelectItem>
                            <SelectItem value="pptx">PPTX</SelectItem>
                            <SelectItem value="img">Image</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="docArea" className="text-[13px] font-medium">Area</Label>
                        <Select>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select area" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="academic">Academic</SelectItem>
                            <SelectItem value="faculty">Faculty</SelectItem>
                            <SelectItem value="curriculum">Curriculum</SelectItem>
                            <SelectItem value="facility">Facility</SelectItem>
                            <SelectItem value="resources">Resources</SelectItem>
                            <SelectItem value="admin">Administrative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="docDept" className="text-[13px] font-medium">Department</Label>
                        <Select>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cosi">College of Information Sciences</SelectItem>
                            <SelectItem value="coe">College of Engineering</SelectItem>
                            <SelectItem value="dean">Dean Office</SelectItem>
                            <SelectItem value="sao">Student Affairs</SelectItem>
                            <SelectItem value="fm">Facilities Management</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <Button onClick={() => setIsUploadModalOpen(false)} className="h-9 shadow-sm">
                        Upload Document
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />

          <div className="grid grid-cols-[280px_1fr] gap-6">
            <Card className="border-gray-200/60 shadow-sm h-fit">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span className="text-[13px] font-semibold text-gray-700">Folders</span>
                </div>
                <div className="space-y-0.5">
                  {folderTree.map((item) => (
                    <FolderTreeItem
                      key={item.id}
                      item={item}
                      level={0}
                      selectedFolder={selectedFolder}
                      onSelectFolder={setSelectedFolder}
                      expandedFolders={expandedFolders}
                      onToggleExpand={toggleExpand}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border-gray-200/60 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search documents..."
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
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="curriculum">Curriculum</SelectItem>
                          <SelectItem value="facility">Facility</SelectItem>
                          <SelectItem value="resources">Resources</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[160px] h-9">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          <SelectItem value="cosi">College of Info Sciences</SelectItem>
                          <SelectItem value="coe">College of Engineering</SelectItem>
                          <SelectItem value="dean">Dean Office</SelectItem>
                          <SelectItem value="sao">Student Affairs</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[130px] h-9">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="docx">DOCX</SelectItem>
                          <SelectItem value="xlsx">XLSX</SelectItem>
                          <SelectItem value="pptx">PPTX</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[120px] h-9">
                          <Tag className="w-3.5 h-3.5 mr-2" />
                          <SelectValue placeholder="Tags" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tags</SelectItem>
                          <SelectItem value="accreditation">Accreditation</SelectItem>
                          <SelectItem value="curriculum">Curriculum</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="reports">Reports</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="newest">
                        <SelectTrigger className="w-[140px] h-9">
                          <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                          <SelectItem value="size-asc">Size (Smallest)</SelectItem>
                          <SelectItem value="size-desc">Size (Largest)</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                            {getFileIcon(doc.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-[11px] text-gray-500">{doc.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded-full">{doc.type}</span>
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>{doc.department}</span>
                          <span>{doc.dateModified}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewFileId(doc.id); }}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Share2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
              <Card className="border-gray-200/60 shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Date Modified</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                                {getFileIcon(doc.type)}
                              </div>
                              <div>
                                <p className="text-[14px] font-medium text-gray-900 max-w-[240px] truncate">
                                  {doc.name}
                                </p>
                                <p className="text-[12px] text-gray-500">{doc.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-[13px] text-gray-600 font-medium">{doc.type}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[13px] text-gray-600">{doc.area}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[13px] text-gray-600">{doc.department}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[13px] text-gray-500">{doc.dateModified}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[13px] text-gray-500">{doc.size}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900" onClick={() => setPreviewFileId(doc.id)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                <Share2 className="w-4 h-4" />
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
                      Showing 8 of 156 documents
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
                          <PaginationLink className="h-8 w-8">19</PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                      <PaginationNext className="h-8" />
                    </Pagination>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DocumentRepositoryPreviewModal
          open={previewFileId !== null}
          onOpenChange={(open) => !open && setPreviewFileId(null)}
          file={selectedDocument}
          allFiles={documents}
        />
      </div>
  )
}