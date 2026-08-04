import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/admin/colleges/colleges.repository";
import type { CollegeDetail } from "@/modules/admin/colleges/colleges.types";
import type {
  CollegeListQuery,
  CreateCollegeBody,
  UpdateCollegeBody,
} from "@/modules/admin/colleges/colleges.validator";

// =============================================================================
// URS-DMS — Admin · Colleges service (Sprint 7.1)
// -----------------------------------------------------------------------------
// Business logic + RBAC re-checks (defence in depth — the route layer's
// `requirePermission(...)` is the first gate; the service re-asserts the same
// permission so a wiring mistake at the route layer can never bypass RBAC).
// No `if (role === "admin")` anywhere.
//
// RBAC model (matches the catalog in permissions.constants.ts):
//   - college.read     → list + detail
//   - college.create   → create
//   - college.update   → update
//   - college.archive → archive + restore (single coarse code, per spec)
// Mutations are ADMINISTRATOR-only; the QAO role is granted the read codes so
// the existing dashboard scope keeps working.
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface ListResult {
  items: CollegeDetail[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("college.read")) {
    throw new ForbiddenError("You do not have access to the admin colleges surface");
  }
}

function assertCanCreate(actor: Actor): void {
  if (!actor.permissions.includes("college.create")) {
    throw new ForbiddenError("You do not have permission to create colleges");
  }
}

function assertCanUpdate(actor: Actor): void {
  if (!actor.permissions.includes("college.update")) {
    throw new ForbiddenError("You do not have permission to update colleges");
  }
}

function assertCanArchive(actor: Actor): void {
  if (!actor.permissions.includes("college.archive")) {
    throw new ForbiddenError("You do not have permission to archive or restore colleges");
  }
}

// -----------------------------------------------------------------------------
// listColleges
// -----------------------------------------------------------------------------
export async function listColleges(
  query: CollegeListQuery,
  actor: Actor,
): Promise<ListResult> {
  assertCanRead(actor);

  const page = query.page;
  const pageSize = query.pageSize;
  const r = await repo.list({
    q: query.q,
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
// getCollege
// -----------------------------------------------------------------------------
export async function getCollege(id: string, actor: Actor): Promise<CollegeDetail> {
  assertCanRead(actor);
  const college = await repo.findById(id);
  if (!college) throw new NotFoundError("College not found");
  return college;
}

// -----------------------------------------------------------------------------
// createCollege
// -----------------------------------------------------------------------------
export async function createCollege(
  input: CreateCollegeBody,
  actor: Actor,
): Promise<CollegeDetail> {
  assertCanCreate(actor);

  // Pre-check code uniqueness to turn P2002 into a friendly 409 message.
  if (await repo.codeTaken(input.code)) {
    throw new ConflictError("A college with this code already exists");
  }

  const college = await repo.create({
    name: input.name,
    code: input.code,
    description: input.description ?? null,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.COLLEGE_CREATED,
    userId: actor.id,
    entity: "college",
    entityId: college.id,
    newValue: {
      name: college.name,
      code: college.code,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return college;
}

// -----------------------------------------------------------------------------
// updateCollege
// -----------------------------------------------------------------------------
export async function updateCollege(
  id: string,
  input: UpdateCollegeBody,
  actor: Actor,
): Promise<CollegeDetail> {
  assertCanUpdate(actor);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("College not found");
  if (existing.deletedAt) {
    throw new BadRequestError("College is archived; restore it before updating");
  }

  const updated = await repo.update({
    id,
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.COLLEGE_UPDATED,
    userId: actor.id,
    entity: "college",
    entityId: id,
    oldValue: {
      name: existing.name,
      description: existing.description,
    },
    newValue: {
      name: updated.name,
      description: updated.description,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// archiveCollege (soft delete)
// -----------------------------------------------------------------------------
export async function archiveCollege(id: string, actor: Actor): Promise<CollegeDetail> {
  assertCanArchive(actor);
  const existing = await repo.findById(id, false);
  if (!existing) throw new NotFoundError("College not found");

  const archived = await repo.archive(id);

  await writeAudit({
    action: AUDIT_ACTIONS.COLLEGE_ARCHIVED,
    userId: actor.id,
    entity: "college",
    entityId: id,
    oldValue: { name: existing.name, code: existing.code, deletedAt: null },
    newValue: { name: archived.name, code: archived.code, deletedAt: archived.deletedAt },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return archived;
}

// -----------------------------------------------------------------------------
// restoreCollege
// -----------------------------------------------------------------------------
export async function restoreCollege(id: string, actor: Actor): Promise<CollegeDetail> {
  assertCanArchive(actor);
  const existing = await repo.findById(id, true);
  if (!existing) throw new NotFoundError("College not found");
  if (!existing.deletedAt) throw new BadRequestError("College is not archived");

  const restored = await repo.restore(id);

  await writeAudit({
    action: AUDIT_ACTIONS.COLLEGE_RESTORED,
    userId: actor.id,
    entity: "college",
    entityId: id,
    oldValue: { name: existing.name, code: existing.code, deletedAt: existing.deletedAt },
    newValue: { name: restored.name, code: restored.code, deletedAt: null },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return restored;
}
