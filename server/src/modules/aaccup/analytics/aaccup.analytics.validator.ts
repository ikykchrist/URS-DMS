import { z } from "zod";

// =============================================================================
// URS-DMS — AACCUP analytics validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const departmentIdParamSchema = idParam;
export const areaIdParamSchema = idParam;
export const requirementIdParamSchema = idParam;

export const overviewAnalyticsQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  areaSet: z.enum(["AACCUP", "ISO", "CERT"]).optional(),
  areaStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  minCompliance: z.coerce.number().min(0).max(100).optional(),
  maxCompliance: z.coerce.number().min(0).max(100).optional(),
  q: z.string().trim().max(200).optional(),
});
export type OverviewAnalyticsQuery = z.infer<typeof overviewAnalyticsQuerySchema>;
