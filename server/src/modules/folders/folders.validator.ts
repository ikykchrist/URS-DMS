import { z } from "zod";

// =============================================================================
// URS-DMS — folders validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const folderIdParamSchema = idParam;

export const listFoldersQuerySchema = z.object({
  parentId: z.preprocess(
    (value) => (value === "null" ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  departmentId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
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
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").nullable().optional(),
    icon: z.string().max(50).nullable().optional(),
  })
  .strict();
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

export const copyFolderSchema = z
  .object({
    targetParentId: z.string().uuid().nullable().optional(),
    // Rule 8: folder conflicts on copy — merge into the existing folder,
    // keep_both (suffix the name), or cancel (409).
    conflictMode: z.enum(["merge", "keep_both", "cancel"]).default("keep_both"),
  })
  .strict();
export type CopyFolderInput = z.infer<typeof copyFolderSchema>;

// Restore from recycle bin: explicit destination (null = root), name-conflict
// handling (keep_both suffix / replace existing / cancel) (rule 8/10).
export const restoreFolderSchema = z
  .object({
    targetParentId: z.string().uuid().nullable().optional(),
    conflictMode: z.enum(["keep_both", "replace", "cancel"]).default("keep_both"),
  })
  .strict();
export type RestoreFolderInput = z.infer<typeof restoreFolderSchema>;
