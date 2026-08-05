import { prisma } from "@/lib/prisma";
import {
  calculateOverallCompliance,
  type RequirementStatus,
} from "@/modules/aaccup/services/compliance.service";
import type {
  AaccupAnalytics,
  AnalyticsFilter,
  CategoryBucket,
  RequestsAnalytics,
  StorageAnalytics,
  TimeSeriesPoint,
  UploadsAnalytics,
  UsersAnalytics,
} from "@/modules/analytics/analytics.types";
import type { Granularity } from "@/modules/analytics/analytics.types";

// =============================================================================
// URS-DMS — analytics service (Sprint 6.2)
// -----------------------------------------------------------------------------
// Historical / trend reporting. Read-only — no audit entries (per sprint
// spec, analytics endpoints are treated like dashboard reads). Every figure
// is computed LIVE from the database.
//
// Performance strategy:
//   - Time-series: each endpoint issues ONE Prisma findMany selecting only the
//     single timestamp column it needs (plus a where on the date range), then
//     buckets the rows in JS. We deliberately do NOT load full rows — this
//     keeps the result set to the minimum width required for the chart.
//   - Category breakdowns use groupBy({ by: [...], _count: { _all: true } })
//     which compiles to a single server-side GROUP BY — one round trip, no N+1.
//   - Aggregate scalars (storage total, request averages) use prisma's
//     aggregate() / count() so the math runs in SQL and only the scalar
//     returns.
//   - All sub-queries inside one endpoint run via Promise.all (one round-trip
//     batch through the Prisma connection pool).
//   - Prisma has no native date_trunc helper, so bucket keys are derived in JS
//     from the timestamp column. This is O(n) in the number of rows in the
//     date window — bounded by the from/to filter, defaulted to the last 12
//     months when omitted.
//
// AACCUP compliance is delegated to the compliance service's
// calculateOverallCompliance() for the area / requirement rollups (single
// source of truth). The compliance *trend* samples per-bucket compliance from
// AaccupSubmission rows joined to their requirement's department, so the trend
// never reimplements the COMPLETED/PENDING/... mapping rule.
// =============================================================================

// -----------------------------------------------------------------------------
// Date helpers
// -----------------------------------------------------------------------------

const MS_PER_MINUTE = 60_000;

function defaultRange(granularity: Granularity, from?: Date, to?: Date): { from: Date; to: Date } {
  const end = to ?? new Date();
  let start: Date;
  if (from) {
    start = from;
  } else {
    // Default window scales with granularity so each window yields a
    // reasonable number of buckets.
    const d = new Date(end);
    switch (granularity) {
      case "daily":
        d.setDate(d.getDate() - 30);
        break;
      case "weekly":
        d.setDate(d.getDate() - 12 * 7);
        break;
      case "monthly":
        d.setMonth(d.getMonth() - 12);
        break;
      case "yearly":
        d.setFullYear(d.getFullYear() - 5);
        break;
    }
    start = d;
  }
  return { from: start, to: end };
}

function startOfBucket(d: Date, granularity: Granularity): Date {
  const x = new Date(d);
  switch (granularity) {
    case "daily": {
      x.setHours(0, 0, 0, 0);
      return x;
    }
    case "weekly": {
      x.setHours(0, 0, 0, 0);
      const day = x.getDay();
      const diff = (day + 6) % 7;
      x.setDate(x.getDate() - diff);
      return x;
    }
    case "monthly": {
      return new Date(x.getFullYear(), x.getMonth(), 1);
    }
    case "yearly": {
      return new Date(x.getFullYear(), 0, 1);
    }
  }
}

function nextBucketStart(start: Date, granularity: Granularity): Date {
  const x = new Date(start);
  switch (granularity) {
    case "daily":
      x.setDate(x.getDate() + 1);
      break;
    case "weekly":
      x.setDate(x.getDate() + 7);
      break;
    case "monthly":
      x.setMonth(x.getMonth() + 1);
      break;
    case "yearly":
      x.setFullYear(x.getFullYear() + 1);
      break;
  }
  return x;
}

function formatBucketKey(start: Date, granularity: Granularity): string {
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  switch (granularity) {
    case "daily":
      return `${y}-${m}-${d}`;
    case "weekly": {
      const iso = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
      const week = compactIsoWeek(iso);
      return `${y}-W${String(week).padStart(2, "0")}`;
    }
    case "monthly":
      return `${y}-${m}`;
    case "yearly":
      return String(y);
  }
}

function compactIsoWeek(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 4);
  return 1 + Math.round((firstThursday - target.getTime()) / (7 * 24 * 3600 * 1000));
}

/**
 * Build an ordered list of bucket labels between from and to inclusive,
 * ensuring that buckets with zero events still appear as `value: 0` in the
 * chart (no gaps in the time series).
 */
function buildEmptySeries(from: Date, to: Date, granularity: Granularity): string[] {
  const labels: string[] = [];
  let cursor = startOfBucket(from, granularity);
  const endBucket = startOfBucket(to, granularity);
  while (cursor <= endBucket) {
    labels.push(formatBucketKey(cursor, granularity));
    cursor = nextBucketStart(cursor, granularity);
  }
  return labels;
}

/**
 * Bucket a flat list of timestamps into a complete TimeSeriesPoint[] (zero
 * buckets are filled in). Dates outside [from,to] are dropped.
 */
function bucketDates(
  dates: Date[],
  from: Date,
  to: Date,
  granularity: Granularity,
): TimeSeriesPoint[] {
  const labels = buildEmptySeries(from, to, granularity);
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, 0);

  for (const d of dates) {
    if (d < from || d > to) continue;
    const key = formatBucketKey(startOfBucket(d, granularity), granularity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
}

function mapToCategoryBuckets<T extends string>(
  rows: { [k: string]: unknown }[],
  key: T,
  known: readonly T[],
): CategoryBucket[] {
  const out = new Map<string, number>();
  for (const k of known) out.set(k, 0);
  for (const r of rows) {
    const v = String(r[key]);
    const c = (r as { _count?: Record<string, number> })._count?._all;
    out.set(v, (out.get(v) ?? 0) + (typeof c === "number" ? c : 0));
  }
  return Array.from(out.entries()).map(([label, value]) => ({ label, value }));
}

// Enum aspirations for Prisma-backed status lookups (kept local so we don't
// import @prisma/client enums — these are stable string literals used only
// for ordering findings).
const REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "FULFILLED"] as const;
const REQUIREMENT_STATUSES: RequirementStatus[] = [
  "COMPLETED",
  "PENDING",
  "NEEDS_REVISION",
  "REJECTED",
  "MISSING",
];

// -----------------------------------------------------------------------------
// GET /analytics/uploads
// -----------------------------------------------------------------------------
export async function getUploadsAnalytics(filter: AnalyticsFilter): Promise<UploadsAnalytics> {
  const { from, to } = defaultRange(filter.granularity, filter.from, filter.to);

  const where = {
    deletedAt: null,
    createdAt: { gte: from, lte: to },
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.ownerId ? { ownerId: filter.ownerId } : {}),
  };

  const [dates, deptRows] = await Promise.all([
    prisma.document.findMany({
      where,
      select: { createdAt: true },
    }),
    prisma.document.groupBy({
      by: ["departmentId"],
      _count: { _all: true },
      where: { deletedAt: null, ...(filter.ownerId ? { ownerId: filter.ownerId } : {}) },
      orderBy: { _count: { departmentId: "desc" } },
    }),
  ]);

  const overTime = bucketDates(
    dates.map((d) => d.createdAt),
    from,
    to,
    filter.granularity,
  );

  // Resolve departmentId → name in one extra query (avoids N+1 inside the
  // groupBy itself; department starts may be soft-deleted but their name is
  // still meaningful for historical charts).
  const deptIds = deptRows.map((r) => r.departmentId).filter((id): id is string => id !== null);
  const departments = deptIds.length
    ? await prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(departments.map((d) => [d.id, d.name]));

  const perDepartment: CategoryBucket[] = deptRows
    .map((r) => {
      const id = r.departmentId;
      const c = (r as { _count?: Record<string, number> })._count?._all;
      return {
        label: (id && nameById.get(id)) ?? "Unassigned",
        value: typeof c === "number" ? c : 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  return { overTime, perDepartment };
}

// -----------------------------------------------------------------------------
// GET /analytics/requests
// -----------------------------------------------------------------------------
export async function getRequestsAnalytics(filter: AnalyticsFilter): Promise<RequestsAnalytics> {
  const { from, to } = defaultRange(filter.granularity, filter.from, filter.to);

  const createdWhere = {
    createdAt: { gte: from, lte: to },
  };

  // One batch: created-over-time rows + the per-status totals (covers the
  // byStatus buckets AND the approved/rejected denominators for the approval
  // rate) + decided rows for the average-processing calc.
  const [createdRows, statusRows, decided] = await Promise.all([
    prisma.documentRequest.findMany({
      where: createdWhere,
      select: { createdAt: true },
    }),
    prisma.documentRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.documentRequest.findMany({
      where: { decidedAt: { not: null } },
      select: { createdAt: true, decidedAt: true },
    }),
  ]);

  const createdOverTime = bucketDates(
    createdRows.map((r) => r.createdAt),
    from,
    to,
    filter.granularity,
  );

  const byStatus = mapToCategoryBuckets(
    statusRows as { status: string; _count?: Record<string, number> }[],
    "status",
    REQUEST_STATUSES,
  );

  // Average processing time = mean of (decidedAt - createdAt) over decided
  // rows. Computed in JS because Prisma's aggregate has no _avg over the
  // difference of two columns; decided rows scale with approvals/rejects so the
  // fetch width (two Date columns) stays small.
  let totalMins = 0;
  let decidedCount = 0;
  for (const r of decided) {
    if (!r.decidedAt) continue;
    totalMins += (r.decidedAt.getTime() - r.createdAt.getTime()) / MS_PER_MINUTE;
    decidedCount += 1;
  }
  // approved / rejected totals come straight from the same status groupBy.
  let approved = 0;
  let rejected = 0;
  for (const r of statusRows) {
    const c = (r as { _count?: Record<string, number> })._count?._all ?? 0;
    if (r.status === "APPROVED") approved += c;
    if (r.status === "REJECTED") rejected += c;
  }
  const totalDecided = approved + rejected;
  const averageProcessingTimeMinutes = decidedCount
    ? Math.round((totalMins / decidedCount) * 10) / 10
    : 0;
  const approvalRate = totalDecided ? Math.round((approved / totalDecided) * 1000) / 10 : 0;

  return {
    createdOverTime,
    byStatus,
    processing: {
      averageProcessingTimeMinutes,
      approvalRate,
      totalDecided,
    },
  };
}

// -----------------------------------------------------------------------------
// GET /analytics/aaccup
// -----------------------------------------------------------------------------
export async function getAaccupAnalytics(filter: AnalyticsFilter): Promise<AaccupAnalytics> {
  const { from, to } = defaultRange(filter.granularity, filter.from, filter.to);

  // Submission trend — single findMany selecting submittedAt.
  const submissionWhere = {
    deletedAt: null,
    submittedAt: { gte: from, lte: to },
    ...(filter.departmentId
      ? { requirement: { area: { departmentId: filter.departmentId } } }
      : {}),
    ...(filter.areaId ? { requirement: { areaId: filter.areaId } } : {}),
  };
  const [submissions, areaComplianceRollup] = await Promise.all([
    prisma.aaccupSubmission.findMany({
      where: submissionWhere,
      select: { submittedAt: true, status: true },
    }),
    // Reuse the single source of truth for the area/requirement rollups.
    calculateOverallCompliance({
      departmentId: filter.departmentId,
      areaId: filter.areaId,
    }),
  ]);

  const submissionTrend = bucketDates(
    submissions.map((s) => s.submittedAt),
    from,
    to,
    filter.granularity,
  );

  // Compliance trend: per-bucket ratio of APPROVED submissions to total
  // submissions within the bucket. This mirrors the compliance service's
  // APPROVED→COMPLETED mapping (the COMPLETED rule), aggregated by bucket
  // rather than per-requirement. A bucket with no submissions yields 0.
  const labels = buildEmptySeries(from, to, filter.granularity);
  const approvedPerBucket = new Map<string, number>(labels.map((l) => [l, 0]));
  const totalPerBucket = new Map<string, number>(labels.map((l) => [l, 0]));
  for (const s of submissions) {
    const key = formatBucketKey(startOfBucket(s.submittedAt, filter.granularity), filter.granularity);
    totalPerBucket.set(key, (totalPerBucket.get(key) ?? 0) + 1);
    if (s.status === "APPROVED") approvedPerBucket.set(key, (approvedPerBucket.get(key) ?? 0) + 1);
  }
  const complianceTrend: TimeSeriesPoint[] = labels.map((label) => {
    const total = totalPerBucket.get(label) ?? 0;
    const approved = approvedPerBucket.get(label) ?? 0;
    const pct = total ? Math.round((approved / total) * 1000) / 10 : 0;
    return { label, value: pct };
  });

  // Area completion bands — derived from the compliance rollup.
  const areaCompletionBands = ["0-25", "26-50", "51-75", "76-99", "100"] as const;
  const bandCounts = new Map<string, number>(areaCompletionBands.map((b) => [b, 0]));
  for (const area of areaComplianceRollup.areaBreakdown) {
    const pct = area.compliancePercentage;
    const band =
      pct >= 100 ? "100"
        : pct >= 76 ? "76-99"
        : pct >= 51 ? "51-75"
        : pct >= 26 ? "26-50"
        : "0-25";
    bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
  }
  const areaCompletion: CategoryBucket[] = areaCompletionBands.map((label) => ({
    label,
    value: bandCounts.get(label) ?? 0,
  }));

  // Requirement completion — flat counts from the rollup's statusCounts.
  const requirementCompletion: CategoryBucket[] = REQUIREMENT_STATUSES.map((label) => ({
    label,
    value: areaComplianceRollup.requirementStatusCounts[label] ?? 0,
  }));

  return {
    complianceTrend,
    areaCompletion,
    requirementCompletion,
    submissionTrend,
  };
}

// -----------------------------------------------------------------------------
// GET /analytics/users
// -----------------------------------------------------------------------------
const LOGIN_AUDIT_ACTIONS = ["auth.login.success", "auth.login.failed"] as const;

export async function getUsersAnalytics(filter: AnalyticsFilter): Promise<UsersAnalytics> {
  const { from, to } = defaultRange(filter.granularity, filter.from, filter.to);

  const [newUserRows, activeUserRows, loginRows] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),
    // "Active" = a Session created within the bucket. Session.createdAt is the
    // login timestamp. This is the closest available proxy without a VisitLog
    // table.
    prisma.session.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, userId: true },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: [...LOGIN_AUDIT_ACTIONS] }, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),
  ]);

  const newUsers = bucketDates(
    newUserRows.map((u) => u.createdAt),
    from,
    to,
    filter.granularity,
  );

  // Active users = distinct userIds per bucket.
  const activeUsersLabels = buildEmptySeries(from, to, filter.granularity);
  const activePerBucket = new Map<string, Set<string>>(activeUsersLabels.map((l) => [l, new Set<string>()]));
  for (const s of activeUserRows) {
    const key = formatBucketKey(startOfBucket(s.createdAt, filter.granularity), filter.granularity);
    const set = activePerBucket.get(key);
    if (set) set.add(s.userId);
  }
  const activeUsers: TimeSeriesPoint[] = activeUsersLabels.map((label) => ({
    label,
    value: activePerBucket.get(label)?.size ?? 0,
  }));

  const loginActivity = bucketDates(
    loginRows.map((l) => l.createdAt),
    from,
    to,
    filter.granularity,
  );

  return { newUsers, activeUsers, loginActivity };
}

// -----------------------------------------------------------------------------
// GET /analytics/storage
// -----------------------------------------------------------------------------
export async function getStorageAnalytics(filter: AnalyticsFilter): Promise<StorageAnalytics> {
  const { from, to } = defaultRange(filter.granularity, filter.from, filter.to);

  const [versionRows, sizeAggregate, totalFiles] = await Promise.all([
    prisma.documentVersion.findMany({
      where: { uploadedAt: { gte: from, lte: to } },
      select: { uploadedAt: true, sizeBytes: true },
    }),
    prisma.documentVersion.aggregate({ _sum: { sizeBytes: true } }),
    prisma.documentVersion.count(),
  ]);

  // Bucket sizes by summing BigInt per bucket, then convert to number for the
  // chart (chart values are display-friendly integers; very large buckets may
  // lose precision beyond Number.MAX_SAFE_INTEGER but storage totals in a
  // university DMS will not approach that).
  const labels = buildEmptySeries(from, to, filter.granularity);
  const bytesPerBucket = new Map<string, bigint>(labels.map((l) => [l, 0n]));
  const countPerBucket = new Map<string, number>(labels.map((l) => [l, 0]));
  for (const v of versionRows) {
    const key = formatBucketKey(startOfBucket(v.uploadedAt, filter.granularity), filter.granularity);
    bytesPerBucket.set(key, (bytesPerBucket.get(key) ?? 0n) + v.sizeBytes);
    countPerBucket.set(key, (countPerBucket.get(key) ?? 0) + 1);
  }
  const storageGrowth: TimeSeriesPoint[] = labels.map((label) => ({
    label,
    value: Number(bytesPerBucket.get(label) ?? 0n),
  }));
  const filesOverTime: TimeSeriesPoint[] = labels.map((label) => ({
    label,
    value: countPerBucket.get(label) ?? 0,
  }));

  const totalStorageUsedBytes = (sizeAggregate._sum.sizeBytes ?? BigInt(0)).toString();

  return {
    storageGrowth,
    filesOverTime,
    totalStorageUsedBytes,
    totalFiles,
  };
}
