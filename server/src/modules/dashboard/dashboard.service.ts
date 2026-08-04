import { prisma } from "@/lib/prisma";
import { calculateOverallCompliance } from "@/modules/aaccup/services/compliance.service";
import type {
  AaccupStats,
  DashboardOverview,
  DocumentStats,
  RequestStats,
  StorageStats,
  UserStats,
} from "@/modules/dashboard/dashboard.types";

// =============================================================================
// URS-DMS — dashboard statistics service
// -----------------------------------------------------------------------------
// Read-only aggregations. Every figure is computed LIVE from the database —
// no mock data, no cached percentages.
//
// Performance strategy:
//   - Use `prisma.<model>.count({ where })` for counts (compiles to a single
//     server-side SQL COUNT(*) + WHERE — no row transfer).
//   - Use `groupBy({ by: ['status'], _count: true })` for per-status buckets
//     so the request/status sections need exactly ONE query each, not N.
//   - Use `aggregate({ _sum: { sizeBytes } })` for the storage total (BigInt
//     sum executed in SQL — only the scalar comes back).
//   - Date math (today / start-of-week / start-of-month) is computed ONCE in
//     JS, then reused across the three document-bucket counts.
//
// AACCUP compliance goes through `calculateOverallCompliance()` from the
// compliance service — the single source of truth mandated in Sprint 5.4 —
// so the dashboard NEVER re-implements compliance business logic.
// =============================================================================

// -----------------------------------------------------------------------------
// Date helpers (computed once per request, reused across counts)
// -----------------------------------------------------------------------------
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  // ISO week: Monday as the first day.
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // back-to-Monday offset
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Reverse a Prisma groupBy({ by: ["status"], _count: { _all: true } }) result
// into a Record<statusValue, number>. Falls back to 0 for any missing status.
function bucketByStatus<T extends string>(
  rows: { status: T; [k: string]: unknown }[],
  known: readonly T[],
): Record<T, number> {
  const out: Record<T, number> = {} as Record<T, number>;
  for (const k of known) out[k] = 0;
  for (const r of rows) {
    const c = (r as { _count?: Record<string, number> })._count?._all;
    out[r.status] = typeof c === "number" ? c : 0;
  }
  return out;
}

const REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "FULFILLED"] as const;
const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"] as const;

// -----------------------------------------------------------------------------
// getDocumentStats
// -----------------------------------------------------------------------------
export async function getDocumentStats(): Promise<DocumentStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // All four counts run in parallel — one round-trip batch.
  const [totalDocuments, archivedDocuments, uploadedToday, uploadedThisWeek, uploadedThisMonth] =
    await Promise.all([
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: { not: null } } }),
      prisma.document.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.document.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.document.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

  // "Active" = non-archived (logical lifecycle), independent of soft-delete.
  // totalDocuments above already excludes soft-deleted rows; "active" here is
  // the count of non-soft-deleted documents (i.e. visible in the repository).
  const activeDocuments = totalDocuments;

  return {
    totalDocuments,
    activeDocuments,
    archivedDocuments,
    uploadedToday,
    uploadedThisWeek,
    uploadedThisMonth,
  };
}

// -----------------------------------------------------------------------------
// getUserStats
// -----------------------------------------------------------------------------
export async function getUserStats(): Promise<UserStats> {
  const [totalUsers, activeUsers, administrators, departmentUsers] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: { deletedAt: null, status: "ACTIVE" },
      }),
      // "Administrators" = users on the ADMINISTRATOR role. RBAC is
      // permission-driven everywhere else, but for a roll-up statistic the
      // role dimension is the only sensible count.
      prisma.user.count({
        where: {
          deletedAt: null,
          role: { name: "ADMINISTRATOR" },
        },
      }),
      // "Department users" = users assigned to a department (departmentId set)
      // and not soft-deleted.
      prisma.user.count({
        where: {
          deletedAt: null,
          NOT: { departmentId: null },
        },
      }),
    ]);

  return {
    totalUsers,
    activeUsers,
    administrators,
    departmentUsers,
  };
}

// -----------------------------------------------------------------------------
// getRequestStats
// Spec lists: Total / Pending / Approved / Rejected / Processing.
// "Processing" maps to FULFILLED in the existing RequestStatus enum — a
// request that has been approved + fulfilled is "in processing / done".
// -----------------------------------------------------------------------------
export async function getRequestStats(): Promise<RequestStats> {
  const [totalRequests, statusRows] = await Promise.all([
    prisma.documentRequest.count(),
    prisma.documentRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const buckets = bucketByStatus(
    statusRows as { status: (typeof REQUEST_STATUSES)[number]; _count?: Record<string, number> }[],
    REQUEST_STATUSES,
  );

  return {
    totalRequests,
    pending: buckets.PENDING,
    approved: buckets.APPROVED,
    rejected: buckets.REJECTED,
    fulfilled: buckets.FULFILLED,
  };
}

// -----------------------------------------------------------------------------
// getAaccupStats
// Reuses the compliance service (single source of truth) for the compliance
// percentage + requirement-status counts. Submissions counts come from a
// single groupBy on the submission table.
// -----------------------------------------------------------------------------
export async function getAaccupStats(): Promise<AaccupStats> {
  const [overall, totalAreas, totalRequirements, submissionStatusRows, totalSubmissions] =
    await Promise.all([
      // Single source of truth for compliance numbers — never reimplemented.
      calculateOverallCompliance(),
      prisma.aaccupArea.count({ where: { deletedAt: null } }),
      prisma.aaccupRequirement.count({ where: { deletedAt: null } }),
      prisma.aaccupSubmission.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
      prisma.aaccupSubmission.count({ where: { deletedAt: null } }),
    ]);

  const buckets = bucketByStatus(
    submissionStatusRows as {
      status: (typeof SUBMISSION_STATUSES)[number];
      _count?: Record<string, number>;
    }[],
    SUBMISSION_STATUSES,
  );

  return {
    totalAreas,
    totalRequirements,
    totalSubmissions,
    approved: buckets.APPROVED,
    pending: buckets.PENDING,
    needsRevision: buckets.NEEDS_REVISION,
    rejected: buckets.REJECTED,
    // High-level compliance percentage comes from the compliance service so the
    // dashboard always reports the same number as /aaccup/analytics/overview.
    overallCompliancePercentage: overall.compliancePercentage,
  };
}

// -----------------------------------------------------------------------------
// getStorageStats
// Total storage used = sum of DocumentVersion.sizeBytes across ALL versions
// (every version occupies physical space in MinIO). Available storage is
// NULL because MinIO has no configured quota — see known issue in the sprint
// report. numberOfFiles counts individual object versions.
// -----------------------------------------------------------------------------
export async function getStorageStats(): Promise<StorageStats> {
  const [sizeAggregate, numberOfFiles] = await Promise.all([
    prisma.documentVersion.aggregate({
      _sum: { sizeBytes: true },
      // Exclude versions of soft-deleted documents? No — physical object still
      // consumes storage until a GC pass removes it (GC not yet implemented,
      // repo known issue #14). So we sum ALL versions for an accurate total.
    }),
    prisma.documentVersion.count(),
  ]);

  const totalBytes = sizeAggregate._sum.sizeBytes ?? BigInt(0);

  return {
    totalStorageUsedBytes: totalBytes.toString(),
    availableStorageBytes: null,
    numberOfFiles,
  };
}

// -----------------------------------------------------------------------------
// getOverview
// Aggregates the five sub-sections in parallel.
// -----------------------------------------------------------------------------
export async function getOverview(): Promise<DashboardOverview> {
  const [documents, users, requests, aaccup, storage] = await Promise.all([
    getDocumentStats(),
    getUserStats(),
    getRequestStats(),
    getAaccupStats(),
    getStorageStats(),
  ]);

  return { documents, users, requests, aaccup, storage };
}
