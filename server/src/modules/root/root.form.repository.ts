import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  FormAssignmentView,
  FormFieldView,
  FormTemplateDetail,
  FormTemplateListItem,
  FormVersionView,
} from "@/modules/root/root.form.types";

// =============================================================================
// URS-DMS — Dynamic Form Builder repository
// =============================================================================

const TEMPLATE_INCLUDE = {
  createdByUser: { select: { firstName: true, lastName: true } },
  updatedByUser: { select: { firstName: true, lastName: true } },
  _count: {
    select: { fields: { where: { deletedAt: null } }, assignments: { where: { deletedAt: null } } },
  },
} satisfies Prisma.FormTemplateInclude;

type TemplateWithRelations = Prisma.FormTemplateGetPayload<{
  include: typeof TEMPLATE_INCLUDE;
}>;

function fullName(u: { firstName: string; lastName: string } | null): string | null {
  return u ? `${u.firstName} ${u.lastName}`.trim() : null;
}

function toListItem(row: TemplateWithRelations): FormTemplateListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    version: row.version,
    fieldCount: row._count.fields,
    assignmentCount: row._count.assignments,
    createdByName: fullName(row.createdByUser) ?? "",
    updatedByName: fullName(row.updatedByUser),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toField(row: Prisma.FormFieldGetPayload<Record<string, never>>): FormFieldView {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    type: row.type,
    description: row.description,
    placeholder: row.placeholder,
    required: row.required,
    defaultValue: row.defaultValue,
    options: Array.isArray(row.options)
      ? (row.options as Array<{ label: string; value: string }>)
      : [],
    validation:
      row.validation && typeof row.validation === "object"
        ? (row.validation as Record<string, unknown>)
        : null,
    helpText: row.helpText,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function list(
  where: Prisma.FormTemplateWhereInput,
  page: number,
  pageSize: number,
  sortField: string,
  sortOrder: "asc" | "desc",
): Promise<{ items: FormTemplateListItem[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.formTemplate.findMany({
      where,
      include: TEMPLATE_INCLUDE,
      orderBy: { [sortField]: sortOrder } as Prisma.FormTemplateOrderByWithRelationInput,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.formTemplate.count({ where }),
  ]);
  return { items: rows.map(toListItem), total };
}

export async function findById(
  id: string,
  includeDeleted = false,
): Promise<FormTemplateDetail | null> {
  const row = await prisma.formTemplate.findFirst({
    where: includeDeleted ? { id } : { id, deletedAt: null },
    include: {
      ...TEMPLATE_INCLUDE,
      fields: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      assignments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) return null;
  return {
    ...toListItem(row),
    fields: row.fields.map(toField),
    assignments: row.assignments.map(toAssignment),
    deletedAt: row.deletedAt,
  };
}

function toAssignment(row: {
  id: string;
  targetType: string;
  targetId: string | null;
  priority: number;
  createdAt: Date;
}): FormAssignmentView {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    targetLabel: null,
    priority: row.priority,
    createdAt: row.createdAt,
  };
}

export async function listAssignments(
  where: Prisma.FormAssignmentWhereInput,
): Promise<FormAssignmentView[]> {
  const rows = await prisma.formAssignment.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    targetLabel: null,
    priority: row.priority,
    createdAt: row.createdAt,
  }));
}

export interface CreateTemplateArgs {
  code: string;
  name: string;
  description: string | null;
  createdBy: string | null;
}

export async function createTemplate(args: CreateTemplateArgs): Promise<FormTemplateDetail> {
  const row = await prisma.formTemplate.create({
    data: {
      code: args.code,
      name: args.name,
      description: args.description,
      version: 1,
      createdBy: args.createdBy,
    },
    include: TEMPLATE_INCLUDE,
  });
  return {
    ...toListItem(row),
    fields: [],
    assignments: [],
    deletedAt: null,
  };
}

export async function updateTemplate(
  id: string,
  data: { name?: string; description?: string | null; updatedBy?: string | null },
): Promise<FormTemplateDetail> {
  const row = await prisma.formTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.updatedBy !== undefined ? { updatedBy: data.updatedBy } : {}),
      updatedAt: new Date(),
    },
    include: TEMPLATE_INCLUDE,
  });
  return {
    ...toListItem(row),
    fields: [],
    assignments: [],
    deletedAt: null,
  };
}

export async function setStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  updatedBy: string | null,
): Promise<void> {
  await prisma.formTemplate.update({
    where: { id },
    data: { status, updatedBy, updatedAt: new Date() },
  });
}

export async function softDelete(id: string, updatedBy: string | null): Promise<void> {
  await prisma.formTemplate.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy, updatedAt: new Date() },
  });
}

export async function unDelete(id: string, updatedBy: string | null): Promise<void> {
  await prisma.formTemplate.update({
    where: { id },
    data: { deletedAt: null, updatedBy, updatedAt: new Date() },
  });
}

export async function bumpVersion(id: string, updatedBy: string | null): Promise<number> {
  const row = await prisma.formTemplate.update({
    where: { id },
    data: { version: { increment: 1 }, updatedBy, updatedAt: new Date() },
  });
  return row.version;
}

export async function createField(
  templateId: string,
  args: {
    key: string;
    label: string;
    type: string;
    description: string | null;
    placeholder: string | null;
    required: boolean;
    defaultValue: unknown;
    options: unknown;
    validation: unknown;
    helpText: string | null;
    sortOrder: number;
    createdBy: string | null;
  },
): Promise<FormFieldView> {
  const row = await prisma.formField.create({
    data: {
      templateId,
      key: args.key,
      label: args.label,
      type: args.type as never,
      description: args.description,
      placeholder: args.placeholder,
      required: args.required,
      defaultValue: args.defaultValue as Prisma.InputJsonValue | undefined,
      options: args.options as Prisma.InputJsonValue | undefined,
      validation: args.validation as Prisma.InputJsonValue | undefined,
      helpText: args.helpText,
      sortOrder: args.sortOrder,
      createdBy: args.createdBy,
    },
  });
  return toField(row as never);
}

export async function updateField(
  templateId: string,
  fieldId: string,
  data: Record<string, unknown>,
): Promise<FormFieldView> {
  const row = await prisma.formField.update({
    where: { id: fieldId, templateId },
    data: { ...data, updatedAt: new Date() },
  });
  return toField(row as never);
}

export async function archiveField(templateId: string, fieldId: string): Promise<void> {
  await prisma.formField.update({
    where: { id: fieldId, templateId },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });
}

export async function restoreField(templateId: string, fieldId: string): Promise<void> {
  await prisma.formField.update({
    where: { id: fieldId, templateId },
    data: { deletedAt: null, updatedAt: new Date() },
  });
}

export async function reorderFields(templateId: string, fieldIds: string[]): Promise<void> {
  await prisma.$transaction(
    fieldIds.map((fieldId, index) =>
      prisma.formField.update({
        where: { id: fieldId, templateId },
        data: { sortOrder: index, updatedAt: new Date() },
      }),
    ),
  );
}

export async function listVersionRows(templateId: string): Promise<FormVersionView[]> {
  const rows = await prisma.formVersion.findMany({
    where: { templateId },
    orderBy: { version: "desc" },
    include: { changedBy: { select: { firstName: true, lastName: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    changeType: row.changeType,
    changeNote: row.changeNote,
    changedByName: fullName(row.changedBy),
    createdAt: row.createdAt,
  }));
}

export async function findVersion(
  templateId: string,
  version: number,
): Promise<{ data: Prisma.JsonValue } | null> {
  const row = await prisma.formVersion.findFirst({
    where: { templateId, version },
    select: { data: true },
  });
  return row;
}

export async function snapshotTemplate(
  templateId: string,
  version: number,
  changeType: string,
  changeNote: string | null,
  changedById: string | null,
): Promise<void> {
  const template = await prisma.formTemplate.findUnique({
    where: { id: templateId },
    include: {
      fields: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          key: true,
          label: true,
          type: true,
          description: true,
          placeholder: true,
          required: true,
          defaultValue: true,
          options: true,
          validation: true,
          helpText: true,
          sortOrder: true,
        },
      },
      assignments: {
        where: { deletedAt: null },
        select: { id: true, targetType: true, targetId: true, priority: true },
      },
    },
  });
  if (!template) return;
  await prisma.formVersion.create({
    data: {
      templateId,
      version,
      changeType: changeType as never,
      changeNote,
      changedById,
      data: {
        template: {
          code: template.code,
          name: template.name,
          description: template.description,
        },
        fields: template.fields as unknown as Prisma.InputJsonValue,
        assignments: template.assignments as unknown as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function writeHistory(args: {
  templateId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  versionFrom?: number | null;
  versionTo?: number | null;
  actorId: string | null;
}): Promise<void> {
  await prisma.formHistory.create({
    data: {
      templateId: args.templateId,
      action: args.action as never,
      oldValue: (args.oldValue as Prisma.InputJsonValue) ?? undefined,
      newValue: (args.newValue as Prisma.InputJsonValue) ?? undefined,
      versionFrom: args.versionFrom ?? null,
      versionTo: args.versionTo ?? null,
      actorId: args.actorId,
    },
  });
}

export async function listHistoryRows(templateId: string): Promise<
  Array<{
    id: string;
    action: string;
    oldValue: unknown;
    newValue: unknown;
    versionFrom: number | null;
    versionTo: number | null;
    actorName: string | null;
    createdAt: Date;
  }>
> {
  const rows = await prisma.formHistory.findMany({
    where: { templateId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { firstName: true, lastName: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    oldValue: row.oldValue,
    newValue: row.newValue,
    versionFrom: row.versionFrom,
    versionTo: row.versionTo,
    actorName: fullName(row.actor),
    createdAt: row.createdAt,
  }));
}

export async function listTargetOptions(targetType: string): Promise<Array<{ id: string; label: string }>> {
  switch (targetType) {
    case "REQUIREMENT_TEMPLATE": {
      const rows = await prisma.requirementTemplate.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return rows.map((row) => ({ id: row.id, label: row.name }));
    }
    case "WORKFLOW_STEP": {
      const rows = await prisma.workflowStep.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, definition: { select: { name: true } } },
        orderBy: { name: "asc" },
      });
      return rows.map((row) => ({ id: row.id, label: `${row.definition.name} / ${row.name}` }));
    }
    case "AACCUP_AREA": {
      const rows = await prisma.aaccupArea.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return rows.map((row) => ({ id: row.id, label: row.name }));
    }
    case "FOLDER_TEMPLATE": {
      const rows = await prisma.folderTemplate.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return rows.map((row) => ({ id: row.id, label: row.name }));
    }
    default:
      return [];
  }
}

export async function assertTargetExists(
  targetType: string,
  targetId: string,
): Promise<boolean> {
  switch (targetType) {
    case "REQUIREMENT_TEMPLATE":
      return (await prisma.requirementTemplate.count({ where: { id: targetId, deletedAt: null } })) > 0;
    case "WORKFLOW_STEP":
      return (await prisma.workflowStep.count({ where: { id: targetId, deletedAt: null } })) > 0;
    case "AACCUP_AREA":
      return (await prisma.aaccupArea.count({ where: { id: targetId, deletedAt: null } })) > 0;
    case "FOLDER_TEMPLATE":
      return (await prisma.folderTemplate.count({ where: { id: targetId, deletedAt: null } })) > 0;
    default:
      return false;
  }
}
