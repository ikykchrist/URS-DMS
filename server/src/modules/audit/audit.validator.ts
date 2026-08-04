import { z } from "zod";

// =============================================================================
// URS-DMS — audit log read/export validators (Sprint 6.3 — Audit Center)
// =============================================================================

const simpleString = z.string().trim().min(1).max(255);

export const auditIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /audit — list + filter + search + sort + paginate.
 *
 * Filters:
 *   userId / roleId / departmentId / module / entity / entityId / action /
 *   status / ipAddress / from / to
 *
 * Search (`q`): matched (case-insensitive) against the user's email +
 * employeeId + name, the action string, the entity label, and the
 * JSON `newValue` payload's text content. Document / area / requirement
 * *names* are reached through the `q` search because the audit `newValue`
 * payload typically carries the human label of the affected entity.
 *
 * Sort:
 *   "newest"  → createdAt desc   (default)
 *   "oldest"  → createdAt asc
 *   "user"    → resolved user lastName asc, then createdAt desc
 *   "action"  → action asc, then createdAt desc
 *   "module"  → action-prefix asc (derived in service), spilling to action
 *
 * `status` filter is accepted here ("SUCCESS" | "FAILED") and expanded to the
 * underlying action codes in the service (success = everything but the
 * failure codes; failure = the LOGIN_FAILED / REFRESH_FAILED / REFRESH_REUSE /
 * PERMISSION_DENIED codes). This lets the Audit Center filter by status
 * without leaking the action-code taxonomy to the client.
 */
export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),

  // Free-text search
  q: simpleString.max(200).optional(),

  // Relational filters (UUIDs / role name)
  userId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),

  // Direct AuditLog column filters
  module: simpleString.optional(),
  entity: simpleString.optional(),
  entityId: z.string().uuid().optional(),
  action: simpleString.optional(),
  status: z.enum(["SUCCESS", "FAILED"]).optional(),
  ipAddress: simpleString.max(64).optional(),

  // Date range (inclusive; ISO strings coerced to Date)
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),

  // Sort
  sort: z
    .enum(["newest", "oldest", "user", "action", "module"])
    .default("newest"),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

/**
 * GET /audit/export — accepts the same filter/search/sort params as GET /audit
 * (the export respects active filters, per spec), plus a `format` selector.
 * Pagination is honoured for the JSON envelope response, but CSV streaming
 * fetches a (bounded) maxRows slice in one query; `maxRows` is capped at 10k
 * to protect the server.
 */
export const exportAuditQuerySchema = listAuditQuerySchema.extend({
  format: z.enum(["csv", "json"]).default("csv"),
  maxRows: z.coerce.number().int().min(1).max(10_000).default(10_000),
});
export type ExportAuditQuery = z.infer<typeof exportAuditQuerySchema>;
