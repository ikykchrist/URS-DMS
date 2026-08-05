import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/audit/audit.service";
import type {
  ExportAuditQuery,
  ListAuditQuery,
} from "@/modules/audit/audit.validator";
import type { AuditLogListItem } from "@/modules/audit/audit.types";

// =============================================================================
// URS-DMS — audit center controller (thin)
// `listAuditHandler` and `getAuditHandler` return the standard success
// envelope. `exportAuditHandler` streams a CSV / JSON file directly (bypassing
// the envelope) so the client receives a true download.
// =============================================================================

export async function listAuditHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ListAuditQuery;
  const result = await service.listAudit(q);
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getAuditHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const detail = await service.getAudit(id);
  sendSuccess(res, detail);
}

export async function exportAuditHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ExportAuditQuery;
  const { items, format } = await service.exportAudit(q);

  if (format === "csv") {
    const csv = toCsv(items);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-export-${new Date().toISOString().slice(0, 19)}.csv"`,
    );
    res.status(200).send(csv);
    return;
  }

  // JSON export — raw array (NO envelope) so the file is a clean JSON array
  // the user can re-import or pass to another tool.
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="audit-export-${new Date().toISOString().slice(0, 19)}.json"`,
  );
  res.status(200).json(items);
}

export async function clearAuditHandler(req: Request, res: Response): Promise<void> {
  const cleared = await service.clearAuditLogs(
    req.auth?.userId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, { cleared });
}

// -----------------------------------------------------------------------------
// CSV serialiser — RFC-4180. Fields: a flat view of AuditLogListItem.
// `changes` is JSON-stringified (already masked at the service layer). The
// list shape (used by both /audit and the export) intentionally omits the
// payload, so the CSV reflects the same surface — masking stays consistent
// for both list and detail endpoints.
// -----------------------------------------------------------------------------
const CSV_HEADERS = [
  "id",
  "timestamp",
  "action",
  "module",
  "status",
  "userId",
  "userName",
  "userEmail",
  "userRole",
  "userDepartmentId",
  "entityType",
  "entityId",
  "ipAddress",
  "userAgent",
] as const;

function toCsv(items: AuditLogListItem[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];
  for (const it of items) {
    const fields = [
      it.id,
      it.timestamp.toISOString(),
      it.action,
      it.module,
      it.status,
      it.user.id ?? "",
      it.user.name ?? "",
      it.user.email ?? "",
      it.user.role ?? "",
      it.user.departmentId ?? "",
      it.entity.type ?? "",
      it.entity.id ?? "",
      it.ipAddress ?? "",
      it.userAgent ?? "",
    ];
    rows.push(fields.map(csvEscape).join(","));
  }
  return rows.join("\r\n") + "\r\n";
}

function csvEscape(v: string): string {
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
