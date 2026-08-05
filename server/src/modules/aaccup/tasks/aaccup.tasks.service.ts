import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/utils/errors";
import * as repo from "@/modules/aaccup/tasks/aaccup.tasks.repository";
import type { Prisma } from "@prisma/client";
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from "@/modules/aaccup/tasks/aaccup.tasks.validator";
import type {
  AaccupTaskDetail,
  AaccupTaskListItem,
} from "@/modules/aaccup/tasks/aaccup.tasks.types";

// =============================================================================
// URS-DMS — AACCUP task service
// RBAC model (mirrors the Area / Requirement services):
//   - "managers" = users holding aaccup.manage (admins + QAOs). Mutations are
//     manager-only; reads require aaccup.read OR manager status.
//   - Assignees are validated at create/update time: USER targets must exist
//     and be ACTIVE; DEPARTMENT targets must exist and not be archived. The
//     display label is snapshotted at write time.
// No `if (role === "admin")` anywhere.
// =============================================================================

export interface ListResult {
  items: AaccupTaskListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

function isManager(actor: Actor): boolean {
  return actor.permissions.includes("aaccup.manage");
}

function assertCanManage(actor: Actor): void {
  if (!isManager(actor)) {
    throw new ForbiddenError("Only managers can manage AACCUP accreditation tasks");
  }
}

function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("aaccup.read") && !isManager(actor)) {
    throw new ForbiddenError("You do not have access to AACCUP accreditation tasks");
  }
}

async function assertAreaExists(areaId: string): Promise<void> {
  const area = await prisma.aaccupArea.findFirst({
    where: { id: areaId, deletedAt: null },
    select: { id: true },
  });
  if (!area) {
    throw new BadRequestError("Referenced AACCUP area not found");
  }
}

// A task may optionally reference a requirement, but only one that belongs to
// the task's own area (and is not archived).
async function assertRequirementForArea(
  areaId: string,
  requirementId: string | null | undefined,
): Promise<void> {
  if (requirementId === undefined || requirementId === null) return;
  const requirement = await prisma.aaccupRequirement.findFirst({
    where: { id: requirementId, deletedAt: null },
    select: { id: true, areaId: true },
  });
  if (!requirement) {
    throw new BadRequestError("Referenced requirement not found");
  }
  if (requirement.areaId !== areaId) {
    throw new BadRequestError("Requirement does not belong to the task's area");
  }
}

function normalizeAssigneeType(assigneeType: "USER" | "DEPARTMENT"): "USER" | "DEPARTMENT" {
  return assigneeType === "DEPARTMENT" ? "DEPARTMENT" : "USER";
}

// Resolve an assignee target to a display label, validating existence.
// USER targets must be ACTIVE and not archived; DEPARTMENT targets must not
// be archived.
async function resolveAssignee(
  assigneeType: "USER" | "DEPARTMENT",
  assigneeId: string,
): Promise<string> {
  if (assigneeType === "DEPARTMENT") {
    const department = await prisma.department.findFirst({
      where: { id: assigneeId, deletedAt: null },
      select: { name: true },
    });
    if (!department) {
      throw new BadRequestError("Referenced department not found");
    }
    return department.name;
  }

  const user = await prisma.user.findFirst({
    where: { id: assigneeId, deletedAt: null },
    select: { firstName: true, lastName: true, status: true },
  });
  if (!user) {
    throw new BadRequestError("Referenced user not found");
  }
  if (user.status !== "ACTIVE") {
    throw new BadRequestError("Tasks can only be assigned to active users");
  }
  return `${user.firstName} ${user.lastName}`.trim();
}

const SORT_FIELDS = new Set(["title", "status", "priority", "dueDate", "createdAt", "updatedAt"]);

// -----------------------------------------------------------------------------
// listTasks
// -----------------------------------------------------------------------------
export async function listTasks(query: ListTasksQuery, actor: Actor): Promise<ListResult> {
  assertCanRead(actor);

  const where: Prisma.AaccupTaskWhereInput = {
    deletedAt: null,
    area: { deletedAt: null },
  };
  if (query.areaId) {
    await assertAreaExists(query.areaId);
    where.areaId = query.areaId;
  }
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assigneeType) where.assigneeType = query.assigneeType;

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { assigneeLabel: { contains: query.q, mode: "insensitive" } },
      {
        area: {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { code: { contains: query.q, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const sortField = SORT_FIELDS.has(query.sort ?? "") ? (query.sort as string) : "createdAt";
  const sortOrder = query.order;
  const page = query.page;
  const pageSize = query.pageSize;

  const { items, total } = await repo.list(where, page, pageSize, sortField, sortOrder);

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

// -----------------------------------------------------------------------------
// getTask
// -----------------------------------------------------------------------------
export async function getTask(id: string, actor: Actor): Promise<AaccupTaskDetail> {
  assertCanRead(actor);
  const task = await repo.findById(id);
  if (!task) throw new NotFoundError("AACCUP task not found");
  return task;
}

// -----------------------------------------------------------------------------
// createTask
// -----------------------------------------------------------------------------
export async function createTask(input: CreateTaskInput, actor: Actor): Promise<AaccupTaskDetail> {
  assertCanManage(actor);
  await assertAreaExists(input.areaId);
  await assertRequirementForArea(input.areaId, input.requirementId);

  const assigneeType = normalizeAssigneeType(input.assigneeType);
  const assigneeLabel = await resolveAssignee(assigneeType, input.assigneeId);

  const task = await repo.create({
    areaId: input.areaId,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? null,
    priority: input.priority,
    dueDate: input.dueDate ?? null,
    requirementId: input.requirementId ?? null,
    assigneeType,
    assigneeId: input.assigneeId,
    assigneeLabel,
    createdBy: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_TASK_CREATED,
    userId: actor.id,
    entity: "aaccup_task",
    entityId: task.id,
    newValue: {
      areaId: task.areaId,
      title: task.title,
      assigneeType,
      assigneeId: input.assigneeId,
      assigneeLabel,
      priority: task.priority,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return task;
}

// -----------------------------------------------------------------------------
// updateTask
// -----------------------------------------------------------------------------
export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  actor: Actor,
): Promise<AaccupTaskDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("AACCUP task not found");

  // If the related requirement changes, it must belong to the task's area.
  if (input.requirementId !== undefined && input.requirementId !== existing.requirementId) {
    await assertRequirementForArea(existing.areaId, input.requirementId);
  }

  // Re-resolve the assignee whenever the target (type or id) changes.
  const newAssigneeType = input.assigneeType
    ? normalizeAssigneeType(input.assigneeType)
    : existing.assigneeType;
  const newAssigneeId = input.assigneeId ?? existing.assigneeId;
  const assigneeChanged =
    input.assigneeType !== undefined ||
    (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId);
  let assigneeData:
    | { assigneeType: "USER" | "DEPARTMENT"; assigneeId: string; assigneeLabel: string }
    | undefined;
  if (assigneeChanged) {
    if (!newAssigneeId) throw new BadRequestError("Assignee is required");
    assigneeData = {
      assigneeType: newAssigneeType,
      assigneeId: newAssigneeId,
      assigneeLabel: await resolveAssignee(newAssigneeType, newAssigneeId),
    };
  }

  const completedAt =
    input.status === "COMPLETED"
      ? new Date()
      : input.status != null
        ? null
        : undefined;

  const updated = await repo.update({
    id,
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.requirementId !== undefined ? { requirementId: input.requirementId } : {}),
      ...(assigneeData ? { ...assigneeData } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
      updatedBy: actor.id,
    },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_TASK_UPDATED,
    userId: actor.id,
    entity: "aaccup_task",
    entityId: id,
    oldValue: {
      title: existing.title,
      status: existing.status,
      assigneeLabel: existing.assigneeLabel,
      priority: existing.priority,
    },
    newValue: {
      title: updated.title,
      status: updated.status,
      assigneeLabel: updated.assigneeLabel,
      priority: updated.priority,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// archiveTask (soft delete)
// -----------------------------------------------------------------------------
export async function archiveTask(id: string, actor: Actor): Promise<AaccupTaskDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id, false);
  if (!existing) throw new NotFoundError("AACCUP task not found");

  const archived = await repo.archive(id, actor.id);

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_TASK_ARCHIVED,
    userId: actor.id,
    entity: "aaccup_task",
    entityId: id,
    oldValue: { title: existing.title, status: existing.status },
    newValue: { deletedAt: archived.deletedAt },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return archived;
}

// -----------------------------------------------------------------------------
// restoreTask
// -----------------------------------------------------------------------------
export async function restoreTask(id: string, actor: Actor): Promise<AaccupTaskDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id, true);
  if (!existing) throw new NotFoundError("AACCUP task not found");
  if (!existing.deletedAt) throw new BadRequestError("Task is not archived");

  await assertAreaExists(existing.areaId);

  const restored = await repo.restore(id, actor.id);

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_TASK_RESTORED,
    userId: actor.id,
    entity: "aaccup_task",
    entityId: id,
    oldValue: { status: existing.status, deletedAt: existing.deletedAt },
    newValue: { status: restored.status, deletedAt: null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return restored;
}