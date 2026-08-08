import { z } from "zod";

// =============================================================================
// URS-DMS — AACCUP task validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const taskIdParamSchema = idParam;

export const listTasksQuerySchema = z.object({
  areaId: z.string().uuid().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeType: z.enum(["USER", "DEPARTMENT"]).optional(),
  mine: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["title", "status", "priority", "dueDate", "createdAt", "updatedAt"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const createTaskSchema = z
  .object({
    areaId: z.string().uuid(),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional(),
    category: z.string().trim().max(100).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    dueDate: z.coerce.date().nullable().optional(),
    requirementId: z.string().uuid().nullable().optional(),
    assigneeType: z.enum(["USER", "DEPARTMENT"]).default("USER"),
    assigneeId: z.string().trim().min(1).max(100),
  })
  .strict();
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional(),
    category: z.string().trim().max(100).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    requirementId: z.string().uuid().nullable().optional(),
    assigneeType: z.enum(["USER", "DEPARTMENT"]).optional(),
    assigneeId: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;