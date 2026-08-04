import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import * as repo from "@/modules/workflow/workflow.repository";
import { invalidateWorkflowCache } from "@/modules/workflow/workflow.engine";
import { PERMISSION_CODES } from "@/modules/permissions/permissions.constants";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import type { Prisma } from "@prisma/client";
import type {
  WorkflowActionView,
  WorkflowAssignmentView,
  WorkflowDefinitionDetail,
  WorkflowDefinitionView,
  WorkflowHistoryView,
  WorkflowInstanceView,
  WorkflowListResult,
  WorkflowSnapshot,
  WorkflowStepInstanceView,
  WorkflowStepView,
  WorkflowTransitionView,
  WorkflowValidationIssue,
  WorkflowValidationResult,
  WorkflowVersionView,
} from "@/modules/workflow/workflow.types";
import type {
  AssignWorkflowDefinitionBody,
  CreateWorkflowDefinitionBody,
  CreateWorkflowStepBody,
  CreateWorkflowTransitionBody,
  ListWorkflowAssignmentsQuery,
  ListWorkflowDefinitionsQuery,
  ListWorkflowHistoryQuery,
  ListWorkflowInstancesQuery,
  PublishWorkflowDefinitionBody,
  RollbackWorkflowDefinitionBody,
  UpdateWorkflowDefinitionBody,
  UpdateWorkflowStepBody,
  UpdateWorkflowTransitionBody,
} from "@/modules/workflow/workflow.validator";

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

const PERMISSION = {
  read: "workflow.read",
  create: "workflow.create",
  update: "workflow.update",
  archive: "workflow.archive",
  restore: "workflow.restore",
  version: "workflow.version",
  validate: "workflow.validate",
  publish: "workflow.publish",
  rollback: "workflow.rollback",
  assign: "workflow.assign",
} as const;

function assertCan(actor: Actor, permission: string, message: string): void {
  if (!actor.permissions.includes(permission)) throw new ForbiddenError(message);
}

function personName(person: { firstName: string; lastName: string } | null): string | null {
  return person ? `${person.firstName} ${person.lastName}`.trim() : null;
}

function toDefinitionView(row: repo.WorkflowDefinitionRow): WorkflowDefinitionView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    entityType: row.entityType,
    status: row.status,
    version: row.version,
    metadata: row.metadata,
    createdBy: row.createdBy,
    createdByName: personName(row.createdByUser),
    updatedBy: row.updatedBy,
    updatedByName: personName(row.updatedByUser),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    stepCount: row._count.steps,
    transitionCount: row._count.transitions,
    assignmentCount: row._count.assignments,
    instanceCount: row._count.instances,
  };
}

function toStepView(row: repo.WorkflowStepRow): WorkflowStepView {
  return {
    id: row.id,
    definitionId: row.definitionId,
    code: row.code,
    name: row.name,
    description: row.description,
    type: row.type,
    roleName: row.roleName,
    permissionCode: row.permissionCode,
    sortOrder: row.sortOrder,
    metadata: row.metadata,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function toTransitionView(row: repo.WorkflowTransitionRow): WorkflowTransitionView {
  return {
    id: row.id,
    definitionId: row.definitionId,
    fromStepId: row.fromStepId,
    toStepId: row.toStepId,
    actionCode: row.actionCode,
    requiredPermission: row.requiredPermission,
    metadata: row.metadata,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function toVersionView(row: repo.WorkflowVersionRow): WorkflowVersionView {
  return {
    id: row.id,
    definitionId: row.definitionId,
    definitionName: row.definition.name,
    version: row.version,
    changeType: row.changeType,
    data: row.data,
    changeNote: row.changeNote,
    changedById: row.changedById,
    changedByName: personName(row.changedBy),
    createdAt: row.createdAt,
  };
}

function toHistoryView(row: repo.WorkflowHistoryRow): WorkflowHistoryView {
  return {
    id: row.id,
    definitionId: row.definitionId,
    action: row.action,
    oldValue: row.oldValue,
    newValue: row.newValue,
    versionFrom: row.versionFrom,
    versionTo: row.versionTo,
    actorId: row.actorId,
    actorName: personName(row.actor),
    createdAt: row.createdAt,
  };
}

async function resolveTargetNames(
  rows: repo.WorkflowAssignmentRow[],
): Promise<Map<string, string>> {
  const ids = {
    COLLEGE: [] as string[],
    DEPARTMENT: [] as string[],
    PROGRAM: [] as string[],
    OFFICE: [] as string[],
    AACCUP_AREA: [] as string[],
    ACCREDITATION_CYCLE: [] as string[],
  };
  for (const row of rows) {
    if (row.targetId && row.targetType !== "UNIVERSITY") ids[row.targetType].push(row.targetId);
  }
  const [colleges, departments, programs, offices, areas, cycles] = await Promise.all([
    prisma.college.findMany({ where: { id: { in: ids.COLLEGE } }, select: { id: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: ids.DEPARTMENT } }, select: { id: true, name: true } }),
    prisma.program.findMany({ where: { id: { in: ids.PROGRAM } }, select: { id: true, name: true } }),
    prisma.office.findMany({ where: { id: { in: ids.OFFICE } }, select: { id: true, name: true } }),
    prisma.aaccupArea.findMany({ where: { id: { in: ids.AACCUP_AREA } }, select: { id: true, name: true } }),
    prisma.accreditationCycle.findMany({
      where: { id: { in: ids.ACCREDITATION_CYCLE } },
      select: { id: true, name: true },
    }),
  ]);
  return new Map(
    [...colleges, ...departments, ...programs, ...offices, ...areas, ...cycles].map((row) => [
      row.id,
      row.name,
    ]),
  );
}

async function assignmentViews(
  rows: repo.WorkflowAssignmentRow[],
  knownDefinition?: { id: string; name: string },
): Promise<WorkflowAssignmentView[]> {
  const names = await resolveTargetNames(rows);
  const definitionIds = [...new Set(rows.map((row) => row.definitionId))];
  const definitions = knownDefinition
    ? [knownDefinition]
    : await prisma.workflowDefinition.findMany({
        where: { id: { in: definitionIds } },
        select: { id: true, name: true },
      });
  const definitionNames = new Map(definitions.map((definition) => [definition.id, definition.name]));
  return rows.map((row) => ({
    id: row.id,
    definitionId: row.definitionId,
    definitionName: definitionNames.get(row.definitionId) ?? "Unknown definition",
    targetType: row.targetType,
    targetId: row.targetId,
    targetName: row.targetId ? (names.get(row.targetId) ?? "Unknown target") : "Entire University",
    priority: row.priority,
    createdAt: row.createdAt,
  }));
}

// -----------------------------------------------------------------------------
// Definition CRUD
// -----------------------------------------------------------------------------

export async function listDefinitions(
  actor: Actor,
  q: ListWorkflowDefinitionsQuery,
): Promise<WorkflowListResult<WorkflowDefinitionView>> {
  assertCan(actor, PERMISSION.read, "You need workflow.read to list workflows");
  const where: Prisma.WorkflowDefinitionWhereInput = {};
  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: "insensitive" } },
      { code: { contains: q.q, mode: "insensitive" } },
    ];
  }
  if (q.entityType) where.entityType = q.entityType;
  if (q.status) where.status = q.status;
  if (!q.includeArchived) where.deletedAt = null;
  const [rows, total] = await Promise.all([
    repo.listDefinitions({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        createdByUser: { select: { firstName: true, lastName: true } },
        updatedByUser: { select: { firstName: true, lastName: true } },
        _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
      },
    }),
    repo.countDefinitions({ where }),
  ]);
  return {
    items: rows.map(toDefinitionView),
    meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
  };
}

export async function getDefinition(actor: Actor, id: string): Promise<WorkflowDefinitionDetail> {
  assertCan(actor, PERMISSION.read, "You need workflow.read to view workflows");
  const row = await repo.findDefinition(id);
  if (!row) throw new NotFoundError("Workflow definition not found");
  const [steps, transitions, assignments] = await Promise.all([
    repo.listSteps(id),
    repo.listTransitions(id),
    repo.listAssignments({ where: { definitionId: id } }),
  ]);
  return {
    ...toDefinitionView(row),
    steps: steps.map(toStepView),
    transitions: transitions.map(toTransitionView),
    assignments: await assignmentViews(assignments, { id: row.id, name: row.name }),
  };
}

export async function createDefinition(
  actor: Actor,
  body: CreateWorkflowDefinitionBody,
): Promise<WorkflowDefinitionView> {
  assertCan(actor, PERMISSION.create, "You need workflow.create to create workflows");
  const existing = await repo.findDefinitionByCode(body.code);
  if (existing) throw new ConflictError("A workflow definition with this code already exists");
  const row = await prisma.workflowDefinition.create({
    data: {
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      entityType: body.entityType,
      metadata: (body.metadata ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      createdBy: actor.id,
      updatedBy: actor.id,
      versions: {
        create: {
          version: 1,
          changeType: "CREATED",
          changeNote: "Initial draft",
          changedById: actor.id,
          data: { name: body.name, code: body.code, description: body.description ?? null, entityType: body.entityType, version: 1, steps: [], transitions: [], assignments: [] },
        },
      },
      history: { create: { action: "CREATED", actorId: actor.id, versionFrom: 1, versionTo: 1 } },
    },
    include: {
      createdByUser: { select: { firstName: true, lastName: true } },
      updatedByUser: { select: { firstName: true, lastName: true } },
      _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
    },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_DEFINITION_CREATED,
    userId: actor.id,
    entity: "WorkflowDefinition",
    entityId: row.id,
    newValue: { code: row.code, name: row.name, entityType: row.entityType, version: 1 },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toDefinitionView(row as repo.WorkflowDefinitionRow);
}

export async function updateDefinition(
  actor: Actor,
  id: string,
  body: UpdateWorkflowDefinitionBody,
): Promise<WorkflowDefinitionView> {
  assertCan(actor, PERMISSION.update, "You need workflow.update to edit workflows");
  const existing = await repo.findDefinition(id);
  if (!existing) throw new NotFoundError("Workflow definition not found");
  assertEditable(existing.status);
  if (body.code && body.code !== existing.code) {
    const taken = await repo.findDefinitionByCode(body.code);
    if (taken) throw new ConflictError("A workflow definition with this code already exists");
  }
  const oldValue = { name: existing.name, code: existing.code, entityType: existing.entityType };
  const row = await prisma.workflowDefinition.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      code: body.code ?? undefined,
      description: body.description === undefined ? undefined : body.description,
      entityType: body.entityType ?? undefined,
      metadata: (body.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      updatedBy: actor.id,
    },
    include: {
      createdByUser: { select: { firstName: true, lastName: true } },
      updatedByUser: { select: { firstName: true, lastName: true } },
      _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
    },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_DEFINITION_UPDATED,
    userId: actor.id,
    entity: "WorkflowDefinition",
    entityId: row.id,
    oldValue,
    newValue: { name: row.name, code: row.code, entityType: row.entityType },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toDefinitionView(row as repo.WorkflowDefinitionRow);
}

export async function archiveDefinition(actor: Actor, id: string): Promise<WorkflowDefinitionView> {
  assertCan(actor, PERMISSION.archive, "You need workflow.archive to archive workflows");
  const existing = await repo.findDefinition(id);
  if (!existing) throw new NotFoundError("Workflow definition not found");
  const row = await prisma.workflowDefinition.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED", updatedBy: actor.id },
    include: {
      createdByUser: { select: { firstName: true, lastName: true } },
      updatedByUser: { select: { firstName: true, lastName: true } },
      _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
    },
  });
  await prisma.workflowHistory.create({
    data: { definitionId: id, action: "ARCHIVED", actorId: actor.id },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_DEFINITION_ARCHIVED,
    userId: actor.id,
    entity: "WorkflowDefinition",
    entityId: row.id,
    newValue: { code: row.code, name: row.name, status: row.status },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toDefinitionView(row as repo.WorkflowDefinitionRow);
}

export async function restoreDefinition(actor: Actor, id: string): Promise<WorkflowDefinitionView> {
  assertCan(actor, PERMISSION.restore, "You need workflow.restore to restore workflows");
  const existing = await repo.findDefinition(id);
  if (!existing) throw new NotFoundError("Workflow definition not found");
  const row = await prisma.workflowDefinition.update({
    where: { id },
    data: { deletedAt: null, status: "DRAFT", updatedBy: actor.id },
    include: {
      createdByUser: { select: { firstName: true, lastName: true } },
      updatedByUser: { select: { firstName: true, lastName: true } },
      _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
    },
  });
  await prisma.workflowHistory.create({
    data: { definitionId: id, action: "RESTORED", actorId: actor.id },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_DEFINITION_RESTORED,
    userId: actor.id,
    entity: "WorkflowDefinition",
    entityId: row.id,
    newValue: { code: row.code, name: row.name },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toDefinitionView(row as repo.WorkflowDefinitionRow);
}

function assertEditable(status: string): void {
  if (status === "PUBLISHED") {
    throw new ConflictError(
      "Published workflow definitions are immutable — roll back to a version or restore a draft before editing",
    );
  }
  if (status === "ARCHIVED") {
    throw new ConflictError("Archived workflow definitions must be restored before editing");
  }
}

// -----------------------------------------------------------------------------
// Versions / history
// -----------------------------------------------------------------------------

export async function listVersions(actor: Actor, id: string): Promise<WorkflowVersionView[]> {
  assertCan(actor, PERMISSION.read, "You need workflow.read to view versions");
  const definition = await repo.findDefinition(id);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  const rows = await repo.listVersions(id);
  return rows.map(toVersionView);
}

export async function listHistory(
  actor: Actor,
  q: ListWorkflowHistoryQuery,
): Promise<WorkflowListResult<WorkflowHistoryView>> {
  assertCan(actor, PERMISSION.read, "You need workflow.read to view history");
  const where: Prisma.WorkflowHistoryWhereInput = {};
  if (q.definitionId) where.definitionId = q.definitionId;
  if (q.action) where.action = q.action;
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) where.createdAt.gte = new Date(q.from);
    if (q.to) where.createdAt.lte = new Date(q.to);
  }
  const [rows, total] = await Promise.all([
    repo.listHistory({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { actor: { select: { firstName: true, lastName: true } } },
    }),
    repo.countHistory({ where }),
  ]);
  return {
    items: rows.map(toHistoryView),
    meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
  };
}

// -----------------------------------------------------------------------------
// Steps
// -----------------------------------------------------------------------------

export async function createStep(
  actor: Actor,
  definitionId: string,
  body: CreateWorkflowStepBody,
): Promise<WorkflowStepView> {
  assertCan(actor, PERMISSION.create, "You need workflow.create to add steps");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  assertEditable(definition.status);
  const existing = await prisma.workflowStep.findFirst({
    where: { definitionId, code: body.code },
  });
  if (existing) throw new ConflictError("A step with this code already exists");
  const row = await prisma.workflowStep.create({
    data: {
      definitionId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      type: body.type,
      roleName: body.roleName ?? null,
      permissionCode: body.permissionCode ?? null,
      sortOrder: body.sortOrder ?? 0,
      metadata: (body.metadata ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      createdBy: actor.id,
      updatedBy: actor.id,
    },
  });
  await prisma.workflowHistory.create({
    data: { definitionId, action: "UPDATED", actorId: actor.id, newValue: { step: body.code } },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_STEP_CREATED,
    userId: actor.id,
    entity: "WorkflowStep",
    entityId: row.id,
    newValue: { definitionId, code: row.code, name: row.name, type: row.type },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toStepView(row as repo.WorkflowStepRow);
}

export async function updateStep(
  actor: Actor,
  definitionId: string,
  stepId: string,
  body: UpdateWorkflowStepBody,
): Promise<WorkflowStepView> {
  assertCan(actor, PERMISSION.update, "You need workflow.update to edit steps");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  assertEditable(definition.status);
  const existing = await repo.findStep(definitionId, stepId);
  if (!existing) throw new NotFoundError("Workflow step not found");
  if (body.code && body.code !== existing.code) {
    const taken = await prisma.workflowStep.findFirst({
      where: { definitionId, code: body.code },
    });
    if (taken) throw new ConflictError("A step with this code already exists");
  }
  const oldValue = { code: existing.code, name: existing.name, type: existing.type };
  const row = await prisma.workflowStep.update({
    where: { id: stepId },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description === undefined ? undefined : body.description,
      type: body.type ?? undefined,
      roleName: body.roleName === undefined ? undefined : body.roleName,
      permissionCode: body.permissionCode === undefined ? undefined : body.permissionCode,
      sortOrder: body.sortOrder ?? undefined,
      metadata: (body.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      status: body.status ?? undefined,
      updatedBy: actor.id,
    },
  });
  await prisma.workflowHistory.create({
    data: { definitionId, action: "UPDATED", actorId: actor.id, newValue: { step: row.code } },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_STEP_UPDATED,
    userId: actor.id,
    entity: "WorkflowStep",
    entityId: row.id,
    oldValue,
    newValue: { code: row.code, name: row.name, type: row.type },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toStepView(row as repo.WorkflowStepRow);
}

export async function archiveStep(
  actor: Actor,
  definitionId: string,
  stepId: string,
): Promise<WorkflowStepView> {
  assertCan(actor, PERMISSION.archive, "You need workflow.archive to archive steps");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  assertEditable(definition.status);
  const existing = await repo.findStep(definitionId, stepId);
  if (!existing) throw new NotFoundError("Workflow step not found");
  const row = await prisma.workflowStep.update({
    where: { id: stepId },
    data: { deletedAt: new Date(), status: "INACTIVE", updatedBy: actor.id },
  });
  await prisma.workflowHistory.create({
    data: { definitionId, action: "UPDATED", actorId: actor.id, newValue: { archivedStep: row.code } },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_STEP_ARCHIVED,
    userId: actor.id,
    entity: "WorkflowStep",
    entityId: row.id,
    newValue: { definitionId, code: row.code },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toStepView(row as repo.WorkflowStepRow);
}

export async function restoreStep(
  actor: Actor,
  definitionId: string,
  stepId: string,
): Promise<WorkflowStepView> {
  assertCan(actor, PERMISSION.restore, "You need workflow.restore to restore steps");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  const existing = await repo.findStep(definitionId, stepId);
  if (!existing) throw new NotFoundError("Workflow step not found");
  const row = await prisma.workflowStep.update({
    where: { id: stepId },
    data: { deletedAt: null, status: "ACTIVE", updatedBy: actor.id },
  });
  await prisma.workflowHistory.create({
    data: { definitionId, action: "UPDATED", actorId: actor.id, newValue: { restoredStep: row.code } },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_STEP_RESTORED,
    userId: actor.id,
    entity: "WorkflowStep",
    entityId: row.id,
    newValue: { definitionId, code: row.code },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toStepView(row as repo.WorkflowStepRow);
}

// -----------------------------------------------------------------------------
// Transitions
// -----------------------------------------------------------------------------

async function assertTransitionTargets(
  definitionId: string,
  fromStepId: string,
  toStepId: string,
): Promise<void> {
  const steps = await prisma.workflowStep.findMany({
    where: { id: { in: [fromStepId, toStepId] }, definitionId },
    select: { id: true },
  });
  const found = new Set(steps.map((step) => step.id));
  if (!found.has(fromStepId)) throw new BadRequestError("Transition from-step does not exist");
  if (!found.has(toStepId)) throw new BadRequestError("Transition to-step does not exist");
}

export async function createTransition(
  actor: Actor,
  definitionId: string,
  body: CreateWorkflowTransitionBody,
): Promise<WorkflowTransitionView> {
  assertCan(actor, PERMISSION.create, "You need workflow.create to add transitions");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  assertEditable(definition.status);
  await assertTransitionTargets(definitionId, body.fromStepId, body.toStepId);
  const existing = await prisma.workflowTransition.findFirst({
    where: { definitionId, fromStepId: body.fromStepId, actionCode: body.actionCode },
  });
  if (existing) throw new ConflictError("This action already exists from the source step");
  const row = await prisma.workflowTransition.create({
    data: {
      definitionId,
      fromStepId: body.fromStepId,
      toStepId: body.toStepId,
      actionCode: body.actionCode,
      requiredPermission: body.requiredPermission ?? null,
      sortOrder: body.sortOrder ?? 0,
      metadata: (body.metadata ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      createdBy: actor.id,
    },
  });
  await prisma.workflowHistory.create({
    data: {
      definitionId,
      action: "UPDATED",
      actorId: actor.id,
      newValue: { transition: body.actionCode },
    },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_TRANSITION_CREATED,
    userId: actor.id,
    entity: "WorkflowTransition",
    entityId: row.id,
    newValue: { definitionId, fromStepId: body.fromStepId, toStepId: body.toStepId, actionCode: body.actionCode },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toTransitionView(row as repo.WorkflowTransitionRow);
}

export async function updateTransition(
  actor: Actor,
  definitionId: string,
  transitionId: string,
  body: UpdateWorkflowTransitionBody,
): Promise<WorkflowTransitionView> {
  assertCan(actor, PERMISSION.update, "You need workflow.update to edit transitions");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  assertEditable(definition.status);
  const existing = await repo.findTransition(definitionId, transitionId);
  if (!existing) throw new NotFoundError("Workflow transition not found");
  if (body.toStepId && body.toStepId !== existing.toStepId) {
    await assertTransitionTargets(definitionId, existing.fromStepId, body.toStepId);
  }
  const oldValue = { actionCode: existing.actionCode, fromStepId: existing.fromStepId, toStepId: existing.toStepId };
  const row = await prisma.workflowTransition.update({
    where: { id: transitionId },
    data: {
      toStepId: body.toStepId ?? undefined,
      actionCode: body.actionCode ?? undefined,
      requiredPermission: body.requiredPermission === undefined ? undefined : body.requiredPermission,
      sortOrder: body.sortOrder ?? undefined,
      metadata: (body.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  await prisma.workflowHistory.create({
    data: { definitionId, action: "UPDATED", actorId: actor.id, newValue: { transition: row.actionCode } },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_TRANSITION_UPDATED,
    userId: actor.id,
    entity: "WorkflowTransition",
    entityId: row.id,
    oldValue,
    newValue: { actionCode: row.actionCode, fromStepId: row.fromStepId, toStepId: row.toStepId },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toTransitionView(row as repo.WorkflowTransitionRow);
}

export async function archiveTransition(
  actor: Actor,
  definitionId: string,
  transitionId: string,
): Promise<WorkflowTransitionView> {
  assertCan(actor, PERMISSION.archive, "You need workflow.archive to archive transitions");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  assertEditable(definition.status);
  const existing = await repo.findTransition(definitionId, transitionId);
  if (!existing) throw new NotFoundError("Workflow transition not found");
  const row = await prisma.workflowTransition.update({
    where: { id: transitionId },
    data: { deletedAt: new Date() },
  });
  await prisma.workflowHistory.create({
    data: { definitionId, action: "UPDATED", actorId: actor.id, newValue: { archivedTransition: row.actionCode } },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_TRANSITION_ARCHIVED,
    userId: actor.id,
    entity: "WorkflowTransition",
    entityId: row.id,
    newValue: { definitionId, actionCode: row.actionCode },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toTransitionView(row as repo.WorkflowTransitionRow);
}

export async function restoreTransition(
  actor: Actor,
  definitionId: string,
  transitionId: string,
): Promise<WorkflowTransitionView> {
  assertCan(actor, PERMISSION.restore, "You need workflow.restore to restore transitions");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  const existing = await repo.findTransition(definitionId, transitionId);
  if (!existing) throw new NotFoundError("Workflow transition not found");
  const row = await prisma.workflowTransition.update({
    where: { id: transitionId },
    data: { deletedAt: null },
  });
  await prisma.workflowHistory.create({
    data: { definitionId, action: "UPDATED", actorId: actor.id, newValue: { restoredTransition: row.actionCode } },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_TRANSITION_RESTORED,
    userId: actor.id,
    entity: "WorkflowTransition",
    entityId: row.id,
    newValue: { definitionId, actionCode: row.actionCode },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return toTransitionView(row as repo.WorkflowTransitionRow);
}

// -----------------------------------------------------------------------------
// Assignments
// -----------------------------------------------------------------------------

export async function listAssignments(
  actor: Actor,
  q: ListWorkflowAssignmentsQuery,
): Promise<WorkflowAssignmentView[]> {
  assertCan(actor, PERMISSION.read, "You need workflow.read to view assignments");
  const rows = await repo.listAssignments({
    where: {
      deletedAt: null,
      ...(q.definitionId ? { definitionId: q.definitionId } : {}),
      ...(q.targetType ? { targetType: q.targetType } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
  });
  return assignmentViews(rows);
}

async function assertTargetExists(
  targetType: string,
  targetId: string | null,
): Promise<void> {
  if (targetType === "UNIVERSITY") {
    if (targetId) throw new BadRequestError("UNIVERSITY assignments must not carry a target id");
    return;
  }
  if (!targetId) throw new BadRequestError(`${targetType} assignments require a target id`);
  let exists = false;
  if (targetType === "COLLEGE") {
    exists = (await prisma.college.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
  } else if (targetType === "DEPARTMENT") {
    exists = (await prisma.department.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
  } else if (targetType === "PROGRAM") {
    exists = (await prisma.program.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
  } else if (targetType === "OFFICE") {
    exists = (await prisma.office.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
  } else if (targetType === "AACCUP_AREA") {
    exists = (await prisma.aaccupArea.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
  } else if (targetType === "ACCREDITATION_CYCLE") {
    exists = (await prisma.accreditationCycle.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
  }
  if (!exists) throw new BadRequestError(`Assignment target ${targetType} does not exist`);
}

export async function assignDefinition(
  actor: Actor,
  definitionId: string,
  body: AssignWorkflowDefinitionBody,
): Promise<WorkflowAssignmentView> {
  assertCan(actor, PERMISSION.assign, "You need workflow.assign to assign workflows");
  const definition = await repo.findDefinition(definitionId);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  await assertTargetExists(body.targetType, body.targetId ?? null);
  const existing = await prisma.workflowAssignment.findFirst({
    where: { definitionId, targetType: body.targetType, targetId: body.targetId ?? null, deletedAt: null },
  });
  if (existing) throw new ConflictError("This workflow is already assigned to this scope");
  const row = await prisma.workflowAssignment.create({
    data: {
      definitionId,
      targetType: body.targetType,
      targetId: body.targetId ?? null,
      priority: body.priority ?? 0,
      createdBy: actor.id,
    },
  });
  await prisma.workflowHistory.create({
    data: {
      definitionId,
      action: "ASSIGNED",
      actorId: actor.id,
      newValue: { targetType: body.targetType, targetId: body.targetId ?? null, priority: body.priority ?? 0 },
    },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_ASSIGNMENT_CREATED,
    userId: actor.id,
    entity: "WorkflowAssignment",
    entityId: row.id,
    newValue: { definitionId, targetType: body.targetType, targetId: body.targetId ?? null, priority: body.priority ?? 0 },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  const views = await assignmentViews([row as repo.WorkflowAssignmentRow], { id: definition.id, name: definition.name });
  return views[0]!;
}

export async function unassign(
  actor: Actor,
  assignmentId: string,
): Promise<{ id: string }> {
  assertCan(actor, PERMISSION.assign, "You need workflow.assign to unassign workflows");
  const existing = await prisma.workflowAssignment.findFirst({
    where: { id: assignmentId, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Workflow assignment not found");
  await prisma.workflowAssignment.update({
    where: { id: assignmentId },
    data: { deletedAt: new Date() },
  });
  await prisma.workflowHistory.create({
    data: {
      definitionId: existing.definitionId,
      action: "UNASSIGNED",
      actorId: actor.id,
      newValue: { targetType: existing.targetType, targetId: existing.targetId },
    },
  });
  invalidateWorkflowCache();
  await writeAudit({
    action: AUDIT_ACTIONS.WORKFLOW_ASSIGNMENT_REMOVED,
    userId: actor.id,
    entity: "WorkflowAssignment",
    entityId: assignmentId,
    oldValue: { definitionId: existing.definitionId, targetType: existing.targetType, targetId: existing.targetId },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return { id: assignmentId };
}

// -----------------------------------------------------------------------------
// Validation / publish / rollback
// -----------------------------------------------------------------------------

export async function validateDefinition(
  actor: Actor,
  id: string,
): Promise<WorkflowValidationResult> {
  assertCan(actor, PERMISSION.validate, "You need workflow.validate to validate workflows");
  const definition = await repo.findDefinition(id);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  const issues = await collectValidationIssues(id);
  const errors = issues.filter((issue) => issue.severity === "ERROR");
  await prisma.workflowHistory.create({
    data: { definitionId: id, action: "VALIDATED", actorId: actor.id, newValue: { issues: errors.length } },
  });
  return { valid: errors.length === 0, issues, checksRun: 13 };
}

async function collectValidationIssues(
  definitionId: string,
): Promise<WorkflowValidationIssue[]> {
  const issues: WorkflowValidationIssue[] = [];
  const [steps, transitions] = await Promise.all([
    repo.listSteps(definitionId),
    repo.listTransitions(definitionId),
  ]);
  const activeSteps = steps.filter((step) => step.deletedAt === null);
  const activeTransitions = transitions.filter((transition) => transition.deletedAt === null);
  const stepById = new Map(activeSteps.map((step) => [step.id, step]));
  const stepCodes = new Set<string>();

  const startSteps = activeSteps.filter((step) => step.type === "START");
  if (startSteps.length === 0) {
    issues.push({ code: "MISSING_START", message: "A workflow must have exactly one start step", severity: "ERROR" });
  } else if (startSteps.length > 1) {
    issues.push({ code: "MULTIPLE_START", message: "A workflow can have only one start step", severity: "ERROR" });
  }

  const endSteps = activeSteps.filter((step) => step.type === "END");
  if (endSteps.length === 0) {
    issues.push({ code: "MISSING_END", message: "A workflow must have at least one terminal (END) step", severity: "ERROR" });
  }

  for (const step of activeSteps) {
    if (stepCodes.has(step.code)) {
      issues.push({ code: "DUPLICATE_STEP_CODE", message: `Step code "${step.code}" is duplicated`, severity: "ERROR" });
    }
    stepCodes.add(step.code);
  }

  for (const transition of activeTransitions) {
    if (!stepById.has(transition.fromStepId)) {
      issues.push({
        code: "BROKEN_TRANSITION",
        message: `Transition "${transition.actionCode}" references a missing from-step`,
        severity: "ERROR",
      });
    }
    if (!stepById.has(transition.toStepId)) {
      issues.push({
        code: "BROKEN_TRANSITION",
        message: `Transition "${transition.actionCode}" references a missing to-step`,
        severity: "ERROR",
      });
    }
    if (transition.requiredPermission && !PERMISSION_CODES.includes(transition.requiredPermission as never)) {
      issues.push({
        code: "UNKNOWN_PERMISSION",
        message: `Transition "${transition.actionCode}" requires unknown permission "${transition.requiredPermission}"`,
        severity: "ERROR",
      });
    }
  }

  const actionsPerFrom = new Map<string, Set<string>>();
  for (const transition of activeTransitions) {
    const actions = actionsPerFrom.get(transition.fromStepId) ?? new Set<string>();
    if (actions.has(transition.actionCode)) {
      issues.push({
        code: "DUPLICATE_ACTION",
        message: `Action "${transition.actionCode}" is defined more than once from the same step`,
        severity: "ERROR",
      });
    }
    actions.add(transition.actionCode);
    actionsPerFrom.set(transition.fromStepId, actions);
  }

  const outgoing = new Map<string, number>();
  for (const transition of activeTransitions) {
    outgoing.set(transition.fromStepId, (outgoing.get(transition.fromStepId) ?? 0) + 1);
  }
  for (const step of activeSteps) {
    if (step.type !== "END" && (outgoing.get(step.id) ?? 0) === 0) {
      issues.push({
        code: "NO_OUTGOING_TRANSITION",
        message: `Non-terminal step "${step.code}" has no outgoing transition`,
        severity: "ERROR",
      });
    }
  }

  // Reachability from the (single) start step.
  const reachable = new Set<string>();
  const queue = startSteps.length === 1 ? [startSteps[0]!.id] : [];
  while (queue.length > 0) {
    const stepId = queue.shift()!;
    if (reachable.has(stepId)) continue;
    reachable.add(stepId);
    for (const transition of activeTransitions) {
      if (transition.fromStepId === stepId && !reachable.has(transition.toStepId)) {
        queue.push(transition.toStepId);
      }
    }
  }
  for (const step of activeSteps) {
    if (!reachable.has(step.id)) {
      issues.push({
        code: "UNREACHABLE_STEP",
        message: `Step "${step.code}" is not reachable from the start step`,
        severity: "ERROR",
      });
    }
  }

  // Every step must be able to terminate (reverse reachability from END steps
  // catches both unreachable-END steps and pure cycles that never reach END).
  const canTerminate = new Set<string>();
  const reverseQueue = [...endSteps.map((step) => step.id)];
  while (reverseQueue.length > 0) {
    const stepId = reverseQueue.shift()!;
    if (canTerminate.has(stepId)) continue;
    canTerminate.add(stepId);
    for (const transition of activeTransitions) {
      if (transition.toStepId === stepId && !canTerminate.has(transition.fromStepId)) {
        reverseQueue.push(transition.fromStepId);
      }
    }
  }
  for (const step of activeSteps) {
    if (!canTerminate.has(step.id)) {
      issues.push({
        code: "NON_TERMINATING",
        message: `Step "${step.code}" can never reach a terminal step (cycle or dead end)`,
        severity: "ERROR",
      });
    }
  }

  // Referenced roles and permissions must exist (platform-first rule).
  const roleNames = [...new Set(activeSteps.map((step) => step.roleName).filter((name): name is string => !!name))];
  if (roleNames.length > 0) {
    const roles = await prisma.role.findMany({ where: { name: { in: roleNames as never } }, select: { name: true } });
    const known = new Set(roles.map((role) => role.name));
    for (const name of roleNames) {
      if (!known.has(name as never)) {
        issues.push({
          code: "UNKNOWN_ROLE",
          message: `Step references unknown role "${name}"`,
          severity: "ERROR",
        });
      }
    }
  }
  const permissionCodes = [
    ...new Set(
      activeSteps
        .map((step) => step.permissionCode)
        .filter((code): code is string => !!code),
    ),
  ];
  for (const code of permissionCodes) {
    if (!PERMISSION_CODES.includes(code as never)) {
      issues.push({
        code: "UNKNOWN_PERMISSION",
        message: `Step references unknown permission "${code}"`,
        severity: "ERROR",
      });
    }
  }

  // Assignment targets must exist.
  const assignments = await repo.listAssignments({ where: { definitionId, deletedAt: null } });
  for (const assignment of assignments) {
    if (assignment.targetType === "UNIVERSITY") continue;
    let exists = false;
    if (assignment.targetId) {
      try {
        await assertTargetExists(assignment.targetType, assignment.targetId);
        exists = true;
      } catch {
        exists = false;
      }
    }
    if (!exists) {
      issues.push({
        code: "BROKEN_ASSIGNMENT",
        message: `Assignment to ${assignment.targetType} references a missing target`,
        severity: "ERROR",
      });
    }
  }

  if (activeSteps.length < 2) {
    issues.push({
      code: "TOO_FEW_STEPS",
      message: "A workflow needs at least a start step and a terminal step",
      severity: "ERROR",
    });
  }

  return issues;
}

async function buildSnapshotInTx(
  tx: Prisma.TransactionClient,
  definitionId: string,
  version: number,
): Promise<WorkflowSnapshot> {
  const [definition, steps, transitions, assignments] = await Promise.all([
    tx.workflowDefinition.findUnique({ where: { id: definitionId } }),
    tx.workflowStep.findMany({
      where: { definitionId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
    tx.workflowTransition.findMany({
      where: { definitionId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { actionCode: "asc" }],
    }),
    tx.workflowAssignment.findMany({ where: { definitionId, deletedAt: null } }),
  ]);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  return {
    name: definition.name,
    code: definition.code,
    description: definition.description,
    entityType: definition.entityType,
    version,
    steps: steps.map((step) => ({
      id: step.id,
      code: step.code,
      name: step.name,
      description: step.description,
      type: step.type,
      roleName: step.roleName,
      permissionCode: step.permissionCode,
      sortOrder: step.sortOrder,
    })),
    transitions: transitions.map((transition) => ({
      id: transition.id,
      fromStepId: transition.fromStepId,
      toStepId: transition.toStepId,
      actionCode: transition.actionCode,
      requiredPermission: transition.requiredPermission,
      sortOrder: transition.sortOrder,
    })),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      targetType: assignment.targetType,
      targetId: assignment.targetId,
      priority: assignment.priority,
    })),
  };
}

export async function publishDefinition(
  actor: Actor,
  id: string,
  body: PublishWorkflowDefinitionBody,
): Promise<WorkflowDefinitionView> {
  assertCan(actor, PERMISSION.publish, "You need workflow.publish to publish workflows");
  const definition = await repo.findDefinition(id);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  if (definition.status !== "DRAFT") {
    throw new ConflictError(`Only DRAFT workflows can be published (current: ${definition.status})`);
  }
  const result = await validateDefinition(actor, id);
  if (!result.valid) {
    throw new BadRequestError("Workflow validation failed; fix the reported issues before publishing", {
      issues: result.issues,
    });
  }
  const nextVersion = definition.version + 1;
  return prisma.$transaction(async (tx) => {
    const snapshot = await buildSnapshotInTx(tx, id, nextVersion);
    await tx.workflowVersion.create({
      data: {
        definitionId: id,
        version: nextVersion,
        changeType: "PUBLISHED",
        data: snapshot as unknown as Prisma.InputJsonValue,
        changeNote: body.changeNote ?? null,
        changedById: actor.id,
      },
    });
    await tx.workflowHistory.create({
      data: {
        definitionId: id,
        action: "PUBLISHED",
        actorId: actor.id,
        versionFrom: definition.version,
        versionTo: nextVersion,
        newValue: { changeNote: body.changeNote ?? null, stepCount: snapshot.steps.length, transitionCount: snapshot.transitions.length },
      },
    });
    const row = await tx.workflowDefinition.update({
      where: { id },
      data: { status: "PUBLISHED", version: nextVersion, updatedBy: actor.id },
      include: {
        createdByUser: { select: { firstName: true, lastName: true } },
        updatedByUser: { select: { firstName: true, lastName: true } },
        _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
      },
    });
    return row;
  }).then(async (row) => {
    invalidateWorkflowCache();
    await writeAudit({
      action: AUDIT_ACTIONS.WORKFLOW_DEFINITION_PUBLISHED,
      userId: actor.id,
      entity: "WorkflowDefinition",
      entityId: row.id,
      oldValue: { version: definition.version, status: "DRAFT" },
      newValue: { version: nextVersion, status: "PUBLISHED", changeNote: body.changeNote ?? null },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toDefinitionView(row as repo.WorkflowDefinitionRow);
  });
}

export async function rollbackDefinition(
  actor: Actor,
  id: string,
  body: RollbackWorkflowDefinitionBody,
): Promise<WorkflowDefinitionView> {
  assertCan(actor, PERMISSION.rollback, "You need workflow.rollback to roll workflows back");
  const definition = await repo.findDefinition(id);
  if (!definition) throw new NotFoundError("Workflow definition not found");
  if (definition.status === "ARCHIVED") {
    throw new ConflictError("Archived workflows cannot be rolled back");
  }
  const version = await repo.findVersion(id, body.version);
  if (!version) throw new NotFoundError("Workflow version not found");
  const snapshot = version.data as unknown as WorkflowSnapshot;

  return prisma.$transaction(async (tx) => {
    await tx.workflowStep.deleteMany({ where: { definitionId: id } });
    await tx.workflowTransition.deleteMany({ where: { definitionId: id } });
    await tx.workflowAssignment.deleteMany({ where: { definitionId: id } });
    for (const step of snapshot.steps) {
      await tx.workflowStep.create({
        data: {
          id: step.id,
          definitionId: id,
          code: step.code,
          name: step.name,
          description: step.description,
          type: step.type,
          roleName: step.roleName,
          permissionCode: step.permissionCode,
          sortOrder: step.sortOrder,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
    }
    for (const transition of snapshot.transitions) {
      await tx.workflowTransition.create({
        data: {
          id: transition.id,
          definitionId: id,
          fromStepId: transition.fromStepId,
          toStepId: transition.toStepId,
          actionCode: transition.actionCode,
          requiredPermission: transition.requiredPermission,
          sortOrder: transition.sortOrder,
          createdBy: actor.id,
        },
      });
    }
    for (const assignment of snapshot.assignments) {
      await tx.workflowAssignment.create({
        data: {
          id: assignment.id,
          definitionId: id,
          targetType: assignment.targetType,
          targetId: assignment.targetId,
          priority: assignment.priority,
          createdBy: actor.id,
        },
      });
    }
    await tx.workflowHistory.create({
      data: {
        definitionId: id,
        action: "ROLLED_BACK",
        actorId: actor.id,
        versionFrom: body.version,
        versionTo: body.version,
        newValue: { changeNote: body.changeNote ?? null },
      },
    });
    return tx.workflowDefinition.update({
      where: { id },
      data: { status: "DRAFT", version: body.version, updatedBy: actor.id },
      include: {
        createdByUser: { select: { firstName: true, lastName: true } },
        updatedByUser: { select: { firstName: true, lastName: true } },
        _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
      },
    });
  }).then(async (row) => {
    invalidateWorkflowCache();
    await writeAudit({
      action: AUDIT_ACTIONS.WORKFLOW_DEFINITION_ROLLED_BACK,
      userId: actor.id,
      entity: "WorkflowDefinition",
      entityId: row.id,
      oldValue: { version: definition.version, status: definition.status },
      newValue: { version: body.version, status: "DRAFT", changeNote: body.changeNote ?? null },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toDefinitionView(row as repo.WorkflowDefinitionRow);
  });
}

// -----------------------------------------------------------------------------
// Runtime views (management side)
// -----------------------------------------------------------------------------

export async function listInstances(
  actor: Actor,
  q: ListWorkflowInstancesQuery,
): Promise<WorkflowListResult<{ id: string; definitionId: string; entityType: string; entityId: string; status: string; currentStepCode: string | null; startedAt: Date; completedAt: Date | null }>> {
  if (!actor.permissions.includes(PERMISSION.read) && !actor.permissions.includes("workflow.instance.read")) {
    throw new ForbiddenError("You need workflow.read or workflow.instance.read to view instances");
  }
  const where: Prisma.WorkflowInstanceWhereInput = {};
  if (q.entityType) where.entityType = q.entityType;
  if (q.entityId) where.entityId = q.entityId;
  if (q.status) where.status = q.status;
  if (q.definitionId) where.definitionId = q.definitionId;
  const [rows, total] = await Promise.all([
    repo.listInstances({
      where,
      orderBy: [{ startedAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    repo.countInstances({ where }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      definitionId: row.definitionId,
      entityType: row.entityType,
      entityId: row.entityId,
      status: row.status,
      currentStepCode: row.currentStepCode,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    })),
    meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
  };
}

export async function getInstanceView(actor: Actor, instanceId: string): Promise<WorkflowInstanceView> {
  if (!actor.permissions.includes(PERMISSION.read) && !actor.permissions.includes("workflow.instance.read")) {
    throw new ForbiddenError("You need workflow.read or workflow.instance.read to view instances");
  }
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: {
      definition: { select: { name: true, code: true } },
      version: { select: { version: true, data: true } },
      startedBy: { select: { firstName: true, lastName: true } },
      stepInstances: {
        orderBy: { activatedAt: "asc" },
        include: { actor: { select: { firstName: true, lastName: true } } },
      },
      actions: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!instance) throw new NotFoundError("Workflow instance not found");

  let allowedActions: string[] = [];
  let currentStepType: WorkflowInstanceView["currentStepType"] = null;
  if (instance.status === "RUNNING" && instance.currentStepCode) {
    const snapshot = instance.version.data as unknown as WorkflowSnapshot;
    const current = snapshot.steps.find((step) => step.code === instance.currentStepCode);
    if (current) {
      currentStepType = current.type;
      allowedActions = snapshot.transitions
        .filter((transition) => transition.fromStepId === current.id)
        .map((transition) => transition.actionCode);
    }
  }

  return {
    id: instance.id,
    definitionId: instance.definitionId,
    definitionName: instance.definition.name,
    definitionCode: instance.definition.code,
    version: instance.version.version,
    entityType: instance.entityType,
    entityId: instance.entityId,
    status: instance.status,
    currentStepId: null,
    currentStepCode: instance.currentStepCode,
    currentStepName: instance.currentStepCode
      ? ((instance.version.data as unknown as WorkflowSnapshot).steps.find((step) => step.code === instance.currentStepCode)?.name ?? instance.currentStepCode)
      : null,
    currentStepType,
    startedById: instance.startedById,
    startedByName: personName(instance.startedBy),
    startedAt: instance.startedAt,
    completedAt: instance.completedAt,
    stepInstances: instance.stepInstances.map(
      (row): WorkflowStepInstanceView => ({
        id: row.id,
        instanceId: row.instanceId,
        stepId: row.stepCode,
        stepCode: row.stepCode,
        stepName: row.stepName,
        stepType: row.stepType,
        status: row.status,
        activatedAt: row.activatedAt,
        completedAt: row.completedAt,
        actorId: row.actorId,
        actorName: personName(row.actor),
        note: row.note,
      }),
    ),
    actions: instance.actions.map(
      (row): WorkflowActionView => ({
        id: row.id,
        instanceId: row.instanceId,
        stepId: row.stepCode,
        stepCode: row.stepCode,
        actionCode: row.actionCode,
        fromStepId: row.fromStepCode,
        toStepId: row.toStepCode,
        actorId: row.actorId,
        actorName: personName(row.actor),
        note: row.note,
        createdAt: row.createdAt,
      }),
    ),
    allowedActions,
  };
}
