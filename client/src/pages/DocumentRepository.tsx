import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Dropzone } from "@/components/ui/Dropzone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";
import {
  createRepositoryFolder,
  deleteOnlineDocument,
  getOnlineDocumentUrl,
  listOnlineDocuments,
  openOnlineDocument,
  resolveRepositoryStructure,
  uploadOnlineDocument,
  type RepositoryFolderNode,
} from "@/services/documents";
import type { Document } from "@/types/domain";
import type { DocumentFile } from "@/components/preview/types";
import { DocumentRepositoryPreviewModal } from "@/components/preview/DocumentRepositoryPreviewModal";
import { toast } from "@/lib/toast";

function bytesToReadable(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FolderItem {
  id: string;
  name: string;
  children?: FolderItem[];
}

function resolveNode(node: RepositoryFolderNode): FolderItem {
  return {
    id: node.id,
    name: node.name,
    children: node.children?.map(resolveNode),
  };
}

function legacyFoldersToTree(folders: {
  id: string;
  name: string;
  parentId: string | null;
}[]): FolderItem[] {
  const childrenOf = (parentId: string | null): FolderItem[] =>
    folders
      .filter((folder) => folder.parentId === parentId)
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        children: childrenOf(folder.id),
      }));
  return childrenOf(null);
}

function flattenFolders(nodes: FolderItem[], depth = 0): Array<FolderItem & { level: number }> {
  return nodes.flatMap((node) => [
    { ...node, level: depth },
    ...flattenFolders(node.children ?? [], depth + 1),
  ]);
}

function docToFile(doc: Document): DocumentFile {
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    area: doc.area,
    department: doc.department,
    dateModified: doc.dateModified,
    size: bytesToReadable(doc.size),
    status: doc.status,
    uploadedBy: doc.ownerName,
    uploadDate: doc.dateCreated,
    lastModifiedDate: doc.dateModified,
    tags: doc.tags,
    blobId: doc.blobId,
    mimeType: doc.mimeType,
  };
}

const getFileIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case "PDF":
      return <FileText className="w-5 h-5 text-red-500" />;
    case "DOCX":
    case "DOC":
      return <FileText className="w-5 h-5 text-blue-500" />;
    case "XLSX":
    case "XLS":
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    case "PPTX":
    case "PPT":
      return <Presentation className="w-5 h-5 text-orange-500" />;
    case "JPG":
    case "PNG":
    case "JPEG":
      return <Image className="w-5 h-5 text-purple-500" />;
    default:
      return <File className="w-5 h-5 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Approved":
      return <Badge variant="success">Approved</Badge>;
    case "Pending":
    case "Department Review":
    case "QA Review":
    case "In Review":
      return <Badge variant="warning">{status}</Badge>;
    case "Rejected":
      return <Badge variant="danger">{status}</Badge>;
    case "Archived":
      return <Badge variant="secondary">Archived</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

interface FolderTreeItemProps {
  item: FolderItem;
  level: number;
  selectedFolder: string;
  onSelectFolder: (id: string) => void;
  expandedFolders: Set<string>;
  onToggleExpand: (id: string) => void;
}

function FolderTreeItem({
  item,
  level,
  selectedFolder,
  onSelectFolder,
  expandedFolders,
  onToggleExpand,
}: FolderTreeItemProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedFolders.has(item.id);
  const isSelected = selectedFolder === item.id;

  return (
    <div>
      <button
        onClick={() => onSelectFolder(item.id)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
          isSelected
            ? "bg-gray-900 text-white"
            : "text-gray-700 hover:bg-gray-100",
          level > 0 && "ml-4",
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(item.id);
            }}
            className={cn(
              "p-0.5 hover:bg-gray-200 rounded",
              isSelected && "hover:bg-gray-700",
            )}
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
  );
}

export default function DocumentRepository() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderTree, setFolderTree] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("root");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["root", "aaccup", "faculty"]),
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(
    () => searchParams.get("modal") === "upload",
  );
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(
    () => searchParams.get("modal") === "create-folder",
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const [folderName, setFolderName] = useState("");
  const [folderParent, setFolderParent] = useState("root");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("pdf");
  const [uploadArea, setUploadArea] = useState("Academic");
  const [uploadDept, setUploadDept] = useState(
    "College of Information Sciences",
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listOnlineDocuments({ search: search || undefined });
      setAllDocuments(list);
      setDocuments(list);
    } catch {
      setAllDocuments([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadFolderTree = useCallback(async () => {
    try {
      const structure = await resolveRepositoryStructure();
      let children: FolderItem[] = [];
      if (structure.source === "template") {
        children = structure.tree.map(resolveNode);
      } else if (structure.source === "legacy") {
        children = legacyFoldersToTree(structure.legacyFolders);
      }
      setFolderTree([
        {
          id: "root",
          name: structure.template?.name ?? "All Documents",
          children,
        },
      ]);
      setExpandedFolders((current) =>
        current.size ? current : new Set(["root"]),
      );
    } catch {
      setFolderTree([]);
    }
  }, []);

  useEffect(() => {
    void loadFolderTree();
  }, [loadFolderTree]);

  const handleCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const parentId = folderParent === "root" ? null : folderParent;
      await createRepositoryFolder({ name, parentId });
      toast.success("Folder created");
      await loadFolderTree();
      setFolderName("");
      setFolderParent("root");
      setIsCreateFolderModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const folderOptions = flattenFolders(folderTree);

  const selectedFolderName =
    flattenFolders(folderTree).find((f) => f.id === selectedFolder)?.name ??
    null;

  useEffect(() => {
    setPage(1);
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    let filtered = [...allDocuments];
    if (selectedFolderName && selectedFolder !== "root") {
      filtered = filtered.filter(
        (d) =>
          d.area === selectedFolderName ||
          d.categoryName === selectedFolderName,
      );
    }
    if (filterArea !== "all")
      filtered = filtered.filter((d) => d.area === filterArea);
    if (filterDept !== "all")
      filtered = filtered.filter((d) => d.department === filterDept);
    if (filterType !== "all")
      filtered = filtered.filter(
        (d) => d.type.toLowerCase() === filterType.toLowerCase(),
      );
    switch (sortOrder) {
      case "oldest":
        filtered.sort((a, b) => a.dateModified.localeCompare(b.dateModified));
        break;
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "size-asc":
        filtered.sort((a, b) => a.size - b.size);
        break;
      case "size-desc":
        filtered.sort((a, b) => b.size - a.size);
        break;
      default:
        filtered.sort((a, b) => b.dateModified.localeCompare(a.dateModified));
    }
    setDocuments(filtered);
  }, [allDocuments, filterArea, filterDept, filterType, sortOrder, selectedFolder, selectedFolderName]);

  const handleCloseUploadModal = (open: boolean) => {
    setIsUploadModalOpen(open);
    if (!open) {
      searchParams.delete("modal");
      setSearchParams(searchParams);
    }
  };

  const handleCloseCreateFolderModal = (open: boolean) => {
    setIsCreateFolderModalOpen(open);
    if (!open) {
      searchParams.delete("modal");
      setSearchParams(searchParams);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName) return;
    setUploading(true);
    try {
      await uploadOnlineDocument({
        title: uploadName,
        departmentId: null,
        classification: "INTERNAL",
        metadata: {
          category: uploadType.toUpperCase(),
          area: uploadArea,
          department: uploadDept,
        },
        file: uploadFile,
      });
      setUploadName("");
      setUploadFile(null);
      setIsUploadModalOpen(false);
      fetchDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await openOnlineDocument(doc);
    } catch {
      toast.error("Could not generate download link");
    }
  };

  const handleShare = async (doc: Document) => {
    try {
      const url = await getOnlineDocumentUrl(doc);
      await navigator.clipboard.writeText(url);
      toast.success("Download link copied to clipboard");
    } catch {
      toast.error("Could not generate share link");
    }
  };

  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await deleteOnlineDocument(docToDelete.id);
      toast.success("Document deleted");
      setDocToDelete(null);
      await fetchDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = async (doc: Document) => {
    setPreviewDocId(doc.id);
  };

  const selectedDoc = previewDocId
    ? (documents.find((d) => d.id === previewDocId) ?? null)
    : null;
  const selectedFile = selectedDoc ? docToFile(selectedDoc) : null;
  const allFiles = documents.map(docToFile);

  const ITEMS_PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(documents.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedDocs = documents.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );
  const pageWindow = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return start + i;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Document Repository"
        description="Manage and organize all your documents in one place."
        actions={
          <div className="flex items-center gap-3">
            <Dialog
              open={isCreateFolderModalOpen}
              onOpenChange={handleCloseCreateFolderModal}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-lg">
                    Create New Folder
                  </DialogTitle>
                  <DialogDescription className="text-[14px]">
                    Create a new folder to organize your documents.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="folderName"
                      className="text-[13px] font-medium"
                    >
                      Folder Name
                    </Label>
                    <Input
                      id="folderName"
                      placeholder="Enter folder name"
                      className="h-10"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="parentFolder"
                      className="text-[13px] font-medium"
                    >
                      Parent Folder
                    </Label>
                    <Select
                      value={folderParent}
                      onValueChange={setFolderParent}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select parent folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {folderOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {"\u00A0".repeat(option.level * 2)}
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11.5px] text-slate-500">
                    Folders are saved to the server and persist across
                    sessions.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateFolderModalOpen(false)}
                    className="h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleCreateFolder()}
                    className="h-9 shadow-sm"
                    disabled={creatingFolder || !folderName.trim()}
                  >
                    {creatingFolder ? "Creating…" : "Create Folder"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isUploadModalOpen}
              onOpenChange={handleCloseUploadModal}
            >
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
                    Upload a document to the repository.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="docTitle"
                      className="text-[13px] font-medium"
                    >
                      Document Title
                    </Label>
                    <Input
                      id="docTitle"
                      placeholder="Enter document title"
                      className="h-10"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="docType"
                      className="text-[13px] font-medium"
                    >
                      Document Type
                    </Label>
                    <Select value={uploadType} onValueChange={setUploadType}>
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
                    <Label
                      htmlFor="docArea"
                      className="text-[13px] font-medium"
                    >
                      Area
                    </Label>
                    <Select value={uploadArea} onValueChange={setUploadArea}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Academic">Academic</SelectItem>
                        <SelectItem value="Faculty">Faculty</SelectItem>
                        <SelectItem value="Curriculum">Curriculum</SelectItem>
                        <SelectItem value="Facility">Facility</SelectItem>
                        <SelectItem value="Resources">Resources</SelectItem>
                        <SelectItem value="Administrative">
                          Administrative
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="docDept"
                      className="text-[13px] font-medium"
                    >
                      Department
                    </Label>
                    <Select value={uploadDept} onValueChange={setUploadDept}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="College of Information Sciences">
                          College of Information Sciences
                        </SelectItem>
                        <SelectItem value="College of Engineering">
                          College of Engineering
                        </SelectItem>
                        <SelectItem value="College of Arts & Sciences">
                          College of Arts & Sciences
                        </SelectItem>
                        <SelectItem value="Library Services">
                          Library Services
                        </SelectItem>
                        <SelectItem value="Dean's Office">
                          Dean's Office
                        </SelectItem>
                        <SelectItem value="Student Affairs">
                          Student Affairs
                        </SelectItem>
                        <SelectItem value="Facilities Management">
                          Facilities Management
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[13px] font-medium">
                      Upload File
                    </Label>
                    <Dropzone
                      accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
                      onChange={(files) => setUploadFile(files[0] ?? null)}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadFile || !uploadName || uploading}
                    className="h-9 shadow-sm"
                  >
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="border-gray-200/60 shadow-sm h-fit">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-4 h-4 text-gray-500" />
              <span className="text-[13px] font-semibold text-gray-700">
                Folders
              </span>
            </div>
            <div className="space-y-0.5">
              {folderTree.map((item) => (
                <FolderTreeItem
                  key={item.id}
                  item={item}
                  level={0}
                  selectedFolder={selectedFolder}
                  onSelectFolder={(id) => {
                    setSelectedFolder(id);
                    setPage(1);
                  }}
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
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={filterArea}
                    onValueChange={(v) => {
                      setFilterArea(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-9">
                      <Filter className="w-3.5 h-3.5 mr-2" />
                      <SelectValue placeholder="Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Faculty">Faculty</SelectItem>
                      <SelectItem value="Curriculum">Curriculum</SelectItem>
                      <SelectItem value="Facility">Facility</SelectItem>
                      <SelectItem value="Resources">Resources</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterDept}
                    onValueChange={(v) => {
                      setFilterDept(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="College of Information Sciences">
                        College of Info Sciences
                      </SelectItem>
                      <SelectItem value="College of Engineering">
                        College of Engineering
                      </SelectItem>
                      <SelectItem value="College of Arts & Sciences">
                        College of Arts & Sciences
                      </SelectItem>
                      <SelectItem value="Library Services">
                        Library Services
                      </SelectItem>
                      <SelectItem value="Dean's Office">
                        Dean's Office
                      </SelectItem>
                      <SelectItem value="Student Affairs">
                        Student Affairs
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterType}
                    onValueChange={(v) => {
                      setFilterType(v);
                      setPage(1);
                    }}
                  >
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
                  <Select value={sortOrder} onValueChange={setSortOrder}>
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
                        viewMode === "list"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700",
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        viewMode === "grid"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700",
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Loading documents...
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {paginatedDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className="border-gray-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => void handlePreview(doc)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 truncate">
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {bytesToReadable(doc.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded-full">
                        {doc.type}
                      </span>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{doc.department}</span>
                      <span>
                        {new Date(doc.dateModified).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handlePreview(doc);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(doc);
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleShare(doc);
                        }}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="text-[13px]"
                            onClick={() => void handlePreview(doc)}
                          >
                            <Eye className="mr-2 w-4 h-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[13px]"
                            onClick={() => void handleDownload(doc)}
                          >
                            <Download className="mr-2 w-4 h-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[13px] text-red-600"
                            onClick={() => setDocToDelete(doc)}
                          >
                            <Trash2 className="mr-2 w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    {paginatedDocs.map((doc) => (
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
                              <p className="text-[12px] text-gray-500">
                                {doc.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-gray-600 font-medium">
                            {doc.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-gray-600">
                            {doc.area}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-gray-600">
                            {doc.department}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-gray-500">
                            {new Date(doc.dateModified).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-gray-500">
                            {bytesToReadable(doc.size)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-gray-900"
                              onClick={() => void handlePreview(doc)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-gray-900"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-gray-900"
                              onClick={() => void handleShare(doc)}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-500 hover:text-gray-900"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  className="text-[13px]"
                                  onClick={() => void handlePreview(doc)}
                                >
                                  <Eye className="mr-2 w-4 h-4" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[13px]"
                                  onClick={() => void handleDownload(doc)}
                                >
                                  <Download className="mr-2 w-4 h-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-[13px] text-red-600"
                                  onClick={() => setDocToDelete(doc)}
                                >
                                  <Trash2 className="mr-2 w-4 h-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 px-5 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[13px] text-gray-500">
                    Showing {paginatedDocs.length} of {documents.length}{" "}
                    documents
                  </p>
                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationPrevious
                        className="h-8"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      />
                      <PaginationContent>
                        {pageWindow.map((p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              isActive={p === safePage}
                              className="h-8 w-8"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        {totalPages > 5 && safePage < totalPages - 2 && (
                          <PaginationEllipsis className="h-8 w-8" />
                        )}
                      </PaginationContent>
                      <PaginationNext
                        className="h-8"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                      />
                    </Pagination>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DocumentRepositoryPreviewModal
        open={previewDocId !== null}
        onOpenChange={(open) => !open && setPreviewDocId(null)}
        file={selectedFile}
        allFiles={allFiles}
        onSelectFile={(f) => setPreviewDocId(f.id)}
      />

      <Dialog open={docToDelete !== null} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Delete Document</DialogTitle>
            <DialogDescription className="text-[14px]">
              Are you sure you want to delete "{docToDelete?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="h-9" onClick={() => setDocToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-9"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
