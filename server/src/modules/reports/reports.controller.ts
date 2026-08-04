import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import { BadRequestError } from "@/utils/errors";
import type { ReportQuery } from "@/modules/reports/reports.validator";
import type { ReportFilters } from "@/modules/reports/reports.types";
import {
  aaccupReport,
  auditReport,
  departmentReport,
  documentReport,
  requestReport,
  storageReport,
  userActivityReport,
} from "@/modules/reports/reports.service";

// =============================================================================
// URS-DMS — Reporting Engine controller (thin) — Sprint 6.4
// -----------------------------------------------------------------------------
// Each report exposes TWO handlers, both mounted as GET on /reports/<type>:
//   - the list handler returns the standard JSON envelope
//   - the export handler accepts `?format=csv|json|pdf` and either returns the
//     envelope (json), streams a CSV file (csv), or rejects pdf until an
//     exporter lands in a later sprint.
//
// CSV serialisation is RFC-4180: `\r\n` line terminators, `"` field quoting
// only when a field contains a comma, quote, or newline. The CSV "table" is
// the report's `records` array; nested objects (requirementCounts, ...) are
// emitted as JSON strings inside the cell, mirroring the audit module's CSV
// export convention.
//
// PDF is a reserved format on the API surface (see validator) but the export
// handler refuses it explicitly so a clear 400 surfaces until an exporter
// exists — the API architecture stays unchanged when pdf support drops in.
// =============================================================================

// Map a validated ReportQuery into the ReportFilters + paging tuple the
// services expect. Re-used by every list and export handler.
function toInputs(q: ReportQuery): {
  filters: ReportFilters;
  page: number;
  pageSize: number;
} {
  const filters: ReportFilters = {
    from: q.from,
    to: q.to,
    departmentId: q.departmentId,
    areaId: q.areaId,
    status: q.status,
    userId: q.userId,
    roleId: q.roleId,
    documentType: q.documentType,
    requestType: q.requestType,
  };
  return { filters, page: q.page, pageSize: q.pageSize };
}

// Dispatcher used by every export handler — selects the right service based
// on the report type slug from the route.
async function buildReport(type: string, q: ReportQuery) {
  const { filters, page, pageSize } = toInputs(q);
  switch (type) {
    case "documents":
      return documentReport(filters, page, pageSize);
    case "requests":
      return requestReport(filters, page, pageSize);
    case "aaccup":
      return aaccupReport(filters);
    case "departments":
      return departmentReport(filters);
    case "users":
      return userActivityReport(filters, page, pageSize);
    case "storage":
      return storageReport(filters);
    case "audit":
      return auditReport(filters, page, pageSize);
    default:
      throw new BadRequestError(`Unknown report type: ${type}`);
  }
}

// -----------------------------------------------------------------------------
// JSON list handlers (one per report type for clarity + type-safety in routes).
// All return the standard success envelope.
// -----------------------------------------------------------------------------

export async function documentsListHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const result = await documentReport(toInputs(q).filters, q.page, q.pageSize);
  sendSuccess(res, result);
}

export async function requestsListHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const result = await requestReport(toInputs(q).filters, q.page, q.pageSize);
  sendSuccess(res, result);
}

export async function aaccupListHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const result = await aaccupReport(toInputs(q).filters);
  sendSuccess(res, result);
}

export async function departmentsListHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const result = await departmentReport(toInputs(q).filters);
  sendSuccess(res, result);
}

export async function usersListHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const result = await userActivityReport(toInputs(q).filters, q.page, q.pageSize);
  sendSuccess(res, result);
}

export async function storageListHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const result = await storageReport(toInputs(q).filters);
  sendSuccess(res, result);
}

export async function auditListHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const result = await auditReport(toInputs(q).filters, q.page, q.pageSize);
  sendSuccess(res, result);
}

// -----------------------------------------------------------------------------
// Export handler — single dispatcher handles every /reports/<type>?format=...
// The route mounts this under the reports.export permission.
// -----------------------------------------------------------------------------
export async function reportExportHandler(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ReportQuery;
  const type = req.params.type as string;

  if (q.format === "pdf") {
    // PDF exporter is deferred to a later sprint — refuse explicitly so the
    // API contract stays stable (the format union already includes "pdf").
    throw new BadRequestError("PDF export is not yet implemented", {
      supportedFormats: ["json", "csv"],
    });
  }

  const result = await buildReport(type, q);

  if (q.format === "csv") {
    const csv = toCsv(result.records as unknown as Record<string, unknown>[]);
    const filename = `${type}-report-${new Date().toISOString().slice(0, 19)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csv);
    return;
  }

  // format === "json" — return the full report (the envelope's `data` carries
  // metadata + summary + records + pagination; this is a true download).
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 19)}.json"`,
  );
  res.status(200).json({ success: true, data: result });
}

// -----------------------------------------------------------------------------
// CSV serialiser. Records may have heterogeneous shapes (per report type), so
// headers are derived from the first record's keys. Nested objects/arrays
// become JSON strings inside the cell. Dates are emitted as ISO 8601 strings.
// -----------------------------------------------------------------------------
function toCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "\r\n";
  const first = records[0];
  if (!first) return "\r\n";
  const headers = Object.keys(first);
  const lines: string[] = [headers.join(",")];
  for (const r of records) {
    const fields = headers.map((h) => cellValue(r[h]));
    lines.push(fields.map(csvEscape).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

function cellValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function csvEscape(v: string): string {
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
