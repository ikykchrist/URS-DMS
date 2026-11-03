import { apiGet, apiGetPage, apiPost } from "@/lib/http"

export const BUG_REPORT_TABS = [
  "Dashboard",
  "My Documents",
  "My Requests",
  "Accreditation",
  "Notifications",
  "My Activity",
  "Profile",
  "Settings",
  "Other",
] as const

export interface BugReport {
  id: string
  tab: string
  description: string
  createdAt: string
  attachmentKey?: string | null
  attachmentName?: string | null
  reporter: {
    firstName: string
    lastName: string
    email: string
    role: { name: string }
  }
}

export interface ReportAttachment { objectKey: string; filename: string }

export function createBugReport(input: { tab: string; description: string; attachment?: ReportAttachment }) {
  return apiPost<BugReport>("/bug-reports", input)
}

export async function uploadBugReportAttachment(file: File): Promise<ReportAttachment> {
  const upload = await apiPost<{ url: string; objectKey: string; headers: Record<string, string> }>("/bug-reports/attachments/upload-url", {
    filename: file.name, mimeType: file.type, sizeBytes: file.size,
  })
  const headers = Object.fromEntries(Object.entries(upload.headers).filter(([key]) => key.toLowerCase() !== "content-length"))
  const response = await fetch(upload.url, { method: "PUT", headers, body: file })
  if (!response.ok) throw new Error("Unable to upload attachment. Please try again.")
  return { objectKey: upload.objectKey, filename: file.name }
}

export async function downloadBugReportAttachment(id: string) {
  const result = await apiGet<{ url: string }>(`/bug-reports/${encodeURIComponent(id)}/attachment`)
  const link = document.createElement("a")
  link.href = result.url
  link.rel = "noopener"
  link.click()
}

export function listBugReports(page = 1, pageSize = 25) {
  return apiGetPage<BugReport>(`/bug-reports?page=${page}&pageSize=${pageSize}`)
}
