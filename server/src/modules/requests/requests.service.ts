import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { prisma } from "@/lib/prisma";
import {
  bindWorkflowInstance,
  evaluateWorkflowAction,
  recordWorkflowAction,
  scopesForDocumentRequest,
} from "@/modules/workflow/workflow.engine";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/utils/errors";
import * as repo from "@/modules/requests/requests.repository";
import type { Prisma } from "@prisma/client";
import type {
  CreateRequestInput,
  ListRequestsQuery,
  DecideRequestInput,
} from "@/modules/requests/requests.validator";
import type { RequestDetail, RequestListItem } from "@/modules/requests/requests.types";

// =============================================================================
// URS-DMS — requests service
// RBAC model:
//   - "managers" = users holding request.manage (admins + QAOs + dept coords).
//   - otherwise: requester sees only their own requests.
// No `if (role === "admin")` anywhere — every check routes through permissions.
// =============================================================================

export interface ListResult {
  items: RequestListItem[];
}

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

function isManager(actor: Actor): boolean {
  return actor.permissions.includes("request.manage");
}

async function assertCanView(actor: Actor, request: { requesterId: string }): Promise<void> {
  if (actor.id === request.requesterId) return;
  if (isManager(actor)) return;
  throw new ForbiddenError("You do not have access to this request");
}

// -----------------------------------------------------------------------------
// listRequests
// -----------------------------------------------------------------------------
export async function listRequests(query: ListRequestsQuery, actor: Actor): Promise<ListResult> {
  const where: Prisma.DocumentRequestWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.documentId) where.documentId = query.documentId;
  if (query.requesterId) where.requesterId = query.requesterId;

  // Scope: managers see everything; everyone else sees only their own.
  if (!isManager(actor)) {
    where.requesterId = actor.id;
  }

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { justification: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return { items: await repo.list(where) };
}

// -----------------------------------------------------------------------------
// getRequest
// -----------------------------------------------------------------------------
export async function getRequest(id: string, actor: Actor): Promise<RequestDetail> {
  const request = await repo.findById(id);
  if (!request) throw new NotFoundError("Request not found");
  await assertCanView(actor, request);
  return request;
}

// -----------------------------------------------------------------------------
// createRequest
// -----------------------------------------------------------------------------
export async function createRequest(
  input: CreateRequestInput,
  actor: Actor,
): Promise<RequestDetail> {
  if (!actor.permissions.includes("request.create")) {
    throw new ForbiddenError("Missing permission: request.create");
  }

  if (input.documentId) {
    // Optional: validate document exists and is not soft-deleted. We rely on
    // schema FK SetNull semantics — a missing document would just null out
    // the field. To keep behavior explicit, we surface a clear error.
    const { prisma } = await import("@/lib/prisma");
    const doc = await prisma.document.findFirst({
      where: { id: input.documentId, deletedAt: null },
      select: { id: true },
    });
    if (!doc) throw new BadRequestError("Referenced document not found");
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await repo.create(
      {
        requesterId: actor.id,
        title: input.title,
        justification: input.justification,
        documentId: input.documentId ?? null,
      },
      tx,
    );

    // Sprint 7.4.5 — bind a published workflow instance (if one is assigned
    // to the requester's scope) inside the same transaction. No assignment →
    // legacy flow unchanged.
    const scopes = await scopesForDocumentRequest(actor.id, tx);
    await bindWorkflowInstance({
      entityType: "DOCUMENT_REQUEST",
      entityId: created.id,
      scopes,
      actor,
      tx,
    });
    return created;
  });

  await writeAudit({
    action: AUDIT_ACTIONS.REQUEST_CREATED,
    userId: actor.id,
    entity: "request",
    entityId: request.id,
    newValue: {
      title: request.title,
      documentId: request.documentId,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return request;
}

// -----------------------------------------------------------------------------
// decideRequest (approve / reject / fulfill)
// -----------------------------------------------------------------------------
export async function decideRequest(
  id: string,
  decision: "APPROVED" | "REJECTED" | "FULFILLED",
  input: DecideRequestInput,
  actor: Actor,
): Promise<RequestDetail> {
  if (!isManager(actor)) {
    throw new ForbiddenError("Missing permission: request.manage");
  }

  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Request not found");

  // State machine validation.
  if (decision === "APPROVED") {
    if (existing.status !== "PENDING") {
      throw new ConflictError("Only pending requests can be approved");
    }
  } else if (decision === "REJECTED") {
    if (existing.status !== "PENDING") {
      throw new ConflictError("Only pending requests can be rejected");
    }
  } else if (decision === "FULFILLED") {
    if (existing.status !== "APPROVED") {
      throw new ConflictError("Only approved requests can be fulfilled");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Sprint 7.4.5 — workflow gate: if a published workflow controls this
    // request, the decision must be an allowed action from the current step
    // (legacy fallback when no instance is bound).
    const evaluation = await evaluateWorkflowAction(
      "DOCUMENT_REQUEST",
      id,
      REQUEST_DECISION_ACTIONS[decision],
      actor,
      tx,
    );
    const row = await repo.decide(
      {
        id,
        status: decision,
        decidedById: actor.id,
        decisionNote: input.decisionNote ?? null,
      },
      tx,
    );
    if (evaluation) {
      await recordWorkflowAction(tx, evaluation, actor, input.decisionNote ?? undefined);
    }
    return row;
  });

  const actionMap = {
    APPROVED: AUDIT_ACTIONS.REQUEST_APPROVED,
    REJECTED: AUDIT_ACTIONS.REQUEST_REJECTED,
    FULFILLED: AUDIT_ACTIONS.REQUEST_FULFILLED,
  } as const;

  await writeAudit({
    action: actionMap[decision],
    userId: actor.id,
    entity: "request",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: {
      status: decision,
      decisionNote: input.decisionNote ?? null,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// cancelRequest
// -----------------------------------------------------------------------------
export async function cancelRequest(id: string, actor: Actor): Promise<RequestDetail> {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Request not found");

  if (existing.requesterId !== actor.id) {
    throw new ForbiddenError("You can only cancel your own requests");
  }
  if (existing.status !== "PENDING") {
    throw new ConflictError("Only pending requests can be cancelled");
  }

  // Reuse decide() with REJECTED status and an explicit cancel note. This
  // keeps the schema happy (status is a RequestStatus enum, no CANCELLED
  // value exists). Audit action REQUEST_CANCELLED distinguishes it from a
  // manager-driven rejection.
  const updated = await prisma.$transaction(async (tx) => {
    const evaluation = await evaluateWorkflowAction(
      "DOCUMENT_REQUEST",
      id,
      "CANCEL",
      actor,
      tx,
    );
    const row = await repo.decide(
      {
        id,
        status: "REJECTED",
        decidedById: actor.id,
        decisionNote: input_decisionNote(existing, "Cancelled by requester"),
      },
      tx,
    );
    if (evaluation) {
      await recordWorkflowAction(tx, evaluation, actor, "Cancelled by requester");
    }
    return row;
  });

  await writeAudit({
    action: AUDIT_ACTIONS.REQUEST_CANCELLED,
    userId: actor.id,
    entity: "request",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: "REJECTED", reason: "cancelled_by_requester" },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

// Sprint 7.4.5 — request status → workflow action adapter (glue convention,
// not workflow data: the action names themselves are authored by ROOT).
const REQUEST_DECISION_ACTIONS: Record<"APPROVED" | "REJECTED" | "FULFILLED", string> = {
  APPROVED: "APPROVE",
  REJECTED: "REJECT",
  FULFILLED: "FULFILL",
};

// Small helper to keep the cancelRequest signature clean.
function input_decisionNote(
  existing: RequestDetail,
  fallback: string,
): string {
  return existing.decisionNote ? `${existing.decisionNote}\n${fallback}` : fallback;
}
