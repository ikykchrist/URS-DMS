// =============================================================================
// URS-DMS — Personal repository domain shapes
// =============================================================================

export interface RepositoryView {
  id: string;
  ownerId: string;
  createdAt: string;
  folderCount: number;
  documentCount: number;
  storageBytes: string;
  emergencyAccessActive: boolean;
}

export interface EmergencyAccessView {
  id: string;
  adminId: string;
  adminName: string;
  ownerId: string;
  ownerName: string;
  reason: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
}
