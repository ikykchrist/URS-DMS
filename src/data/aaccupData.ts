export interface Submission {
  id: string
  title: string
  area: string
  aaccupArea: number
  submittedBy: string
  department: string
  dateSubmitted: string
  fileName: string
  fileSize: string
  status: "Pending" | "Approved" | "Returned"
}

export interface AACCUPArea {
  id: number
  title: string
  description: string
  status: "Completed" | "In Progress" | "Pending" | "Overdue"
  completion: number
  dueDate: string
}

export const aaccupAreas: AACCUPArea[] = [
  { id: 1, title: "Vision, Mission, and Educational Goals", description: "Institutional vision, mission, and educational goals", status: "Completed", completion: 100, dueDate: "2024-02-01" },
  { id: 2, title: "Faculty", description: "Faculty qualifications and development", status: "In Progress", completion: 75, dueDate: "2024-03-15" },
  { id: 3, title: "Curriculum and Instruction", description: "Curriculum development and instructional processes", status: "In Progress", completion: 60, dueDate: "2024-04-01" },
  { id: 4, title: "Support Services", description: "Student support services and development", status: "Pending", completion: 30, dueDate: "2024-05-15" },
  { id: 5, title: "Library", description: "Library resources and services", status: "In Progress", completion: 85, dueDate: "2024-02-15" },
  { id: 6, title: "Physical Plant", description: "Facilities and physical resources", status: "Overdue", completion: 45, dueDate: "2024-01-10" },
  { id: 7, title: "Laboratory", description: "Laboratory facilities and equipment", status: "In Progress", completion: 55, dueDate: "2024-03-20" },
  { id: 8, title: "Research", description: "Research and extension programs", status: "Pending", completion: 20, dueDate: "2024-06-15" },
  { id: 9, title: "Community Involvement", description: "Extension and community engagement", status: "In Progress", completion: 70, dueDate: "2024-03-01" },
  { id: 10, title: "Financial Resources", description: "Financial management and resources", status: "Completed", completion: 100, dueDate: "2024-01-20" },
]

export const submissions: Submission[] = [
  { id: "SUB-001", title: "Self-Study Report - COSI Department", area: "Academic", aaccupArea: 1, submittedBy: "Dr. Maria Santos", department: "College of Info Sciences", dateSubmitted: "2024-01-15", fileName: "SSR_COSI_2024.pdf", fileSize: "2.4 MB", status: "Approved" },
  { id: "SUB-002", title: "Faculty Credentials - Dr. John Doe", area: "Faculty", aaccupArea: 2, submittedBy: "Prof. John Doe", department: "College of Engineering", dateSubmitted: "2024-01-14", fileName: "Credentials_Doe.pdf", fileSize: "1.1 MB", status: "Approved" },
  { id: "SUB-003", title: "Infrastructure Assessment Report", area: "Facility", aaccupArea: 6, submittedBy: "Engr. Sarah Cruz", department: "Facilities Management", dateSubmitted: "2024-01-13", fileName: "Infra_Assessment.pdf", fileSize: "3.8 MB", status: "Pending" },
  { id: "SUB-004", title: "Curriculum Revision - BSIT", area: "Curriculum", aaccupArea: 3, submittedBy: "Dr. Peter Lim", department: "College of Info Sciences", dateSubmitted: "2024-01-12", fileName: "BSIT_Curriculum.docx", fileSize: "856 KB", status: "Returned" },
  { id: "SUB-005", title: "Laboratory Equipment Inventory", area: "Resources", aaccupArea: 7, submittedBy: "Ms. Ana Reyes", department: "College of Engineering", dateSubmitted: "2024-01-11", fileName: "Lab_Inventory.xlsx", fileSize: "420 KB", status: "Approved" },
  { id: "SUB-006", title: "Annual Report 2023", area: "Administrative", aaccupArea: 10, submittedBy: "Mr. James Wilson", department: "Dean Office", dateSubmitted: "2024-01-10", fileName: "Annual_Report_2023.pptx", fileSize: "5.2 MB", status: "Pending" },
  { id: "SUB-007", title: "Student Handbook 2024", area: "Academic", aaccupArea: 4, submittedBy: "Ms. Lisa Chen", department: "Student Affairs", dateSubmitted: "2024-01-09", fileName: "Student_Handbook.pdf", fileSize: "1.9 MB", status: "Approved" },
  { id: "SUB-008", title: "Accreditation Timeline", area: "Academic", aaccupArea: 1, submittedBy: "Dr. Maria Santos", department: "College of Info Sciences", dateSubmitted: "2024-01-08", fileName: "Accreditation_Timeline.xlsx", fileSize: "234 KB", status: "Returned" },
  { id: "SUB-009", title: "Faculty Development Plan", area: "Faculty", aaccupArea: 2, submittedBy: "Prof. Robert Garcia", department: "College of Arts & Sciences", dateSubmitted: "2024-01-07", fileName: "Faculty_Development.docx", fileSize: "1.5 MB", status: "Pending" },
  { id: "SUB-010", title: "Library Collection Report", area: "Resources", aaccupArea: 5, submittedBy: "Ms. Elena Cruz", department: "Library Services", dateSubmitted: "2024-01-06", fileName: "Library_Collection.pdf", fileSize: "2.1 MB", status: "Approved" },
  { id: "SUB-011", title: "Community Extension Report", area: "Community", aaccupArea: 9, submittedBy: "Dr. Maria Santos", department: "Extension Office", dateSubmitted: "2024-01-05", fileName: "Extension_Report.pdf", fileSize: "3.2 MB", status: "Pending" },
  { id: "SUB-012", title: "Research Output Summary", area: "Research", aaccupArea: 8, submittedBy: "Dr. Peter Lim", department: "Research Center", dateSubmitted: "2024-01-04", fileName: "Research_Output.pdf", fileSize: "4.5 MB", status: "Pending" },
]

export function getAACCUPAreaStats(areaId: number) {
  const areaSubmissions = submissions.filter(s => s.aaccupArea === areaId)
  const completed = areaSubmissions.filter(s => s.status === "Approved").length
  const pending = areaSubmissions.filter(s => s.status === "Pending").length
  const returned = areaSubmissions.filter(s => s.status === "Returned").length
  
  return {
    total: areaSubmissions.length,
    completed,
    pending,
    returned,
    completion: areaSubmissions.length > 0 ? Math.round((completed / areaSubmissions.length) * 100) : 0
  }
}

export function getSubmissionsByArea(areaId: number): Submission[] {
  return submissions.filter(s => s.aaccupArea === areaId)
}
