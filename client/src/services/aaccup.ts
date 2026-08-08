import { apiGetPage, apiPost, apiPatch, apiDelete, apiGet } from "@/lib/http"

export type AreaSet = "AACCUP" | "ISO" | "CERT"

export interface OnlineAaccupArea {
  id: string
  code: string
  name: string
  description: string | null
  departmentId: string
  departmentName: string
  accreditationCycleId: string | null
  accreditationCycleName: string | null
  areaSet: AreaSet
  status: "ACTIVE" | "INACTIVE"
  createdAt: string
  updatedAt: string
}

export interface OnlineRequirementValidation {
  id: string
  type: "FILE_TYPE" | "FILE_SIZE" | "PAGE_COUNT" | "EXPIRATION_DATE" | "NAMING_CONVENTION" | "METADATA"
  config: Record<string, unknown>
  message: string | null
  severity: "ERROR" | "WARNING"
}

export interface OnlineAaccupRequirement {
  id: string
  areaId: string
  areaCode: string
  areaName: string
  title: string
  description: string | null
  documentCode: string
  category: string | null
  priority: string | null
  isRequired: boolean
  status: "ACTIVE" | "INACTIVE"
  displayOrder: number
  sourceNodeId: string | null
  sourceAssignmentId: string | null
  sourceTemplateId: string | null
  sourceTemplateVersion: number | null
  nodeType: "REQUIREMENT" | "SUB_REQUIREMENT" | "SUPPORTING_DOCUMENT" | null
  validations: OnlineRequirementValidation[]
}

export interface OnlineAaccupSubmission {
  id: string
  requirementId: string
  requirementTitle: string
  documentId: string
  documentTitle: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION"
  remarks: string | null
  isCurrent: boolean
  submittedAt: string
}

export interface UploadValidationResult {
  valid: boolean
  errors: Array<{ ruleId: string; type: string; message: string; severity: "ERROR" }>
  warnings: Array<{ ruleId: string; type: string; message: string; severity: "WARNING" }>
}

interface OnlineDocument {
  id: string
  versions: Array<{
    id: string
    checksum: string
    versionNumber: number
  }>
}

interface DocumentCreateResult {
  document: OnlineDocument
}

interface DocumentVersionResult {
  document: OnlineDocument
  upload: {
    url: string
    objectKey: string
    headers: Record<string, string>
    expiresInSeconds: number
  }
}

async function everyPage<T>(path: string, pageSize = 100): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?"
  const first = await apiGetPage<T>(`${path}${separator}page=1&pageSize=${pageSize}`)
  if (first.meta.totalPages <= 1) return first.items
  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      apiGetPage<T>(`${path}${separator}page=${index + 2}&pageSize=${pageSize}`),
    ),
  )
  return [...first.items, ...remaining.flatMap((page) => page.items)]
}

export async function listOnlineAaccupAreas(areaSet?: AreaSet): Promise<OnlineAaccupArea[]> {
  const qs = areaSet ? `&areaSet=${encodeURIComponent(areaSet)}` : ""
  return everyPage<OnlineAaccupArea>(`/aaccup/areas?status=ACTIVE${qs}`)
}

export async function listAllOnlineAaccupAreas(query?: {
  q?: string
  departmentId?: string
  status?: "ACTIVE" | "INACTIVE"
  areaSet?: AreaSet
}): Promise<OnlineAaccupArea[]> {
  const params = new URLSearchParams()
  if (query?.q) params.set("q", query.q)
  if (query?.departmentId) params.set("departmentId", query.departmentId)
  if (query?.status) params.set("status", query.status)
  if (query?.areaSet) params.set("areaSet", query.areaSet)
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return everyPage<OnlineAaccupArea>(`/aaccup/areas${qs}`)
}

export interface CreateOnlineAreaInput {
  code: string
  name: string
  description?: string
  departmentId: string
  accreditationCycleId?: string | null
  areaSet?: AreaSet
  status?: "ACTIVE" | "INACTIVE"
}

export async function createOnlineArea(input: CreateOnlineAreaInput): Promise<OnlineAaccupArea> {
  return apiPost<OnlineAaccupArea>("/aaccup/areas", input)
}

export async function updateOnlineArea(
  id: string,
  patch: Partial<Omit<CreateOnlineAreaInput, "code" | "name"> & { code?: string; name?: string }>,
): Promise<OnlineAaccupArea> {
  return apiPatch<OnlineAaccupArea>(`/aaccup/areas/${encodeURIComponent(id)}`, patch)
}

export async function archiveOnlineArea(id: string): Promise<OnlineAaccupArea> {
  return apiDelete<OnlineAaccupArea>(`/aaccup/areas/${encodeURIComponent(id)}`)
}

export async function restoreOnlineArea(id: string): Promise<OnlineAaccupArea> {
  return apiPost<OnlineAaccupArea>(`/aaccup/areas/${encodeURIComponent(id)}/restore`)
}

export interface OnlineSubmissionListItem {
  id: string
  requirementId: string
  requirementCode: string
  requirementTitle: string
  areaId: string
  areaCode: string
  areaName: string
  departmentId: string | null
  departmentName: string | null
  taskId: string | null
  taskTitle: string | null
  taskStatus: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | null
  documentId: string
  documentTitle: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION"
  remarks: string | null
  submittedById: string | null
  submittedByName: string | null
  reviewedById: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  submittedAt: string
}

export async function listAllOnlineSubmissions(query?: {
  areaId?: string
  requirementId?: string
  areaSet?: AreaSet
  status?: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION"
  q?: string
}): Promise<OnlineSubmissionListItem[]> {
  const params = new URLSearchParams()
  if (query?.areaId) params.set("areaId", query.areaId)
  if (query?.requirementId) params.set("requirementId", query.requirementId)
  if (query?.areaSet) params.set("areaSet", query.areaSet)
  if (query?.status) params.set("status", query.status)
  if (query?.q) params.set("q", query.q)
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return everyPage<OnlineSubmissionListItem>(`/aaccup/submissions${qs}`)
}

export async function reviewOnlineSubmission(
  id: string,
  input: { decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION"; remarks?: string },
): Promise<OnlineAaccupSubmission> {
  return apiPost<OnlineAaccupSubmission>(
    `/aaccup/submissions/${encodeURIComponent(id)}/review`,
    input,
  )
}

export async function archiveOnlineSubmission(id: string): Promise<OnlineAaccupSubmission> {
  return apiDelete<OnlineAaccupSubmission>(`/aaccup/submissions/${encodeURIComponent(id)}`)
}

export async function getOnlineArea(id: string): Promise<OnlineAaccupArea> {
  return apiGet<OnlineAaccupArea>(`/aaccup/areas/${encodeURIComponent(id)}`)
}

// ── Analytics (/aaccup/analytics) ────────────────────────────────────────────

export interface OnlineComplianceOverview {
  totalDepartments: number
  totalAreas: number
  totalRequirements: number
  requirementStatusCounts: Record<string, number>
  totalApproved: number
  totalPending: number
  totalMissing: number
  pendingReviews: number
  compliancePercentage: number
  areaBreakdown: Array<{
    areaId: string
    areaCode: string
    areaName: string
    departmentId: string
    requirementCounts: Record<string, number>
    totalRequirements: number
    completedRequirements: number
    compliancePercentage: number
  }>
}

export async function getOnlineComplianceOverview(query?: {
  areaSet?: AreaSet
  departmentId?: string
  areaId?: string
}): Promise<OnlineComplianceOverview> {
  const params = new URLSearchParams()
  if (query?.areaSet) params.set("areaSet", query.areaSet)
  if (query?.departmentId) params.set("departmentId", query.departmentId)
  if (query?.areaId) params.set("areaId", query.areaId)
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return apiGet<OnlineComplianceOverview>(`/aaccup/analytics/overview${qs}`)
}

export async function listOnlineRequirements(areaId: string): Promise<OnlineAaccupRequirement[]> {
  return everyPage<OnlineAaccupRequirement>(
    `/aaccup/requirements?areaId=${encodeURIComponent(areaId)}&status=ACTIVE&sort=displayOrder&order=asc`,
  )
}

export async function listOnlineAreaRequirements(areaId: string): Promise<OnlineAaccupRequirement[]> {
  return everyPage<OnlineAaccupRequirement>(
    `/aaccup/requirements?areaId=${encodeURIComponent(areaId)}&sort=displayOrder&order=asc`,
  )
}

export interface CreateOnlineRequirementInput {
  areaId: string
  title: string
  documentCode: string
  description?: string | null
  category?: string | null
  priority?: string | null
  isRequired?: boolean
  status?: "ACTIVE" | "INACTIVE"
  displayOrder?: number
}

export async function createOnlineRequirement(input: CreateOnlineRequirementInput): Promise<OnlineAaccupRequirement> {
  return apiPost<OnlineAaccupRequirement>("/aaccup/requirements", input)
}

export async function updateOnlineRequirement(
  id: string,
  patch: Partial<Omit<CreateOnlineRequirementInput, "areaId"> & { areaId?: string }>,
): Promise<OnlineAaccupRequirement> {
  return apiPatch<OnlineAaccupRequirement>(`/aaccup/requirements/${encodeURIComponent(id)}`, patch)
}

export async function archiveOnlineRequirement(id: string): Promise<OnlineAaccupRequirement> {
  return apiDelete<OnlineAaccupRequirement>(`/aaccup/requirements/${encodeURIComponent(id)}`)
}

export async function listMyAaccupSubmissions(areaId: string): Promise<OnlineAaccupSubmission[]> {
  return everyPage<OnlineAaccupSubmission>(
    `/aaccup/submissions?areaId=${encodeURIComponent(areaId)}&isCurrent=true&sort=submittedAt&order=desc`,
  )
}

// ── Tasks (/aaccup/tasks) ────────────────────────────────────────────────────

export type OnlineTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type OnlineTaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

export interface OnlineAaccupTask {
  id: string
  areaId: string
  areaCode: string
  areaName: string
  areaSet: AreaSet
  departmentId: string | null
  title: string
  description: string | null
  category: string | null
  priority: OnlineTaskPriority
  status: OnlineTaskStatus
  dueDate: string | null
  requirementId: string | null
  requirementTitle: string | null
  requirementCode: string | null
  assigneeType: "USER" | "DEPARTMENT"
  assigneeId: string | null
  assigneeLabel: string | null
  createdByName: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOnlineTaskInput {
  areaId: string
  title: string
  description?: string | null
  category?: string | null
  priority?: OnlineTaskPriority
  dueDate?: string | null
  requirementId?: string | null
  assigneeType: "USER" | "DEPARTMENT"
  assigneeId: string
}

export async function createOnlineTask(input: CreateOnlineTaskInput): Promise<OnlineAaccupTask> {
  return apiPost<OnlineAaccupTask>("/aaccup/tasks", input)
}

export async function updateOnlineTask(
  id: string,
  patch: { status?: OnlineTaskStatus; title?: string; description?: string | null; priority?: OnlineTaskPriority; dueDate?: string | null; requirementId?: string | null },
): Promise<OnlineAaccupTask> {
  return apiPatch<OnlineAaccupTask>(`/aaccup/tasks/${encodeURIComponent(id)}`, patch)
}

export interface TaskAssigneeOption {
  id: string
  fullName: string
}

export interface TaskDepartmentOption {
  id: string
  name: string
}

export async function listTaskAssignees(): Promise<{
  users: TaskAssigneeOption[]
  departments: TaskDepartmentOption[]
}> {
  return apiGet<{ users: TaskAssigneeOption[]; departments: TaskDepartmentOption[] }>("/aaccup/tasks/assignees")
}

export async function listOnlineAreaTasks(
  areaId: string,
  query?: { status?: OnlineTaskStatus; q?: string },
): Promise<OnlineAaccupTask[]> {
  const params = new URLSearchParams({ areaId })
  if (query?.status) params.set("status", query.status)
  if (query?.q) params.set("q", query.q)
  return everyPage<OnlineAaccupTask>(`/aaccup/tasks?${params.toString()}`)
}

export async function listMyOnlineTasks(): Promise<OnlineAaccupTask[]> {
  return everyPage<OnlineAaccupTask>("/aaccup/tasks?mine=true")
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

export interface RequirementUploadInput {
  requirementId: string
  departmentId: string
  title: string
  areaName?: string
  requirementCode?: string
  taskId?: string
  file: File
  remarks?: string
  pageCount?: number
  expirationDate?: string
  metadata?: Record<string, string>
}

export async function validateOnlineRequirementUpload(
  input: Pick<RequirementUploadInput, "requirementId" | "file" | "pageCount" | "expirationDate" | "metadata">,
): Promise<UploadValidationResult> {
  return apiPost<UploadValidationResult>(
    `/aaccup/requirements/${encodeURIComponent(input.requirementId)}/validate-upload`,
    {
      filename: input.file.name,
      mimeType: inferredMimeType(input.file),
      sizeBytes: input.file.size,
      ...(input.pageCount ? { pageCount: input.pageCount } : {}),
      ...(input.expirationDate ? { expirationDate: input.expirationDate } : {}),
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.pageCount ? { pageCount: input.pageCount } : {}),
        ...(input.expirationDate ? { expirationDate: input.expirationDate } : {}),
      },
    },
  )
}

export async function uploadOnlineRequirementDocument(
  input: RequirementUploadInput,
): Promise<OnlineAaccupSubmission> {
  const validation = await validateOnlineRequirementUpload(input)
  if (!validation.valid) throw new Error(validation.errors.map((issue) => issue.message).join(" "))

  const metadata = {
    ...(input.metadata ?? {}),
    ...(input.areaName ? { aaccupAreaName: input.areaName } : {}),
    ...(input.requirementCode ? { requirementCode: input.requirementCode } : {}),
    requirementId: input.requirementId,
    ...(input.pageCount ? { pageCount: input.pageCount } : {}),
    ...(input.expirationDate ? { expirationDate: input.expirationDate } : {}),
  }
  const created = await apiPost<DocumentCreateResult>("/documents", {
    title: input.title,
    classification: "INTERNAL",
    departmentId: input.departmentId,
    metadata,
  })
  const checksum = await sha256(input.file)
  const version = await apiPost<DocumentVersionResult>(
    `/documents/${encodeURIComponent(created.document.id)}/version`,
    {
      filename: input.file.name,
      mimeType: inferredMimeType(input.file),
      sizeBytes: input.file.size,
      checksum,
      changeNote: "AACCUP requirement upload",
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
  return apiPost<OnlineAaccupSubmission>("/aaccup/submissions", {
    requirementId: input.requirementId,
    documentId: created.document.id,
    ...(input.taskId ? { taskId: input.taskId } : {}),
    remarks: input.remarks,
  })
}
