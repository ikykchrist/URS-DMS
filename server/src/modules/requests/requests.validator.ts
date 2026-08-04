import { z } from "zod";

// =============================================================================
// URS-DMS — requests validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const requestIdParamSchema = idParam;

export const listRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FULFILLED"]).optional(),
  requesterId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
});
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;

export const createRequestSchema = z.object({
  title: z.string().trim().min(1).max(255),
  justification: z.string().trim().min(1).max(2000),
  documentId: z.string().uuid().nullable().optional(),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const decideRequestSchema = z.object({
  decisionNote: z.string().trim().max(2000).optional(),
});
export type DecideRequestInput = z.infer<typeof decideRequestSchema>;
