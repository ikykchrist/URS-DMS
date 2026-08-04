import { z } from "zod";

// =============================================================================
// URS-DMS — folders validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const folderIdParamSchema = idParam;

export const listFoldersQuerySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().default(false),
});
export type ListFoldersQuery = z.infer<typeof listFoldersQuerySchema>;

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    parentId: z.string().uuid().nullable().optional(),
    departmentId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
