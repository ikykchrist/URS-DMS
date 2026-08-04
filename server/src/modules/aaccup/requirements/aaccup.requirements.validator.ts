import { z } from "zod";

// =============================================================================
// URS-DMS — AACCUP requirement validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const requirementIdParamSchema = idParam;

export const listRequirementsQuerySchema = z.object({
  areaId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  category: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  isRequired: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["title", "documentCode", "createdAt", "updatedAt", "displayOrder"])
    .default("displayOrder"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type ListRequirementsQuery = z.infer<typeof listRequirementsQuerySchema>;

export const createRequirementSchema = z.object({
  areaId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  documentCode: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "documentCode must contain only letters, digits, dots, underscores, and dashes",
    ),
  category: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  isRequired: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  displayOrder: z.number().int().min(0).default(0),
});
export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;

export const updateRequirementSchema = z
  .object({
    areaId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional(),
    documentCode: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(
        /^[A-Za-z0-9._-]+$/,
        "documentCode must contain only letters, digits, dots, underscores, and dashes",
      )
      .optional(),
    category: z.string().trim().max(100).optional(),
    priority: z.string().trim().max(50).optional(),
    isRequired: z.boolean().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .strict();
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;

export const validateRequirementUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(150),
    sizeBytes: z.coerce.bigint().min(0n),
    pageCount: z.number().int().min(1).max(100_000).optional(),
    expirationDate: z.coerce.date().optional(),
    metadata: z
      .record(z.string(), z.unknown())
      .refine((value) => Object.keys(value).length <= 64, "Metadata is limited to 64 entries")
      .optional(),
  })
  .strict();
export type ValidateRequirementUploadInput = z.infer<typeof validateRequirementUploadSchema>;
