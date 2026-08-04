import { z } from "zod";

// =============================================================================
// URS-DMS — Root · Dynamic Folder Builder validators (Sprint 7.4.3)
// -----------------------------------------------------------------------------
// Mirrors the Configuration / Organization engine validator style: `.strict()`
// bodies (unknown fields rejected), trimmed strings with length caps, UUID
// params, coerced pagination. Node metadata is free-form JSON (max 64 keys).
// =============================================================================

const nameSchema = z.string().trim().min(1).max(120);
const templateCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Code must be alphanumeric with dots/underscores/hyphens");
const descriptionSchema = z.string().trim().max(500).nullable().optional();
const shortTextSchema = z.string().trim().max(120).nullable().optional();
const optionalIdSchema = z.string().uuid().nullable().optional();

export const folderTemplateIdParamSchema = z.object({ id: z.string().uuid() });
export type FolderTemplateIdParam = z.infer<typeof folderTemplateIdParamSchema>;

export const folderNodeIdParamSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid(),
});
export type FolderNodeIdParam = z.infer<typeof folderNodeIdParamSchema>;

export const listFolderTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  includeArchived: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});
export type ListFolderTemplatesQuery = z.infer<typeof listFolderTemplatesQuerySchema>;

export const listFolderHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  templateId: z.string().uuid().optional(),
  action: z.enum(["CREATED", "UPDATED", "ASSIGNED", "ARCHIVED", "RESTORED", "ROLLED_BACK"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type ListFolderHistoryQuery = z.infer<typeof listFolderHistoryQuerySchema>;

export const listFolderAssignmentsQuerySchema = z.object({
  templateId: z.string().uuid().optional(),
  targetType: z.enum(["UNIVERSITY", "COLLEGE", "DEPARTMENT", "PROGRAM", "OFFICE", "AACCUP_AREA"]).optional(),
});
export type ListFolderAssignmentsQuery = z.infer<typeof listFolderAssignmentsQuerySchema>;

export const listFolderNodesQuerySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  q: z.string().trim().max(200).optional(),
  includeArchived: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});
export type ListFolderNodesQuery = z.infer<typeof listFolderNodesQuerySchema>;

// -----------------------------------------------------------------------------
// Template create / update
// -----------------------------------------------------------------------------
const templateFields = {
  name: nameSchema,
  code: templateCodeSchema,
  description: descriptionSchema,
  category: shortTextSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  icon: shortTextSchema,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex color like #10B981")
    .nullable()
    .optional(),
};

export const createFolderTemplateSchema = z
  .object({
    ...templateFields,
    nodes: z
      .array(
        z.object({
          name: nameSchema,
          description: descriptionSchema,
          category: shortTextSchema,
          icon: shortTextSchema,
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
        }),
      )
      .max(200)
      .optional(),
  })
  .strict();
export type CreateFolderTemplateBody = z.infer<typeof createFolderTemplateSchema>;

export const updateFolderTemplateSchema = z
  .object({
    name: nameSchema.optional(),
    code: templateCodeSchema.optional(),
    description: descriptionSchema,
    category: shortTextSchema,
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    icon: shortTextSchema,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  })
  .strict();
export type UpdateFolderTemplateBody = z.infer<typeof updateFolderTemplateSchema>;

// -----------------------------------------------------------------------------
// Node create / update / move / duplicate
// -----------------------------------------------------------------------------
const nodeFields = {
  name: nameSchema,
  description: descriptionSchema,
  category: shortTextSchema,
  metadata: z
    .record(z.string(), z.unknown())
    .refine((v) => Object.keys(v).length <= 64, "Metadata is limited to 64 entries")
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  icon: shortTextSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  visibility: z.enum(["VISIBLE", "HIDDEN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
};

export const createFolderNodeSchema = z
  .object({
    ...nodeFields,
    parentId: optionalIdSchema,
  })
  .strict();
export type CreateFolderNodeBody = z.infer<typeof createFolderNodeSchema>;

export const updateFolderNodeSchema = z.object({ ...nodeFields, name: nameSchema.optional() }).strict();
export type UpdateFolderNodeBody = z.infer<typeof updateFolderNodeSchema>;

export const moveFolderNodeSchema = z
  .object({
    parentId: optionalIdSchema,
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();
export type MoveFolderNodeBody = z.infer<typeof moveFolderNodeSchema>;

// -----------------------------------------------------------------------------
// Assignment + rollback
// -----------------------------------------------------------------------------
export const assignFolderTemplateSchema = z
  .object({
    targetType: z.enum(["UNIVERSITY", "COLLEGE", "DEPARTMENT", "PROGRAM", "OFFICE", "AACCUP_AREA"]),
    targetId: optionalIdSchema,
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.targetType === "UNIVERSITY" && val.targetId !== null && val.targetId !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "University assignments must not carry a targetId" });
    }
    if (val.targetType !== "UNIVERSITY" && !val.targetId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `targetId is required for ${val.targetType} assignments` });
    }
  });
export type AssignFolderTemplateBody = z.infer<typeof assignFolderTemplateSchema>;

export const rollbackFolderTemplateSchema = z
  .object({
    templateId: z.string().uuid(),
    version: z.number().int().min(1),
    changeNote: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
export type RollbackFolderTemplateBody = z.infer<typeof rollbackFolderTemplateSchema>;
