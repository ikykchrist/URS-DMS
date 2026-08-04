import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "Code must be alphanumeric with dots, underscores, or dashes",
  );
const nameSchema = z.string().trim().min(1).max(255);
const nullableDescription = z.string().trim().max(2000).nullable().optional();
const nullableShortText = z.string().trim().max(255).nullable().optional();
const nullableId = z.string().uuid().nullable().optional();
const jsonRecord = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length <= 64, "Metadata is limited to 64 entries");

export const requirementTemplateIdParamSchema = z.object({ id: z.string().uuid() });
export const requirementNodeIdParamSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid(),
});
export const requirementValidationIdParamSchema = z.object({
  id: z.string().uuid(),
  nodeId: z.string().uuid(),
  validationId: z.string().uuid(),
});
export const requirementAssignmentIdParamSchema = z.object({ id: z.string().uuid() });
export const accreditationCycleIdParamSchema = z.object({ id: z.string().uuid() });

export const listRequirementTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  category: z.string().trim().max(255).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type ListRequirementTemplatesQuery = z.infer<typeof listRequirementTemplatesQuerySchema>;

export const listRequirementNodesQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  parentId: z.string().uuid().nullable().optional(),
  type: z.enum(["SECTION", "REQUIREMENT", "SUB_REQUIREMENT", "SUPPORTING_DOCUMENT"]).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type ListRequirementNodesQuery = z.infer<typeof listRequirementNodesQuerySchema>;

export const listRequirementAssignmentsQuerySchema = z.object({
  templateId: z.string().uuid().optional(),
  targetType: z
    .enum([
      "UNIVERSITY",
      "COLLEGE",
      "DEPARTMENT",
      "PROGRAM",
      "OFFICE",
      "AACCUP_AREA",
      "ACCREDITATION_CYCLE",
    ])
    .optional(),
});
export type ListRequirementAssignmentsQuery = z.infer<typeof listRequirementAssignmentsQuerySchema>;

export const listRequirementHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  templateId: z.string().uuid().optional(),
  action: z
    .enum(["CREATED", "UPDATED", "ASSIGNED", "ARCHIVED", "RESTORED", "ROLLED_BACK"])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type ListRequirementHistoryQuery = z.infer<typeof listRequirementHistoryQuerySchema>;

export const createRequirementTemplateSchema = z
  .object({
    name: nameSchema,
    code: codeSchema,
    description: nullableDescription,
    category: nullableShortText,
    metadata: jsonRecord.nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  })
  .strict();
export type CreateRequirementTemplateBody = z.infer<typeof createRequirementTemplateSchema>;

export const updateRequirementTemplateSchema = z
  .object({
    name: nameSchema.optional(),
    code: codeSchema.optional(),
    description: nullableDescription,
    category: nullableShortText,
    metadata: jsonRecord.nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();
export type UpdateRequirementTemplateBody = z.infer<typeof updateRequirementTemplateSchema>;

const requirementNodeFields = {
  code: codeSchema,
  name: nameSchema,
  description: nullableDescription,
  helpText: nullableDescription,
  type: z.enum(["SECTION", "REQUIREMENT", "SUB_REQUIREMENT", "SUPPORTING_DOCUMENT"]),
  metadata: jsonRecord.nullable().optional(),
  isRequired: z.boolean().optional(),
  allowMultiple: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
};

export const createRequirementNodeSchema = z
  .object({ ...requirementNodeFields, parentId: nullableId })
  .strict();
export type CreateRequirementNodeBody = z.infer<typeof createRequirementNodeSchema>;

export const updateRequirementNodeSchema = z
  .object({
    ...requirementNodeFields,
    code: codeSchema.optional(),
    name: nameSchema.optional(),
    type: requirementNodeFields.type.optional(),
  })
  .strict();
export type UpdateRequirementNodeBody = z.infer<typeof updateRequirementNodeSchema>;

export const moveRequirementNodeSchema = z
  .object({
    parentId: nullableId,
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();
export type MoveRequirementNodeBody = z.infer<typeof moveRequirementNodeSchema>;

export const assignRequirementTemplateSchema = z
  .object({
    targetType: z.enum([
      "UNIVERSITY",
      "COLLEGE",
      "DEPARTMENT",
      "PROGRAM",
      "OFFICE",
      "AACCUP_AREA",
      "ACCREDITATION_CYCLE",
    ]),
    targetId: nullableId,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.targetType === "UNIVERSITY" && value.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "University assignments must not carry a targetId",
      });
    }
    if (value.targetType !== "UNIVERSITY" && !value.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `targetId is required for ${value.targetType}`,
      });
    }
  });
export type AssignRequirementTemplateBody = z.infer<typeof assignRequirementTemplateSchema>;

export const rollbackRequirementTemplateSchema = z
  .object({
    templateId: z.string().uuid(),
    version: z.number().int().min(1),
    changeNote: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
export type RollbackRequirementTemplateBody = z.infer<typeof rollbackRequirementTemplateSchema>;

const validationBase = {
  message: z.string().trim().max(500).nullable().optional(),
  severity: z.enum(["ERROR", "WARNING"]).default("ERROR"),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
};

const fileTypeConfig = z
  .object({
    allowedMimeTypes: z.array(z.string().trim().min(1).max(150)).max(50).default([]),
    allowedExtensions: z
      .array(
        z
          .string()
          .trim()
          .regex(/^\.?[A-Za-z0-9]+$/),
      )
      .max(50)
      .default([]),
  })
  .strict()
  .refine(
    (value) => value.allowedMimeTypes.length > 0 || value.allowedExtensions.length > 0,
    "At least one MIME type or extension is required",
  );

const fileSizeConfig = z
  .object({
    minBytes: z.number().int().min(0).optional(),
    maxBytes: z.number().int().positive().max(10_737_418_240).optional(),
  })
  .strict()
  .refine(
    (value) => value.minBytes !== undefined || value.maxBytes !== undefined,
    "Set a minimum or maximum size",
  )
  .refine(
    (value) =>
      value.minBytes === undefined ||
      value.maxBytes === undefined ||
      value.minBytes <= value.maxBytes,
    "minBytes cannot exceed maxBytes",
  );

const pageCountConfig = z
  .object({
    minPages: z.number().int().min(1).optional(),
    maxPages: z.number().int().min(1).max(100_000).optional(),
  })
  .strict()
  .refine(
    (value) => value.minPages !== undefined || value.maxPages !== undefined,
    "Set a minimum or maximum page count",
  )
  .refine(
    (value) =>
      value.minPages === undefined ||
      value.maxPages === undefined ||
      value.minPages <= value.maxPages,
    "minPages cannot exceed maxPages",
  );

const expirationConfig = z
  .object({
    required: z.boolean().default(true),
    minDaysFromNow: z.number().int().min(0).max(36_500).optional(),
    maxDaysFromNow: z.number().int().min(0).max(36_500).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.minDaysFromNow === undefined ||
      value.maxDaysFromNow === undefined ||
      value.minDaysFromNow <= value.maxDaysFromNow,
    "minDaysFromNow cannot exceed maxDaysFromNow",
  );

const namingConfig = z
  .object({
    pattern: z.string().trim().min(1).max(250),
    caseInsensitive: z.boolean().default(false),
    example: z.string().trim().max(255).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    try {
      new RegExp(value.pattern, value.caseInsensitive ? "i" : undefined);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pattern must be a valid regular expression",
      });
    }
  });

const metadataConfig = z
  .object({
    requiredKeys: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
  })
  .strict();

export const createRequirementValidationSchema = z.discriminatedUnion("type", [
  z.object({ ...validationBase, type: z.literal("FILE_TYPE"), config: fileTypeConfig }).strict(),
  z.object({ ...validationBase, type: z.literal("FILE_SIZE"), config: fileSizeConfig }).strict(),
  z.object({ ...validationBase, type: z.literal("PAGE_COUNT"), config: pageCountConfig }).strict(),
  z
    .object({ ...validationBase, type: z.literal("EXPIRATION_DATE"), config: expirationConfig })
    .strict(),
  z
    .object({ ...validationBase, type: z.literal("NAMING_CONVENTION"), config: namingConfig })
    .strict(),
  z.object({ ...validationBase, type: z.literal("METADATA"), config: metadataConfig }).strict(),
]);
export type CreateRequirementValidationBody = z.infer<typeof createRequirementValidationSchema>;
export type UpdateRequirementValidationBody = CreateRequirementValidationBody;

export const validateRequirementUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(150),
    sizeBytes: z.coerce.bigint().min(0n),
    pageCount: z.number().int().min(1).max(100_000).optional(),
    expirationDate: z.coerce.date().optional(),
    metadata: jsonRecord.optional(),
  })
  .strict();
export type ValidateRequirementUploadBody = z.infer<typeof validateRequirementUploadSchema>;

export const listAccreditationCyclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type ListAccreditationCyclesQuery = z.infer<typeof listAccreditationCyclesQuerySchema>;

export const createAccreditationCycleSchema = z
  .object({
    code: codeSchema,
    name: nameSchema,
    description: nullableDescription,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be on or before endDate",
  });
export type CreateAccreditationCycleBody = z.infer<typeof createAccreditationCycleSchema>;

export const updateAccreditationCycleSchema = z
  .object({
    code: codeSchema.optional(),
    name: nameSchema.optional(),
    description: nullableDescription,
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();
export type UpdateAccreditationCycleBody = z.infer<typeof updateAccreditationCycleSchema>;
