import { apiGet, apiPost, ApiRequestError } from "@/lib/http"
import type { DocumentRequest, RequestStatus } from "@/types/domain"

// =============================================================================
// URS-DMS — Document requests service (server-backed, Sprint 4)
// Mirrors the /api/v1/requests endpoints. The adapter maps the backend shape
// into the client `DocumentRequest` type for the existing UI.
// =============================================================================

interface BackendRequest {
  id: string
  title: string
  justification: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED"
  requesterId: string
  requesterName: string
  documentId: string | null
  documentTitle: string | null
  decidedById: string | null
  decidedByName: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
  updatedAt: string
}

function adaptStatusFromBackend(s: BackendRequest["status"]): RequestStatus {
  switch (s) {
    case "PENDING": return "Pending"
    case "APPROVED": return "Approved"
    case "REJECTED": return "Rejected"
    case "FULFILLED": return "Approved"
    default: return "Pending"
  }
}

function adaptStatusToBackend(s: RequestStatus | "all"): "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED" | "all" {
  switch (s) {
    case "Pending": return "PENDING"
    case "Approved": return "APPROVED"
    case "Rejected": return "REJECTED"
    case "In Review": return "PENDING"
    case "Draft": return "PENDING"
    default: return s
  }
}

function adaptRequestFromBackend(r: BackendRequest): DocumentRequest {
  const hasUrgent = r.justification.toLowerCase().includes("priority: urgent")
  return {
    id: r.id,
    title: r.title,
    purpose: r.justification.split("\n Remarks:")[0].split("\nPriority:")[0].split("\nAdditional documents:")[0],
    remarks: r.decisionNote ?? "",
    priority: hasUrgent ? "Urgent" : "Normal",
    submittedBy: r.requesterId,
    submittedByName: r.requesterName,
    department: "",
    documents: r.documentId ? [{ documentId: r.documentId, documentName: r.documentTitle ?? "" }] : [],
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
  const firstDoc = data.documents?.[0]?.documentId ?? null
  const justificationParts = [data.purpose]
  if (data.remarks) justificationParts.push(`Remarks: ${data.remarks}`)
  if (data.documents && data.documents.length > 1) {
    justificationParts.push(`Additional documents: ${data.documents.slice(1).map((d) => d.documentName).join(", ")}`)
  }
  if (data.priority === "Urgent") justificationParts.push("Priority: Urgent")
  const created = await apiPost<BackendRequest>("/requests", {
    title: data.title,
    justification: justificationParts.join("\n"),
    documentId: firstDoc,
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
