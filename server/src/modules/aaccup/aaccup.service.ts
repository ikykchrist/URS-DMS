import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/aaccup/aaccup.repository";
import type { Prisma } from "@prisma/client";
import type {
  CreateAreaInput,
  ListAreasQuery,
  UpdateAreaInput,
} from "@/modules/aaccup/aaccup.validator";
import type { AaccupAreaDetail, AaccupAreaListItem } from "@/modules/aaccup/aaccup.types";
import {
  invalidateRequirementResolutionCache,
  syncAreaRequirementProjection,
} from "@/modules/requirements/requirement.runtime";

// =============================================================================
// URS-DMS — AACCUP service
// RBAC model:
//   - "managers" = users holding aaccup.manage (admins + QAOs).
//   - otherwise: aaccup.read allows viewing; aaccup.create/update/archive/restore
//     requires matching permission.
// No `if (role === "admin")` anywhere.
// =============================================================================

export interface ListResult {
  items: AaccupAreaListItem[];
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
    throw new ForbiddenError("Only managers can manage AACCUP accreditation areas");
  }
}

function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("aaccup.read") && !isManager(actor)) {
    throw new ForbiddenError("You do not have access to AACCUP accreditation areas");
  }
}

// Validate department existence before relying on FK constraint. Archived
// departments (soft-deleted) are rejected so callers get a clear 400 instead
// of a P2003 FK violation surfacing as an opaque 500.
async function assertDepartmentExists(departmentId: string): Promise<void> {
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, deletedAt: null },
    select: { id: true },
  });
  if (!dept) {
    throw new BadRequestError("Referenced department not found");
  }
}

async function assertCycleExists(cycleId: string | null | undefined): Promise<void> {
  if (!cycleId) return;
  const cycle = await prisma.accreditationCycle.findFirst({
    where: { id: cycleId, deletedAt: null },
    select: { id: true },
  });
  if (!cycle) throw new BadRequestError("Referenced accreditation cycle not found");
}

async function actorDepartmentIds(actor: Actor): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { departmentId: true, departments: { select: { id: true } } },
  });
  return [
    ...new Set(
      [user?.departmentId, ...(user?.departments.map((department) => department.id) ?? [])].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
}

async function assertAreaInScope(actor: Actor, departmentId: string): Promise<void> {
  if (isManager(actor)) return;
  if (!(await actorDepartmentIds(actor)).includes(departmentId)) {
    throw new ForbiddenError("AACCUP area is outside your department scope");
  }
}

// -----------------------------------------------------------------------------
// listAreas
// -----------------------------------------------------------------------------
export async function listAreas(query: ListAreasQuery, actor: Actor): Promise<ListResult> {
  assertCanRead(actor);
  const where: Prisma.AaccupAreaWhereInput = { deletedAt: null };
  if (query.status) where.status = query.status;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.accreditationCycleId) where.accreditationCycleId = query.accreditationCycleId;
  if (!isManager(actor)) {
    const allowed = await actorDepartmentIds(actor);
    where.departmentId =
      query.departmentId && allowed.includes(query.departmentId)
        ? query.departmentId
        : { in: query.departmentId ? [] : allowed };
  }
  if (query.q) {
    where.OR = [
      { code: { contains: query.q, mode: "insensitive" } },
      { name: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const sortField = query.sort ?? "name";
  const sortOrder = query.order ?? "asc";
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  const r = await repo.list(where, page, pageSize, sortField, sortOrder);
  return {
    items: r.items,
    meta: {
      page,
      pageSize,
      total: r.total,
      totalPages: Math.max(1, Math.ceil(r.total / pageSize)),
    },
  };
}

// -----------------------------------------------------------------------------
// getArea
// -----------------------------------------------------------------------------
export async function getArea(id: string, actor: Actor): Promise<AaccupAreaDetail> {
  assertCanRead(actor);
  const area = await repo.findById(id);
  if (!area) throw new NotFoundError("AACCUP area not found");
  await assertAreaInScope(actor, area.departmentId);
  return area;
}

// -----------------------------------------------------------------------------
// createArea
// -----------------------------------------------------------------------------
export async function createArea(input: CreateAreaInput, actor: Actor): Promise<AaccupAreaDetail> {
  assertCanManage(actor);
  await assertDepartmentExists(input.departmentId);
  await assertCycleExists(input.accreditationCycleId);

  // Check code uniqueness (before insert to avoid relying solely on DB exception)
  const existingCode = await prisma.aaccupArea.findFirst({
    where: { code: input.code, deletedAt: null },
    select: { id: true },
  });
  if (existingCode) {
    throw new ConflictError("An active AACCUP area with this code already exists");
  }

  const area = await repo.create({
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    departmentId: input.departmentId,
    accreditationCycleId: input.accreditationCycleId ?? null,
    createdBy: actor.id,
    status: input.status ?? "ACTIVE",
  });

  invalidateRequirementResolutionCache();
  await syncAreaRequirementProjection(area.id, actor.id);

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_AREA_CREATED,
    userId: actor.id,
    entity: "aaccup_area",
    entityId: area.id,
    newValue: {
      code: area.code,
      name: area.name,
      departmentId: area.departmentId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return area;
}

// -----------------------------------------------------------------------------
// updateArea
// -----------------------------------------------------------------------------
export async function updateArea(
  id: string,
  input: UpdateAreaInput,
  actor: Actor,
): Promise<AaccupAreaDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("AACCUP area not found");

  if (input.departmentId && input.departmentId !== existing.departmentId) {
    await assertDepartmentExists(input.departmentId);
  }
  await assertCycleExists(input.accreditationCycleId);

  if (input.code && input.code !== existing.code) {
    const dup = await prisma.aaccupArea.findFirst({
      where: { code: input.code, deletedAt: null, id: { not: id } },
      select: { id: true },
    });
    if (dup) throw new ConflictError("Another active AACCUP area already uses this code");
  }

  const updated = await repo.update({
    id,
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      departmentId: input.departmentId,
      accreditationCycleId: input.accreditationCycleId,
      status: input.status,
      updatedBy: actor.id,
    },
  });

  invalidateRequirementResolutionCache();
  await syncAreaRequirementProjection(updated.id, actor.id);

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_AREA_UPDATED,
    userId: actor.id,
    entity: "aaccup_area",
    entityId: id,
    oldValue: {
      code: existing.code,
      name: existing.name,
      status: existing.status,
    },
    newValue: {
      code: updated.code,
      name: updated.name,
      status: updated.status,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// archiveArea (soft delete)
// -----------------------------------------------------------------------------
export async function archiveArea(id: string, actor: Actor): Promise<AaccupAreaDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id, false);
  if (!existing) throw new NotFoundError("AACCUP area not found");

  const archived = await repo.archive(id, actor.id);
  invalidateRequirementResolutionCache();
  await prisma.aaccupRequirement.updateMany({
    where: { areaId: id, sourceNodeId: { not: null }, deletedAt: null },
    data: { status: "INACTIVE", deletedAt: new Date(), updatedBy: actor.id },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_AREA_ARCHIVED,
    userId: actor.id,
    entity: "aaccup_area",
    entityId: id,
    oldValue: { code: existing.code, name: existing.name, status: existing.status },
    newValue: { status: "INACTIVE", deletedAt: archived.deletedAt },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return archived;
}

// -----------------------------------------------------------------------------
// restoreArea
// -----------------------------------------------------------------------------
export async function restoreArea(id: string, actor: Actor): Promise<AaccupAreaDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id, true);
  if (!existing) throw new NotFoundError("AACCUP area not found");
  if (!existing.deletedAt) throw new BadRequestError("Area is not archived");

  const restored = await repo.restore(id, actor.id);
  invalidateRequirementResolutionCache();
  await syncAreaRequirementProjection(restored.id, actor.id);

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_AREA_RESTORED,
    userId: actor.id,
    entity: "aaccup_area",
    entityId: id,
    oldValue: { status: "INACTIVE", deletedAt: existing.deletedAt },
    newValue: { status: restored.status, deletedAt: null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return restored;
}
