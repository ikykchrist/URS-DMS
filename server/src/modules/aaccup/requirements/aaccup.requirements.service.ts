import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/aaccup/requirements/aaccup.requirements.repository";
import type { Prisma } from "@prisma/client";
import type {
  CreateRequirementInput,
  ListRequirementsQuery,
  UpdateRequirementInput,
  ValidateRequirementUploadInput,
} from "@/modules/aaccup/requirements/aaccup.requirements.validator";
import type {
  AaccupRequirementDetail,
  AaccupRequirementListItem,
} from "@/modules/aaccup/requirements/aaccup.requirements.types";
import {
  resolveRequirementAssignmentForArea,
  syncAreaRequirementProjection,
  validateRequirementUpload,
} from "@/modules/requirements/requirement.runtime";
import type { UploadValidationResult } from "@/modules/root/root.requirement.types";

// =============================================================================
// URS-DMS — AACCUP requirement service
// RBAC model (mirrors the Area service):
//   - "managers" = users holding aaccup.manage (admins + QAOs). Manager status
//     grants create/update/archive/restore. Reads require aaccup.requirement.read
//     OR manager status.
//   - Granular aaccup.requirement.* codes are checked at the route layer via
//     requirePermission(...); this service additionally enforces manager status
//     for mutations to keep defense-in-depth with the Area module.
// No `if (role === "admin")` anywhere.
// =============================================================================

export interface ListResult {
  items: AaccupRequirementListItem[];
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
    throw new ForbiddenError("Only managers can manage AACCUP accreditation requirements");
  }
}

function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("aaccup.requirement.read") && !isManager(actor)) {
    throw new ForbiddenError("You do not have access to AACCUP accreditation requirements");
  }
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

async function assertAreaScope(actor: Actor, areaId: string): Promise<{ departmentId: string }> {
  const area = await prisma.aaccupArea.findFirst({
    where: { id: areaId, deletedAt: null },
    select: { departmentId: true },
  });
  if (!area) throw new BadRequestError("Referenced AACCUP area not found");
  if (!isManager(actor) && !(await actorDepartmentIds(actor)).includes(area.departmentId)) {
    throw new ForbiddenError("AACCUP area is outside your department scope");
  }
  return area;
}

// Validate parent Area existence before relying on the FK constraint. Archived
// (soft-deleted) areas are rejected so callers get a clear 400 instead of an
// opaque constraint error.
async function assertAreaExists(areaId: string): Promise<void> {
  const area = await prisma.aaccupArea.findFirst({
    where: { id: areaId, deletedAt: null },
    select: { id: true },
  });
  if (!area) {
    throw new BadRequestError("Referenced AACCUP area not found");
  }
}

const SORT_FIELDS = new Set(["title", "documentCode", "createdAt", "updatedAt", "displayOrder"]);

// -----------------------------------------------------------------------------
// listRequirements
// -----------------------------------------------------------------------------
export async function listRequirements(
  query: ListRequirementsQuery,
  actor: Actor,
): Promise<ListResult> {
  assertCanRead(actor);

  const where: Prisma.AaccupRequirementWhereInput = {
    deletedAt: null,
    area: { deletedAt: null },
  };
  if (query.areaId) {
    await assertAreaScope(actor, query.areaId);
    const assignment = await syncAreaRequirementProjection(query.areaId, actor.id);
    where.areaId = query.areaId;
    if (assignment) where.sourceAssignmentId = assignment.id;
    else where.sourceNodeId = null;
  } else if (!isManager(actor)) {
    where.area = {
      deletedAt: null,
      departmentId: { in: await actorDepartmentIds(actor) },
    };
  }
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.priority) where.priority = query.priority;
  if (typeof query.isRequired !== "undefined") {
    where.isRequired = query.isRequired === "true";
  }

  // Search across title, documentCode, and (case-insensitively) Area name/code
  // as well as category + priority. Area fields require a relation filter.
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { documentCode: { contains: query.q, mode: "insensitive" } },
      { category: { contains: query.q, mode: "insensitive" } },
      { priority: { contains: query.q, mode: "insensitive" } },
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

  const sortField = SORT_FIELDS.has(query.sort) ? query.sort : "displayOrder";
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
// getRequirement
// -----------------------------------------------------------------------------
export async function getRequirement(id: string, actor: Actor): Promise<AaccupRequirementDetail> {
  assertCanRead(actor);
  const requirement = await repo.findById(id);
  if (!requirement) throw new NotFoundError("AACCUP requirement not found");
  await assertAreaScope(actor, requirement.areaId);
  return requirement;
}

// -----------------------------------------------------------------------------
// createRequirement
// -----------------------------------------------------------------------------
export async function createRequirement(
  input: CreateRequirementInput,
  actor: Actor,
): Promise<AaccupRequirementDetail> {
  assertCanManage(actor);
  await assertAreaExists(input.areaId);
  if (await resolveRequirementAssignmentForArea(input.areaId)) {
    throw new ConflictError("This area is managed by the Root Requirement Builder");
  }

  // Duplicate documentCode within the same Area (active rows only).
  const duplicate = await prisma.aaccupRequirement.findFirst({
    where: { areaId: input.areaId, documentCode: input.documentCode, deletedAt: null },
    select: { id: true },
  });
  if (duplicate) {
    throw new ConflictError("A requirement with this documentCode already exists for this area");
  }

  const requirement = await repo.create({
    areaId: input.areaId,
    title: input.title,
    description: input.description ?? null,
    documentCode: input.documentCode,
    category: input.category ?? null,
    priority: input.priority ?? null,
    isRequired: input.isRequired,
    status: input.status,
    displayOrder: input.displayOrder,
    createdBy: actor.id,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_REQUIREMENT_CREATED,
    userId: actor.id,
    entity: "aaccup_requirement",
    entityId: requirement.id,
    newValue: {
      areaId: requirement.areaId,
      title: requirement.title,
      documentCode: requirement.documentCode,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return requirement;
}

// -----------------------------------------------------------------------------
// updateRequirement
// -----------------------------------------------------------------------------
export async function updateRequirement(
  id: string,
  input: UpdateRequirementInput,
  actor: Actor,
): Promise<AaccupRequirementDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("AACCUP requirement not found");
  if (existing.sourceNodeId) {
    throw new ConflictError("This requirement is managed by the Root Requirement Builder");
  }

  // If areaId changes, validate the new parent area exists.
  const newAreaId = input.areaId ?? existing.areaId;
  if (input.areaId && input.areaId !== existing.areaId) {
    await assertAreaExists(input.areaId);
  }

  // Duplicate documentCode check applies only when documentCode or areaId
  // actually changes; otherwise the requirement is unchanged against itself.
  const codeChanged =
    input.documentCode !== undefined && input.documentCode !== existing.documentCode;
  const areaChanged = newAreaId !== existing.areaId;
  if (codeChanged || areaChanged) {
    const candidateCode = input.documentCode ?? existing.documentCode;
    const dup = await prisma.aaccupRequirement.findFirst({
      where: {
        areaId: newAreaId,
        documentCode: candidateCode,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictError(
        "Another requirement with this documentCode already exists for this area",
      );
    }
  }

  const updated = await repo.update({
    id,
    data: {
      ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.documentCode !== undefined ? { documentCode: input.documentCode } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      updatedBy: actor.id,
    },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_REQUIREMENT_UPDATED,
    userId: actor.id,
    entity: "aaccup_requirement",
    entityId: id,
    oldValue: {
      areaId: existing.areaId,
      title: existing.title,
      documentCode: existing.documentCode,
      status: existing.status,
    },
    newValue: {
      areaId: updated.areaId,
      title: updated.title,
      documentCode: updated.documentCode,
      status: updated.status,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// archiveRequirement (soft delete)
// -----------------------------------------------------------------------------
export async function archiveRequirement(
  id: string,
  actor: Actor,
): Promise<AaccupRequirementDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id, false);
  if (!existing) throw new NotFoundError("AACCUP requirement not found");
  if (existing.sourceNodeId) {
    throw new ConflictError("This requirement is managed by the Root Requirement Builder");
  }

  const archived = await repo.archive(id, actor.id);

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_REQUIREMENT_ARCHIVED,
    userId: actor.id,
    entity: "aaccup_requirement",
    entityId: id,
    oldValue: {
      title: existing.title,
      documentCode: existing.documentCode,
      status: existing.status,
    },
    newValue: {
      status: "INACTIVE",
      deletedAt: archived.deletedAt,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return archived;
}

// -----------------------------------------------------------------------------
// restoreRequirement
// -----------------------------------------------------------------------------
export async function restoreRequirement(
  id: string,
  actor: Actor,
): Promise<AaccupRequirementDetail> {
  assertCanManage(actor);
  const existing = await repo.findById(id, true);
  if (!existing) throw new NotFoundError("AACCUP requirement not found");
  if (existing.sourceNodeId) {
    throw new ConflictError("This requirement is managed by the Root Requirement Builder");
  }
  if (!existing.deletedAt) throw new BadRequestError("Requirement is not archived");

  // If the parent area has since been archived, the requirement cannot be
  // restored until the area is restored.
  await assertAreaExists(existing.areaId);

  const restored = await repo.restore(id, actor.id);

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_REQUIREMENT_RESTORED,
    userId: actor.id,
    entity: "aaccup_requirement",
    entityId: id,
    oldValue: {
      status: "INACTIVE",
      deletedAt: existing.deletedAt,
    },
    newValue: {
      status: restored.status,
      deletedAt: null,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return restored;
}

export async function validateUpload(
  id: string,
  input: ValidateRequirementUploadInput,
  actor: Actor,
): Promise<UploadValidationResult> {
  assertCanRead(actor);
  const requirement = await repo.findById(id);
  if (!requirement) throw new NotFoundError("AACCUP requirement not found");
  await assertAreaScope(actor, requirement.areaId);
  return validateRequirementUpload(id, input);
}
