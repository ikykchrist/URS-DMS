import { z } from "zod";
import { listAreasQuerySchema } from "../aaccup.validator";
import { listSubmissionsQuerySchema } from "../submissions/aaccup.submissions.validator";

export const areasQuery = listAreasQuerySchema.pick({ page: true, pageSize: true }).extend({
  areaSet: z.enum(["AACCUP", "ISO"]),
});

export const evidenceQuery = listSubmissionsQuerySchema.pick({ page: true, pageSize: true }).extend({
  areaId: z.string().uuid(),
});

export type AreasQuery = z.infer<typeof areasQuery>;
export type EvidenceQuery = z.infer<typeof evidenceQuery>;
