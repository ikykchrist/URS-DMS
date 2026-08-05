// =============================================================================
// URS-DMS — dashboard statistics domain shapes
// Each endpoint returns one of these shapes via sendSuccess.
// =============================================================================

export interface DocumentStats {
  totalDocuments: number;
  activeDocuments: number;
  archivedDocuments: number;
  uploadedToday: number;
  uploadedThisWeek: number;
  uploadedThisMonth: number;
  totalFolders: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  administrators: number;
  departmentUsers: number;
}

export interface RequestStats {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  fulfilled: number;
}

export interface AaccupSetStats {
  totalAreas: number;
  totalRequirements: number;
  totalSubmissions: number;
  approved: number;
  pending: number;
  needsRevision: number;
  rejected: number;
  overallCompliancePercentage: number;
}

export interface AaccupStats {
  totalAreas: number;
  totalRequirements: number;
  totalSubmissions: number;
  approved: number;
  pending: number;
  needsRevision: number;
  rejected: number;
  overallCompliancePercentage: number;
  // Per-accreditation-set breakdown (AACCUP / ISO / Certification) so tabs and
  // dashboards can report each set's live content independently.
  byAreaSet: Record<"AACCUP" | "ISO" | "CERT", AaccupSetStats>;
}

export interface StorageStats {
  totalStorageUsedBytes: string;
  availableStorageBytes: string | null;
  numberOfFiles: number;
}

export interface DashboardOverview {
  documents: DocumentStats;
  users: UserStats;
  requests: RequestStats;
  aaccup: AaccupStats;
  storage: StorageStats;
}
