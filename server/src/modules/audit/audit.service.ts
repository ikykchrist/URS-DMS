import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AuditAction } from "@/config/constants";
import { AUDIT_ACTIONS } from "@/config/constants";
import * as repo from "@/modules/audit/audit.repository";
import { FAILED_AUDIT_ACTIONS } from "@/modules/audit/audit.repository";
import type {
  AuditListResult,
  AuditLogDetail,
  AuditLogListItem,
} from "@/modules/audit/audit.types";
import type {
  ExportAuditQuery,
  ListAuditQuery,
} from "@/modules/audit/audit.validator";
import { NotFoundError, BadRequestError } from "@/utils/errors";

// =============================================================================
// URS-DMS — audit log helper (write path) — UNCHANGED from Sprint 2.
// Never throws. Audit writes must not break the request.
// =============================================================================

export interface AuditWrite {
  action: AuditAction;
  userId?: string | null;
  entity?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAudit(entry: AuditWrite): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId ?? null,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        oldValue: (entry.oldValue as object | null) ?? undefined,
        newValue: (entry.newValue as object | null) ?? undefined,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", {
      action: entry.action,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

// =============================================================================
// URS-DMS — audit log read/export service (Sprint 6.3 — Audit Center)
// -----------------------------------------------------------------------------
// Business logic only. The service:
//   1. Builds a typed Prisma AuditLogWhereInput from the validated query.
//   2. Maps the abstract `sort` enum to a Prisma orderBy array (multi-key to
//      keep ordering deterministic for ties).
//   3. Masks sensitive keys inside `newValue` / `oldValue` before they reach
//      the client (defence in depth — the spec forbids leaking passwords,
//      tokens, secrets, refresh tokens, JWTs).
//
// The failed-action catalogue (`FAILED_AUDIT_ACTIONS`) is owned by the
// repository (single source) and re-used here for the `status` filter.
// =============================================================================

const SENSITIVE_KEYS = [
  "password",
  "passwordhash",
  "newpassword",
  "oldpassword",
  "currentpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "jti",
  "jwt",
  "secret",
  "authorization",
  "apikey",
  "api_key",
];
const MASK = "***";

function isJotLike(s: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s);
}

function maskUnknown(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(maskUnknown);
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.includes(k.toLowerCase()) ? MASK : maskUnknown(v);
    }
    return out;
  }
  if (typeof input === "string" && isJotLike(input)) return MASK;
  return input;
}

function maskDetail(detail: AuditLogDetail): AuditLogDetail {
  return {
    ...detail,
    changes: {
      oldValue: maskUnknown(detail.changes.oldValue),
      newValue: maskUnknown(detail.changes.newValue),
    },
  };
}

// -----------------------------------------------------------------------------
// Build the Prisma where
// -----------------------------------------------------------------------------
function buildWhere(q: ListAuditQuery | ExportAuditQuery): Prisma.AuditLogWhereInput {
  // `actionConstraints` collects every filter that targets the `action`
  // column (textual `action`, `module` prefix, `status` failed-success set).
  // Prisma's StringFilter has no `AND` field, so we OR/AND them together at
  // the top level instead of nesting under `where.action`. We keep a
  // composite AND array that is appended to the top-level where.AND below.
  const actionConstraints: Prisma.StringFilter[] = [];
  const where: Prisma.AuditLogWhereInput = {};

  if (q.entityId) where.entityId = q.entityId;
  if (q.ipAddress) where.ipAddress = { contains: q.ipAddress, mode: "insensitive" };
  if (q.entity) where.entity = { equals: q.entity, mode: "insensitive" };
  if (q.action) {
    actionConstraints.push({ contains: q.action, mode: "insensitive" });
  }

  const dateRange: Prisma.DateTimeFilter = {};
  if (q.from) dateRange.gte = q.from;
  if (q.to) dateRange.lte = q.to;
  if (q.from || q.to) where.createdAt = dateRange;

  // Status → action in/notIn the failed-action set.
  if (q.status) {
    actionConstraints.push(
      q.status === "FAILED"
        ? { in: [...FAILED_AUDIT_ACTIONS] }
        : { notIn: [...FAILED_AUDIT_ACTIONS] },
    );
  }

  // Module → action prefix match ("document" matches "document.created" etc.).
  if (q.module) {
    const prefix = q.module.endsWith(".") ? q.module : `${q.module}.`;
    actionConstraints.push({ startsWith: prefix, mode: "insensitive" });
  }

  // Compress the action constraints down into a single StringFilter applied to
  // `where.action`. With zero constraints we leave `action` unset; with one we
  // set it directly; with more than one we AND them at top level (since
  // StringFilter has no AND field).
  if (actionConstraints.length === 1) {
    where.action = actionConstraints[0];
  } else if (actionConstraints.length > 1) {
    where.AND = actionConstraints.map((ac) => ({ action: ac }));
  }

  // -- Relational filters ---------------------------------------------------
  const userFilter: Prisma.UserWhereInput = {};
  if (q.userId) userFilter.id = q.userId;
  if (q.roleId) userFilter.roleId = q.roleId;
  if (q.departmentId) userFilter.departmentId = q.departmentId;

  if (q.q) {
    const t = q.q;
    // Free-text search across the user's identifiable fields. AuditLog.user is
    // optional (anonymous rows like a failed login), so the user-search branch
    // is kept inside an OR against the audit-column search branches — rows
    // without a user still match non-user terms.
    const userSearch: Prisma.UserWhereInput = {
      OR: [
        { email: { contains: t, mode: "insensitive" } },
        { employeeId: { contains: t, mode: "insensitive" } },
        { firstName: { contains: t, mode: "insensitive" } },
        { lastName: { contains: t, mode: "insensitive" } },
      ],
    };
    if (Object.keys(userFilter).length > 0) {
      userFilter.AND = [userSearch];
    } else {
      Object.assign(userFilter, userSearch);
    }

    // AuditLog-column search branches: action, entity, and JSON payload text
    // (Postgres `string_contains` — case-insensitive). Document / area /
    // requirement *names* are reachable here because writeAudit's `newValue`
    // payload typically carries the human label of the affected entity (see
    // any writeAudit call in the codebase).
    const auditSearch: Prisma.AuditLogWhereInput = {
      OR: [
        { action: { contains: t, mode: "insensitive" } },
        { entity: { contains: t, mode: "insensitive" } },
        { newValue: { string_contains: t } },
        { oldValue: { string_contains: t } },
      ],
    };

    where.OR = [auditSearch, { user: userFilter }];
  } else if (Object.keys(userFilter).length > 0) {
    where.user = userFilter;
  }

  return where;
}

// -----------------------------------------------------------------------------
// Build the Prisma orderBy
// -----------------------------------------------------------------------------
function buildOrderBy(
  q: Pick<ListAuditQuery, "sort">,
): Prisma.AuditLogOrderByWithRelationInput[] {
  switch (q.sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "user":
      return [{ user: { lastName: "asc" } }, { createdAt: "desc" }, { id: "desc" }];
    case "action":
      return [{ action: "asc" }, { createdAt: "desc" }, { id: "desc" }];
    case "module":
      // "module" is derived only in the DTO (action prefix) — sorting on
      // `action` asc yields the same group ordering.
      return [{ action: "asc" }, { createdAt: "desc" }, { id: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

// -----------------------------------------------------------------------------
// Public service API
// -----------------------------------------------------------------------------
export async function listAudit(q: ListAuditQuery): Promise<AuditListResult> {
  const where = buildWhere(q);
  const orderBy = buildOrderBy(q);
  const { items, total } = await repo.list(where, q.page, q.pageSize, orderBy);
  return {
    items,
    meta: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    },
  };
}

export async function getAudit(id: string): Promise<AuditLogDetail> {
  const detail = await repo.findById(id);
  if (!detail) throw new NotFoundError("Audit log not found");
  return maskDetail(detail);
}

export async function exportAudit(
  q: ExportAuditQuery,
): Promise<{ items: AuditLogListItem[]; format: "csv" | "json" }> {
  if (q.format !== "csv" && q.format !== "json") {
    throw new BadRequestError("Unsupported export format");
  }
  const where = buildWhere(q);
  const orderBy = buildOrderBy(q);
  const items = await repo.findManyForExport(where, orderBy, q.maxRows);
  return { items, format: q.format };
}

/**
 * Admin-only destructive action. Deletes every audit row and leaves a single
 * record behind (written AFTER the wipe) documenting who cleared the logs and
 * how many rows were removed, so the destructive act itself stays on the trail.
 */
export async function clearAuditLogs(
  userId: string | undefined,
  ipAddress: string,
  userAgent: string,
): Promise<number> {
  const cleared = await repo.clearAll();
  await writeAudit({
    action: AUDIT_ACTIONS.AUDIT_LOGS_CLEARED,
    userId: userId ?? null,
    newValue: { cleared },
    ipAddress,
    userAgent,
  });
  return cleared;
}
