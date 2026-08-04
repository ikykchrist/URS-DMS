import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, type AuditAction } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/root/root.folderBuilder.repository";
import type { Prisma } from "@prisma/client";
import type {
  AssignFolderTemplateBody,
  CreateFolderNodeBody,
  CreateFolderTemplateBody,
  ListFolderAssignmentsQuery,
  ListFolderHistoryQuery,
  ListFolderNodesQuery,
  ListFolderTemplatesQuery,
  MoveFolderNodeBody,
  RollbackFolderTemplateBody,
  UpdateFolderNodeBody,
  UpdateFolderTemplateBody,
} from "@/modules/root/root.folderBuilder.validator";
import type {
  FolderAssignmentView,
  FolderHistoryView,
  FolderSnapshot,
  FolderSnapshotNode,
  FolderTemplateDetail,
  FolderTemplateView,
  FolderTreeNode,
  FolderVersionView,
  ListHistoryResult,
  ListResult,
} from "@/modules/root/root.folderBuilder.types";

// =============================================================================
// URS-DMS — Root · Dynamic Folder Builder service (Sprint 7.4.3)
// -----------------------------------------------------------------------------
// Business logic + RBAC re-asserts (defence in depth — the route layer's
// `requirePermission(...)` is the first gate; the service re-asserts the same
// permission so a wiring mistake at the route layer can never bypass RBAC).
//
// RBAC model (matches the catalog in permissions.constants.ts):
//   - folder.read      → list / detail / tree / versions / history reads
//   - folder.create    → POST template + POST node
//   - folder.update    → PATCH template / node, node move / duplicate
//   - folder.archive   → DELETE template / node (archive)
//   - folder.restore   → POST restore (template / node)
//   - folder.assign    → POST assign / DELETE assignment
//   - folder.rollback  → POST rollback
//
// Versioning model (mirrors the Configuration Engine):
//   * `FolderTemplate.version` is the CURRENT version. Every STRUCTURAL
//     mutation (template update, node create / update / move / duplicate /
//     archive / restore, assignment change, rollback) bumps it by one and
//     appends a FolderVersion snapshot + a FolderHistory row inside the same
//     Prisma transaction — the tables can never drift. The snapshot holds the
//     WHOLE template (fields + node tree + assignment scopes), so rollback
//     replays the full structure as a NEW version (changeType ROLLED_BACK).
//   * Template archive / restore are soft (deletedAt) and do NOT bump the
//     version — restoring returns the same version number it had before
//     (Configuration Engine convention).
//
// Security invariants (spec):
//   * No circular references — a node can never become its own ancestor.
//   * No duplicate names within the same parent (service check + partial
//     unique index backstop).
//   * No broken parents — parentId must reference a live node of the SAME
//     template.
//   * No invalid assignments — target must exist and be live; at most one
//     live assignment per target (re-assigning replaces, not stacks).
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

const PERM = {
  read: "folder.read",
  create: "folder.create",
  update: "folder.update",
  archive: "folder.archive",
  restore: "folder.restore",
  assign: "folder.assign",
  rollback: "folder.rollback",
} as const;

function assertCan(actor: Actor, code: string, message: string): void {
  if (!actor.permissions.includes(code)) {
    throw new ForbiddenError(message);
  }
}

// -----------------------------------------------------------------------------
// Mapping helpers
// -----------------------------------------------------------------------------
function toTemplateView(row: repo.FolderTemplateRow): FolderTemplateView {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    category: row.category,
    status: row.status,
    version: row.version,
    icon: row.icon,
    color: row.color,
    createdBy: row.createdBy,
    createdByName: row.createdByUser ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}`.trim() : null,
    updatedBy: row.updatedBy,
    updatedByName: row.updatedByUser ? `${row.updatedByUser.firstName} ${row.updatedByUser.lastName}`.trim() : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    nodeCount: row._count?.nodes ?? 0,
    assignmentCount: row._count?.assignments ?? 0,
  };
}

function toNodeView(row: repo.FolderNodeRow): Omit<FolderTreeNode, "children"> {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    description: row.description,
    category: row.category,
    metadata: row.metadata,
    sortOrder: row.sortOrder,
    icon: row.icon,
    color: row.color,
    visibility: row.visibility,
    status: row.status,
    level: row.level,
    deletedAt: row.deletedAt,
  };
}

function buildTree(rows: repo.FolderNodeRow[]): FolderTreeNode[] {
  const byParent = new Map<string | null, FolderTreeNode[]>();
  for (const row of rows) {
    const node = { ...toNodeView(row), children: [] as FolderTreeNode[] };
    const bucket = byParent.get(row.parentId) ?? [];
    bucket.push(node);
    byParent.set(row.parentId, bucket);
  }
  const attach = (parentId: string | null): FolderTreeNode[] => {
    const bucket = byParent.get(parentId) ?? [];
    for (const node of bucket) {
      node.children = attach(node.id);
    }
    return bucket;
  };
  return attach(null);
}

function toHistoryView(row: repo.FolderHistoryRow): FolderHistoryView {
  return {
    id: row.id,
    templateId: row.templateId,
    action: row.action,
    oldValue: row.oldValue,
    newValue: row.newValue,
    versionFrom: row.versionFrom,
    versionTo: row.versionTo,
    actorId: row.actorId,
    actorName: row.actor ? `${row.actor.firstName} ${row.actor.lastName}`.trim() : null,
    createdAt: row.createdAt,
  };
}

function toVersionView(row: repo.FolderVersionRow): FolderVersionView {
  return {
    id: row.id,
    templateId: row.templateId,
    version: row.version,
    changeType: row.changeType,
    data: row.data,
    changeNote: row.changeNote,
    changedById: row.changedById,
    changedByName: row.changedBy ? `${row.changedBy.firstName} ${row.changedBy.lastName}`.trim() : null,
    createdAt: row.createdAt,
  };
}

// -----------------------------------------------------------------------------
// Snapshot builder — full template state (fields + tree + assignment scopes)
// -----------------------------------------------------------------------------
function toSnapshotNode(n: FolderTreeNode): FolderSnapshotNode {
  return {
    name: n.name,
    description: n.description,
    category: n.category,
    metadata: n.metadata as Prisma.JsonValue | null,
    sortOrder: n.sortOrder,
    icon: n.icon,
    color: n.color,
    visibility: n.visibility,
    status: n.status,
    children: n.children.map(toSnapshotNode),
  };
}

async function buildSnapshotInTx(
  tx: Prisma.TransactionClient,
  templateId: string,
): Promise<FolderSnapshot> {
  const [template, nodes, assignments] = await Promise.all([
    tx.folderTemplate.findUnique({ where: { id: templateId } }),
    tx.folderNode.findMany({
      where: { templateId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    tx.folderAssignment.findMany({
      where: { templateId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!template) throw new NotFoundError("Folder template not found");
  return {
    name: template.name,
    code: template.code,
    description: template.description,
    category: template.category,
    status: template.status,
    icon: template.icon,
    color: template.color,
    nodes: buildTree(nodes).map(toSnapshotNode),
    assignments: assignments.map((a) => ({ targetType: a.targetType, targetId: a.targetId })),
  };
}

// -----------------------------------------------------------------------------
// Mutation wrapper — perform mutation + append version snapshot + history in
// one transaction (never drifts), then audit.
// -----------------------------------------------------------------------------
async function mutateTemplate(
  template: repo.FolderTemplateRow,
  actor: Actor,
  mutation: (tx: Prisma.TransactionClient) => Promise<unknown>,
  changeType: FolderVersionView["changeType"],
  auditAction: AuditAction,
  auditValue: Record<string, unknown>,
  changeNote: string | null,
): Promise<void> {
  const nextVersion = template.version + 1;
  await prisma.$transaction(async (tx) => {
    await mutation(tx);
    // Keep the template ROW's version column in sync with the snapshots —
    // the version guards (rollback target checks, next-version computation)
    // read the row, so drift here would corrupt every later mutation.
    await tx.folderTemplate.update({
      where: { id: template.id },
      data: { version: nextVersion },
    });
    const snapshot = await buildSnapshotInTx(tx, template.id);
    await repo.appendVersion(tx, {
      templateId: template.id,
      version: nextVersion,
      changeType,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      changeNote,
      changedById: actor.id,
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
  await writeAudit({
    action: auditAction,
    userId: actor.id,
    entity: "folder_template",
    entityId: template.id,
    newValue: auditValue,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

async function templateVersion(templateId: string): Promise<number> {
  const versions = await repo.listVersions(templateId);
  return versions[0]?.version ?? 1;
}

async function getDetail(
  template: repo.FolderTemplateRow,
  actor: Actor,
): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const [nodes, assignmentRows] = await Promise.all([
    repo.listTemplateNodes(template.id),
    repo.listTemplateAssignments(template.id),
  ]);
  const names = await resolveAssignmentTargetNames(assignmentRows);
  const assignments: FolderAssignmentView[] = assignmentRows.map((a) => ({
    id: a.id,
    templateId: a.templateId,
    templateName: template.name,
    targetType: a.targetType,
    targetId: a.targetId,
    targetName: a.targetId ? (names.get(a.targetId) ?? "Unknown target") : "Entire University",
    createdAt: a.createdAt,
  }));
  return {
    template: { ...toTemplateView(template), version: await templateVersion(template.id) },
    tree: buildTree(nodes),
    assignments,
  };
}

async function resolveAssignmentTargetNames(
  rows: repo.FolderAssignmentRow[],
): Promise<Map<string, string | null>> {
  const nameById = new Map<string, string | null>();
  const collegeIds: string[] = [];
  const departmentIds: string[] = [];
  const programIds: string[] = [];
  const officeIds: string[] = [];
  const areaIds: string[] = [];
  for (const row of rows) {
    if (!row.targetId) continue;
    switch (row.targetType) {
      case "COLLEGE": collegeIds.push(row.targetId); break;
      case "DEPARTMENT": departmentIds.push(row.targetId); break;
      case "PROGRAM": programIds.push(row.targetId); break;
      case "OFFICE": officeIds.push(row.targetId); break;
      case "AACCUP_AREA": areaIds.push(row.targetId); break;
      default: break;
    }
  }
  const [colleges, departments, programs, offices, areas] = await Promise.all([
    collegeIds.length ? prisma.college.findMany({ where: { id: { in: collegeIds } }, select: { id: true, name: true } }) : [],
    departmentIds.length ? prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, name: true } }) : [],
    programIds.length ? prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true } }) : [],
    officeIds.length ? prisma.office.findMany({ where: { id: { in: officeIds } }, select: { id: true, name: true } }) : [],
    areaIds.length ? prisma.aaccupArea.findMany({ where: { id: { in: areaIds } }, select: { id: true, name: true } }) : [],
  ]);
  for (const c of colleges) nameById.set(c.id, c.name);
  for (const d of departments) nameById.set(d.id, d.name);
  for (const p of programs) nameById.set(p.id, p.name);
  for (const o of offices) nameById.set(o.id, o.name);
  for (const a of areas) nameById.set(a.id, a.name);
  return nameById;
}

// -----------------------------------------------------------------------------
// Template reads
// -----------------------------------------------------------------------------
export async function listTemplates(
  query: ListFolderTemplatesQuery,
  actor: Actor,
): Promise<ListResult> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const where: Prisma.FolderTemplateWhereInput = {};
  if (query.status) where.status = query.status;
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
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
  };
}

export async function getTemplate(id: string, actor: Actor): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const template = await repo.findTemplateById(id, true);
  if (!template) throw new NotFoundError("Folder template not found");
  return getDetail(template, actor);
}

// -----------------------------------------------------------------------------
// Template create / update / archive / restore / duplicate
// -----------------------------------------------------------------------------
export async function createTemplate(
  input: CreateFolderTemplateBody,
  actor: Actor,
): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.create, "You do not have permission to create folder templates");
  const existingCode = await repo.findTemplateByCode(input.code, true);
  if (existingCode) {
    throw new ConflictError(`A folder template with code "${input.code}" already exists`);
  }
  const existingName = await repo.findTemplateByNameLive(input.name);
  if (existingName) {
    throw new ConflictError(`A folder template named "${input.name}" already exists`);
  }

  const snapshot: FolderSnapshot = {
    name: input.name,
    code: input.code,
    description: input.description ?? null,
    category: input.category ?? null,
    status: input.status ?? "ACTIVE",
    icon: input.icon ?? null,
    color: input.color ?? null,
    nodes: (input.nodes ?? []).map((n, i) => ({
      name: n.name,
      description: n.description ?? null,
      category: n.category ?? null,
      metadata: null,
      sortOrder: i,
      icon: n.icon ?? null,
      color: n.color ?? null,
      visibility: "VISIBLE",
      status: "ACTIVE",
      children: [],
    })),
    assignments: [],
  };

  const created = await prisma.$transaction(async (tx) => {
    const template = await tx.folderTemplate.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        category: input.category ?? null,
        status: input.status ?? "ACTIVE",
        version: 1,
        icon: input.icon ?? null,
        color: input.color ?? null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
    for (const [i, n] of (input.nodes ?? []).entries()) {
      await tx.folderNode.create({
        data: {
          templateId: template.id,
          parentId: null,
          name: n.name,
          description: n.description ?? null,
          category: n.category ?? null,
          sortOrder: i,
          icon: n.icon ?? null,
          color: n.color ?? null,
          level: 0,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
    }
    await repo.appendVersion(tx, {
      templateId: template.id,
      version: 1,
      changeType: "CREATED",
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      changeNote: "Initial template",
      changedById: actor.id,
    });
    await repo.appendHistory(tx, {
      templateId: template.id,
      action: "CREATED",
      oldValue: null,
      newValue: { name: input.name, code: input.code, version: 1 },
      versionFrom: null,
      versionTo: 1,
      actorId: actor.id,
    });
    return template;
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FOLDER_TEMPLATE_CREATED,
    userId: actor.id,
    entity: "folder_template",
    entityId: created.id,
    newValue: { name: input.name, code: input.code },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return getTemplate(created.id, actor);
}

export async function updateTemplate(
  id: string,
  input: UpdateFolderTemplateBody,
  actor: Actor,
): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.update, "You do not have permission to update folder templates");
  const template = await repo.findTemplateById(id);
  if (!template) throw new NotFoundError("Folder template not found");

  if (input.code && input.code !== template.code) {
    const taken = await repo.findTemplateByCode(input.code, true);
    if (taken && taken.id !== id) {
      throw new ConflictError(`A folder template with code "${input.code}" already exists`);
    }
  }
  if (input.name && input.name.toLowerCase() !== template.name.toLowerCase()) {
    const takenName = await repo.findTemplateByNameLive(input.name);
    if (takenName && takenName.id !== id) {
      throw new ConflictError(`A folder template named "${input.name}" already exists`);
    }
  }

  await mutateTemplate(
    template,
    actor,
    (tx) =>
      tx.folderTemplate.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          updatedBy: actor.id,
        },
      }),
    "UPDATED",
    AUDIT_ACTIONS.FOLDER_TEMPLATE_UPDATED,
    { name: input.name ?? template.name, code: input.code ?? template.code },
    null,
  );

  return getTemplate(id, actor);
}

async function setTemplateDeletedState(
  id: string,
  actor: Actor,
  action: "ARCHIVED" | "RESTORED",
): Promise<FolderTemplateDetail> {
  const template = await repo.findTemplateById(id, true);
  if (!template) throw new NotFoundError("Folder template not found");
  if (action === "ARCHIVED" && template.deletedAt) {
    throw new BadRequestError("Template is already archived");
  }
  if (action === "RESTORED" && !template.deletedAt) {
    throw new BadRequestError("Template is not archived");
  }
  await prisma.$transaction(async (tx) => {
    await repo.setTemplateDeleted(tx, id, action === "ARCHIVED" ? new Date() : null, actor.id);
    await repo.appendHistory(tx, {
      templateId: id,
      action,
      oldValue: { name: template.name, version: template.version },
      newValue: { name: template.name, version: template.version },
      versionFrom: template.version,
      versionTo: template.version,
      actorId: actor.id,
    });
  });
  await writeAudit({
    action: action === "ARCHIVED" ? AUDIT_ACTIONS.FOLDER_TEMPLATE_ARCHIVED : AUDIT_ACTIONS.FOLDER_TEMPLATE_RESTORED,
    userId: actor.id,
    entity: "folder_template",
    entityId: id,
    newValue: { name: template.name },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return getTemplate(id, actor);
}

export async function archiveTemplate(id: string, actor: Actor): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.archive, "You do not have permission to archive folder templates");
  return setTemplateDeletedState(id, actor, "ARCHIVED");
}

export async function restoreTemplate(id: string, actor: Actor): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.restore, "You do not have permission to restore folder templates");
  return setTemplateDeletedState(id, actor, "RESTORED");
}

export async function duplicateTemplate(id: string, actor: Actor): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.create, "You do not have permission to duplicate folder templates");
  const template = await repo.findTemplateById(id, true);
  if (!template) throw new NotFoundError("Folder template not found");
  const nodes = await repo.listTemplateNodes(id);
  const snapshotNodes = buildTree(nodes).map(toSnapshotNode);

  let nameSuffix = " (Copy)";
  let name = `${template.name.slice(0, 120 - nameSuffix.length)}${nameSuffix}`;
  let counter = 2;
  while (await repo.findTemplateByNameLive(name)) {
    nameSuffix = ` (Copy ${counter})`;
    name = `${template.name.slice(0, 120 - nameSuffix.length)}${nameSuffix}`;
    counter++;
  }
  let codeSuffix = "-copy";
  let code = `${template.code.slice(0, 40 - codeSuffix.length)}${codeSuffix}`;
  counter = 2;
  while (await repo.findTemplateByCode(code, true)) {
    codeSuffix = `-copy-${counter}`;
    code = `${template.code.slice(0, 40 - codeSuffix.length)}${codeSuffix}`;
    counter++;
  }

  const duplicated = await prisma.$transaction(async (tx) => {
    const created = await tx.folderTemplate.create({
      data: {
        name,
        code,
        description: template.description,
        category: template.category,
        status: template.status,
        version: 1,
        icon: template.icon,
        color: template.color,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
    // Insert parents before children so the idMap can resolve parent ids.
    const sorted = [...nodes].sort(
      (a, b) => (a.level ?? 0) - (b.level ?? 0) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    const idMap = new Map<string, string>();
    for (const row of sorted) {
      const parentId = row.parentId ? (idMap.get(row.parentId) ?? null) : null;
      const newNode = await tx.folderNode.create({
        data: {
          templateId: created.id,
          parentId,
          name: row.name,
          description: row.description,
          category: row.category,
          metadata: (row.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          sortOrder: row.sortOrder,
          icon: row.icon,
          color: row.color,
          visibility: row.visibility,
          status: row.status,
          level: row.level,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      idMap.set(row.id, newNode.id);
    }
    const snapshot: FolderSnapshot = {
      name,
      code,
      description: template.description,
      category: template.category,
      status: template.status,
      icon: template.icon,
      color: template.color,
      nodes: snapshotNodes,
      assignments: [],
    };
    await repo.appendVersion(tx, {
      templateId: created.id,
      version: 1,
      changeType: "CREATED",
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      changeNote: `Duplicated from "${template.name}"`,
      changedById: actor.id,
    });
    await repo.appendHistory(tx, {
      templateId: created.id,
      action: "CREATED",
      oldValue: null,
      newValue: { name, code, duplicatedFrom: template.id, version: 1 },
      versionFrom: null,
      versionTo: 1,
      actorId: actor.id,
    });
    return created;
  });

  await writeAudit({
    action: AUDIT_ACTIONS.FOLDER_TEMPLATE_CREATED,
    userId: actor.id,
    entity: "folder_template",
    entityId: duplicated.id,
    newValue: { name, code, duplicatedFrom: template.id },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return getTemplate(duplicated.id, actor);
}

// -----------------------------------------------------------------------------
// Node reads + mutations
// -----------------------------------------------------------------------------
export async function listNodes(
  templateId: string,
  query: ListFolderNodesQuery,
  actor: Actor,
): Promise<FolderTreeNode[]> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const template = await repo.findTemplateById(templateId, true);
  if (!template) throw new NotFoundError("Folder template not found");
  const rows = await repo.listTemplateNodes(templateId, query.includeArchived ?? false);
  let filtered = rows;
  if (query.parentId !== undefined && query.parentId !== null) {
    filtered = filtered.filter((r) => r.parentId === query.parentId);
  }
  if (query.q) {
    const t = query.q.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(t) ||
        (r.description ?? "").toLowerCase().includes(t) ||
        (r.category ?? "").toLowerCase().includes(t) ||
        JSON.stringify(r.metadata ?? {}).toLowerCase().includes(t),
    );
  }
  if (query.q && query.parentId === undefined) return buildTree(filtered);
  return filtered.map((r) => ({ ...toNodeView(r), children: [] }));
}

export async function listNodeChildren(
  templateId: string,
  nodeId: string,
  actor: Actor,
): Promise<FolderTreeNode[]> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const node = await repo.findNodeById(nodeId, templateId);
  if (!node) throw new NotFoundError("Folder node not found");
  const rows = await repo.listNodeChildren(templateId, nodeId);
  return rows.map((r) => ({ ...toNodeView(r), children: [] }));
}

async function assertNodeNameFree(
  templateId: string,
  parentId: string | null,
  name: string,
  excludeNodeId?: string,
): Promise<void> {
  const count = await repo.countSiblingName(templateId, parentId, name, excludeNodeId);
  if (count > 0) {
    throw new ConflictError(`A folder named "${name}" already exists in this location`);
  }
}

export async function createNode(
  templateId: string,
  input: CreateFolderNodeBody,
  actor: Actor,
): Promise<FolderTreeNode> {
  assertCan(actor, PERM.create, "You do not have permission to create folder nodes");
  const template = await repo.findTemplateById(templateId);
  if (!template) throw new NotFoundError("Folder template not found");

  let level = 0;
  if (input.parentId) {
    const parent = await repo.findNodeById(input.parentId, templateId);
    if (!parent) throw new BadRequestError("Parent folder not found (or belongs to another template)");
    level = parent.level + 1;
  }
  await assertNodeNameFree(templateId, input.parentId ?? null, input.name);
  const sortOrder = input.sortOrder ?? (await repo.nextSiblingOrder(templateId, input.parentId ?? null));

  let createdId = "";
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      const node = await repo.createNode({
        tx,
        templateId,
        parentId: input.parentId ?? null,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | null,
        sortOrder,
        icon: input.icon ?? null,
        color: input.color ?? null,
        visibility: input.visibility ?? "VISIBLE",
        status: input.status ?? "ACTIVE",
        level,
        createdById: actor.id,
      });
      createdId = node.id;
      await repo.renumberSiblings(tx, templateId, input.parentId ?? null);
    },
    "UPDATED",
    AUDIT_ACTIONS.FOLDER_NODE_CREATED,
    { templateId, name: input.name, parentId: input.parentId ?? null },
    null,
  );

  const rows = await repo.listTemplateNodes(templateId);
  return findInTree(buildTree(rows), createdId);
}

function findNodeInTree(tree: FolderTreeNode[], id: string): FolderTreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findInTree(tree: FolderTreeNode[], id: string): FolderTreeNode {
  const node = findNodeInTree(tree, id);
  if (!node) throw new NotFoundError("Folder node not found after mutation");
  return node;
}

export async function updateNode(
  templateId: string,
  nodeId: string,
  input: UpdateFolderNodeBody,
  actor: Actor,
): Promise<FolderTreeNode> {
  assertCan(actor, PERM.update, "You do not have permission to update folder nodes");
  const template = await repo.findTemplateById(templateId);
  if (!template) throw new NotFoundError("Folder template not found");
  const node = await repo.findNodeById(nodeId, templateId);
  if (!node) throw new NotFoundError("Folder node not found");

  if (input.name && input.name.toLowerCase() !== node.name.toLowerCase()) {
    await assertNodeNameFree(templateId, node.parentId, input.name, nodeId);
  }

  await mutateTemplate(
    template,
    actor,
    (tx) =>
      repo.updateNode(
        tx,
        nodeId,
        {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.metadata !== undefined
            ? { metadata: input.metadata as Prisma.InputJsonValue | null }
            : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        actor.id,
      ),
    "UPDATED",
    AUDIT_ACTIONS.FOLDER_NODE_UPDATED,
    { templateId, nodeId, name: input.name ?? node.name },
    null,
  );

  const rows = await repo.listTemplateNodes(templateId);
  return findInTree(buildTree(rows), nodeId);
}

// Recompute the denormalized `level` of a moved node's whole subtree (BFS).
async function recomputeSubtreeLevels(
  tx: Prisma.TransactionClient,
  rootId: string,
  rootLevel: number,
): Promise<void> {
  const queue: { id: string; level: number }[] = [{ id: rootId, level: rootLevel }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    await tx.folderNode.update({ where: { id: current.id }, data: { level: current.level } });
    const children = await tx.folderNode.findMany({
      where: { parentId: current.id, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) {
      queue.push({ id: child.id, level: current.level + 1 });
    }
  }
}

// True when `candidate` is an ancestor of `node` — i.e. `node` sits inside
// `candidate`'s subtree. Moving `candidate` under `node` would create a
// cycle. Walked in memory — template trees are small (bounded by the
// max-depth guard), so no recursive SQL needed.
async function isAncestorOf(
  templateId: string,
  candidateId: string,
  nodeId: string,
): Promise<boolean> {
  const rows = await repo.listTemplateNodes(templateId);
  const byId = new Map(rows.map((r) => [r.id, r]));
  let cursor = byId.get(nodeId)?.parentId ?? null;
  while (cursor) {
    if (cursor === candidateId) return true;
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
}

export async function moveNode(
  templateId: string,
  nodeId: string,
  input: MoveFolderNodeBody,
  actor: Actor,
): Promise<FolderTreeNode> {
  assertCan(actor, PERM.update, "You do not have permission to move folder nodes");
  const template = await repo.findTemplateById(templateId);
  if (!template) throw new NotFoundError("Folder template not found");
  const node = await repo.findNodeById(nodeId, templateId);
  if (!node) throw new NotFoundError("Folder node not found");

  const newParentId = input.parentId ?? null;
  if (newParentId === nodeId) {
    throw new BadRequestError("A folder cannot be its own parent");
  }
  let newLevel = 0;
  if (newParentId) {
    const parent = await repo.findNodeById(newParentId, templateId);
    if (!parent) throw new BadRequestError("Parent folder not found (or belongs to another template)");
    if (await isAncestorOf(templateId, nodeId, newParentId)) {
      throw new BadRequestError("Cannot move a folder into its own subtree");
    }
    newLevel = parent.level + 1;
  }
  if (newParentId !== node.parentId) {
    await assertNodeNameFree(templateId, newParentId, node.name, nodeId);
  }
  const sortOrder = input.sortOrder ?? (await repo.nextSiblingOrder(templateId, newParentId));

  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.folderNode.update({
        where: { id: nodeId },
        data: { parentId: newParentId, sortOrder, updatedBy: actor.id },
      });
      await recomputeSubtreeLevels(tx, nodeId, newLevel);
      await repo.renumberSiblings(tx, templateId, newParentId);
      if (newParentId !== node.parentId && node.parentId) {
        await repo.renumberSiblings(tx, templateId, node.parentId);
      }
    },
    "UPDATED",
    AUDIT_ACTIONS.FOLDER_NODE_MOVED,
    { templateId, nodeId, fromParent: node.parentId, toParent: newParentId },
    null,
  );

  const rows = await repo.listTemplateNodes(templateId);
  return findInTree(buildTree(rows), nodeId);
}

export async function duplicateNode(
  templateId: string,
  nodeId: string,
  actor: Actor,
): Promise<FolderTreeNode> {
  assertCan(actor, PERM.create, "You do not have permission to duplicate folder nodes");
  const template = await repo.findTemplateById(templateId);
  if (!template) throw new NotFoundError("Folder template not found");
  const node = await repo.findNodeById(nodeId, templateId);
  if (!node) throw new NotFoundError("Folder node not found");

  let newRootId = "";
  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      const rows = await repo.listTemplateNodes(templateId);
      const byParent = new Map<string | null, repo.FolderNodeRow[]>();
      for (const row of rows) byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
      const idMap = new Map<string, string>();
      const cloneSubtree = async (source: repo.FolderNodeRow, newParentId: string | null): Promise<void> => {
        const isRootClone = source.id === nodeId;
        const baseName = isRootClone ? `${source.name} (Copy)` : source.name;
        let name = baseName;
        let counter = 2;
        while (
          (await tx.folderNode.count({
            where: { templateId, parentId: newParentId, name: { equals: name, mode: "insensitive" }, deletedAt: null },
          })) > 0
        ) {
          name = `${baseName} ${counter}`;
          counter++;
        }
        const sortOrder = await tx.folderNode.count({
          where: { templateId, parentId: newParentId, deletedAt: null },
        });
        const cloned = await tx.folderNode.create({
          data: {
            templateId,
            parentId: newParentId,
            name,
            description: source.description,
            category: source.category,
            metadata: (source.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            sortOrder,
            icon: source.icon,
            color: source.color,
            visibility: source.visibility,
            status: source.status,
            level: source.level,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
        });
        if (isRootClone) newRootId = cloned.id;
        idMap.set(source.id, cloned.id);
        for (const child of byParent.get(source.id) ?? []) {
          await cloneSubtree(child, cloned.id);
        }
      };
      await cloneSubtree(node, node.parentId);
      await repo.renumberSiblings(tx, templateId, node.parentId);
    },
    "UPDATED",
    AUDIT_ACTIONS.FOLDER_NODE_DUPLICATED,
    { templateId, sourceNodeId: nodeId },
    null,
  );

  const rows = await repo.listTemplateNodes(templateId);
  return findInTree(buildTree(rows), newRootId);
}

async function setNodeDeletedState(
  templateId: string,
  nodeId: string,
  actor: Actor,
  action: "ARCHIVED" | "RESTORED",
): Promise<FolderTreeNode> {
  const template = await repo.findTemplateById(templateId);
  if (!template) throw new NotFoundError("Folder template not found");
  const node = await repo.findNodeById(nodeId, templateId, true);
  if (!node) throw new NotFoundError("Folder node not found");
  if (action === "ARCHIVED" && node.deletedAt) {
    throw new BadRequestError("Folder is already archived");
  }
  if (action === "RESTORED" && !node.deletedAt) {
    throw new BadRequestError("Folder is not archived");
  }
  if (action === "RESTORED") {
    if (node.parentId && !(await repo.findNodeById(node.parentId, templateId))) {
      throw new BadRequestError("Restore the parent folder before restoring this folder");
    }
    await assertNodeNameFree(templateId, node.parentId, node.name, nodeId);
  }

  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.folderNode.update({
        where: { id: nodeId },
        data: { deletedAt: action === "ARCHIVED" ? new Date() : null, updatedBy: actor.id },
      });
      // Archiving a node archives nothing below it (children stay live but
      // unreachable through the tree); restoring re-attaches the whole live
      // subtree in place.
    },
    "UPDATED",
    action === "ARCHIVED" ? AUDIT_ACTIONS.FOLDER_NODE_DELETED : AUDIT_ACTIONS.FOLDER_NODE_RESTORED,
    { templateId, nodeId, name: node.name },
    null,
  );

  if (action === "ARCHIVED") {
    const archived = await repo.findNodeById(nodeId, templateId, true);
    if (!archived) throw new NotFoundError("Folder node not found after mutation");
    return { ...toNodeView(archived), children: [] };
  }
  const rows = await repo.listTemplateNodes(templateId);
  return findInTree(buildTree(rows), nodeId);
}

export async function archiveNode(
  templateId: string,
  nodeId: string,
  actor: Actor,
): Promise<FolderTreeNode> {
  assertCan(actor, PERM.archive, "You do not have permission to archive folder nodes");
  return setNodeDeletedState(templateId, nodeId, actor, "ARCHIVED");
}

export async function restoreNode(
  templateId: string,
  nodeId: string,
  actor: Actor,
): Promise<FolderTreeNode> {
  assertCan(actor, PERM.restore, "You do not have permission to restore folder nodes");
  return setNodeDeletedState(templateId, nodeId, actor, "RESTORED");
}

// -----------------------------------------------------------------------------
// Version history + rollback
// -----------------------------------------------------------------------------
export async function listTemplateVersions(
  id: string,
  actor: Actor,
): Promise<FolderVersionView[]> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const template = await repo.findTemplateById(id, true);
  if (!template) throw new NotFoundError("Folder template not found");
  const versions = await repo.listVersions(id);
  return versions.map(toVersionView);
}

export async function listHistory(
  query: ListFolderHistoryQuery,
  actor: Actor,
): Promise<ListHistoryResult> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const where: Prisma.FolderHistoryWhereInput = {};
  if (query.templateId) {
    const template = await repo.findTemplateById(query.templateId, true);
    if (!template) throw new NotFoundError("Folder template not found");
    where.templateId = query.templateId;
  }
  if (query.action) where.action = query.action;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }
  const { items, total } = await repo.listHistory(where, query.page, query.pageSize);
  return {
    items: items.map(toHistoryView),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
  };
}

export async function rollbackTemplate(
  input: RollbackFolderTemplateBody,
  actor: Actor,
): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.rollback, "You do not have permission to roll back folder templates");
  const template = await repo.findTemplateById(input.templateId);
  if (!template) throw new NotFoundError("Folder template not found");
  if (input.version >= template.version) {
    throw new BadRequestError(
      `Target version must be lower than the current version (${template.version})`,
    );
  }
  const snapshotRow = await repo.findVersion(input.templateId, input.version);
  if (!snapshotRow) {
    throw new NotFoundError(`Version ${input.version} of this template not found`);
  }
  const snapshot = snapshotRow.data as unknown as FolderSnapshot;
  if (!snapshot || typeof snapshot.name !== "string") {
    throw new BadRequestError("Snapshot data is malformed");
  }
  // A rolled-back template can never collide with another live template's code.
  if (snapshot.code !== template.code) {
    const taken = await repo.findTemplateByCode(snapshot.code);
    if (taken && taken.id !== template.id) {
      throw new ConflictError(
        `Cannot roll back: code "${snapshot.code}" is now used by "${taken.name}"`,
      );
    }
  }

  const nextVersion = template.version + 1;
  await prisma.$transaction(async (tx) => {
    await tx.folderTemplate.update({
      where: { id: template.id },
      data: {
        name: snapshot.name,
        code: snapshot.code,
        description: snapshot.description ?? null,
        category: snapshot.category ?? null,
        status: snapshot.status ?? "ACTIVE",
        icon: snapshot.icon ?? null,
        color: snapshot.color ?? null,
        version: nextVersion,
        updatedBy: actor.id,
      },
    });
    // Rebuild the node tree: archive every current live node, then recreate
    // the snapshot's nodes with fresh ids (nodes carry no external FKs — the
    // repository consumes names/levels, so id churn is safe and keeps the
    // rollback a pure replay).
    await tx.folderNode.updateMany({
      where: { templateId: template.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    const createNode = async (n: FolderSnapshotNode, parentId: string | null, level: number): Promise<void> => {
      const created = await tx.folderNode.create({
        data: {
          templateId: template.id,
          parentId,
          name: n.name,
          description: n.description ?? null,
          category: n.category ?? null,
          metadata: (n.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          sortOrder: n.sortOrder,
          icon: n.icon ?? null,
          color: n.color ?? null,
          visibility: n.visibility ?? "VISIBLE",
          status: n.status ?? "ACTIVE",
          level,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      for (const child of n.children ?? []) {
        await createNode(child, created.id, level + 1);
      }
    };
    for (const root of snapshot.nodes ?? []) {
      await createNode(root, null, 0);
    }
    // Rebuild assignments from the snapshot. Assignment targets are globally
    // unique, so revive/swap an existing row instead of archive + create.
    await tx.folderAssignment.updateMany({
      where: { templateId: template.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    for (const a of snapshot.assignments ?? []) {
      if (a.targetType !== "UNIVERSITY" && !a.targetId) continue;
      const targetType = a.targetType as repo.FolderAssignmentRow["targetType"];
      const existing = await tx.folderAssignment.findFirst({
        where: { targetType, targetId: a.targetId },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) {
        await tx.folderAssignment.update({
          where: { id: existing.id },
          data: { templateId: template.id, deletedAt: null, createdBy: actor.id },
        });
      } else {
        await tx.folderAssignment.create({
          data: {
            templateId: template.id,
            targetType,
            targetId: a.targetId,
            createdBy: actor.id,
          },
        });
      }
    }
    await repo.appendVersion(tx, {
      templateId: template.id,
      version: nextVersion,
      changeType: "ROLLED_BACK",
      snapshot: snapshotRow.data as Prisma.InputJsonValue,
      changeNote: input.changeNote ?? `Rolled back to version ${input.version}`,
      changedById: actor.id,
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

  await writeAudit({
    action: AUDIT_ACTIONS.FOLDER_TEMPLATE_ROLLED_BACK,
    userId: actor.id,
    entity: "folder_template",
    entityId: template.id,
    newValue: { rolledBackTo: input.version, version: template.version + 1 },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return getTemplate(template.id, actor);
}

// -----------------------------------------------------------------------------
// Assignments
// -----------------------------------------------------------------------------
const TARGET_MODEL: Record<
  Exclude<FolderAssignmentView["targetType"], "UNIVERSITY">,
  "college" | "department" | "program" | "office" | "aaccupArea"
> = {
  COLLEGE: "college",
  DEPARTMENT: "department",
  PROGRAM: "program",
  OFFICE: "office",
  AACCUP_AREA: "aaccupArea",
};

async function assertTargetExists(
  targetType: FolderAssignmentView["targetType"],
  targetId: string | null,
): Promise<void> {
  if (targetType === "UNIVERSITY") return;
  if (!targetId) throw new BadRequestError("targetId is required for scoped assignments");
  const model = TARGET_MODEL[targetType];
  const delegate = prisma[model] as unknown as {
    findFirst: (args: { where: { id: string; deletedAt: null } }) => Promise<unknown>;
  };
  const found = await delegate.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!found) {
    throw new BadRequestError(`Assignment target (${targetType}) not found or not live`);
  }
}

export async function assignTemplate(
  templateId: string,
  input: AssignFolderTemplateBody,
  actor: Actor,
): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.assign, "You do not have permission to assign folder templates");
  const template = await repo.findTemplateById(templateId);
  if (!template) throw new NotFoundError("Folder template not found");
  if (template.deletedAt) throw new BadRequestError("Template is archived; restore it before assigning");
  const targetId = input.targetId ?? null;
  await assertTargetExists(input.targetType, targetId);
  const current = await repo.findAssignmentByTarget(input.targetType, targetId);
  if (current?.templateId === templateId) return getTemplate(templateId, actor);

  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      const live = await tx.folderAssignment.findFirst({
        where: { targetType: input.targetType, targetId, deletedAt: null },
      });
      const existing = live ?? await tx.folderAssignment.findFirst({
        where: { targetType: input.targetType, targetId },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) {
        // Re-assigning this target: swap the template and revive the row if
        // it was archived. `@@unique([targetType, targetId])` is a global
        // unique, so archive + create would collide — update in place.
        await tx.folderAssignment.update({
          where: { id: existing.id },
          data: { templateId, deletedAt: null, createdBy: actor.id },
        });
        return;
      }
      await tx.folderAssignment.create({
        data: {
          templateId,
          targetType: input.targetType,
          targetId,
          createdBy: actor.id,
        },
      });
    },
    "ASSIGNED",
    AUDIT_ACTIONS.FOLDER_TEMPLATE_ASSIGNED,
    { targetType: input.targetType, targetId },
    null,
  );

  return getTemplate(templateId, actor);
}

export async function unassignTemplate(
  assignmentId: string,
  actor: Actor,
): Promise<FolderTemplateDetail> {
  assertCan(actor, PERM.assign, "You do not have permission to modify folder template assignments");
  const assignment = await repo.findAssignmentById(assignmentId);
  if (!assignment) throw new NotFoundError("Assignment not found");
  const template = await repo.findTemplateById(assignment.templateId);
  if (!template) throw new NotFoundError("Folder template not found");

  await mutateTemplate(
    template,
    actor,
    async (tx) => {
      await tx.folderAssignment.update({
        where: { id: assignmentId },
        data: { deletedAt: new Date() },
      });
    },
    "ASSIGNED",
    AUDIT_ACTIONS.FOLDER_TEMPLATE_ASSIGNED,
    { unassigned: true, targetType: assignment.targetType, targetId: assignment.targetId },
    null,
  );

  return getTemplate(assignment.templateId, actor);
}

export async function listAssignments(
  query: ListFolderAssignmentsQuery,
  actor: Actor,
): Promise<FolderAssignmentView[]> {
  assertCan(actor, PERM.read, "You do not have access to the folder builder");
  const where: Prisma.FolderAssignmentWhereInput = {};
  if (query.templateId) where.templateId = query.templateId;
  if (query.targetType) where.targetType = query.targetType;
  const rows = await repo.listAssignments(where);
  const names = await resolveAssignmentTargetNames(rows);
  const templateIds = [...new Set(rows.map((r) => r.templateId))];
  const templates = templateIds.length
    ? await prisma.folderTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, name: true } })
    : [];
  const templateName = new Map(templates.map((t) => [t.id, t.name]));
  return rows.map((a) => ({
    id: a.id,
    templateId: a.templateId,
    templateName: templateName.get(a.templateId) ?? "Unknown template",
    targetType: a.targetType,
    targetId: a.targetId,
    targetName: a.targetId ? (names.get(a.targetId) ?? "Unknown target") : "Entire University",
    createdAt: a.createdAt,
  }));
}
