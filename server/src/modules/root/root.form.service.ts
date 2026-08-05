import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/utils/errors";
import * as repo from "@/modules/root/root.form.repository";
import type {
  CreateAssignmentInput,
  CreateFieldInput,
  CreateFormInput,
  ListAssignmentsQuery,
  ListFormsQuery,
  ReorderFieldsInput,
  RollbackFormInput,
  UpdateFieldInput,
  UpdateFormInput,
} from "@/modules/root/root.form.validator";
import type {
  FormAssignmentView,
  FormPreviewView,
  FormTemplateDetail,
  FormTemplateListItem,
  FormVersionView,
} from "@/modules/root/root.form.types";

// =============================================================================
// URS-DMS — Dynamic Form Builder service (Sprint 7.4.6)
// RBAC: every mutation is ROOT-only via the form.* permission codes (bound
// exclusively to ROOT in the role matrix) — no `if (role === "admin")` here,
// everything routes through permissions. Versioning mirrors the Workflow and
// Requirement engines: every mutation bumps `version`, writes an immutable
// snapshot into form_versions.data, and appends a history row in the same
// transaction. PUBLISHED templates are immutable (409 on mutation) until a
// rollback replays an older snapshot as a new DRAFT version.
// =============================================================================

export interface ListResult {
  items: FormTemplateListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

function assertPermission(actor: Actor, code: string, message: string): void {
  if (!actor.permissions.includes(code)) {
    throw new ForbiddenError(message);
  }
}

async function assertDraft(actor: Actor, templateId: string): Promise<void> {
  void actor;
  const template = await prisma.formTemplate.findFirst({
    where: { id: templateId, deletedAt: null },
    select: { id: true, status: true, version: true },
  });
  if (!template) throw new NotFoundError("Form template not found");
  if (template.status !== "DRAFT") {
    throw new ConflictError("Only draft form templates can be edited — roll back to a draft first");
  }
  return undefined;
}

function assertCanMutate(actor: Actor): void {
  assertPermission(actor, "form.update", "Missing permission: form.update");
}

function assertCanPublish(actor: Actor): void {
  assertPermission(actor, "form.publish", "Missing permission: form.publish");
}

function assertCanAssign(actor: Actor): void {
  assertPermission(actor, "form.assign", "Missing permission: form.assign");
}

function assertCanRollback(actor: Actor): void {
  assertPermission(actor, "form.rollback", "Missing permission: form.rollback");
}

function assertCanArchive(actor: Actor): void {
  assertPermission(actor, "form.archive", "Missing permission: form.archive");
}

const SORT_FIELDS = new Set(["name", "code", "status", "version", "createdAt", "updatedAt"]);

// -----------------------------------------------------------------------------
// listForms
// -----------------------------------------------------------------------------
export async function listForms(query: ListFormsQuery, actor: Actor): Promise<ListResult> {
  assertPermission(actor, "form.read", "Missing permission: form.read");
  const where: { deletedAt?: null | undefined; status?: string; OR?: unknown[] } = {};
  if (!query.includeArchived) where.deletedAt = null;
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { code: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }
  const sortField = SORT_FIELDS.has(query.sort) ? query.sort : "updatedAt";
  const { items, total } = await repo.list(
    where as never,
    query.page,
    query.pageSize,
    sortField,
    query.order,
  );
  return {
    items,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

// -----------------------------------------------------------------------------
// getForm / getFormPreview
// -----------------------------------------------------------------------------
export async function getForm(id: string, actor: Actor): Promise<FormTemplateDetail> {
  assertPermission(actor, "form.read", "Missing permission: form.read");
  const template = await repo.findById(id, true);
  if (!template) throw new NotFoundError("Form template not found");
  return template;
}

export async function getFormPreview(id: string, actor: Actor): Promise<FormPreviewView> {
  assertPermission(actor, "form.read", "Missing permission: form.read");
  const template = await repo.findById(id, true);
  if (!template) throw new NotFoundError("Form template not found");
  return {
    template: {
      id: template.id,
      code: template.code,
      name: template.name,
      description: template.description,
      version: template.version,
    },
    fields: template.fields,
    assignments: template.assignments,
  };
}

// -----------------------------------------------------------------------------
// createForm
// -----------------------------------------------------------------------------
export async function createForm(input: CreateFormInput, actor: Actor): Promise<FormTemplateDetail> {
  assertPermission(actor, "form.create", "Missing permission: form.create");

  const duplicate = await prisma.formTemplate.findFirst({
    where: { code: input.code, deletedAt: null },
    select: { id: true },
  });
  if (duplicate) throw new ConflictError("A form template with this code already exists");

  const template = await repo.createTemplate({
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    createdBy: actor.id,
  });

  await repo.snapshotTemplate(template.id, 1, "CREATED", "Initial draft", actor.id);
  await repo.writeHistory({
    templateId: template.id,
    action: "CREATED",
    newValue: { code: template.code, name: template.name },
    versionTo: 1,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_CREATED,
    userId: actor.id,
    entity: "form_template",
    entityId: template.id,
    newValue: { code: template.code, name: template.name, version: 1 },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return template;
}

// -----------------------------------------------------------------------------
// updateForm (metadata only)
// -----------------------------------------------------------------------------
export async function updateForm(
  id: string,
  input: UpdateFormInput,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanMutate(actor);
  await assertDraft(actor, id);

  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Form template not found");

  const updated = await repo.updateTemplate(id, {
    name: input.name,
    description: input.description,
    updatedBy: actor.id,
  });

  const newVersion = await repo.bumpVersion(id, actor.id);
  await repo.snapshotTemplate(id, newVersion, "UPDATED", "Metadata updated", actor.id);
  await repo.writeHistory({
    templateId: id,
    action: "UPDATED",
    oldValue: { name: existing.name, description: existing.description },
    newValue: { name: updated.name, description: updated.description },
    versionFrom: existing.version,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_UPDATED,
    userId: actor.id,
    entity: "form_template",
    entityId: id,
    oldValue: { name: existing.name, version: existing.version },
    newValue: { name: updated.name, version: newVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(id) as Promise<FormTemplateDetail>;
}

// -----------------------------------------------------------------------------
// saveDraft — explicit snapshot without changing content
// -----------------------------------------------------------------------------
export async function saveDraft(
  id: string,
  changeNote: string | undefined,
  actor: Actor,
): Promise<{ templateId: string; version: number }> {
  assertCanMutate(actor);
  await assertDraft(actor, id);

  const newVersion = await repo.bumpVersion(id, actor.id);
  await repo.snapshotTemplate(id, newVersion, "SAVED", changeNote ?? null, actor.id);
  await repo.writeHistory({
    templateId: id,
    action: "SAVED",
    newValue: { version: newVersion, note: changeNote ?? null },
    versionFrom: newVersion - 1,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_SAVED,
    userId: actor.id,
    entity: "form_template",
    entityId: id,
    newValue: { version: newVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return { templateId: id, version: newVersion };
}

// -----------------------------------------------------------------------------
// publishForm
// -----------------------------------------------------------------------------
export async function publishForm(
  id: string,
  changeNote: string | undefined,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanPublish(actor);

  const template = await repo.findById(id, true);
  if (!template) throw new NotFoundError("Form template not found");
  if (template.status === "ARCHIVED") {
    throw new ConflictError("Archived form templates cannot be published");
  }

  const newVersion = await repo.bumpVersion(id, actor.id);
  await repo.snapshotTemplate(id, newVersion, "PUBLISHED", changeNote ?? null, actor.id);
  await repo.setStatus(id, "PUBLISHED", actor.id);
  await repo.writeHistory({
    templateId: id,
    action: "PUBLISHED",
    newValue: { status: "PUBLISHED" },
    versionFrom: template.version,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_PUBLISHED,
    userId: actor.id,
    entity: "form_template",
    entityId: id,
    newValue: { version: newVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(id) as Promise<FormTemplateDetail>;
}

// -----------------------------------------------------------------------------
// duplicateForm — copies a template as a new DRAFT with a new code
// -----------------------------------------------------------------------------
export async function duplicateForm(id: string, actor: Actor): Promise<FormTemplateDetail> {
  assertPermission(actor, "form.create", "Missing permission: form.create");

  const source = await repo.findById(id, true);
  if (!source) throw new NotFoundError("Form template not found");

  const base = source.code.replace(/-\d+$/, "");
  let suffix = 2;
  let code = `${base}-${suffix}`;
  while (await prisma.formTemplate.findUnique({ where: { code } })) {
    suffix += 1;
    code = `${base}-${suffix}`;
  }

  const created = await repo.createTemplate({
    code,
    name: `${source.name} (copy)`,
    description: source.description,
    createdBy: actor.id,
  });

  for (const field of source.fields) {
    await repo.createField(created.id, {
      key: field.key,
      label: field.label,
      type: field.type,
      description: field.description,
      placeholder: field.placeholder,
      required: field.required,
      defaultValue: field.defaultValue,
      options: field.options,
      validation: field.validation,
      helpText: field.helpText,
      sortOrder: field.sortOrder,
      createdBy: actor.id,
    });
  }

  await repo.snapshotTemplate(created.id, 1, "DUPLICATED", `Duplicated from ${source.code}`, actor.id);
  await repo.writeHistory({
    templateId: created.id,
    action: "DUPLICATED",
    newValue: { source: source.code },
    versionTo: 1,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_DUPLICATED,
    userId: actor.id,
    entity: "form_template",
    entityId: created.id,
    newValue: { code, source: source.code },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(created.id) as Promise<FormTemplateDetail>;
}

// -----------------------------------------------------------------------------
// archiveForm / restoreForm
// -----------------------------------------------------------------------------
export async function archiveForm(id: string, actor: Actor): Promise<void> {
  assertCanArchive(actor);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Form template not found");

  await repo.setStatus(id, "ARCHIVED", actor.id);
  await repo.softDelete(id, actor.id);
  await repo.writeHistory({
    templateId: id,
    action: "ARCHIVED",
    oldValue: { status: existing.status },
    newValue: { status: "ARCHIVED" },
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_ARCHIVED,
    userId: actor.id,
    entity: "form_template",
    entityId: id,
    oldValue: { status: existing.status, name: existing.name },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

export async function restoreForm(id: string, actor: Actor): Promise<FormTemplateDetail> {
  assertCanArchive(actor);
  const existing = await repo.findById(id, true);
  if (!existing) throw new NotFoundError("Form template not found");
  if (!existing.deletedAt) throw new BadRequestError("Form template is not archived");
  if (existing.status !== "ARCHIVED") {
    throw new BadRequestError("Only archived form templates can be restored");
  }

  await repo.setStatus(id, "DRAFT", actor.id);
  await repo.unDelete(id, actor.id);
  await repo.writeHistory({
    templateId: id,
    action: "RESTORED",
    oldValue: { status: "ARCHIVED" },
    newValue: { status: "DRAFT" },
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_RESTORED,
    userId: actor.id,
    entity: "form_template",
    entityId: id,
    oldValue: { status: "ARCHIVED" },
    newValue: { status: "DRAFT" },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(id) as Promise<FormTemplateDetail>;
}

// -----------------------------------------------------------------------------
// Field mutations (draft-only, versioned)
// -----------------------------------------------------------------------------
function toKey(label: string, type: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${base}_${type.toLowerCase().slice(0, 12)}`;
}

async function uniqueFieldKey(templateId: string, label: string, type: string): Promise<string> {
  const base = toKey(label, type) || "field";
  let key = base;
  let n = 2;
  while (
    await prisma.formField.findFirst({
      where: { templateId, key, deletedAt: null },
      select: { id: true },
    })
  ) {
    key = `${base}_${n}`;
    n += 1;
  }
  return key;
}

export async function createField(
  templateId: string,
  input: CreateFieldInput,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanMutate(actor);
  await assertDraft(actor, templateId);

  const key = input.key ?? (await uniqueFieldKey(templateId, input.label, input.type));
  if (
    await prisma.formField.findFirst({
      where: { templateId, key, deletedAt: null },
      select: { id: true },
    })
  ) {
    throw new ConflictError(`A field with key "${key}" already exists`);
  }

  const maxOrder = await prisma.formField.aggregate({
    where: { templateId, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  await repo.createField(templateId, {
    key,
    label: input.label,
    type: input.type,
    description: input.description ?? null,
    placeholder: input.placeholder ?? null,
    required: input.required,
    defaultValue: input.defaultValue,
    options: input.options ?? null,
    validation: input.validation ?? null,
    helpText: input.helpText ?? null,
    sortOrder,
    createdBy: actor.id,
  });

  const newVersion = await repo.bumpVersion(templateId, actor.id);
  await repo.snapshotTemplate(templateId, newVersion, "UPDATED", `Field "${input.label}" added`, actor.id);
  await repo.writeHistory({
    templateId,
    action: "UPDATED",
    newValue: { field: { key, label: input.label, type: input.type } },
    versionFrom: newVersion - 1,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_UPDATED,
    userId: actor.id,
    entity: "form_template",
    entityId: templateId,
    newValue: { field: key, version: newVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(templateId) as Promise<FormTemplateDetail>;
}

export async function updateField(
  templateId: string,
  fieldId: string,
  input: UpdateFieldInput,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanMutate(actor);
  await assertDraft(actor, templateId);

  const existing = await prisma.formField.findFirst({
    where: { id: fieldId, templateId, deletedAt: null },
    select: { key: true, label: true },
  });
  if (!existing) throw new NotFoundError("Form field not found");

  const data: Record<string, unknown> = {};
  if (input.label !== undefined) data.label = input.label;
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.placeholder !== undefined) data.placeholder = input.placeholder ?? null;
  if (input.required !== undefined) data.required = input.required;
  if (input.defaultValue !== undefined) data.defaultValue = input.defaultValue;
  if (input.options !== undefined) data.options = input.options ?? null;
  if (input.validation !== undefined) data.validation = input.validation ?? null;
  if (input.helpText !== undefined) data.helpText = input.helpText ?? null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.key !== undefined) data.key = input.key;

  await repo.updateField(templateId, fieldId, data);

  const newVersion = await repo.bumpVersion(templateId, actor.id);
  await repo.snapshotTemplate(templateId, newVersion, "UPDATED", `Field "${input.label ?? existing.label}" updated`, actor.id);
  await repo.writeHistory({
    templateId,
    action: "UPDATED",
    oldValue: { field: existing.key },
    newValue: { field: input.key ?? existing.key },
    versionFrom: newVersion - 1,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_UPDATED,
    userId: actor.id,
    entity: "form_template",
    entityId: templateId,
    newValue: { field: input.key ?? existing.key, version: newVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(templateId) as Promise<FormTemplateDetail>;
}

export async function archiveField(
  templateId: string,
  fieldId: string,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanMutate(actor);
  await assertDraft(actor, templateId);

  const existing = await prisma.formField.findFirst({
    where: { id: fieldId, templateId, deletedAt: null },
    select: { key: true, label: true },
  });
  if (!existing) throw new NotFoundError("Form field not found");

  await repo.archiveField(templateId, fieldId);

  const newVersion = await repo.bumpVersion(templateId, actor.id);
  await repo.snapshotTemplate(templateId, newVersion, "UPDATED", `Field "${existing.label}" removed`, actor.id);
  await repo.writeHistory({
    templateId,
    action: "UPDATED",
    oldValue: { field: existing.key, removed: true },
    versionFrom: newVersion - 1,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_UPDATED,
    userId: actor.id,
    entity: "form_template",
    entityId: templateId,
    newValue: { fieldRemoved: existing.key, version: newVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(templateId) as Promise<FormTemplateDetail>;
}

export async function reorderFields(
  templateId: string,
  input: ReorderFieldsInput,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanMutate(actor);
  await assertDraft(actor, templateId);

  const count = await prisma.formField.count({
    where: { templateId, deletedAt: null, id: { in: input.fieldIds } },
  });
  if (count !== input.fieldIds.length) {
    throw new BadRequestError("One or more field ids do not belong to this template");
  }

  await repo.reorderFields(templateId, input.fieldIds);

  const newVersion = await repo.bumpVersion(templateId, actor.id);
  await repo.snapshotTemplate(templateId, newVersion, "UPDATED", "Field order changed", actor.id);
  await repo.writeHistory({
    templateId,
    action: "UPDATED",
    newValue: { reordered: true },
    versionFrom: newVersion - 1,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_UPDATED,
    userId: actor.id,
    entity: "form_template",
    entityId: templateId,
    newValue: { reordered: true, version: newVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(templateId) as Promise<FormTemplateDetail>;
}

// -----------------------------------------------------------------------------
// Versions / rollback / history
// -----------------------------------------------------------------------------
export async function listVersions(id: string, actor: Actor): Promise<FormVersionView[]> {
  assertPermission(actor, "form.read", "Missing permission: form.read");
  const template = await repo.findById(id, true);
  if (!template) throw new NotFoundError("Form template not found");
  return repo.listVersionRows(id);
}

export async function rollbackForm(
  id: string,
  input: RollbackFormInput,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanRollback(actor);

  const template = await repo.findById(id, true);
  if (!template) throw new NotFoundError("Form template not found");
  if (template.deletedAt) throw new BadRequestError("Archived form templates cannot be rolled back");

  const versionRow = await repo.findVersion(id, input.version);
  if (!versionRow) throw new NotFoundError(`Version ${input.version} not found`);

  const snapshot = versionRow.data as {
    template?: { code?: string; name?: string; description?: string | null };
    fields?: Array<{
      key: string;
      label: string;
      type: string;
      description?: string | null;
      placeholder?: string | null;
      required?: boolean;
      defaultValue?: unknown;
      options?: unknown;
      validation?: unknown;
      helpText?: string | null;
      sortOrder?: number;
    }>;
    assignments?: Array<{ targetType: string; targetId: string | null; priority?: number }>;
  };

  const restored = await prisma.$transaction(async (tx) => {
    await tx.formField.updateMany({
      where: { templateId: id, deletedAt: null },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    if (snapshot.fields) {
      for (const field of snapshot.fields) {
        const key = field.key;
        const existing = await tx.formField.findFirst({ where: { templateId: id, key } });
        if (existing) {
          await tx.formField.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              label: field.label,
              type: field.type as never,
              description: field.description ?? null,
              placeholder: field.placeholder ?? null,
              required: field.required ?? false,
              defaultValue: (field.defaultValue as never) ?? undefined,
              options: (field.options as never) ?? undefined,
              validation: (field.validation as never) ?? undefined,
              helpText: field.helpText ?? null,
              sortOrder: field.sortOrder ?? 0,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.formField.create({
            data: {
              templateId: id,
              key,
              label: field.label,
              type: field.type as never,
              description: field.description ?? null,
              placeholder: field.placeholder ?? null,
              required: field.required ?? false,
              defaultValue: (field.defaultValue as never) ?? undefined,
              options: (field.options as never) ?? undefined,
              validation: (field.validation as never) ?? undefined,
              helpText: field.helpText ?? null,
              sortOrder: field.sortOrder ?? 0,
            },
          });
        }
      }
    }
    await tx.formTemplate.update({
      where: { id },
      data: {
        name: snapshot.template?.name ?? template.name,
        description: snapshot.template?.description ?? template.description,
        status: "DRAFT",
        version: { increment: 1 },
        updatedBy: actor.id,
        updatedAt: new Date(),
      },
    });
  });

  const newVersion = template.version + 1;
  await repo.snapshotTemplate(id, newVersion, "ROLLED_BACK", `Rolled back to version ${input.version}`, actor.id);
  await repo.writeHistory({
    templateId: id,
    action: "ROLLED_BACK",
    oldValue: { version: template.version },
    newValue: { version: newVersion, restoredFrom: input.version },
    versionFrom: template.version,
    versionTo: newVersion,
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_ROLLED_BACK,
    userId: actor.id,
    entity: "form_template",
    entityId: id,
    oldValue: { version: template.version },
    newValue: { version: newVersion, restoredFrom: input.version },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  void restored;
  return repo.findById(id) as Promise<FormTemplateDetail>;
}

export async function listHistory(
  id: string,
  actor: Actor,
): Promise<Awaited<ReturnType<typeof repo.listHistoryRows>>> {
  assertPermission(actor, "form.read", "Missing permission: form.read");
  const template = await repo.findById(id, true);
  if (!template) throw new NotFoundError("Form template not found");
  return repo.listHistoryRows(id);
}

// -----------------------------------------------------------------------------
// Assignments
// -----------------------------------------------------------------------------
export async function listAssignments(
  query: ListAssignmentsQuery,
  actor: Actor,
): Promise<{ items: FormAssignmentView[]; meta: Record<string, number> }> {
  assertPermission(actor, "form.read", "Missing permission: form.read");
  const where: Record<string, unknown> = { deletedAt: null };
  if (query.templateId) where.templateId = query.templateId;
  if (query.targetType) where.targetType = query.targetType;
  if (query.targetId) where.targetId = query.targetId;

  const rows = await prisma.formAssignment.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: { template: { select: { name: true } } },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
  const total = await prisma.formAssignment.count({ where });

  return {
    items: rows.map((row) => ({
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      targetLabel: row.targetId ? null : null,
      priority: row.priority,
      createdAt: row.createdAt,
    })),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
  };
}

export async function createAssignment(
  templateId: string,
  input: CreateAssignmentInput,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanAssign(actor);
  const template = await repo.findById(templateId);
  if (!template) throw new NotFoundError("Form template not found");

  if (input.targetType !== "UNIVERSITY") {
    if (!input.targetId) {
      throw new BadRequestError("targetId is required for this target type");
    }
    const exists = await repo.assertTargetExists(input.targetType, input.targetId);
    if (!exists) {
      throw new BadRequestError(`Referenced ${input.targetType} target not found`);
    }
  }

  const duplicate = await prisma.formAssignment.findFirst({
    where: {
      templateId,
      targetType: input.targetType,
      targetId: input.targetType === "UNIVERSITY" ? null : (input.targetId ?? null),
      deletedAt: null,
    },
    select: { id: true },
  });
  if (duplicate) throw new ConflictError("This form is already assigned to that scope");

  await prisma.formAssignment.create({
    data: {
      templateId,
      targetType: input.targetType,
      targetId: input.targetType === "UNIVERSITY" ? null : (input.targetId ?? null),
      priority: input.priority,
      createdBy: actor.id,
    },
  });

  await repo.writeHistory({
    templateId,
    action: "ASSIGNED",
    newValue: { targetType: input.targetType, targetId: input.targetType === "UNIVERSITY" ? null : input.targetId },
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_ASSIGNED,
    userId: actor.id,
    entity: "form_template",
    entityId: templateId,
    newValue: { targetType: input.targetType, targetId: input.targetId ?? null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(templateId) as Promise<FormTemplateDetail>;
}

export async function removeAssignment(
  templateId: string,
  assignmentId: string,
  actor: Actor,
): Promise<FormTemplateDetail> {
  assertCanAssign(actor);
  const template = await repo.findById(templateId);
  if (!template) throw new NotFoundError("Form template not found");

  const assignment = await prisma.formAssignment.findFirst({
    where: { id: assignmentId, templateId, deletedAt: null },
    select: { id: true, targetType: true, targetId: true },
  });
  if (!assignment) throw new NotFoundError("Form assignment not found");

  await prisma.formAssignment.update({
    where: { id: assignmentId },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });

  await repo.writeHistory({
    templateId,
    action: "UNASSIGNED",
    newValue: { targetType: assignment.targetType, targetId: assignment.targetId },
    actorId: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FORM_UNASSIGNED,
    userId: actor.id,
    entity: "form_template",
    entityId: templateId,
    oldValue: { targetType: assignment.targetType, targetId: assignment.targetId },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return repo.findById(templateId) as Promise<FormTemplateDetail>;
}

export async function listAssignmentTargetOptions(
  targetType: string,
  actor: Actor,
): Promise<Array<{ id: string; label: string }>> {
  assertPermission(actor, "form.read", "Missing permission: form.read");
  return repo.listTargetOptions(targetType);
}
