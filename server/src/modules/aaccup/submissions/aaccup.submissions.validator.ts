import { z } from "zod";

// =============================================================================
// URS-DMS — AACCUP submission validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const submissionIdParamSchema = idParam;

export const listSubmissionsQuerySchema = z.object({
  requirementId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  submittedById: z.string().uuid().optional(),
  reviewedById: z.string().uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"]).optional(),
  isCurrent: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["submittedAt", "createdAt", "updatedAt", "status"])
    .default("submittedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;

export const createSubmissionSchema = z.object({
  requirementId: z.string().uuid(),
  documentId: z.string().uuid(),
  remarks: z.string().trim().max(2000).optional(),
});
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const updateSubmissionSchema = z
  .object({
    remarks: z.string().trim().max(2000).optional(),
  })
  .strict();
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;

export const reviewSubmissionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "NEEDS_REVISION"]),
  remarks: z.string().trim().max(2000).optional(),
});
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
