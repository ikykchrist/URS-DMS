export interface DocumentFile {
  id: string
  name: string
  type: string
  area: string
  department: string
  dateModified: string
  size: string
  status: string
  uploadedBy?: string
  uploadDate?: string
  lastModifiedDate?: string
  tags?: string[]
  folderPath?: string[]
  fileUrl?: string
  thumbnailUrl?: string
}

export interface PreviewFileActivity {
  id: string
  action: string
  user: string
  date: string
  avatar?: string
}

export interface PreviewFileVersion {
  id: string
  version: string
  date: string
  user: string
  changes: string
}

export const mockDocumentFiles: DocumentFile[] = [
  {
    id: "DOC-001",
    name: "Self-Study Report - COSI Department",
    type: "PDF",
    area: "Academic",
    department: "College of Information Sciences",
    dateModified: "2024-01-15",
    size: "2.4 MB",
    status: "Published",
    uploadedBy: "Dr. Maria Santos",
    uploadDate: "2024-01-10",
    lastModifiedDate: "2024-01-15",
    tags: ["AACCUP", "Accreditation", "SSR"],
    folderPath: ["AACCUP Documents", "Phase I - SSR"],
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
    uploadedBy: "John Smith",
    uploadDate: "2024-01-12",
    lastModifiedDate: "2024-01-14",
    tags: ["Faculty", "Credentials"],
    folderPath: ["Faculty Files", "Credentials"],
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
    uploadedBy: "Jane Doe",
    uploadDate: "2024-01-08",
    lastModifiedDate: "2024-01-13",
    tags: ["Curriculum", "BSIT"],
    folderPath: ["Curriculum", "BS-COSI"],
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
    uploadedBy: "Admin User",
    uploadDate: "2024-01-05",
    lastModifiedDate: "2024-01-12",
    tags: ["Annual", "Report"],
    folderPath: ["AACCUP Documents", "Annual Reports"],
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
    uploadedBy: "Lab Tech",
    uploadDate: "2024-01-09",
    lastModifiedDate: "2024-01-11",
    tags: ["Equipment", "Laboratory"],
    folderPath: ["Resources", "Laboratory"],
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
    uploadedBy: "Facilities Staff",
    uploadDate: "2024-01-07",
    lastModifiedDate: "2024-01-10",
    tags: ["Facility", "Room Layout"],
    folderPath: ["Facility Documents", "Room Layouts"],
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
    uploadedBy: "Student Affairs",
    uploadDate: "2024-01-06",
    lastModifiedDate: "2024-01-09",
    tags: ["Student", "Handbook"],
    folderPath: ["Academic"],
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
    uploadedBy: "Accreditation Chair",
    uploadDate: "2024-01-04",
    lastModifiedDate: "2024-01-08",
    tags: ["Accreditation", "Timeline"],
    folderPath: ["AACCUP Documents", "Phase I - SSR"],
  },
]

export const mockFileActivities: PreviewFileActivity[] = [
  {
    id: "ACT-001",
    action: "Uploaded document",
    user: "Dr. Maria Santos",
    date: "2024-01-10 09:30 AM",
  },
  {
    id: "ACT-002",
    action: "Modified document",
    user: "John Smith",
    date: "2024-01-12 02:15 PM",
  },
  {
    id: "ACT-003",
    action: "Viewed document",
    user: "Jane Doe",
    date: "2024-01-14 11:00 AM",
  },
  {
    id: "ACT-004",
    action: "Downloaded document",
    user: "Admin User",
    date: "2024-01-15 03:45 PM",
  },
]

export const mockFileVersions: PreviewFileVersion[] = [
  {
    id: "VER-001",
    version: "1.0",
    date: "2024-01-10",
    user: "Dr. Maria Santos",
    changes: "Initial upload",
  },
  {
    id: "VER-002",
    version: "1.1",
    date: "2024-01-12",
    user: "John Smith",
    changes: "Updated formatting and content",
  },
  {
    id: "VER-003",
    version: "1.2",
    date: "2024-01-15",
    user: "Dr. Maria Santos",
    changes: "Final review edits",
  },
]