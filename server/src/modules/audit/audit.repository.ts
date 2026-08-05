import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  AuditLogDetail,
  AuditLogListItem,
} from "@/modules/audit/audit.types";

// =============================================================================
// URS-DMS — audit log repository (data access)
// Sprint 6.3 exposes the existing AuditLog table (append-only, never mutated
// through this module). All joins go through a single Prisma include so a list
// query is one round-trip, not N+1 for the actor's role/department.
// `clearAll` is the one deliberate mutation — gate the admin "Clear Logs" action.
// =============================================================================

const AUDIT_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      // departmentId is a scalar on User — there's no `department` relation
      // field, so we expose the FK directly. The Audit Center resolves it to a
      // name client-side via the departments module if needed.
      departmentId: true,
      role: { select: { name: true } },
    },
  },
} satisfies Prisma.AuditLogInclude;

type AuditRow = Prisma.AuditLogGetPayload<{ include: typeof AUDIT_INCLUDE }>;

/**
 * Catalogue of action codes that represent *failed* acts (login failed,
 * refresh failed, refresh reuse, permission denied). Kept here as the single
 * source so both the row→DTO mapping and the service-level status filter can
 * reference the same set without duplicating literals.
 */
export const FAILED_AUDIT_ACTIONS: readonly string[] = [
  "auth.login.failed",
  "auth.refresh.failed",
  "auth.refresh.reuse_detected",
  "auth.permission_denied",
] as const;

const FAILED_ACTIONS = new Set<string>(FAILED_AUDIT_ACTIONS);

function fullName(u: { firstName: string; lastName: string } | null): string | null {
  if (!u) return null;
  return `${u.firstName} ${u.lastName}`.trim() || null;
}

// Module label = substring of the action before the first ".". Pure string
// operation on the action literal, so it lives in the row→DTO mapping layer.
function deriveModule(action: string): string {
  const i = action.indexOf(".");
  return i === -1 ? action : action.slice(0, i);
}

function deriveStatus(action: string): "SUCCESS" | "FAILED" {
  return FAILED_ACTIONS.has(action) ? "FAILED" : "SUCCESS";
}

function toListItem(row: AuditRow): AuditLogListItem {
  const u = row.user;
  return {
    id: row.id,
    timestamp: row.createdAt,
    action: row.action,
    module: deriveModule(row.action),
    status: deriveStatus(row.action),
    user: {
      id: u?.id ?? null,
      name: fullName(u),
      email: u?.email ?? null,
      role: u?.role?.name ?? null,
      departmentId: u?.departmentId ?? null,
    },
    entity: { type: row.entity, id: row.entityId },
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
  };
}

function toDetail(row: AuditRow): AuditLogDetail {
  return {
    ...toListItem(row),
    changes: { oldValue: row.oldValue, newValue: row.newValue },
  };
}

export async function list(
  where: Prisma.AuditLogWhereInput,
  page: number,
  pageSize: number,
  orderBy: Prisma.AuditLogOrderByWithRelationInput[],
): Promise<{ items: AuditLogListItem[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: AUDIT_INCLUDE,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items: rows.map(toListItem), total };
}

export async function findById(id: string): Promise<AuditLogDetail | null> {
  const row = await prisma.auditLog.findUnique({
    where: { id },
    include: AUDIT_INCLUDE,
  });
  return row ? toDetail(row) : null;
}

export async function findManyForExport(
  where: Prisma.AuditLogWhereInput,
  orderBy: Prisma.AuditLogOrderByWithRelationInput[],
  maxRows: number,
): Promise<AuditLogListItem[]> {
  const rows = await prisma.auditLog.findMany({
    where,
    include: AUDIT_INCLUDE,
    orderBy,
    take: maxRows,
  });
  return rows.map(toListItem);
}

/** Delete every audit row. Returns the number of rows removed. */
export async function clearAll(): Promise<number> {
  const result = await prisma.auditLog.deleteMany({});
  return result.count;
}
