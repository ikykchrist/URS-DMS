import { apiGet } from "@/lib/http"

// =============================================================================
// URS-DMS — Dashboard service (server-backed)
// Wraps the /dashboard endpoints (modules/dashboard). Read-only analytics.
// =============================================================================

export interface DocumentStats {
  totalDocuments: number
  activeDocuments: number
  archivedDocuments: number
  uploadedToday: number
  uploadedThisWeek: number
  uploadedThisMonth: number
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  administrators: number
  departmentUsers: number
}

export interface RequestStats {
  totalRequests: number
  pending: number
  approved: number
  rejected: number
  fulfilled: number
}

export interface AaccupStats {
  totalAreas: number
  totalRequirements: number
  totalSubmissions: number
  approved: number
  pending: number
  needsRevision: number
  rejected: number
  overallCompliancePercentage: number
}

export interface StorageStats {
  totalStorageUsedBytes: string
  availableStorageBytes: string | null
  numberOfFiles: number
}

export interface DashboardOverview {
  documents: DocumentStats
  users: UserStats
  requests: RequestStats
  aaccup: AaccupStats
  storage: StorageStats
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return apiGet<DashboardOverview>("/dashboard/overview")
}

export function getDashboardDocuments(): Promise<DocumentStats> {
  return apiGet<DocumentStats>("/dashboard/documents")
}

export function getDashboardUsers(): Promise<UserStats> {
  return apiGet<UserStats>("/dashboard/users")
}

export function getDashboardRequests(): Promise<RequestStats> {
  return apiGet<RequestStats>("/dashboard/requests")
}

export function getDashboardAaccup(): Promise<AaccupStats> {
  return apiGet<AaccupStats>("/dashboard/aaccup")
}

export function getDashboardStorage(): Promise<StorageStats> {
  return apiGet<StorageStats>("/dashboard/storage")
}
