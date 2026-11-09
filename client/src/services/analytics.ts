import { apiGet } from "@/lib/http"

// =============================================================================
// URS-DMS — Analytics service (server-backed)
// Wraps the /analytics endpoints (modules/analytics). Read-only, computed live
// from aggregate queries. Requires the analytics.read permission.
// =============================================================================

export type AnalyticsGranularity = "daily" | "weekly" | "monthly" | "yearly"

export interface TimeSeriesPoint {
  label: string
  value: number
}

export interface CategoryBucket {
  label: string
  value: number
}

export interface UploadsAnalytics {
  overTime: TimeSeriesPoint[]
  perProgram: CategoryBucket[]
}

export function getUploadsAnalytics(opts?: {
  granularity?: AnalyticsGranularity
  from?: string
  to?: string
  campusId?: string
  collegeId?: string
  programId?: string
}): Promise<UploadsAnalytics> {
  const params = new URLSearchParams()
  params.set("granularity", opts?.granularity ?? "monthly")
  if (opts?.from) params.set("from", opts.from)
  if (opts?.to) params.set("to", opts.to)
  if (opts?.campusId) params.set("campusId", opts.campusId)
  if (opts?.collegeId) params.set("collegeId", opts.collegeId)
  if (opts?.programId) params.set("programId", opts.programId)
  return apiGet<UploadsAnalytics>(`/analytics/uploads?${params.toString()}`)
}
