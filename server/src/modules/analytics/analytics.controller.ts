import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import {
  getAaccupAnalytics,
  getRequestsAnalytics,
  getStorageAnalytics,
  getUploadsAnalytics,
  getUsersAnalytics,
} from "@/modules/analytics/analytics.service";
import type { AnalyticsFilter } from "@/modules/analytics/analytics.types";
import type { AnalyticsQuery } from "@/modules/analytics/analytics.validator";

// =============================================================================
// URS-DMS — analytics controller (thin)
// Read-only endpoints; no audit entries per the analytics/trend spec.
// Each handler converts the validated query into an AnalyticsFilter and
// delegates to the service.
// =============================================================================

export async function uploadsHandler(req: Request, res: Response): Promise<void> {
  const filter = toFilter(req);
  const data = await getUploadsAnalytics(filter);
  sendSuccess(res, data);
}

export async function requestsHandler(req: Request, res: Response): Promise<void> {
  const filter = toFilter(req);
  const data = await getRequestsAnalytics(filter);
  sendSuccess(res, data);
}

export async function aaccupHandler(req: Request, res: Response): Promise<void> {
  const filter = toFilter(req);
  const data = await getAaccupAnalytics(filter);
  sendSuccess(res, data);
}

export async function usersHandler(req: Request, res: Response): Promise<void> {
  const filter = toFilter(req);
  const data = await getUsersAnalytics(filter);
  sendSuccess(res, data);
}

export async function storageHandler(req: Request, res: Response): Promise<void> {
  const filter = toFilter(req);
  const data = await getStorageAnalytics(filter);
  sendSuccess(res, data);
}

function toFilter(req: Request): AnalyticsFilter {
  const q = req.query as unknown as AnalyticsQuery;
  // Personal-repository analytics: non-ROOT actors see only their own
  // repository's uploads (platform-wide values belong to the Root Console).
  const permissions = req.auth!.permissions ?? [];
  return {
    granularity: q.granularity,
    from: q.from,
    to: q.to,
    departmentId: q.departmentId,
    areaId: q.areaId,
    ownerId: permissions.includes("root.access") ? undefined : req.auth!.userId,
  };
}
