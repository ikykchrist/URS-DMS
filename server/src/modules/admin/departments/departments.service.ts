import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/admin/departments/departments.repository";
import type { DepartmentDetail } from "@/modules/admin/departments/departments.types";
import type {
  CreateDepartmentBody,
  DepartmentListQuery,
  UpdateDepartmentBody,
} from "@/modules/admin/departments/departments.validator";

// =============================================================================
// URS-DMS — Admin · Departments service (Sprint 7.1)
// -----------------------------------------------------------------------------
// Business logic + RBAC re-checks (defence in depth — the route layer's
// `requirePermission(...)` is the first gate; the service re-asserts the same
// permission so a wiring mistake at the route layer can never bypass RBAC).
// No `if (role === "admin")` anywhere.
//
// RBAC model (matches the catalog in permissions.constants.ts):
//   - department.read           → list + detail
//   - department.create          → create
//   - department.update          → update
//   - department.archive         → archive + restore (single coarse code, per spec)
// The "admin" surface is intentionally ADMINISTRATOR-only for mutations; the
// QAO role is granted the read codes so the existing dashboard scope keeps
// working.
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface ListResult {
  items: DepartmentDetail[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("department.read")) {
    throw new ForbiddenError("You do not have access to the admin departments surface");
  }
}

function assertCanCreate(actor: Actor): void {
  if (!actor.permissions.includes("department.create")) {
    throw new ForbiddenError("You do not have permission to create departments");
  }
}

function assertCanUpdate(actor: Actor): void {
  if (!actor.permissions.includes("department.update")) {
    throw new ForbiddenError("You do not have permission to update departments");
  }
}

function assertCanArchive(actor: Actor): void {
  if (!actor.permissions.includes("department.archive")) {
    throw new ForbiddenError("You do not have permission to archive or restore departments");
  }
}

// Validate head existence before relying on the FK constraint. Inactive /
// soft-deleted users are rejected so the caller gets a clear 400 instead of a
// P2003 FK violation surfacing as an opaque 500. `headId === null` is allowed
// (clears the head).
async function assertHeadExists(headId: string | null | undefined): Promise<void> {
  if (headId === undefined || headId === null) return;
  const user = await prisma.user.findFirst({
    where: { id: headId, deletedAt: null },
    select: { id: true },
  });
  if (!user) {
    throw new BadRequestError("Referenced department head not found");
  }
}

// Validate college existence before relying on the FK constraint. Archived
// colleges (soft-deleted) are rejected. `collegeId === null` is allowed
// (clears the college).
async function assertCollegeExists(collegeId: string | null | undefined): Promise<void> {
  if (collegeId === undefined || collegeId === null) return;
  const college = await prisma.college.findFirst({
    where: { id: collegeId, deletedAt: null },
    select: { id: true },
  });
  if (!college) {
    throw new BadRequestError("Referenced college not found");
  }
}

// -----------------------------------------------------------------------------
// listDepartments
// -----------------------------------------------------------------------------
export async function listDepartments(
  query: DepartmentListQuery,
  actor: Actor,
): Promise<ListResult> {
  assertCanRead(actor);

  const page = query.page;
  const pageSize = query.pageSize;
  const r = await repo.list({
    q: query.q,
    collegeId: query.collegeId,
    page,
    pageSize,
    includeArchived: query.includeArchived,
  });

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
// getDepartment
// -----------------------------------------------------------------------------
export async function getDepartment(id: string, actor: Actor): Promise<DepartmentDetail> {
  assertCanRead(actor);
  const dept = await repo.findById(id);
  if (!dept) throw new NotFoundError("Department not found");
  return dept;
}

// -----------------------------------------------------------------------------
// createDepartment
// -----------------------------------------------------------------------------
export async function createDepartment(
  input: CreateDepartmentBody,
  actor: Actor,
): Promise<DepartmentDetail> {
  assertCanCreate(actor);
  await assertHeadExists(input.headId);
  await assertCollegeExists(input.collegeId);

  // Check code uniqueness before insert to give a clear conflict message.
  // `code` is `@unique` in the schema so the DB is the ultimate guard; this
  // pre-check just turns P2002 into a friendly 409.
  if (await repo.codeTaken(input.code)) {
    throw new ConflictError("A department with this code already exists");
  }

  const dept = await repo.create({
    name: input.name,
    code: input.code,
    description: input.description ?? null,
    headId: input.headId ?? null,
    collegeId: input.collegeId ?? null,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.DEPARTMENT_CREATED,
    userId: actor.id,
    entity: "department",
    entityId: dept.id,
    newValue: {
      name: dept.name,
      code: dept.code,
      headId: dept.headId,
      collegeId: dept.collegeId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return dept;
}

// -----------------------------------------------------------------------------
// updateDepartment
// -----------------------------------------------------------------------------
export async function updateDepartment(
  id: string,
  input: UpdateDepartmentBody,
  actor: Actor,
): Promise<DepartmentDetail> {
  assertCanUpdate(actor);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Department not found");

  // Permission mocks architecture mandate: never trust the route layer alone,
  // and never permit mutation of a soft-deleted row via the update endpoint
  // (an archived row is restored only via the explicit restore flow).
  if (existing.deletedAt) {
    throw new BadRequestError("Department is archived; restore it before updating");
  }

  if (input.headId !== undefined) await assertHeadExists(input.headId);
  if (input.collegeId !== undefined) await assertCollegeExists(input.collegeId);

  const updated = await repo.update({
    id,
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.headId !== undefined ? { headId: input.headId } : {}),
      ...(input.collegeId !== undefined ? { collegeId: input.collegeId } : {}),
    },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.DEPARTMENT_UPDATED,
    userId: actor.id,
    entity: "department",
    entityId: id,
    oldValue: {
      name: existing.name,
      description: existing.description,
      headId: existing.headId,
      collegeId: existing.collegeId,
    },
    newValue: {
      name: updated.name,
      description: updated.description,
      headId: updated.headId,
      collegeId: updated.collegeId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// archiveDepartment (soft delete)
// -----------------------------------------------------------------------------
export async function archiveDepartment(id: string, actor: Actor): Promise<DepartmentDetail> {
  assertCanArchive(actor);
  const existing = await repo.findById(id, false);
  if (!existing) throw new NotFoundError("Department not found");

  const archived = await repo.archive(id);

  await writeAudit({
    action: AUDIT_ACTIONS.DEPARTMENT_ARCHIVED,
    userId: actor.id,
    entity: "department",
    entityId: id,
    oldValue: { name: existing.name, code: existing.code, deletedAt: null },
    newValue: { name: archived.name, code: archived.code, deletedAt: archived.deletedAt },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return archived;
}

// -----------------------------------------------------------------------------
// restoreDepartment
// -----------------------------------------------------------------------------
export async function restoreDepartment(id: string, actor: Actor): Promise<DepartmentDetail> {
  assertCanArchive(actor);
  const existing = await repo.findById(id, true);
  if (!existing) throw new NotFoundError("Department not found");
  if (!existing.deletedAt) throw new BadRequestError("Department is not archived");

  const restored = await repo.restore(id);

  await writeAudit({
    action: AUDIT_ACTIONS.DEPARTMENT_RESTORED,
    userId: actor.id,
    entity: "department",
    entityId: id,
    oldValue: { name: existing.name, code: existing.code, deletedAt: existing.deletedAt },
    newValue: { name: restored.name, code: restored.code, deletedAt: null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return restored;
}
