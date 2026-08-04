// =============================================================================
// URS-DMS — audit log read domain shapes (Sprint 6.3 — Audit Center)
// Read-only API surface for the existing AuditLog table. Nothing about the
// audit WRITE path changes here; these shapes describe only the read/export
// responses.
// =============================================================================

/**
 * Derived success/failure status per audit row. The AuditLog table has no
 * dedicated `status` column — "denied" actions (permission denials, login
 * failures, refresh-reuse) are encoded as distinct action codes. We map those
 * to `FAILED`, everything else to `SUCCESS`, so the Audit Center can show a
 * status pill without re-deriving the rule per row on the client.
 */
export type AuditStatus = "SUCCESS" | "FAILED";

/** Module label derived from an audit action's prefix (e.g. "document.updated" → "document"). */
export type AuditModule = string;

export interface AuditActor {
  /** AuditLog.userId (may be null for anonymous/system actions like a failed login). */
  id: string | null;
  /** Full name resolved from user.firstName + user.lastName; null when userId is null. */
  name: string | null;
  /** Email — included because the Audit Center spec lists "Search by Email". null if anonymous. */
  email: string | null;
  /** RoleName enum value; null when userId is null or the user was hard-purged. */
  role: string | null;
  /** Department id (FK). User.departmentId has no relation field in the schema,
   *  so the Audit Center keeps the scalar — it can resolve the name itself via
   *  the existing departments module / its own department cache. */
  departmentId: string | null;
}

export interface AuditEntityRef {
  /** Free-text entity label (e.g. "document", "user", "aaccup_area"). */
  type: string | null;
  /** UUID of the affected entity. */
  id: string | null;
}

/** Flat list-shape returned by GET /audit. */
export interface AuditLogListItem {
  id: string;
  timestamp: Date;
  action: string;
  module: AuditModule;
  status: AuditStatus;
  user: AuditActor;
  entity: AuditEntityRef;
  ipAddress: string | null;
  userAgent: string | null;
}

/** Detail-shape returned by GET /audit/:id. Adds the change payload (masked). */
export interface AuditLogDetail extends AuditLogListItem {
  /** oldValue / newValue as written by writeAudit(); sensitive keys are masked by the service. */
  changes: {
    oldValue: unknown;
    newValue: unknown;
  };
}

export interface AuditListResult {
  items: AuditLogListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
