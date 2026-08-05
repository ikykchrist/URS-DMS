// =============================================================================
// URS-DMS — Personal repository service
// Mirrors server modules/repositories/*
// =============================================================================

import { apiGet, apiPost } from "@/lib/http"

export interface RepositoryView {
  id: string
  ownerId: string
  createdAt: string
  folderCount: number
  documentCount: number
  storageBytes: string
  emergencyAccessActive: boolean
}

export interface EmergencyAccessView {
  id: string
  adminId: string
  adminName: string
  ownerId: string
  ownerName: string
  reason: string
  grantedBy: string
  grantedAt: string
  expiresAt: string
  revokedAt: string | null
  active: boolean
}

/** Provision (idempotently) and return the caller's repository. */
export async function getMyRepository(): Promise<RepositoryView> {
  return apiGet<RepositoryView>("/repositories/me")
}

export async function backfillRepositories(): Promise<{ provisioned: number }> {
  return apiPost<{ provisioned: number }>("/repositories/backfill")
}

export async function grantEmergencyAccess(input: {
  ownerId: string
  adminId: string
  reason: string
  durationMinutes: number
}): Promise<{ id: string; expiresAt: string }> {
  return apiPost<{ id: string; expiresAt: string }>(
    `/repositories/${encodeURIComponent(input.ownerId)}/emergency-access`,
    {
      adminId: input.adminId,
      reason: input.reason,
      durationMinutes: input.durationMinutes,
    },
  )
}

export async function revokeEmergencyAccess(id: string): Promise<{ id: string }> {
  return apiPost<{ id: string }>(`/repositories/emergency-access/${encodeURIComponent(id)}/revoke`, {})
}

export async function listEmergencyAccess(): Promise<EmergencyAccessView[]> {
  return apiGet<EmergencyAccessView[]>("/repositories/emergency")
}

export interface StorageSummary {
  usedBytes: string
  availableBytes: string | null
  totalBytes: string | null
  minioStatus: "online" | "offline"
  bucket: string
}

/** Honest server storage display (rule 13) — used bytes + MinIO status. */
export async function getRepositoryStorage(): Promise<StorageSummary> {
  return apiGet<StorageSummary>("/repositories/storage")
}
