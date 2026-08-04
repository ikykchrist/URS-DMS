import { z } from "zod";

// =============================================================================
// URS-DMS — Admin · Departments validators (Sprint 7.1)
// -----------------------------------------------------------------------------
// Shared filter + pagination validator for the admin list endpoint; the create
// / update / archive / restore endpoints use tighter per-route schemas.
// =============================================================================

const optionalTrimmedString = z.string().trim().min(1).max(255).optional();
const optionalUuid = z.string().uuid().optional();

export const departmentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const departmentListQuerySchema = z.object({
  q: optionalTrimmedString,
  collegeId: optionalUuid,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  includeArchived: z.coerce.boolean().default(false),
});
export type DepartmentListQuery = z.infer<typeof departmentListQuerySchema>;

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().min(1).max(64),
  description: z.string().trim().max(1000).optional().nullable(),
  headId: z.string().uuid().optional().nullable(),
  collegeId: z.string().uuid().optional().nullable(),
});
export type CreateDepartmentBody = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  headId: z.string().uuid().optional().nullable(),
  collegeId: z.string().uuid().optional().nullable(),
});
export type UpdateDepartmentBody = z.infer<typeof updateDepartmentSchema>;
