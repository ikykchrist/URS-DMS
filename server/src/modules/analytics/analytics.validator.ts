import { z } from "zod";
import { validateQuery } from "@/middlewares/validate";

// =============================================================================
// URS-DMS — analytics query validator (Sprint 6.2)
// Shared by all five /analytics/* endpoints. Coerces `from` / `to` to Date
// and validates UUIDs for the optional scope filters.
// =============================================================================

export const analyticsQuerySchema = z.object({
  granularity: z
    .enum(["daily", "weekly", "monthly", "yearly"])
    .default("monthly"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  departmentId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

// Re-export the Express validateQuery helper bound to our schema, so route
// files can import everything from one place. Matches the AACCUP analytics
// validator pattern (schema + type co-located, route file stays thin).
export const analyticsQueryValidator = validateQuery(analyticsQuerySchema);
