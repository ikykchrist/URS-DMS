import { apiGet, apiGetPage, apiPatch, apiPost, apiDelete, getAccessToken, API_BASE, type ApiPage } from "@/lib/http"

// =============================================================================
// URS-DMS — Admin service (server-backed)
// Wraps the /admin/* and /audit endpoints used by the admin + user surfaces.
// No local data stores. Mirrors server shapes from modules/admin + modules/audit.
// =============================================================================

// ── Users (/admin/users) ─────────────────────────────────────────────────────

export interface SystemUser {
  id: string
  employeeId: string | null
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  suffix: string | null
  status: string
  roleId: string
  roleName: string
  departmentId: string | null
  departmentName: string | null
  collegeId: string | null
  collegeName: string | null
  mustChangePassword: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export async function listSystemUsers(query?: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  roleId?: string
  departmentId?: string
  includeArchived?: boolean
}): Promise<ApiPage<SystemUser>> {
  const params = new URLSearchParams()
  if (query?.page) params.set("page", String(query.page))
  if (query?.pageSize) params.set("pageSize", String(query.pageSize))
  if (query?.search) params.set("q", query.search)
  if (query?.status) params.set("status", query.status)
  if (query?.roleId) params.set("roleId", query.roleId)
  if (query?.departmentId) params.set("departmentId", query.departmentId)
  if (query?.includeArchived) params.set("includeArchived", "true")
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return apiGetPage<SystemUser>(`/admin/users${qs}`)
}

export async function getSystemUser(id: string): Promise<SystemUser> {
  return apiGet<SystemUser>(`/admin/users/${encodeURIComponent(id)}`)
}

export interface CreateSystemUserInput {
  employeeId: string
  email: string
  password: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  roleId: string
  departmentId?: string | null
  mustChangePassword?: boolean
}

export async function createSystemUser(input: CreateSystemUserInput): Promise<SystemUser> {
  return apiPost<SystemUser>("/admin/users", input)
}

export async function updateSystemUser(
  id: string,
  patch: Partial<{
    email: string
    firstName: string
    middleName: string | null
    lastName: string
    suffix: string | null
    roleId: string
    departmentId: string | null
  }>,
): Promise<SystemUser> {
  return apiPatch<SystemUser>(`/admin/users/${encodeURIComponent(id)}`, patch)
}

export async function archiveSystemUser(id: string): Promise<SystemUser> {
  return apiDelete<SystemUser>(`/admin/users/${encodeURIComponent(id)}`)
}

export async function restoreSystemUser(id: string): Promise<SystemUser> {
  return apiPost<SystemUser>(`/admin/users/${encodeURIComponent(id)}/restore`)
}

export async function updateUserStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<SystemUser> {
  return apiPatch<SystemUser>(`/admin/users/${encodeURIComponent(id)}/status`, { status })
}

export async function resetUserPassword(
  id: string,
  input: { newPassword: string; mustChangePassword?: boolean },
): Promise<SystemUser> {
  return apiPost<SystemUser>(`/admin/users/${encodeURIComponent(id)}/reset-password`, input)
}

// ── Roles (/admin/roles) ─────────────────────────────────────────────────────

export interface SystemRole {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  userCount: number
  permissionCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export async function listSystemRoles(query?: {
  page?: number
  pageSize?: number
  q?: string
  includeArchived?: boolean
}): Promise<ApiPage<SystemRole>> {
  const params = new URLSearchParams()
  if (query?.page) params.set("page", String(query.page))
  if (query?.pageSize) params.set("pageSize", String(query.pageSize))
  if (query?.q) params.set("q", query.q)
  if (query?.includeArchived) params.set("includeArchived", "true")
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return apiGetPage<SystemRole>(`/admin/roles${qs}`)
}

// ── Departments (/admin/departments) ─────────────────────────────────────────

export interface SystemDepartment {
  id: string
  name: string
  code: string
  description: string | null
  headId: string | null
  headName: string | null
  collegeId: string | null
  collegeName: string | null
  userCount: number
  documentCount: number
  folderCount: number
  areaCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export async function listSystemDepartments(query?: {
  page?: number
  pageSize?: number
  q?: string
  includeArchived?: boolean
}): Promise<ApiPage<SystemDepartment>> {
  const params = new URLSearchParams()
  if (query?.page) params.set("page", String(query.page))
  if (query?.pageSize) params.set("pageSize", String(query.pageSize))
  if (query?.q) params.set("q", query.q)
  if (query?.includeArchived) params.set("includeArchived", "true")
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return apiGetPage<SystemDepartment>(`/admin/departments${qs}`)
}

export async function createSystemDepartment(input: {
  name: string
  code: string
  description?: string | null
  headId?: string | null
  collegeId?: string | null
}): Promise<SystemDepartment> {
  return apiPost<SystemDepartment>("/admin/departments", input)
}

// ── Colleges (/admin/colleges) ───────────────────────────────────────────────

export interface SystemCollege {
  id: string
  name: string
  code: string
  description: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export async function listSystemColleges(query?: {
  page?: number
  pageSize?: number
  q?: string
  includeArchived?: boolean
}): Promise<ApiPage<SystemCollege>> {
  const params = new URLSearchParams()
  if (query?.page) params.set("page", String(query.page))
  if (query?.pageSize) params.set("pageSize", String(query.pageSize))
  if (query?.q) params.set("q", query.q)
  if (query?.includeArchived) params.set("includeArchived", "true")
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return apiGetPage<SystemCollege>(`/admin/colleges${qs}`)
}

// ── System Settings (/admin/settings) ────────────────────────────────────────

export interface SystemSettingsView {
  applicationName: string
  maxUploadSizeBytes: string
  allowedFileTypes: string[]
  sessionTimeoutMinutes: number
  defaultPaginationSize: number
  maintenanceMode: boolean
  storageThresholdWarning: number
  updatedAt: string | null
  updatedById: string | null
}

export async function getSystemSettings(): Promise<SystemSettingsView> {
  return apiGet<SystemSettingsView>("/admin/settings")
}

export async function updateSystemSettings(
  patch: Partial<Omit<SystemSettingsView, "updatedAt" | "updatedById">>,
): Promise<SystemSettingsView> {
  return apiPatch<SystemSettingsView>("/admin/settings", patch)
}

// ── Audit (/audit) ───────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string
  timestamp: string
  action: string
  module: string
  status: string
  user: { id: string; name: string; email: string; role: string } | null
  entity: { type: string; id: string } | null
  ipAddress: string | null
  userAgent: string | null
}

export async function listAuditEntries(query?: {
  page?: number
  pageSize?: number
  q?: string
  module?: string
  action?: string
  status?: string
  from?: string
  to?: string
}): Promise<ApiPage<AuditEntry>> {
  const params = new URLSearchParams()
  if (query?.page) params.set("page", String(query.page))
  if (query?.pageSize) params.set("pageSize", String(query.pageSize))
  if (query?.q) params.set("q", query.q)
  if (query?.module) params.set("module", query.module)
  if (query?.action) params.set("action", query.action)
  if (query?.status) params.set("status", query.status)
  if (query?.from) params.set("from", query.from)
  if (query?.to) params.set("to", query.to)
  const qs = params.size > 0 ? `?${params.toString()}` : ""
  return apiGetPage<AuditEntry>(`/audit${qs}`)
}

/** Wipe every audit row (administrator-only). Returns the number of rows removed. */
export async function clearAuditLogs(): Promise<number> {
  const data = await apiDelete<{ cleared: number }>("/audit")
  return data.cleared
}

export interface AuditExportResult {
  format: string
  contentType: string
  filename: string
  data: string
  count: number
}

export async function exportAuditEntries(query?: {
  q?: string
  module?: string
  action?: string
  status?: string
  from?: string
  to?: string
}): Promise<AuditExportResult> {
  const params = new URLSearchParams({ format: "csv" })
  if (query?.q) params.set("q", query.q)
  if (query?.module) params.set("module", query.module)
  if (query?.action) params.set("action", query.action)
  if (query?.status) params.set("status", query.status)
  if (query?.from) params.set("from", query.from)
  if (query?.to) params.set("to", query.to)

  const token = getAccessToken()
  const res = await fetch(`${API_BASE}/audit/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  })
  if (!res.ok) {
    let message = `Export failed (${res.status})`
    try {
      const payload = (await res.json()) as { error?: { message?: string } }
      if (payload.error?.message) message = payload.error.message
    } catch {
      // Raw text/empty body — keep the generic message.
    }
    throw new Error(message)
  }
  const data = await res.text()
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? "audit-export.csv"
  return {
    format: "csv",
    contentType: res.headers.get("Content-Type") ?? "text/csv",
    filename,
    data,
    count: data.split("\r\n").filter((line) => line.length > 0).length - 1,
  }
}
