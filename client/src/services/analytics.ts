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
  perDepartment: CategoryBucket[]
}

export function getUploadsAnalytics(opts?: {
  granularity?: AnalyticsGranularity
  from?: string
  to?: string
  departmentId?: string
}): Promise<UploadsAnalytics> {
  const params = new URLSearchParams()
  params.set("granularity", opts?.granularity ?? "monthly")
  if (opts?.from) params.set("from", opts.from)
  if (opts?.to) params.set("to", opts.to)
  if (opts?.departmentId) params.set("departmentId", opts.departmentId)
  return apiGet<UploadsAnalytics>(`/analytics/uploads?${params.toString()}`)
}
