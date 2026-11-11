import { actorAreaScope } from "./aaccup.scope";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/aaccup/aaccup.repository";
import type { Prisma } from "@prisma/client";
import { attachTemplateToArea, detachTemplateFromArea } from "@/modules/root/root.requirement.service";
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
import { announceAreaDeadline } from "@/modules/aaccup/aaccup.area-deadline-reminder.service";
import { logger } from "@/utils/logger";

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

export async function listAreaSetupOrganization(actor: Actor) {
  assertCanManage(actor);
  return listAccreditationOrganization();
}

export async function listAccreditationOrganization() {
  return (await repo.listSetupOrganization()).map((campus) => ({
    ...campus, colleges: campus.colleges.map((college) => ({
      ...college, programs: college.programs.filter((program) => program.campusId === campus.id),
    })),
  }));
}

export async function listAreaSetupPrograms(actor: Actor) {
  assertCanManage(actor);
  return (await repo.listSetupPrograms()).filter((program) => program.campusId && program.collegeId && program.college?.campusId === program.campusId)
    .map((program) => ({ id: program.id, name: program.name, campusId: program.campusId!, collegeId: program.collegeId!, campusName: program.campus!.name, collegeName: program.college!.name }));
}

export async function getAreaTemplateSetup(areaId: string, actor: Actor) {
  assertCanManage(actor);
  const area = await repo.findById(areaId);
  if (!area) throw new NotFoundError("Accreditation area not found");
  return repo.areaTemplateSetup(areaId, area.areaSet as "AACCUP" | "ISO" | "CERT");
}

export async function setAreaTemplate(areaId: string, templateId: string | null, actor: Actor) {
  assertCanManage(actor);
  if (templateId) await attachTemplateToArea(areaId, templateId, actor);
  else await detachTemplateFromArea(areaId, actor);
  await syncAreaRequirementProjection(areaId, actor.id);
  return getAreaTemplateSetup(areaId, actor);
}

async function assertOrganizationScopeExists(input: { campusId: string; collegeId: string; programId: string | null }): Promise<void> {
  const [campus, college, program] = await Promise.all([
    prisma.campus.findFirst({ where: { id: input.campusId, deletedAt: null }, select: { id: true } }),
    prisma.college.findFirst({ where: { id: input.collegeId, deletedAt: null }, select: { id: true, campusId: true } }),
    input.programId ? prisma.program.findFirst({ where: { id: input.programId, deletedAt: null }, select: { id: true, campusId: true, collegeId: true } }) : Promise.resolve(null),
  ]);
  if (!campus || !college || college.campusId !== input.campusId || (input.programId !== null && (!program || program.campusId !== input.campusId || program.collegeId !== input.collegeId))) {
    throw new BadRequestError("Campus, college, and program must belong to the same organization scope");
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

async function assertAreaInScope(actor: Actor, areaId: string): Promise<void> {
  if (isManager(actor)) return;
  if (!await prisma.aaccupArea.findFirst({ where: { id: areaId, deletedAt: null, AND: [await actorAreaScope(actor.id)] }, select: { id: true } })) {
    throw new ForbiddenError("Accreditation area is outside your campus, college or program scope");
  }
}

// -----------------------------------------------------------------------------
// listAreas
// -----------------------------------------------------------------------------
export async function listAreas(query: ListAreasQuery, actor: Actor): Promise<ListResult> {
  assertCanRead(actor);
  const where: Prisma.AaccupAreaWhereInput = { deletedAt: null };
  if (query.areaSet) where.areaSet = query.areaSet;
  if (query.status) where.status = query.status;
  if (query.programId) where.programId = query.programId;
  if (query.accreditationCycleId) where.accreditationCycleId = query.accreditationCycleId;
  if (query.campusId) where.campusId = query.campusId;
  if (query.collegeId) where.collegeId = query.collegeId;
  if (!isManager(actor)) where.AND = [await actorAreaScope(actor.id)];
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
  await assertAreaInScope(actor, area.id);
  return area;
}

// -----------------------------------------------------------------------------
// createArea
// -----------------------------------------------------------------------------
export async function createArea(input: CreateAreaInput, actor: Actor): Promise<AaccupAreaDetail> {
  assertCanManage(actor);
  await assertOrganizationScopeExists(input);
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
    campusId: input.campusId,
    collegeId: input.collegeId,
    programId: input.programId,
    accreditationCycleId: input.accreditationCycleId ?? null,
    areaSet: input.areaSet ?? "AACCUP",
    createdBy: actor.id,
    status: input.status ?? "ACTIVE",
    dueDate: input.dueDate ?? null,
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
      campusId: area.campusId,
      collegeId: area.collegeId,
      programId: area.programId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  if (area.dueDate) {
    try { await announceAreaDeadline({ ...area, dueDate: area.dueDate }); }
    catch (error) { logger.warn("Area deadline announcement failed", { areaId: area.id, error: error instanceof Error ? error.message : String(error) }); }
  }

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

  if (input.campusId !== undefined || input.collegeId !== undefined || input.programId !== undefined) {
    await assertOrganizationScopeExists({
      campusId: input.campusId ?? existing.campusId ?? "",
      collegeId: input.collegeId ?? existing.collegeId ?? "",
      programId: input.programId !== undefined ? input.programId : existing.programId,
    });
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
      campusId: input.campusId,
      collegeId: input.collegeId,
      programId: input.programId,
      accreditationCycleId: input.accreditationCycleId,
      areaSet: input.areaSet,
      status: input.status,
      dueDate: input.dueDate,
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
      dueDate: existing.dueDate,
    },
    newValue: {
      code: updated.code,
      name: updated.name,
      status: updated.status,
      dueDate: updated.dueDate,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  const deadlineChanged = input.dueDate !== undefined && (existing.dueDate?.getTime() ?? null) !== (updated.dueDate?.getTime() ?? null);
  if (deadlineChanged && updated.dueDate) {
    try { await announceAreaDeadline({ ...updated, dueDate: updated.dueDate }); }
    catch (error) { logger.warn("Area deadline announcement failed", { areaId: updated.id, error: error instanceof Error ? error.message : String(error) }); }
  }

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
