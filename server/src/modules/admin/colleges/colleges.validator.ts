import { z } from "zod";

// =============================================================================
// URS-DMS — Admin · Colleges validators (Sprint 7.1)
// -----------------------------------------------------------------------------
// Shared filter + pagination validator for the admin list endpoint; the
// create / update / archive / restore endpoints use tighter per-route
// schemas.
// =============================================================================

const optionalTrimmedString = z.string().trim().min(1).max(255).optional();

export const collegeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const collegeListQuerySchema = z.object({
  q: optionalTrimmedString,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  includeArchived: z.coerce.boolean().default(false),
});
export type CollegeListQuery = z.infer<typeof collegeListQuerySchema>;

export const createCollegeSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().min(1).max(64),
  description: z.string().trim().max(1000).optional().nullable(),
});
export type CreateCollegeBody = z.infer<typeof createCollegeSchema>;

export const updateCollegeSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();
export type UpdateCollegeBody = z.infer<typeof updateCollegeSchema>;
