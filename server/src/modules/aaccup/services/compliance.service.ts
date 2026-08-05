import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import type {
  AaccupArea,
  Department,
  Prisma,
} from "@prisma/client";

// =============================================================================
// URS-DMS — AACCUP compliance service (single source of truth)
// -----------------------------------------------------------------------------
// Every consumer of compliance numbers (analytics API, future dashboards,
// reports, AI features) MUST go through this service. Nothing is stored as a
// percentage — all figures are computed live from the database.
//
// Compliance rule for a single Requirement:
//   "Latest submission status" → COMPLETED / PENDING / NEEDS_REVISION /
//   REJECTED; "no submission" → MISSING.
//
// "Latest" = the non-deleted submission with the greatest submittedAt (ties
// broken by createdAt). This deliberately does NOT trust the `isCurrent`
// flag, because reviewers / archivers may flip it; deriving from the
// immutable submittedAt history preserves a stable, auditable definition.
// =============================================================================

export type RequirementStatus =
  | "COMPLETED"
  | "PENDING"
  | "NEEDS_REVISION"
  | "REJECTED"
  | "MISSING";

export interface RequirementCompliance {
  requirementId: string;
  status: RequirementStatus;
  latestSubmissionId: string | null;
  latestSubmissionStatus: string | null;
  latestSubmittedAt: Date | null;
  reviewerId: string | null;
  reviewerName: string | null;
  remarks: string | null;
}

export interface AreaCompliance {
  areaId: string;
  areaCode: string;
  areaName: string;
  departmentId: string;
  requirementCounts: Record<RequirementStatus, number>;
  totalRequirements: number;
  completedRequirements: number;
  compliancePercentage: number;
}

export interface DepartmentCompliance {
  departmentId: string;
  departmentName: string;
  totalAreas: number;
  completedAreas: number;
  incompleteAreas: number;
  // Sum of requirement-level bars across the whole department.
  requirementStatusCounts: Record<RequirementStatus, number>;
  missingDocuments: number;
  pendingReviews: number;
  compliancePercentage: number;
}

export interface OverallCompliance {
  totalDepartments: number;
  totalAreas: number;
  totalRequirements: number;
  requirementStatusCounts: Record<RequirementStatus, number>;
  totalApproved: number;
  totalPending: number;
  totalMissing: number;
  pendingReviews: number;
  compliancePercentage: number;
  areaBreakdown: AreaCompliance[];
}

// Shape pulled in one nested-include query (no N+1).
const COMPLIANCE_GRAPH = {
  requirements: {
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      documentCode: true,
      category: true,
      priority: true,
      isRequired: true,
      status: true,
      displayOrder: true,
      areaId: true,
      submissions: {
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          remarks: true,
          submittedAt: true,
          reviewedAt: true,
          reviewedBy: true,
          reviewedByUser: { select: { firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  },
} satisfies Prisma.AaccupAreaInclude;

const DEPARTMENT_GRAPH = {
  aaccupAreas: {
    where: { deletedAt: null },
    include: COMPLIANCE_GRAPH,
  },
} satisfies Prisma.DepartmentInclude;

interface RawSubmission {
  id: string;
  status: string;
  remarks: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewedByUser: { firstName: string; lastName: string } | null;
}
interface RawRequirement {
  id: string;
  title: string;
  documentCode: string;
  category: string | null;
  priority: string | null;
  isRequired: boolean;
  status: string;
  displayOrder: number;
  areaId: string;
  submissions: RawSubmission[];
}
interface RawArea extends AaccupArea { requirements: RawRequirement[] }
interface RawDepartment extends Department { aaccupAreas: RawArea[] }

const EMPTY_COUNTS = (): Record<RequirementStatus, number> => ({
  COMPLETED: 0,
  PENDING: 0,
  NEEDS_REVISION: 0,
  REJECTED: 0,
  MISSING: 0,
});

function fullName(
  u: { firstName: string; lastName: string } | null,
): string | null {
  return u ? `${u.firstName} ${u.lastName}`.trim() : null;
}

// Pick the latest submission for a requirement by submittedAt (ties → createdAt
// is implicitly preserved by Prisma's per-key ordering for equal keys; we add
// an explicit secondary sort in JS to be safe).
function latestSubmission(
  submissions: RawSubmission[],
): RawSubmission | null {
  if (submissions.length === 0) return null;
  return submissions.reduce<RawSubmission | null>((acc, s) => {
    if (!acc) return s;
    if (s.submittedAt > acc.submittedAt) return s;
    if (s.submittedAt.getTime() === acc.submittedAt.getTime()) {
      // Tie-break: larger createdAt wins (last-written).
      return s.id > acc.id ? s : acc;
    }
    return acc;
  }, null);
}

function submissionStatusToRequirement(
  status: string | null,
): RequirementStatus {
  if (!status) return "MISSING";
  switch (status) {
    case "APPROVED":
      return "COMPLETED";
    case "PENDING":
      return "PENDING";
    case "NEEDS_REVISION":
      return "NEEDS_REVISION";
    case "REJECTED":
      return "REJECTED";
    default:
      return "MISSING";
  }
}

// -----------------------------------------------------------------------------
// calculateRequirementStatus  — single requirement compliance
// -----------------------------------------------------------------------------
export async function calculateRequirementStatus(
  requirementId: string,
): Promise<RequirementCompliance> {
  const requirement = (await prisma.aaccupRequirement.findFirst({
    where: { id: requirementId, deletedAt: null },
    select: {
      id: true,
      submissions: {
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          remarks: true,
          submittedAt: true,
          reviewedAt: true,
          reviewedBy: true,
          reviewedByUser: { select: { firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  })) as { id: string; submissions: RawSubmission[] } | null;

  if (!requirement) throw new NotFoundError("AACCUP requirement not found");

  const latest = latestSubmission(requirement.submissions);
  const status = submissionStatusToRequirement(latest?.status ?? null);
  return {
    requirementId: requirement.id,
    status,
    latestSubmissionId: latest?.id ?? null,
    latestSubmissionStatus: latest?.status ?? null,
    latestSubmittedAt: latest?.submittedAt ?? null,
    reviewerId: latest?.reviewedBy ?? null,
    reviewerName: latest ? fullName(latest.reviewedByUser) : null,
    remarks: latest?.remarks ?? null,
  };
}

// Core rollup shared by area / department / overall.
function rollupArea(area: RawArea): AreaCompliance {
  const counts = EMPTY_COUNTS();
  for (const req of area.requirements) {
    const latest = latestSubmission(req.submissions);
    const s = submissionStatusToRequirement(latest?.status ?? null);
    counts[s] += 1;
  }
  const total = area.requirements.length;
  const completed = counts.COMPLETED;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;
  return {
    areaId: area.id,
    areaCode: area.code,
    areaName: area.name,
    departmentId: area.departmentId,
    requirementCounts: counts,
    totalRequirements: total,
    completedRequirements: completed,
    compliancePercentage: pct,
  };
}

export async function calculateAreaCompliance(
  areaId: string,
): Promise<AreaCompliance> {
  const areas = await prisma.aaccupArea.findMany({
    where: { id: areaId, deletedAt: null },
    include: COMPLIANCE_GRAPH,
  });
  const area = areas[0] as RawArea | undefined;
  if (!area) throw new NotFoundError("AACCUP area not found");
  return rollupArea(area);
}

export async function calculateDepartmentCompliance(
  departmentId: string,
): Promise<DepartmentCompliance> {
  const departments = await prisma.department.findMany({
    where: { id: departmentId, deletedAt: null },
    include: DEPARTMENT_GRAPH,
  });
  const dept = departments[0] as RawDepartment | undefined;
  if (!dept) throw new NotFoundError("Department not found");

  const areas = dept.aaccupAreas;
  const statusCounts = EMPTY_COUNTS();
  let completedAreas = 0;
  let totalReqs = 0;

  for (const area of areas) {
    const rolled = rollupArea(area);
    for (const k of Object.keys(rolled.requirementCounts) as RequirementStatus[]) {
      statusCounts[k] += rolled.requirementCounts[k];
    }
    totalReqs += rolled.totalRequirements;
    // An area "completed" if it has requirements and every one is COMPLETED.
    if (rolled.totalRequirements > 0 && rolled.completedRequirements === rolled.totalRequirements) {
      completedAreas += 1;
    }
  }

  const totalAreas = areas.length;
  const incompleteAreas = totalAreas - completedAreas;
  const completed = statusCounts.COMPLETED;
  const pct =
    totalReqs === 0 ? 0 : Math.round((completed / totalReqs) * 1000) / 10;

  return {
    departmentId: dept.id,
    departmentName: dept.name,
    totalAreas,
    completedAreas,
    incompleteAreas,
    requirementStatusCounts: statusCounts,
    missingDocuments: statusCounts.MISSING,
    pendingReviews: statusCounts.PENDING,
    compliancePercentage: pct,
  };
}

export async function calculateOverallCompliance(
  filter?: AnalyticsFilter,
): Promise<OverallCompliance> {
  // Single nested query: departments → areas → requirements → submissions.
  // Totals (totalAreas / totalRequirements / requirementStatusCounts /
  // compliancePercentage) intentionally reflect the FULL set — filtered out
  // by `areaId` / `areaStatus` only, not by the compliance-range filter.
  // `areaBreakdown`, in contrast, is the FILTERED view (incl. the
  // compliance-range filter), so it may have fewer entries than totalAreas.
  // This is by design: totals == global metrics, breakdown == visible rows.
  // Departments are included even when archived IF they still own live areas
  // (Sprint 7.5 integration fix): a live area must never disappear from
  // compliance just because its parent department was archived. Only
  // departments with no live areas at all are excluded.
  const departments = (await prisma.department.findMany({
    where: {
      OR: [
        { deletedAt: null },
        { aaccupAreas: { some: { deletedAt: null } } },
      ],
    },
    include: DEPARTMENT_GRAPH,
  })) as RawDepartment[];

  // Optional department filter (#1 specialty — handled at the DB layer above).
  const contact = filter?.departmentId
    ? departments.filter((d) => d.id === filter.departmentId)
    : departments;

  const statusCounts = EMPTY_COUNTS();
  let totalAreas = 0;
  let totalReqs = 0;
  const areaBreakdown: AreaCompliance[] = [];

  for (const dept of contact) {
    for (const area of dept.aaccupAreas) {
      // Optional area filter.
      if (filter?.areaId && area.id !== filter.areaId) continue;
      // Optional status filter (area-level derived status).
      if (filter?.areaStatus && area.status !== filter.areaStatus) continue;
      // Optional accreditation set filter (AACCUP / ISO / Certification).
      if (filter?.areaSet && area.areaSet !== filter.areaSet) continue;

      const rolled = rollupArea(area);
      totalAreas += 1;
      totalReqs += rolled.totalRequirements;
      for (const k of Object.keys(rolled.requirementCounts) as RequirementStatus[]) {
        statusCounts[k] += rolled.requirementCounts[k];
      }

      // Compliance-range filter (computed).
      if (filter?.minCompliance !== undefined && rolled.compliancePercentage < filter.minCompliance) {
        continue;
      }
      if (filter?.maxCompliance !== undefined && rolled.compliancePercentage > filter.maxCompliance) {
        continue;
      }
      areaBreakdown.push(rolled);
    }
  }

  const totalApproved = statusCounts.COMPLETED;
  const totalPending = statusCounts.PENDING;
  const totalMissing = statusCounts.MISSING;
  const pct = totalReqs === 0 ? 0 : Math.round((totalApproved / totalReqs) * 1000) / 10;

  return {
    totalDepartments: contact.length,
    totalAreas,
    totalRequirements: totalReqs,
    requirementStatusCounts: statusCounts,
    totalApproved,
    totalPending,
    totalMissing,
    pendingReviews: totalPending,
    compliancePercentage: pct,
    areaBreakdown,
  };
}

// Shared filter type for the analytics query validators.
export interface AnalyticsFilter {
  departmentId?: string;
  areaId?: string;
  areaSet?: "AACCUP" | "ISO" | "CERT";
  areaStatus?: "ACTIVE" | "INACTIVE";
  minCompliance?: number;
  maxCompliance?: number;
  q?: string;
}
