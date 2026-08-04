import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Code must be alphanumeric with dots, underscores, or dashes");
const actionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Action code must be alphanumeric with dots, underscores, or dashes");
const nameSchema = z.string().trim().min(1).max(255);
const nullableDescription = z.string().trim().max(2000).nullable().optional();
const nullableShortText = z.string().trim().max(255).nullable().optional();
const nullableUuid = z.string().uuid().nullable().optional();
const jsonRecord = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length <= 64, "Metadata is limited to 64 entries");

export const workflowDefinitionIdParamSchema = z.object({ id: z.string().uuid() });
export const workflowStepIdParamSchema = z.object({ id: z.string().uuid(), stepId: z.string().uuid() });
export const workflowTransitionIdParamSchema = z.object({
  id: z.string().uuid(),
  transitionId: z.string().uuid(),
});
export const workflowAssignmentIdParamSchema = z.object({ id: z.string().uuid() });
export const workflowInstanceIdParamSchema = z.object({ id: z.string().uuid() });
export const runtimeEntityParamSchema = z.object({
  entityType: z.enum(["DOCUMENT_REQUEST", "AACCUP_SUBMISSION", "DOCUMENT"]),
  entityId: z.string().uuid(),
});

export const listWorkflowDefinitionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  q: z.string().trim().max(200).optional(),
  entityType: z.enum(["DOCUMENT_REQUEST", "AACCUP_SUBMISSION", "DOCUMENT"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type ListWorkflowDefinitionsQuery = z.infer<typeof listWorkflowDefinitionsQuerySchema>;

export const listWorkflowAssignmentsQuerySchema = z.object({
  definitionId: z.string().uuid().optional(),
  targetType: z
    .enum(["UNIVERSITY", "COLLEGE", "DEPARTMENT", "PROGRAM", "OFFICE", "AACCUP_AREA", "ACCREDITATION_CYCLE"])
    .optional(),
});
export type ListWorkflowAssignmentsQuery = z.infer<typeof listWorkflowAssignmentsQuerySchema>;

export const listWorkflowHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  definitionId: z.string().uuid().optional(),
  action: z
    .enum(["CREATED", "UPDATED", "VALIDATED", "PUBLISHED", "ASSIGNED", "UNASSIGNED", "ARCHIVED", "RESTORED", "ROLLED_BACK"])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type ListWorkflowHistoryQuery = z.infer<typeof listWorkflowHistoryQuerySchema>;

export const listWorkflowInstancesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  entityType: z.enum(["DOCUMENT_REQUEST", "AACCUP_SUBMISSION", "DOCUMENT"]).optional(),
  entityId: z.string().uuid().optional(),
  status: z.enum(["RUNNING", "COMPLETED", "TERMINATED"]).optional(),
  definitionId: z.string().uuid().optional(),
});
export type ListWorkflowInstancesQuery = z.infer<typeof listWorkflowInstancesQuerySchema>;

export const createWorkflowDefinitionSchema = z
  .object({
    name: nameSchema,
    code: codeSchema,
    description: nullableDescription,
    entityType: z.enum(["DOCUMENT_REQUEST", "AACCUP_SUBMISSION", "DOCUMENT"]),
    metadata: jsonRecord.nullable().optional(),
  })
  .strict();
export type CreateWorkflowDefinitionBody = z.infer<typeof createWorkflowDefinitionSchema>;

export const updateWorkflowDefinitionSchema = z
  .object({
    name: nameSchema.optional(),
    code: codeSchema.optional(),
    description: nullableDescription,
    entityType: z.enum(["DOCUMENT_REQUEST", "AACCUP_SUBMISSION", "DOCUMENT"]).optional(),
    metadata: jsonRecord.nullable().optional(),
  })
  .strict();
export type UpdateWorkflowDefinitionBody = z.infer<typeof updateWorkflowDefinitionSchema>;

export const createWorkflowStepSchema = z
  .object({
    code: codeSchema,
    name: nameSchema,
    description: nullableDescription,
    type: z.enum(["START", "TASK", "REVIEW", "APPROVAL", "END"]),
    roleName: nullableShortText,
    permissionCode: nullableShortText,
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    metadata: jsonRecord.nullable().optional(),
  })
  .strict();
export type CreateWorkflowStepBody = z.infer<typeof createWorkflowStepSchema>;

export const updateWorkflowStepSchema = z
  .object({
    code: codeSchema.optional(),
    name: nameSchema.optional(),
    description: nullableDescription,
    type: z.enum(["START", "TASK", "REVIEW", "APPROVAL", "END"]).optional(),
    roleName: nullableShortText,
    permissionCode: nullableShortText,
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    metadata: jsonRecord.nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();
export type UpdateWorkflowStepBody = z.infer<typeof updateWorkflowStepSchema>;

export const createWorkflowTransitionSchema = z
  .object({
    fromStepId: z.string().uuid(),
    toStepId: z.string().uuid(),
    actionCode: actionCodeSchema,
    requiredPermission: nullableShortText,
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    metadata: jsonRecord.nullable().optional(),
  })
  .strict();
export type CreateWorkflowTransitionBody = z.infer<typeof createWorkflowTransitionSchema>;

export const updateWorkflowTransitionSchema = z
  .object({
    toStepId: z.string().uuid().optional(),
    actionCode: actionCodeSchema.optional(),
    requiredPermission: nullableShortText,
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    metadata: jsonRecord.nullable().optional(),
  })
  .strict();
export type UpdateWorkflowTransitionBody = z.infer<typeof updateWorkflowTransitionSchema>;

export const assignWorkflowDefinitionSchema = z
  .object({
    targetType: z.enum(["UNIVERSITY", "COLLEGE", "DEPARTMENT", "PROGRAM", "OFFICE", "AACCUP_AREA", "ACCREDITATION_CYCLE"]),
    targetId: nullableUuid,
    priority: z.number().int().min(-1000).max(1000).optional(),
  })
  .strict();
export type AssignWorkflowDefinitionBody = z.infer<typeof assignWorkflowDefinitionSchema>;

export const validateWorkflowDefinitionSchema = z.object({}).strict();
export type ValidateWorkflowDefinitionBody = z.infer<typeof validateWorkflowDefinitionSchema>;

export const publishWorkflowDefinitionSchema = z
  .object({
    changeNote: z.string().trim().max(2000).optional(),
  })
  .strict();
export type PublishWorkflowDefinitionBody = z.infer<typeof publishWorkflowDefinitionSchema>;

export const rollbackWorkflowDefinitionSchema = z
  .object({
    version: z.number().int().min(1),
    changeNote: z.string().trim().max(2000).optional(),
  })
  .strict();
export type RollbackWorkflowDefinitionBody = z.infer<typeof rollbackWorkflowDefinitionSchema>;

export const performWorkflowActionSchema = z
  .object({
    actionCode: actionCodeSchema,
    note: z.string().trim().max(2000).optional(),
  })
  .strict();
export type PerformWorkflowActionBody = z.infer<typeof performWorkflowActionSchema>;

export const overrideWorkflowInstanceSchema = z
  .object({
    action: z.enum(["COMPLETE", "TERMINATE"]),
    note: z.string().trim().max(2000).optional(),
  })
  .strict();
export type OverrideWorkflowInstanceBody = z.infer<typeof overrideWorkflowInstanceSchema>;
