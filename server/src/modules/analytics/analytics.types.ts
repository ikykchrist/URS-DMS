// =============================================================================
// URS-DMS — analytics domain shapes (Sprint 6.2)
// Each endpoint returns one of these shapes (wrapped in the standard
// { success, data } envelope by sendSuccess). Every figure is computed LIVE
// from the database via aggregate queries — no mock data, no cached rows.
// =============================================================================

// -----------------------------------------------------------------------------
// Shared shapes
// -----------------------------------------------------------------------------

/** Granularity for time-series endpoints. */
export type Granularity = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Filter parsed from query string and shared across all analytics services.
 * `from`/`to` are optional inclusive Date bounds. `departmentId` / `areaId`
 * scope the aggregates to a single department / AACCUP area respectively.
 */
export interface AnalyticsFilter {
  granularity: Granularity;
  from?: Date;
  to?: Date;
  departmentId?: string;
  areaId?: string;
  ownerId?: string;
}

/**
 * A generic time-series bucket. `label` is a human-readable bucket key whose
 * format depends on granularity (e.g. "2026-01" for monthly, "2026-W03" for
 * weekly). `value` is the numeric measure. The frontend can chart these
 * directly without any further transformation.
 */
export interface TimeSeriesPoint {
  label: string;
  value: number;
}

/** A categorical breakdown (e.g. uploads per department, requests by status). */
export interface CategoryBucket {
  label: string;
  value: number;
}

// -----------------------------------------------------------------------------
// GET /analytics/uploads
// -----------------------------------------------------------------------------

export interface UploadsAnalytics {
  /** Uploads grouped by the requested granularity over the date range. */
  overTime: TimeSeriesPoint[];
  /** Uploads grouped by department (top-N by count, descending). */
  perDepartment: CategoryBucket[];
}

// -----------------------------------------------------------------------------
// GET /analytics/requests
// -----------------------------------------------------------------------------

export interface RequestProcessingStats {
  /** Average minutes from createdAt → decidedAt across decided requests. */
  averageProcessingTimeMinutes: number;
  /** approvalRate = approved / (approved + rejected), or 0 if no decisions. */
  approvalRate: number;
  /** Denominator used for the approval rate (approved + rejected). */
  totalDecided: number;
}

export interface RequestsAnalytics {
  /** Requests created over time (by granularity). */
  createdOverTime: TimeSeriesPoint[];
  /** Count of requests grouped by RequestStatus enum value. */
  byStatus: CategoryBucket[];
  /** Derived processing metrics. */
  processing: RequestProcessingStats;
}

// -----------------------------------------------------------------------------
// GET /analytics/aaccup
// -----------------------------------------------------------------------------

export interface AaccupAnalytics {
  /**
   * Compliance trend: compliance % sampled at each granularity bucket, based
   * on submissions whose submittedAt falls in the bucket. Reuses the
   * compliance service's definition (single source of truth) but rolled up to
   * buckets rather than recomputed from scratch.
   */
  complianceTrend: TimeSeriesPoint[];
  /** Count of areas per area-level completion percentage band (0-25, 26-50, …). */
  areaCompletion: CategoryBucket[];
  /** Count of requirements per RequirementStatus (MISSING / PENDING / …). */
  requirementCompletion: CategoryBucket[];
  /** AACCUP submissions made over time (by granularity). */
  submissionTrend: TimeSeriesPoint[];
}

// -----------------------------------------------------------------------------
// GET /analytics/users
// -----------------------------------------------------------------------------

export interface UsersAnalytics {
  /** New user registrations over time (by granularity). */
  newUsers: TimeSeriesPoint[];
  /**
   * Active users over time. "Active" = a session was created for that user
   * within the bucket. Falls back to user.createdAt if no session history.
   */
  activeUsers: TimeSeriesPoint[];
  /** Login attempts (successful + failed) over time, sourced from AuditLog. */
  loginActivity: TimeSeriesPoint[];
}

// -----------------------------------------------------------------------------
// GET /analytics/storage
// -----------------------------------------------------------------------------

export interface StorageAnalytics {
  /** Sum of bytes uploaded, sampled at each granularity bucket. */
  storageGrowth: TimeSeriesPoint[];
  /** Number of file versions uploaded over time (by granularity). */
  filesOverTime: TimeSeriesPoint[];
  /** Grand total bytes across all versions (string — BigInt serialization). */
  totalStorageUsedBytes: string;
  /** Total number of object versions. */
  totalFiles: number;
}
