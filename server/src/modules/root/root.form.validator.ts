import { z } from "zod";

// =============================================================================
// URS-DMS — Dynamic Form Builder validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const formIdParamSchema = idParam;
export const fieldIdParamSchema = z.object({
  id: z.string().uuid(),
  fieldId: z.string().uuid(),
});

export const listFormsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  includeArchived: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["name", "code", "status", "version", "createdAt", "updatedAt"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type ListFormsQuery = z.infer<typeof listFormsQuerySchema>;

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, "Code must contain only letters, digits, dots, underscores, and dashes");

export const createFormSchema = z
  .object({
    code: codeSchema,
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();
export type CreateFormInput = z.infer<typeof createFormSchema>;

export const updateFormSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
export type UpdateFormInput = z.infer<typeof updateFormSchema>;

// ── Field definitions ────────────────────────────────────────────────────────

export const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "EMAIL",
  "DATE",
  "TIME",
  "DROPDOWN",
  "RADIO",
  "CHECKBOX",
  "MULTI_SELECT",
  "FILE",
  "SECTION",
] as const;

const SELECTION_TYPES: readonly string[] = ["DROPDOWN", "RADIO", "CHECKBOX", "MULTI_SELECT"];

export const formFieldBaseSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9_]+$/, "Field key must be lowercase letters, digits and underscores")
      .optional(),
    label: z.string().trim().min(1).max(255),
    type: z.enum(FIELD_TYPES),
    description: z.string().trim().max(2000).optional(),
    placeholder: z.string().trim().max(255).optional(),
    required: z.boolean().default(false),
    defaultValue: z.unknown().optional(),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(255),
          value: z.string().trim().min(1).max(255),
        }),
      )
      .max(100)
      .optional(),
    validation: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        minLength: z.number().int().min(0).optional(),
        maxLength: z.number().int().min(1).optional(),
        pattern: z.string().trim().max(255).optional(),
        minDate: z.string().trim().max(50).optional(),
        maxDate: z.string().trim().max(50).optional(),
        minItems: z.number().int().min(0).optional(),
        maxItems: z.number().int().min(1).optional(),
        maxSizeBytes: z.number().int().min(1).optional(),
        allowedTypes: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
      })
      .strict()
      .optional(),
    helpText: z.string().trim().max(1000).optional(),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();

export const formFieldSchema = formFieldBaseSchema.superRefine((field, ctx) => {
  if (SELECTION_TYPES.includes(field.type) && (field.options ?? []).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["options"],
      message: "Selection fields require at least one option",
    });
  }
  if (field.type === "SECTION" && field.key === undefined) {
    // SECTION headers may be label-only; a stable key is still required for
    // rendering order — the service derives one when absent.
    return;
  }
});
export type FormFieldInput = z.infer<typeof formFieldSchema>;

export const createFieldSchema = formFieldSchema;
export type CreateFieldInput = z.infer<typeof createFieldSchema>;

export const updateFieldSchema = formFieldBaseSchema.partial().strict();
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;

export const reorderFieldsSchema = z
  .object({
    fieldIds: z.array(z.string().uuid()).min(1).max(500),
  })
  .strict();
export type ReorderFieldsInput = z.infer<typeof reorderFieldsSchema>;

// ── Publish / save / rollback ────────────────────────────────────────────────

export const publishFormSchema = z
  .object({
    changeNote: z.string().trim().max(500).optional(),
  })
  .strict();
export type PublishFormInput = z.infer<typeof publishFormSchema>;

export const saveDraftSchema = z
  .object({
    changeNote: z.string().trim().max(500).optional(),
  })
  .strict();
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

export const rollbackFormSchema = z
  .object({
    version: z.number().int().min(1),
  })
  .strict();
export type RollbackFormInput = z.infer<typeof rollbackFormSchema>;

// ── Assignments ──────────────────────────────────────────────────────────────

export const listAssignmentsQuerySchema = z.object({
  templateId: z.string().uuid().optional(),
  targetType: z.enum(["REQUIREMENT_TEMPLATE", "WORKFLOW_STEP", "AACCUP_AREA", "FOLDER_TEMPLATE", "UNIVERSITY"]).optional(),
  targetId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;

export const createAssignmentSchema = z
  .object({
    targetType: z.enum(["REQUIREMENT_TEMPLATE", "WORKFLOW_STEP", "AACCUP_AREA", "FOLDER_TEMPLATE", "UNIVERSITY"]),
    targetId: z.string().uuid().nullable().optional(),
    priority: z.number().int().min(0).default(0),
  })
  .strict();
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const assignmentIdParamSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
});
