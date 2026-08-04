import { z } from "zod";

// =============================================================================
// URS-DMS — Reporting Engine validators (Sprint 6.4)
// -----------------------------------------------------------------------------
// Shared filter schema + per report reuse. Every GET /reports/* endpoint
// accepts the same superset of filters and validates them here; the service
// applies each filter only if it is relevant to that report.
//
// Export format selector: `format=json|csv|pdf`. PDF is part of the union so
// the API surface stays stable when a PDF exporter is added in a later sprint,
// but the *export* routes reject `format=pdf` (see reports.controller.ts)
// until the exporter exists. Non-export (default JSON envelope) routes ignore
// the `format` parameter.
// =============================================================================

const optionalUuid = z.string().uuid().optional();
const optionalDate = z.coerce.date().optional();
const optionalTrimmedString = z.string().trim().min(1).max(255).optional();

/**
 * Full filter vocabulary. Individual reports read only the keys they care
 * about — the validator keeps the contract uniform so a single client filter
 * panel can drive all seven endpoints without per-endpoint schema churn.
 */
export const reportFilterSchema = z.object({
  from: optionalDate,
  to: optionalDate,
  departmentId: optionalUuid,
  areaId: optionalUuid,
  status: optionalTrimmedString,
  userId: optionalUuid,
  roleId: optionalUuid,
  documentType: optionalTrimmedString,
  requestType: optionalTrimmedString,
  // Audit-only: exact (case-insensitive) match on AuditLog.entity.
  entity: optionalTrimmedString,

  // Pagination (only used by paginated reports; ignored by unpaginated ones).
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),

  // Export selector (only honoured on GET /reports/<type> after the
  // reports.export permission gate is satisfied).
  format: z.enum(["json", "csv", "pdf"]).default("json"),
});

export type ReportQuery = z.infer<typeof reportFilterSchema>;

/** Known request statuses (Prisma enum) — used for explicit `status` typing. */
export const REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "FULFILLED"] as const;
/** Known document statuses (Prisma enum). */
export const DOCUMENT_STATUSES = ["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"] as const;
/** Known document classifications (Prisma enum). */
export const DOCUMENT_CLASSIFICATIONS = ["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"] as const;
