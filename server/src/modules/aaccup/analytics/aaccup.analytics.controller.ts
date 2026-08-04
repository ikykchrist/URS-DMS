import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import {
  calculateAreaCompliance,
  calculateDepartmentCompliance,
  calculateOverallCompliance,
  calculateRequirementStatus,
  type AnalyticsFilter,
} from "@/modules/aaccup/services/compliance.service";
import type { OverviewAnalyticsQuery } from "@/modules/aaccup/analytics/aaccup.analytics.validator";

// =============================================================================
// URS-DMS — AACCUP analytics controller (thin)
// Read-only endpoints. Per the sprint spec, no audit log entries are written.
// =============================================================================

export async function overviewAnalyticsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as unknown as OverviewAnalyticsQuery;
  const filter: AnalyticsFilter = {
    departmentId: query.departmentId,
    areaId: query.areaId,
    areaStatus: query.areaStatus,
    minCompliance: query.minCompliance,
    maxCompliance: query.maxCompliance,
    q: query.q,
  };
  const result = await calculateOverallCompliance(filter);
  sendSuccess(res, result);
}

export async function departmentAnalyticsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await calculateDepartmentCompliance(id);
  sendSuccess(res, result);
}

export async function areaAnalyticsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await calculateAreaCompliance(id);
  sendSuccess(res, result);
}

export async function requirementAnalyticsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await calculateRequirementStatus(id);
  sendSuccess(res, result);
}
