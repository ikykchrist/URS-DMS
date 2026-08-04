import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, type AuditAction } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import * as repo from "@/modules/root/root.requirement.repository";
import {
  invalidateRequirementResolutionCache,
  refreshRequirementProjectionsForCycleBestEffort,
  refreshRequirementProjectionsForTemplateBestEffort,
} from "@/modules/requirements/requirement.runtime";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type {
  AccreditationCycleView,
  ListResult,
  RequirementAssignmentView,
  RequirementHistoryView,
  RequirementSnapshot,
  RequirementSnapshotValidation,
  RequirementTargetType,
  RequirementTemplateDetail,
  RequirementTemplateView,
  RequirementTreeNode,
  RequirementValidationView,
  RequirementVersionView,
} from "@/modules/root/root.requirement.types";
import type {
  AssignRequirementTemplateBody,
  CreateAccreditationCycleBody,
  CreateRequirementNodeBody,
  CreateRequirementTemplateBody,
  CreateRequirementValidationBody,
  ListAccreditationCyclesQuery,
  ListRequirementAssignmentsQuery,
  ListRequirementHistoryQuery,
  ListRequirementNodesQuery,
  ListRequirementTemplatesQuery,
  MoveRequirementNodeBody,
  RollbackRequirementTemplateBody,
  UpdateAccreditationCycleBody,
  UpdateRequirementNodeBody,
  UpdateRequirementTemplateBody,
  UpdateRequirementValidationBody,
} from "@/modules/root/root.requirement.validator";

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

const PERMISSION = {
  read: "requirement.read",
  create: "requirement.create",
  update: "requirement.update",
  archive: "requirement.archive",
  restore: "requirement.restore",
  assign: "requirement.assign",
  rollback: "requirement.rollback",
} as const;

function assertCan(actor: Actor, permission: string, message: string): void {
  if (!actor.permissions.includes(permission)) throw new ForbiddenError(message);
}

function personName(person: { firstName: string; lastName: string } | null): string | null {
  return person ? `${person.firstName} ${person.lastName}`.trim() : null;
}

function toTemplateView(row: repo.RequirementTemplateRow): RequirementTemplateView {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    category: row.category,
    metadata: row.metadata,
    status: row.status,
    version: row.version,
    createdBy: row.createdBy,
    createdByName: personName(row.createdByUser),
    updatedBy: row.updatedBy,
    updatedByName: personName(row.updatedByUser),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    nodeCount: row._count.nodes,
    validationCount: row.validationCount,
    assignmentCount: row._count.assignments,
  };
}

function toValidationView(row: repo.RequirementValidationRow): RequirementValidationView {
  return {
    id: row.id,
    nodeId: row.nodeId,
    type: row.type,
    config: row.config,
    message: row.message,
    severity: row.severity,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function toNode(row: repo.RequirementNodeRow): Omit<RequirementTreeNode, "children"> {
  return {
    id: row.id,
    templateId: row.templateId,
    parentId: row.parentId,
    code: row.code,
    name: row.name,
    description: row.description,
    helpText: row.helpText,
    type: row.type,
    metadata: row.metadata,
    isRequired: row.isRequired,
    allowMultiple: row.allowMultiple,
    sortOrder: row.sortOrder,
    level: row.level,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    validations: row.validations.map(toValidationView),
  };
}

function buildTree(rows: repo.RequirementNodeRow[]): RequirementTreeNode[] {
  const byParent = new Map<string | null, RequirementTreeNode[]>();
  for (const row of rows) {
    const node: RequirementTreeNode = { ...toNode(row), children: [] };
    const bucket = byParent.get(row.parentId) ?? [];
    bucket.push(node);
    byParent.set(row.parentId, bucket);
  }
  const attach = (parentId: string | null): RequirementTreeNode[] => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) child.children = attach(child.id);
    return children;
  };
  return attach(null);
}

function findTreeNode(tree: RequirementTreeNode[], nodeId: string): RequirementTreeNode {
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.shift()!;
    if (node.id === nodeId) return node;
    stack.unshift(...node.children);
  }
  throw new NotFoundError("Requirement node not found after mutation");
}

function toVersionView(row: repo.RequirementVersionRow): RequirementVersionView {
  return {
    id: row.id,
    templateId: row.templateId,
    version: row.version,
    changeType: row.changeType,
    data: row.data,
    changeNote: row.changeNote,
    changedById: row.changedById,
    changedByName: personName(row.changedBy),
    createdAt: row.createdAt,
  };
}

function toHistoryView(row: repo.RequirementHistoryRow): RequirementHistoryView {
  return {
    id: row.id,
    templateId: row.templateId,
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
  rows: repo.RequirementAssignmentRow[],
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
    prisma.college.findMany({
      where: { id: { in: ids.COLLEGE } },
      select: { id: true, name: true },
    }),
    prisma.department.findMany({
      where: { id: { in: ids.DEPARTMENT } },
      select: { id: true, name: true },
    }),
    prisma.program.findMany({
      where: { id: { in: ids.PROGRAM } },
      select: { id: true, name: true },
    }),
    prisma.office.findMany({ where: { id: { in: ids.OFFICE } }, select: { id: true, name: true } }),
    prisma.aaccupArea.findMany({
      where: { id: { in: ids.AACCUP_AREA } },
      select: { id: true, name: true },
    }),
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
  rows: repo.RequirementAssignmentRow[],
  knownTemplate?: repo.RequirementTemplateRow,
): Promise<RequirementAssignmentView[]> {
  const names = await resolveTargetNames(rows);
  const templateIds = [...new Set(rows.map((row) => row.templateId))];
  const templates = knownTemplate
    ? [{ id: knownTemplate.id, name: knownTemplate.name }]
    : await prisma.requirementTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, name: true },
      });
  const templateNames = new Map(templates.map((template) => [template.id, template.name]));
  return rows.map((row) => ({
    id: row.id,
    templateId: row.templateId,
    templateName: templateNames.get(row.templateId) ?? "Unknown template",
    targetType: row.targetType,
    targetId: row.targetId,
    targetName: row.targetId ? (names.get(row.targetId) ?? "Unknown target") : "Entire University",
    createdAt: row.createdAt,
  }));
}

function snapshotValidation(row: {
  id: string;
  type: string;
  config: Prisma.JsonValue;
  message: string | null;
  severity: string;
  enabled: boolean;
  sortOrder: number;
}): RequirementSnapshotValidation {
  return {
    id: row.id,
    type: row.type as RequirementSnapshotValidation["type"],
    config: row.config,
    message: row.message,
    severity: row.severity as RequirementSnapshotValidation["severity"],
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

async function buildSnapshotInTx(
  tx: Prisma.TransactionClient,
  templateId: string,
): Promise<RequirementSnapshot> {
  const [template, nodes, assignments] = await Promise.all([
    tx.requirementTemplate.findUnique({ where: { id: templateId } }),
    tx.requirementNode.findMany({
      where: { templateId, deletedAt: null },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        validations: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { type: "asc" }],
        },
      },
    }),
    tx.requirementAssignment.findMany({
      where: { templateId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!template) throw new NotFoundError("Requirement template not found");
  return {
    name: template.name,
    code: template.code,
    description: template.description,
    category: template.category,
    metadata: template.metadata,
    status: template.status,
    nodes: nodes.map((node) => ({
      id: node.id,
      parentId: node.parentId,
      code: node.code,
      name: node.name,
      description: node.description,
      helpText: node.helpText,
      type: node.type,
      metadata: node.metadata,
      isRequired: node.isRequired,
      allowMultiple: node.allowMultiple,
      sortOrder: node.sortOrder,
      level: node.level,
      status: node.status,
      validations: node.validations.map(snapshotValidation),
    })),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      targetType: assignment.targetType,
      targetId: assignment.targetId,
    })),
  };
}

async function auditMutation(
  actor: Actor,
  action: AuditAction,
  entity: string,
  entityId: string,
  value: Record<string, unknown>,
): Promise<void> {
  await writeAudit({
    action,
    userId: actor.id,
    entity,
    entityId,
    newValue: value,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

async function mutateTemplate(
  template: repo.RequirementTemplateRow,
  actor: Actor,
  mutation: (tx: Prisma.TransactionClient) => Promise<void>,
  changeType: RequirementVersionView["changeType"],
  auditAction: AuditAction,
  auditEntity: string,
  auditEntityId: string,
  auditValue: Record<string, unknown>,
  changeNote: string | null,
): Promise<void> {
  const nextVersion = template.version + 1;
  await prisma.$transaction(async (tx) => {
    await mutation(tx);
    const claimed = await tx.requirementTemplate.updateMany({
      where: { id: template.id, version: template.version },
      data: { version: nextVersion, updatedBy: actor.id },
    });
    if (claimed.count !== 1) {
      throw new ConflictError("Requirement template changed concurrently; reload and retry");
    }
    const snapshot = await buildSnapshotInTx(tx, template.id);
    await repo.appendVersion(tx, {
      templateId: template.id,
      version: nextVersion,
      changeType,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      changeNote,
      actorId: actor.id,
    });
    await repo.appendHistory(tx, {
      templateId: template.id,
      action: changeType,
      oldValue: { name: template.name, version: template.version },
      newValue: { ...auditValue, version: nextVersion },
      versionFrom: template.version,
      versionTo: nextVersion,
      actorId: actor.id,
    });
  });
  invalidateRequirementResolutionCache();
  await auditMutation(actor, auditAction, auditEntity, auditEntityId, auditValue);
  await refreshRequirementProjectionsForTemplateBestEffort(template.id, actor.id);
}

async function getDetail(
  template: repo.RequirementTemplateRow,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(actor, PERMISSION.read, "You do not have access to the requirement builder");
  const [nodes, assignments] = await Promise.all([
    repo.listTemplateNodes(template.id),
    repo.listAssignments({ templateId: template.id }),
  ]);
  return {
    template: toTemplateView(template),
    tree: buildTree(nodes),
    assignments: await assignmentViews(assignments, template),
  };
}

export async function listTemplates(
  query: ListRequirementTemplatesQuery,
  actor: Actor,
): Promise<ListResult<RequirementTemplateView>> {
  assertCan(actor, PERMISSION.read, "You do not have access to the requirement builder");
  const where: Prisma.RequirementTemplateWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.category) where.category = { equals: query.category, mode: "insensitive" };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { code: { contains: query.q, mode: "insensitive" } },
      { category: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }
  const { items, total } = await repo.listTemplates(
    where,
    query.page,
    query.pageSize,
    query.includeArchived ?? false,
  );
  return {
    items: items.map(toTemplateView),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function getTemplate(id: string, actor: Actor): Promise<RequirementTemplateDetail> {
  const template = await repo.findTemplateById(id, true);
  if (!template) throw new NotFoundError("Requirement template not found");
  return getDetail(template, actor);
}

export async function createTemplate(
  input: CreateRequirementTemplateBody,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(actor, PERMISSION.create, "You do not have permission to create requirement templates");
  if (await repo.findTemplateByCode(input.code)) {
    throw new ConflictError(`A requirement template with code "${input.code}" already exists`);
  }
  if (await repo.findLiveTemplateByName(input.name)) {
    throw new ConflictError(`A requirement template named "${input.name}" already exists`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const template = await tx.requirementTemplate.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        category: input.category ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        status: input.status,
        version: 1,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
    const snapshot = await buildSnapshotInTx(tx, template.id);
    await repo.appendVersion(tx, {
      templateId: template.id,
      version: 1,
      changeType: "CREATED",
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      changeNote: "Initial requirement template",
      actorId: actor.id,
    });
    await repo.appendHistory(tx, {
      templateId: template.id,
      action: "CREATED",
      oldValue: null,
      newValue: { name: template.name, code: template.code, version: 1 },
      versionFrom: null,
      versionTo: 1,
      actorId: actor.id,
    });
    return template;
  });
  await auditMutation(
    actor,
    AUDIT_ACTIONS.REQUIREMENT_TEMPLATE_CREATED,
    "requirement_template",
    created.id,
    {
      name: created.name,
      code: created.code,
    },
  );
  return getTemplate(created.id, actor);
}

export async function updateTemplate(
  id: string,
  input: UpdateRequirementTemplateBody,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(actor, PERMISSION.update, "You do not have permission to update requirement templates");
  const template = await repo.findTemplateById(id);
  if (!template) throw new NotFoundError("Requirement template not found");
  if (input.code && input.code !== template.code) {
    const duplicate = await repo.findTemplateByCode(input.code);
    if (duplicate && duplicate.id !== id)
      throw new ConflictError(`Template code "${input.code}" is already used`);
  }
  if (input.name && input.name.toLowerCase() !== template.name.toLowerCase()) {
    const duplicate = await repo.findLiveTemplateByName(input.name);
    if (duplicate && duplicate.id !== id)
      throw new ConflictError(`Template name "${input.name}" is already used`);
  }
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementTemplate.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.metadata !== undefined
            ? {
                metadata: (input.metadata ?? null) as
                  | Prisma.NullableJsonNullValueInput
                  | Prisma.InputJsonValue,
              }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
    },
    "UPDATED",
    AUDIT_ACTIONS.REQUIREMENT_TEMPLATE_UPDATED,
    "requirement_template",
    id,
    { name: input.name ?? template.name, code: input.code ?? template.code },
    null,
  );
  return getTemplate(id, actor);
}

async function setTemplateArchived(
  id: string,
  archived: boolean,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  const template = await repo.findTemplateById(id, true);
  if (!template) throw new NotFoundError("Requirement template not found");
  if (archived === Boolean(template.deletedAt)) {
    throw new BadRequestError(
      archived ? "Template is already archived" : "Template is not archived",
    );
  }
  if (!archived) {
    const nameOwner = await repo.findLiveTemplateByName(template.name);
    if (nameOwner && nameOwner.id !== template.id) {
      throw new ConflictError(`Template name "${template.name}" is now in use`);
    }
  }
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementTemplate.update({
        where: { id },
        data: { deletedAt: archived ? new Date() : null },
      });
    },
    archived ? "ARCHIVED" : "RESTORED",
    archived
      ? AUDIT_ACTIONS.REQUIREMENT_TEMPLATE_ARCHIVED
      : AUDIT_ACTIONS.REQUIREMENT_TEMPLATE_RESTORED,
    "requirement_template",
    id,
    { name: template.name, archived },
    null,
  );
  return getTemplate(id, actor);
}

export async function archiveTemplate(
  id: string,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(
    actor,
    PERMISSION.archive,
    "You do not have permission to archive requirement templates",
  );
  return setTemplateArchived(id, true, actor);
}

export async function restoreTemplate(
  id: string,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(
    actor,
    PERMISSION.restore,
    "You do not have permission to restore requirement templates",
  );
  return setTemplateArchived(id, false, actor);
}

export async function listNodes(
  templateId: string,
  query: ListRequirementNodesQuery,
  actor: Actor,
): Promise<RequirementTreeNode[]> {
  assertCan(actor, PERMISSION.read, "You do not have access to the requirement builder");
  if (!(await repo.findTemplateById(templateId, true)))
    throw new NotFoundError("Requirement template not found");
  let rows = await repo.listTemplateNodes(templateId, query.includeArchived ?? false);
  if (query.parentId !== undefined) rows = rows.filter((row) => row.parentId === query.parentId);
  if (query.type) rows = rows.filter((row) => row.type === query.type);
  if (query.q) {
    const q = query.q.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q),
    );
    return rows.map((row) => ({ ...toNode(row), children: [] }));
  }
  if (query.parentId !== undefined || query.type) {
    return rows.map((row) => ({ ...toNode(row), children: [] }));
  }
  return buildTree(rows);
}

async function assertNodeNameAvailable(
  templateId: string,
  parentId: string | null,
  name: string,
  excludeId?: string,
): Promise<void> {
  if ((await repo.countLiveSiblingName(templateId, parentId, name, excludeId)) > 0) {
    throw new ConflictError(`A node named "${name}" already exists in this location`);
  }
}

async function requireLiveTemplate(templateId: string): Promise<repo.RequirementTemplateRow> {
  const template = await repo.findTemplateById(templateId);
  if (!template) throw new NotFoundError("Requirement template not found");
  return template;
}

export async function createNode(
  templateId: string,
  input: CreateRequirementNodeBody,
  actor: Actor,
): Promise<RequirementTreeNode> {
  assertCan(actor, PERMISSION.create, "You do not have permission to create requirement nodes");
  const template = await requireLiveTemplate(templateId);
  const parentId = input.parentId ?? null;
  let level = 0;
  if (parentId) {
    const parent = await repo.findNodeById(templateId, parentId);
    if (!parent) throw new BadRequestError("Parent node not found or belongs to another template");
    level = parent.level + 1;
  }
  if (await repo.findNodeByCode(templateId, input.code)) {
    throw new ConflictError(`Node code "${input.code}" already exists in this template`);
  }
  await assertNodeNameAvailable(templateId, parentId, input.name);
  const sortOrder = input.sortOrder ?? (await repo.nextSiblingOrder(templateId, parentId));
  const createdId = randomUUID();
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementNode.create({
        data: {
          id: createdId,
          templateId,
          parentId,
          code: input.code,
          name: input.name,
          description: input.description ?? null,
          helpText: input.helpText ?? null,
          type: input.type,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          isRequired: input.isRequired ?? input.type !== "SECTION",
          allowMultiple: input.allowMultiple ?? false,
          sortOrder,
          level,
          status: input.status ?? "ACTIVE",
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        select: { id: true },
      });
      await reorderSiblings(tx, templateId, parentId, createdId, sortOrder);
    },
    "UPDATED",
    AUDIT_ACTIONS.REQUIREMENT_NODE_CREATED,
    "requirement_node",
    createdId,
    { templateId, code: input.code, name: input.name, parentId },
    `Created node ${input.code}`,
  );
  return findTreeNode(buildTree(await repo.listTemplateNodes(templateId)), createdId);
}

export async function updateNode(
  templateId: string,
  nodeId: string,
  input: UpdateRequirementNodeBody,
  actor: Actor,
): Promise<RequirementTreeNode> {
  assertCan(actor, PERMISSION.update, "You do not have permission to update requirement nodes");
  const template = await requireLiveTemplate(templateId);
  const node = await repo.findNodeById(templateId, nodeId);
  if (!node) throw new NotFoundError("Requirement node not found");
  if (input.code && input.code !== node.code) {
    const duplicate = await repo.findNodeByCode(templateId, input.code);
    if (duplicate && duplicate.id !== nodeId)
      throw new ConflictError(`Node code "${input.code}" already exists`);
  }
  if (input.name && input.name.toLowerCase() !== node.name.toLowerCase()) {
    await assertNodeNameAvailable(templateId, node.parentId, input.name, nodeId);
  }
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementNode.update({
        where: { id: nodeId },
        data: {
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.helpText !== undefined ? { helpText: input.helpText } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.metadata !== undefined
            ? {
                metadata: (input.metadata ?? null) as
                  | Prisma.NullableJsonNullValueInput
                  | Prisma.InputJsonValue,
              }
            : {}),
          ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
          ...(input.allowMultiple !== undefined ? { allowMultiple: input.allowMultiple } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedBy: actor.id,
        },
      });
      if (input.sortOrder !== undefined) {
        await reorderSiblings(tx, templateId, node.parentId, nodeId, input.sortOrder);
      }
    },
    "UPDATED",
    AUDIT_ACTIONS.REQUIREMENT_NODE_UPDATED,
    "requirement_node",
    nodeId,
    { templateId, nodeId, name: input.name ?? node.name, code: input.code ?? node.code },
    `Updated node ${node.code}`,
  );
  return findTreeNode(buildTree(await repo.listTemplateNodes(templateId)), nodeId);
}

async function reorderSiblings(
  tx: Prisma.TransactionClient,
  templateId: string,
  parentId: string | null,
  movingId: string,
  requestedIndex: number,
): Promise<void> {
  const siblings = await tx.requirementNode.findMany({
    where: { templateId, parentId, deletedAt: null, id: { not: movingId } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const index = Math.max(0, Math.min(requestedIndex, siblings.length));
  siblings.splice(index, 0, { id: movingId });
  for (const [sortOrder, sibling] of siblings.entries()) {
    await tx.requirementNode.update({ where: { id: sibling.id }, data: { sortOrder } });
  }
}

async function recomputeSubtreeLevels(
  tx: Prisma.TransactionClient,
  nodeId: string,
  level: number,
): Promise<void> {
  const queue = [{ id: nodeId, level }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    await tx.requirementNode.update({ where: { id: current.id }, data: { level: current.level } });
    const children = await tx.requirementNode.findMany({
      where: { parentId: current.id, deletedAt: null },
      select: { id: true },
    });
    queue.push(...children.map((child) => ({ id: child.id, level: current.level + 1 })));
  }
}

function isDescendant(
  rows: repo.RequirementNodeRow[],
  candidateParentId: string,
  nodeId: string,
): boolean {
  const byId = new Map(rows.map((row) => [row.id, row]));
  let cursor: string | null = candidateParentId;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    if (cursor === nodeId) return true;
    visited.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
}

export async function moveNode(
  templateId: string,
  nodeId: string,
  input: MoveRequirementNodeBody,
  actor: Actor,
): Promise<RequirementTreeNode> {
  assertCan(actor, PERMISSION.update, "You do not have permission to move requirement nodes");
  const template = await requireLiveTemplate(templateId);
  const node = await repo.findNodeById(templateId, nodeId);
  if (!node) throw new NotFoundError("Requirement node not found");
  const parentId = input.parentId ?? null;
  if (parentId === nodeId) throw new BadRequestError("A node cannot be its own parent");
  const rows = await repo.listTemplateNodes(templateId);
  let level = 0;
  if (parentId) {
    const parent = rows.find((row) => row.id === parentId);
    if (!parent) throw new BadRequestError("Parent node not found or belongs to another template");
    if (isDescendant(rows, parentId, nodeId))
      throw new BadRequestError("Cannot move a node into its own subtree");
    level = parent.level + 1;
  }
  if (parentId !== node.parentId)
    await assertNodeNameAvailable(templateId, parentId, node.name, nodeId);
  const targetIndex = input.sortOrder ?? (await repo.nextSiblingOrder(templateId, parentId));
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementNode.update({
        where: { id: nodeId },
        data: { parentId, updatedBy: actor.id },
      });
      await recomputeSubtreeLevels(tx, nodeId, level);
      await reorderSiblings(tx, templateId, parentId, nodeId, targetIndex);
      if (node.parentId !== parentId) {
        const oldSiblings = await tx.requirementNode.findMany({
          where: { templateId, parentId: node.parentId, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true },
        });
        for (const [sortOrder, sibling] of oldSiblings.entries()) {
          await tx.requirementNode.update({ where: { id: sibling.id }, data: { sortOrder } });
        }
      }
    },
    "UPDATED",
    AUDIT_ACTIONS.REQUIREMENT_NODE_MOVED,
    "requirement_node",
    nodeId,
    {
      templateId,
      nodeId,
      fromParentId: node.parentId,
      toParentId: parentId,
      sortOrder: targetIndex,
    },
    `Moved node ${node.code}`,
  );
  return findTreeNode(buildTree(await repo.listTemplateNodes(templateId)), nodeId);
}

function subtreeIds(rows: repo.RequirementNodeRow[], rootId: string): string[] {
  const children = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    children.set(row.parentId, [...(children.get(row.parentId) ?? []), row.id]);
  }
  const result: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    queue.push(...(children.get(id) ?? []));
  }
  return result;
}

async function setNodeArchived(
  templateId: string,
  nodeId: string,
  archived: boolean,
  actor: Actor,
): Promise<RequirementTreeNode> {
  const template = await requireLiveTemplate(templateId);
  const node = await repo.findNodeById(templateId, nodeId, true);
  if (!node) throw new NotFoundError("Requirement node not found");
  if (archived === Boolean(node.deletedAt)) {
    throw new BadRequestError(archived ? "Node is already archived" : "Node is not archived");
  }
  if (!archived && node.parentId && !(await repo.findNodeById(templateId, node.parentId))) {
    throw new BadRequestError("Restore the parent node before restoring this subtree");
  }
  const rows = await repo.listTemplateNodes(templateId, true);
  const subtree = new Set(subtreeIds(rows, nodeId));
  const archiveTimestamp = node.deletedAt?.getTime() ?? null;
  const ids = rows
    .filter(
      (row) =>
        subtree.has(row.id) &&
        (archived ? row.deletedAt === null : row.deletedAt?.getTime() === archiveTimestamp),
    )
    .map((row) => row.id);
  if (!archived) {
    for (const candidate of rows.filter((row) => ids.includes(row.id))) {
      await assertNodeNameAvailable(templateId, candidate.parentId, candidate.name, candidate.id);
    }
  }
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementNode.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: archived ? new Date() : null, updatedBy: actor.id },
      });
    },
    "UPDATED",
    archived ? AUDIT_ACTIONS.REQUIREMENT_NODE_ARCHIVED : AUDIT_ACTIONS.REQUIREMENT_NODE_RESTORED,
    "requirement_node",
    nodeId,
    { templateId, nodeId, name: node.name, subtreeSize: ids.length, archived },
    `${archived ? "Archived" : "Restored"} node ${node.code}`,
  );
  const refreshed = await repo.findNodeById(templateId, nodeId, archived);
  if (!refreshed) throw new NotFoundError("Requirement node not found after mutation");
  if (archived) return { ...toNode(refreshed), children: [] };
  return findTreeNode(buildTree(await repo.listTemplateNodes(templateId)), nodeId);
}

export async function archiveNode(
  templateId: string,
  nodeId: string,
  actor: Actor,
): Promise<RequirementTreeNode> {
  assertCan(actor, PERMISSION.archive, "You do not have permission to archive requirement nodes");
  return setNodeArchived(templateId, nodeId, true, actor);
}

export async function restoreNode(
  templateId: string,
  nodeId: string,
  actor: Actor,
): Promise<RequirementTreeNode> {
  assertCan(actor, PERMISSION.restore, "You do not have permission to restore requirement nodes");
  return setNodeArchived(templateId, nodeId, false, actor);
}

async function requireRuleNode(
  templateId: string,
  nodeId: string,
): Promise<{ template: repo.RequirementTemplateRow; node: repo.RequirementNodeRow }> {
  const template = await requireLiveTemplate(templateId);
  const node = await repo.findNodeById(templateId, nodeId);
  if (!node) throw new NotFoundError("Requirement node not found");
  if (node.type === "SECTION")
    throw new BadRequestError("Section nodes cannot have upload validation rules");
  return { template, node };
}

export async function createValidation(
  templateId: string,
  nodeId: string,
  input: CreateRequirementValidationBody,
  actor: Actor,
): Promise<RequirementValidationView> {
  assertCan(actor, PERMISSION.create, "You do not have permission to create validation rules");
  const { template, node } = await requireRuleNode(templateId, nodeId);
  const existing = await prisma.requirementValidation.findUnique({
    where: { nodeId_type: { nodeId, type: input.type } },
    select: { id: true, deletedAt: true },
  });
  if (existing && !existing.deletedAt)
    throw new ConflictError(`${input.type} validation already exists on this node`);
  const validationId = existing?.id ?? randomUUID();
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      if (existing) {
        await tx.requirementValidation.update({
          where: { id: existing.id },
          data: {
            config: input.config as Prisma.InputJsonValue,
            message: input.message ?? null,
            severity: input.severity,
            enabled: input.enabled,
            sortOrder: input.sortOrder,
            deletedAt: null,
            updatedBy: actor.id,
          },
        });
      } else {
        await tx.requirementValidation.create({
          data: {
            id: validationId,
            nodeId,
            type: input.type,
            config: input.config as Prisma.InputJsonValue,
            message: input.message ?? null,
            severity: input.severity,
            enabled: input.enabled,
            sortOrder: input.sortOrder,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          select: { id: true },
        });
      }
    },
    "UPDATED",
    AUDIT_ACTIONS.REQUIREMENT_VALIDATION_CREATED,
    "requirement_validation",
    validationId,
    { templateId, nodeId, type: input.type },
    `Added ${input.type} validation to ${node.code}`,
  );
  const refreshed = await repo.findNodeById(templateId, nodeId);
  const rule = refreshed?.validations.find((validation) => validation.id === validationId);
  if (!rule) throw new NotFoundError("Validation rule not found after mutation");
  return toValidationView(rule);
}

async function findValidation(
  templateId: string,
  nodeId: string,
  validationId: string,
  includeArchived: boolean,
): Promise<{
  id: string;
  nodeId: string;
  type: RequirementValidationView["type"];
  config: Prisma.JsonValue;
  message: string | null;
  severity: RequirementValidationView["severity"];
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
} | null> {
  const row = await prisma.requirementValidation.findFirst({
    where: {
      id: validationId,
      nodeId,
      node: { templateId },
      ...(includeArchived ? {} : { deletedAt: null }),
    },
    select: {
      id: true,
      nodeId: true,
      type: true,
      config: true,
      message: true,
      severity: true,
      enabled: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });
  return row;
}

export async function updateValidation(
  templateId: string,
  nodeId: string,
  validationId: string,
  input: UpdateRequirementValidationBody,
  actor: Actor,
): Promise<RequirementValidationView> {
  assertCan(actor, PERMISSION.update, "You do not have permission to update validation rules");
  const { template, node } = await requireRuleNode(templateId, nodeId);
  const validation = await findValidation(templateId, nodeId, validationId, false);
  if (!validation) throw new NotFoundError("Validation rule not found");
  if (input.type !== validation.type)
    throw new BadRequestError("Validation type cannot be changed; create a new rule instead");
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementValidation.update({
        where: { id: validationId },
        data: {
          config: input.config as Prisma.InputJsonValue,
          message: input.message ?? null,
          severity: input.severity,
          enabled: input.enabled,
          sortOrder: input.sortOrder,
          updatedBy: actor.id,
        },
      });
    },
    "UPDATED",
    AUDIT_ACTIONS.REQUIREMENT_VALIDATION_UPDATED,
    "requirement_validation",
    validationId,
    { templateId, nodeId, type: input.type },
    `Updated ${input.type} validation on ${node.code}`,
  );
  const refreshed = await findValidation(templateId, nodeId, validationId, false);
  if (!refreshed) throw new NotFoundError("Validation rule not found after mutation");
  return refreshed;
}

async function setValidationArchived(
  templateId: string,
  nodeId: string,
  validationId: string,
  archived: boolean,
  actor: Actor,
): Promise<RequirementValidationView> {
  const { template, node } = await requireRuleNode(templateId, nodeId);
  const validation = await findValidation(templateId, nodeId, validationId, true);
  if (!validation) throw new NotFoundError("Validation rule not found");
  if (archived === Boolean(validation.deletedAt)) {
    throw new BadRequestError(
      archived ? "Validation rule is already archived" : "Validation rule is not archived",
    );
  }
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementValidation.update({
        where: { id: validationId },
        data: { deletedAt: archived ? new Date() : null, updatedBy: actor.id },
      });
    },
    "UPDATED",
    archived
      ? AUDIT_ACTIONS.REQUIREMENT_VALIDATION_ARCHIVED
      : AUDIT_ACTIONS.REQUIREMENT_VALIDATION_RESTORED,
    "requirement_validation",
    validationId,
    { templateId, nodeId, type: validation.type, archived },
    `${archived ? "Archived" : "Restored"} ${validation.type} validation on ${node.code}`,
  );
  const refreshed = await findValidation(templateId, nodeId, validationId, true);
  if (!refreshed) throw new NotFoundError("Validation rule not found after mutation");
  return refreshed;
}

export async function archiveValidation(
  templateId: string,
  nodeId: string,
  validationId: string,
  actor: Actor,
): Promise<RequirementValidationView> {
  assertCan(actor, PERMISSION.archive, "You do not have permission to archive validation rules");
  return setValidationArchived(templateId, nodeId, validationId, true, actor);
}

export async function restoreValidation(
  templateId: string,
  nodeId: string,
  validationId: string,
  actor: Actor,
): Promise<RequirementValidationView> {
  assertCan(actor, PERMISSION.restore, "You do not have permission to restore validation rules");
  return setValidationArchived(templateId, nodeId, validationId, false, actor);
}

async function assertTargetExists(
  targetType: RequirementTargetType,
  targetId: string | null,
): Promise<void> {
  if (targetType === "UNIVERSITY") return;
  if (!targetId) throw new BadRequestError("targetId is required for scoped assignments");
  let found: unknown = null;
  switch (targetType) {
    case "COLLEGE":
      found = await prisma.college.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      });
      break;
    case "DEPARTMENT":
      found = await prisma.department.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      });
      break;
    case "PROGRAM":
      found = await prisma.program.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      });
      break;
    case "OFFICE":
      found = await prisma.office.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      });
      break;
    case "AACCUP_AREA":
      found = await prisma.aaccupArea.findFirst({
        where: { id: targetId, deletedAt: null, status: "ACTIVE" },
        select: { id: true },
      });
      break;
    case "ACCREDITATION_CYCLE":
      found = await prisma.accreditationCycle.findFirst({
        where: { id: targetId, deletedAt: null, status: "ACTIVE" },
        select: { id: true },
      });
      break;
  }
  if (!found) throw new BadRequestError(`Assignment target (${targetType}) not found or not live`);
}

export async function assignTemplate(
  templateId: string,
  input: AssignRequirementTemplateBody,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(actor, PERMISSION.assign, "You do not have permission to assign requirement templates");
  const template = await requireLiveTemplate(templateId);
  const targetId = input.targetId ?? null;
  await assertTargetExists(input.targetType, targetId);
  const live = await repo.findAssignmentByTarget(input.targetType, targetId);
  if (live?.templateId === templateId) return getDetail(template, actor);
  if (live)
    throw new ConflictError("This target is already assigned to another requirement template");
  const archived = await repo.findAssignmentByTarget(input.targetType, targetId, true);
  const assignmentId = archived?.id ?? randomUUID();
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      if (archived) {
        await tx.requirementAssignment.update({
          where: { id: archived.id },
          data: { templateId, deletedAt: null, createdBy: actor.id },
        });
      } else {
        await tx.requirementAssignment.create({
          data: {
            id: assignmentId,
            templateId,
            targetType: input.targetType,
            targetId,
            createdBy: actor.id,
          },
          select: { id: true },
        });
      }
    },
    "ASSIGNED",
    AUDIT_ACTIONS.REQUIREMENT_TEMPLATE_ASSIGNED,
    "requirement_assignment",
    assignmentId,
    { templateId, targetType: input.targetType, targetId },
    `Assigned template to ${input.targetType}`,
  );
  return getTemplate(templateId, actor);
}

export async function unassignTemplate(
  assignmentId: string,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(
    actor,
    PERMISSION.assign,
    "You do not have permission to unassign requirement templates",
  );
  const assignment = await repo.findAssignmentById(assignmentId);
  if (!assignment) throw new NotFoundError("Requirement assignment not found");
  const template = await requireLiveTemplate(assignment.templateId);
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.requirementAssignment.update({
        where: { id: assignmentId },
        data: { deletedAt: new Date() },
      });
    },
    "ASSIGNED",
    AUDIT_ACTIONS.REQUIREMENT_TEMPLATE_ASSIGNED,
    "requirement_assignment",
    assignmentId,
    {
      templateId: assignment.templateId,
      targetType: assignment.targetType,
      targetId: assignment.targetId,
      unassigned: true,
    },
    `Unassigned template from ${assignment.targetType}`,
  );
  return getTemplate(assignment.templateId, actor);
}

export async function listAssignments(
  query: ListRequirementAssignmentsQuery,
  actor: Actor,
): Promise<RequirementAssignmentView[]> {
  assertCan(actor, PERMISSION.read, "You do not have access to requirement assignments");
  const where: Prisma.RequirementAssignmentWhereInput = {};
  if (query.templateId) where.templateId = query.templateId;
  if (query.targetType) where.targetType = query.targetType;
  return assignmentViews(await repo.listAssignments(where));
}

export async function listVersions(id: string, actor: Actor): Promise<RequirementVersionView[]> {
  assertCan(actor, PERMISSION.read, "You do not have access to requirement versions");
  if (!(await repo.findTemplateById(id, true)))
    throw new NotFoundError("Requirement template not found");
  return (await repo.listVersions(id)).map(toVersionView);
}

export async function listHistory(
  query: ListRequirementHistoryQuery,
  actor: Actor,
): Promise<ListResult<RequirementHistoryView>> {
  assertCan(actor, PERMISSION.read, "You do not have access to requirement history");
  const where: Prisma.RequirementHistoryWhereInput = {};
  if (query.templateId) where.templateId = query.templateId;
  if (query.action) where.action = query.action;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }
  const { items, total } = await repo.listHistory(where, query.page, query.pageSize);
  return {
    items: items.map(toHistoryView),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

function assertSnapshot(value: Prisma.JsonValue): RequirementSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError("Requirement snapshot is malformed");
  }
  const snapshot = value as unknown as RequirementSnapshot;
  if (
    typeof snapshot.name !== "string" ||
    typeof snapshot.code !== "string" ||
    !Array.isArray(snapshot.nodes) ||
    !Array.isArray(snapshot.assignments)
  ) {
    throw new BadRequestError("Requirement snapshot is malformed");
  }
  return snapshot;
}

export async function rollbackTemplate(
  input: RollbackRequirementTemplateBody,
  actor: Actor,
): Promise<RequirementTemplateDetail> {
  assertCan(
    actor,
    PERMISSION.rollback,
    "You do not have permission to roll back requirement templates",
  );
  const template = await requireLiveTemplate(input.templateId);
  if (input.version >= template.version) {
    throw new BadRequestError(
      `Target version must be lower than current version ${template.version}`,
    );
  }
  const version = await repo.findVersion(input.templateId, input.version);
  if (!version) throw new NotFoundError(`Requirement template version ${input.version} not found`);
  const snapshot = assertSnapshot(version.data);
  const codeOwner = await repo.findTemplateByCode(snapshot.code);
  if (codeOwner && codeOwner.id !== template.id)
    throw new ConflictError(`Template code "${snapshot.code}" is now in use`);
  const nameOwner = await repo.findLiveTemplateByName(snapshot.name);
  if (nameOwner && nameOwner.id !== template.id)
    throw new ConflictError(`Template name "${snapshot.name}" is now in use`);
  for (const assignment of snapshot.assignments) {
    const conflict = await repo.findAssignmentByTarget(assignment.targetType, assignment.targetId);
    if (conflict && conflict.templateId !== template.id) {
      throw new ConflictError(
        `Rollback target ${assignment.targetType} is assigned to another template`,
      );
    }
    await assertTargetExists(assignment.targetType, assignment.targetId);
  }

  const nextVersion = template.version + 1;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.requirementTemplate.updateMany({
      where: { id: template.id, version: template.version },
      data: {
        name: snapshot.name,
        code: snapshot.code,
        description: snapshot.description,
        category: snapshot.category,
        metadata: (snapshot.metadata ?? null) as
          | Prisma.NullableJsonNullValueInput
          | Prisma.InputJsonValue,
        status: snapshot.status,
        version: nextVersion,
        updatedBy: actor.id,
      },
    });
    if (claimed.count !== 1)
      throw new ConflictError("Requirement template changed concurrently; reload and retry");

    const nodeIds = snapshot.nodes.map((node) => node.id);
    await tx.requirementNode.updateMany({
      where: {
        templateId: template.id,
        ...(nodeIds.length > 0 ? { id: { notIn: nodeIds } } : {}),
        deletedAt: null,
      },
      data: { deletedAt: new Date(), updatedBy: actor.id },
    });
    const orderedNodes = [...snapshot.nodes].sort(
      (a, b) => a.level - b.level || a.sortOrder - b.sortOrder,
    );
    for (const node of orderedNodes) {
      const existing = await tx.requirementNode.findUnique({
        where: { id: node.id },
        select: { templateId: true },
      });
      if (existing && existing.templateId !== template.id)
        throw new BadRequestError("Snapshot node belongs to another template");
      const data = {
        parentId: node.parentId,
        code: node.code,
        name: node.name,
        description: node.description,
        helpText: node.helpText,
        type: node.type,
        metadata: (node.metadata ?? null) as
          | Prisma.NullableJsonNullValueInput
          | Prisma.InputJsonValue,
        isRequired: node.isRequired,
        allowMultiple: node.allowMultiple,
        sortOrder: node.sortOrder,
        level: node.level,
        status: node.status,
        deletedAt: null,
        updatedBy: actor.id,
      };
      if (existing) {
        await tx.requirementNode.update({ where: { id: node.id }, data });
      } else {
        await tx.requirementNode.create({
          data: { id: node.id, templateId: template.id, ...data, createdBy: actor.id },
        });
      }
    }

    const validationIds = snapshot.nodes.flatMap((node) =>
      node.validations.map((validation) => validation.id),
    );
    await tx.requirementValidation.updateMany({
      where: {
        node: { templateId: template.id },
        ...(validationIds.length > 0 ? { id: { notIn: validationIds } } : {}),
        deletedAt: null,
      },
      data: { deletedAt: new Date(), updatedBy: actor.id },
    });
    for (const node of orderedNodes) {
      for (const validation of node.validations) {
        await tx.requirementValidation.upsert({
          where: { id: validation.id },
          update: {
            nodeId: node.id,
            type: validation.type,
            config: validation.config as Prisma.InputJsonValue,
            message: validation.message,
            severity: validation.severity,
            enabled: validation.enabled,
            sortOrder: validation.sortOrder,
            deletedAt: null,
            updatedBy: actor.id,
          },
          create: {
            id: validation.id,
            nodeId: node.id,
            type: validation.type,
            config: validation.config as Prisma.InputJsonValue,
            message: validation.message,
            severity: validation.severity,
            enabled: validation.enabled,
            sortOrder: validation.sortOrder,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });
      }
    }

    const assignmentIds = snapshot.assignments.map((assignment) => assignment.id);
    await tx.requirementAssignment.updateMany({
      where: {
        templateId: template.id,
        ...(assignmentIds.length > 0 ? { id: { notIn: assignmentIds } } : {}),
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    for (const assignment of snapshot.assignments) {
      await tx.requirementAssignment.upsert({
        where: { id: assignment.id },
        update: {
          templateId: template.id,
          targetType: assignment.targetType,
          targetId: assignment.targetId,
          deletedAt: null,
          createdBy: actor.id,
        },
        create: {
          id: assignment.id,
          templateId: template.id,
          targetType: assignment.targetType,
          targetId: assignment.targetId,
          createdBy: actor.id,
        },
      });
    }
    await repo.appendVersion(tx, {
      templateId: template.id,
      version: nextVersion,
      changeType: "ROLLED_BACK",
      snapshot: version.data as Prisma.InputJsonValue,
      changeNote: input.changeNote ?? `Rolled back to version ${input.version}`,
      actorId: actor.id,
    });
    await repo.appendHistory(tx, {
      templateId: template.id,
      action: "ROLLED_BACK",
      oldValue: { name: template.name, version: template.version },
      newValue: { name: snapshot.name, version: nextVersion, rolledBackTo: input.version },
      versionFrom: template.version,
      versionTo: nextVersion,
      actorId: actor.id,
    });
  });
  invalidateRequirementResolutionCache();
  await auditMutation(
    actor,
    AUDIT_ACTIONS.REQUIREMENT_TEMPLATE_ROLLED_BACK,
    "requirement_template",
    template.id,
    { rolledBackTo: input.version, version: nextVersion },
  );
  await refreshRequirementProjectionsForTemplateBestEffort(template.id, actor.id);
  return getTemplate(template.id, actor);
}

export async function listCycles(
  query: ListAccreditationCyclesQuery,
  actor: Actor,
): Promise<ListResult<AccreditationCycleView>> {
  assertCan(actor, PERMISSION.read, "You do not have access to accreditation cycles");
  const where: Prisma.AccreditationCycleWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q, mode: "insensitive" } },
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }
  const { items, total } = await repo.listCycles(
    where,
    query.page,
    query.pageSize,
    query.includeArchived ?? false,
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

async function assertCycleUnique(code: string, name: string, excludeId?: string): Promise<void> {
  const duplicate = await prisma.accreditationCycle.findFirst({
    where: {
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ code }, { name: { equals: name, mode: "insensitive" } }],
    },
    select: { id: true, code: true, name: true },
  });
  if (duplicate)
    throw new ConflictError("An active accreditation cycle already uses this code or name");
}

export async function createCycle(
  input: CreateAccreditationCycleBody,
  actor: Actor,
): Promise<AccreditationCycleView> {
  assertCan(actor, PERMISSION.create, "You do not have permission to create accreditation cycles");
  await assertCycleUnique(input.code, input.name);
  const cycle = await prisma.accreditationCycle.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
      createdBy: actor.id,
      updatedBy: actor.id,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });
  await auditMutation(
    actor,
    AUDIT_ACTIONS.ACCREDITATION_CYCLE_CREATED,
    "accreditation_cycle",
    cycle.id,
    {
      code: cycle.code,
      name: cycle.name,
    },
  );
  return cycle;
}

export async function updateCycle(
  id: string,
  input: UpdateAccreditationCycleBody,
  actor: Actor,
): Promise<AccreditationCycleView> {
  assertCan(actor, PERMISSION.update, "You do not have permission to update accreditation cycles");
  const existing = await prisma.accreditationCycle.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Accreditation cycle not found");
  const code = input.code ?? existing.code;
  const name = input.name ?? existing.name;
  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  if (startDate > endDate) throw new BadRequestError("startDate must be on or before endDate");
  await assertCycleUnique(code, name, id);
  const cycle = await prisma.accreditationCycle.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedBy: actor.id,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });
  invalidateRequirementResolutionCache();
  await auditMutation(actor, AUDIT_ACTIONS.ACCREDITATION_CYCLE_UPDATED, "accreditation_cycle", id, {
    code: cycle.code,
    name: cycle.name,
  });
  await refreshRequirementProjectionsForCycleBestEffort(id, actor.id);
  return cycle;
}

async function setCycleArchived(
  id: string,
  archived: boolean,
  actor: Actor,
): Promise<AccreditationCycleView> {
  const existing = await prisma.accreditationCycle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Accreditation cycle not found");
  if (archived === Boolean(existing.deletedAt)) {
    throw new BadRequestError(
      archived ? "Accreditation cycle is already archived" : "Accreditation cycle is not archived",
    );
  }
  if (!archived) await assertCycleUnique(existing.code, existing.name, id);
  const cycle = await prisma.accreditationCycle.update({
    where: { id },
    data: { deletedAt: archived ? new Date() : null, updatedBy: actor.id },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });
  invalidateRequirementResolutionCache();
  await auditMutation(
    actor,
    archived
      ? AUDIT_ACTIONS.ACCREDITATION_CYCLE_ARCHIVED
      : AUDIT_ACTIONS.ACCREDITATION_CYCLE_RESTORED,
    "accreditation_cycle",
    id,
    { code: cycle.code, name: cycle.name, archived },
  );
  await refreshRequirementProjectionsForCycleBestEffort(id, actor.id);
  return cycle;
}

export async function archiveCycle(id: string, actor: Actor): Promise<AccreditationCycleView> {
  assertCan(
    actor,
    PERMISSION.archive,
    "You do not have permission to archive accreditation cycles",
  );
  return setCycleArchived(id, true, actor);
}

export async function restoreCycle(id: string, actor: Actor): Promise<AccreditationCycleView> {
  assertCan(
    actor,
    PERMISSION.restore,
    "You do not have permission to restore accreditation cycles",
  );
  return setCycleArchived(id, false, actor);
}
