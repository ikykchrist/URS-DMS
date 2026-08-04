import { apiGet, apiGetPage, apiPost, apiPatch, apiDelete } from "@/lib/http"
import type { Document, DocumentStatus } from "@/types/domain"

interface OnlineDocumentRow {
  id: string
  title: string
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED"
  ownerId: string
  ownerName: string
  departmentId: string | null
  departmentName: string | null
  currentVersionId: string | null
  currentVersionNumber: number | null
  currentFilename: string | null
  currentMimeType: string | null
  currentSizeBytes: string | null
  metadata: Record<string, unknown> | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface DownloadResult {
  url: string
  filename: string
}

function documentStatus(status: OnlineDocumentRow["status"]): DocumentStatus {
  switch (status) {
    case "APPROVED":
    case "PUBLISHED": return "Approved"
    case "ARCHIVED": return "Archived"
    case "UNDER_REVIEW": return "In Review"
    default: return "Pending"
  }
}

function extension(filename: string | null): string {
  return filename?.split(".").pop()?.toUpperCase() || "FILE"
}

function toLegacyDocument(row: OnlineDocumentRow): Document | null {
  if (!row.currentVersionId || !row.currentFilename) return null
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {}
  return {
    id: row.id,
    name: row.title,
    type: extension(row.currentFilename),
    categoryId: "online",
    categoryName: typeof metadata.requirementCode === "string" ? metadata.requirementCode : "Online Repository",
    area: typeof metadata.aaccupAreaName === "string" ? metadata.aaccupAreaName : "Repository",
    department: row.departmentName ?? "Unassigned",
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    size: Number(row.currentSizeBytes ?? 0),
    status: documentStatus(row.status),
    blobId: `online:${row.id}`,
    currentVersionId: row.currentVersionId,
    versionCount: row.currentVersionNumber ?? 1,
    archived: row.status === "ARCHIVED",
    dateModified: row.updatedAt,
    dateCreated: row.createdAt,
    mimeType: row.currentMimeType ?? "application/octet-stream",
    tags: row.tags,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listOnlineDocuments(options?: {
  search?: string
  ownerId?: string
  archived?: boolean
  departmentId?: string
}): Promise<Document[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" })
  if (options?.search) params.set("q", options.search)
  if (options?.ownerId) params.set("ownerId", options.ownerId)
  if (options?.archived === true) params.set("status", "ARCHIVED")
  if (options?.departmentId) params.set("departmentId", options.departmentId)
  const first = await apiGetPage<OnlineDocumentRow>(`/documents?${params.toString()}`)
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) => {
      params.set("page", String(index + 2))
      return apiGetPage<OnlineDocumentRow>(`/documents?${params.toString()}`)
    }),
  )
  return [...first.items, ...remaining.flatMap((page) => page.items)]
    .map(toLegacyDocument)
    .filter((document): document is Document => {
      if (document === null) return false
      if (options?.archived === false) return !document.archived
      if (options?.archived === true) return document.archived
      return true
    })
}

export async function getOnlineDocument(id: string): Promise<Document | null> {
  try {
    const row = await apiGet<OnlineDocumentRow>(`/documents/${encodeURIComponent(id)}`)
    return toLegacyDocument(row)
  } catch {
    return null
  }
}

export async function deleteOnlineDocument(id: string): Promise<void> {
  await apiDelete<{ success: true }>(`/documents/${encodeURIComponent(id)}`)
}

export async function updateOnlineDocumentStatus(
  id: string,
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED",
): Promise<void> {
  await apiPatch<{ success: true }>(`/documents/${encodeURIComponent(id)}`, { status })
}

// ── Upload pipeline (create → version → presigned PUT → verify) ────────────

interface OnlineDocumentCreateResult {
  document: { id: string; versions: Array<{ id: string; checksum: string }> }
}

interface OnlineDocumentVersionResult {
  document: { id: string; versions: Array<{ id: string; checksum: string; versionNumber: number }> }
  upload: { url: string; headers: Record<string, string> }
}

function inferredMimeType(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split(".").pop()?.toLowerCase()
  const types: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    csv: "text/csv",
    txt: "text/plain",
  }
  return types[extension ?? ""] ?? "application/octet-stream"
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export interface OnlineDocumentUploadInput {
  title: string
  description?: string
  departmentId?: string | null
  classification?: "PUBLIC" | "INTERNAL" | "RESTRICTED" | "CONFIDENTIAL"
  metadata?: Record<string, unknown>
  tags?: string[]
  file: File
  changeNote?: string
}

export async function uploadOnlineDocument(input: OnlineDocumentUploadInput): Promise<Document> {
  const created = await apiPost<OnlineDocumentCreateResult>("/documents", {
    title: input.title,
    description: input.description,
    classification: input.classification ?? "INTERNAL",
    departmentId: input.departmentId ?? null,
    metadata: input.metadata,
    tags: input.tags,
  })
  const checksum = await sha256(input.file)
  const version = await apiPost<OnlineDocumentVersionResult>(
    `/documents/${encodeURIComponent(created.document.id)}/version`,
    {
      filename: input.file.name,
      mimeType: inferredMimeType(input.file),
      sizeBytes: input.file.size,
      checksum,
      changeNote: input.changeNote ?? "Initial upload",
    },
  )
  const uploadedVersion = version.document.versions.find((item) => item.checksum === checksum)
  if (!uploadedVersion) throw new Error("Document version was not created")

  const headers = Object.fromEntries(
    Object.entries(version.upload.headers).filter(([key]) => key.toLowerCase() !== "content-length"),
  )
  const uploadResponse = await fetch(version.upload.url, {
    method: "PUT",
    headers,
    body: input.file,
  })
  if (!uploadResponse.ok) throw new Error(`Object upload failed (${uploadResponse.status})`)

  await apiPost<{ verified: true }>(
    `/documents/${encodeURIComponent(created.document.id)}/versions/${encodeURIComponent(uploadedVersion.id)}/verify`,
  )
  const row = await apiGet<OnlineDocumentRow>(`/documents/${encodeURIComponent(created.document.id)}`)
  return toLegacyDocument(row) as Document
}

export function isOnlineDocument(document: Document): boolean {
  return document.blobId.startsWith("online:")
}

export async function openOnlineDocument(document: Document, preview = false): Promise<void> {
  const endpoint = preview ? "preview" : "download"
  const result = await apiGet<DownloadResult>(`/documents/${encodeURIComponent(document.id)}/${endpoint}`)
  window.open(result.url, "_blank", "noopener,noreferrer")
}

// ── Repository folders (server-backed; replaces the hardcoded UI tree) ──────

export interface RepositoryFolderNode {
  id: string
  parentId: string | null
  name: string
  description: string | null
  level: number
  sortOrder: number
  icon: string | null
  color: string | null
  visibility: "VISIBLE" | "HIDDEN"
  status: "ACTIVE" | "INACTIVE"
  children: RepositoryFolderNode[]
}

export interface RepositoryLegacyFolder {
  id: string
  name: string
  parentId: string | null
  departmentId: string | null
  ownerId: string | null
  documentCount: number
  childCount: number
  createdAt: string
  updatedAt: string
}

export interface ResolvedRepositoryStructure {
  source: "template" | "legacy" | "none"
  template: {
    id: string
    name: string
    code: string
    icon: string | null
    color: string | null
  } | null
  assignment: { id: string; targetType: string; targetId: string | null } | null
  tree: RepositoryFolderNode[]
  legacyFolders: RepositoryLegacyFolder[]
}

export async function resolveRepositoryStructure(): Promise<ResolvedRepositoryStructure> {
  return apiGet<ResolvedRepositoryStructure>("/folders/resolve")
}

export async function createRepositoryFolder(input: {
  name: string
  parentId?: string | null
  departmentId?: string | null
}): Promise<{ id: string; name: string; parentId: string | null }> {
  return apiPost<{ id: string; name: string; parentId: string | null }>("/folders", input)
}
