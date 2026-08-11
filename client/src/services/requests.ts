import { apiGet, apiPost, ApiRequestError } from "@/lib/http"
import type { DocumentRequest, RequestStatus } from "@/types/domain"

// =============================================================================
// URS-DMS — Document requests service (server-backed, Sprint 4)
// Mirrors the /api/v1/requests endpoints. The adapter maps the backend shape
// into the client `DocumentRequest` type for the existing UI.
// =============================================================================

export interface BackendRequestItem {
  documentId: string
  title: string | null
  filename: string | null
  mimeType: string | null
  sizeBytes: string | null
  ownerName: string | null
  uploadedAt: string | null
}

interface BackendRequest {
  id: string
  title: string
  justification: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED"
  requesterId: string
  requesterName: string
  requesterEmail: string | null
  documentId: string | null
  documentTitle: string | null
  items: BackendRequestItem[]
  decidedById: string | null
  decidedByName: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
  updatedAt: string
}

export interface BrowseBucketItem {
  id: string
  title: string
  filename: string | null
  mimeType: string | null
  sizeBytes: string | null
  ownerName: string
  departmentId: string | null
  departmentName: string | null
  uploadedAt: string
  folderName: string | null
}

export interface BrowseBucket {
  items: BrowseBucketItem[]
  departmentId: string | null
  departmentName: string | null
}

function adaptStatusFromBackend(s: BackendRequest["status"]): RequestStatus {
  switch (s) {
    case "PENDING": return "Pending"
    case "APPROVED": return "Approved"
    case "FULFILLED": return "Fulfilled"
    case "REJECTED": return "Rejected"
    default: return "Pending"
  }
}

function adaptStatusToBackend(s: RequestStatus | "all"): "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED" | "all" {
  switch (s) {
    case "Pending": return "PENDING"
    case "Approved": return "APPROVED"
    case "Fulfilled": return "FULFILLED"
    case "Rejected": return "REJECTED"
    case "In Review": return "PENDING"
    case "Draft": return "PENDING"
    default: return s
  }
}

function adaptRequestFromBackend(r: BackendRequest): DocumentRequest {
  const hasUrgent = r.justification.toLowerCase().includes("priority: urgent")
  const docs = r.items.length > 0
    ? r.items.map((item) => ({
        documentId: item.documentId,
        documentName: item.title ?? item.filename ?? "",
      }))
    : r.documentId
      ? [{ documentId: r.documentId, documentName: r.documentTitle ?? "" }]
      : []
  return {
    id: r.id,
    title: r.title,
    purpose: r.justification.split("\n Remarks:")[0].split("\nPriority:")[0].split("\nAdditional documents:")[0],
    remarks: r.decisionNote ?? "",
    priority: hasUrgent ? "Urgent" : "Normal",
    submittedBy: r.requesterId,
    submittedByName: r.requesterName,
    department: "",
    documents: docs,
    status: adaptStatusFromBackend(r.status),
    dateSubmitted: r.createdAt,
    handledBy: r.decidedById ?? undefined,
    handledByName: r.decidedByName ?? undefined,
    handledAt: r.decidedAt ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export async function listRequests(filter?: {
  status?: RequestStatus | "all"
  submittedBy?: string
  search?: string
}): Promise<DocumentRequest[]> {
  const params = new URLSearchParams()
  if (filter?.status && filter.status !== "all") params.set("status", adaptStatusToBackend(filter.status))
  if (filter?.submittedBy) params.set("requesterId", filter.submittedBy)
  if (filter?.search) params.set("q", filter.search)
  const qs = params.toString() ? `?${params.toString()}` : ""
  const data = await apiGet<BackendRequest[]>(`/requests${qs}`)
  return data.map(adaptRequestFromBackend)
}

export async function getRequest(id: string): Promise<DocumentRequest | null> {
  try {
    const data = await apiGet<BackendRequest>(`/requests/${id}`)
    return adaptRequestFromBackend(data)
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null
    throw err
  }
}

export async function createRequest(
  data: Pick<DocumentRequest, "title" | "purpose" | "remarks" | "priority" | "documents">,
): Promise<DocumentRequest> {
  const documentIds = (data.documents ?? []).map((d) => d.documentId).filter(Boolean)
  const justificationParts = [data.purpose]
  if (data.remarks) justificationParts.push(`Remarks: ${data.remarks}`)
  if (data.priority === "Urgent") justificationParts.push("Priority: Urgent")
  const created = await apiPost<BackendRequest>("/requests", {
    title: data.title,
    justification: justificationParts.join("\n"),
    documentIds,
  })
  return adaptRequestFromBackend(created)
}

export async function handleRequest(
  id: string,
  decision: "Approved" | "Rejected",
  remarks?: string,
): Promise<void> {
  const endpoint = decision === "Approved" ? "approve" : "reject"
  await apiPost<BackendRequest>(`/requests/${id}/${endpoint}`, {
    decisionNote: remarks,
  })
}

export async function cancelRequest(id: string): Promise<void> {
  await apiPost<BackendRequest>(`/requests/${id}/cancel`)
}

export async function browseArchive(): Promise<BrowseBucket> {
  return apiGet<BrowseBucket>("/requests/browse")
}
