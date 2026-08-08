import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  type RequestDetail,
  type RequestListItem,
  type RequestWithRelations,
  type RequestItemInfo,
  requestSelect,
} from "@/modules/requests/requests.types";

// =============================================================================
// URS-DMS — requests repository
// =============================================================================

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function toItemInfo(r: RequestWithRelations["items"][number]): RequestItemInfo {
  return {
    documentId: r.documentId,
    title: r.document?.title ?? null,
    filename: r.document?.currentVersion?.filename ?? null,
    mimeType: r.document?.currentVersion?.mimeType ?? null,
    sizeBytes: r.document?.currentVersion?.sizeBytes?.toString() ?? null,
    ownerName: r.document?.owner ? fullName(r.document.owner.firstName, r.document.owner.lastName) : null,
    uploadedAt: r.document?.createdAt ?? null,
  };
}

function toListItem(r: RequestWithRelations): RequestListItem {
  return {
    id: r.id,
    title: r.title,
    justification: r.justification,
    status: r.status,
    requesterId: r.requesterId,
    requesterName: fullName(r.requester.firstName, r.requester.lastName),
    requesterEmail: r.requester.email,
    documentId: r.documentId,
    documentTitle: r.document?.title ?? null,
    items: r.items.map(toItemInfo),
    decidedById: r.decidedById,
    decidedByName: r.decidedBy ? fullName(r.decidedBy.firstName, r.decidedBy.lastName) : null,
    decidedAt: r.decidedAt,
    decisionNote: r.decisionNote,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function list(
  where: Prisma.DocumentRequestWhereInput,
): Promise<RequestListItem[]> {
  const rows = await prisma.documentRequest.findMany({
    where,
    select: requestSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toListItem);
}

export async function findById(id: string): Promise<RequestDetail | null> {
  const row = await prisma.documentRequest.findUnique({
    where: { id },
    select: requestSelect,
  });
  return row ? toListItem(row) : null;
}

export interface CreateArgs {
  requesterId: string;
  title: string;
  justification: string;
  documentId: string | null;
  documentIds: string[];
}

export async function create(
  args: CreateArgs,
  tx?: Prisma.TransactionClient,
): Promise<RequestDetail> {
  const client = tx ?? prisma;
  const row = await client.documentRequest.create({
    data: {
      requesterId: args.requesterId,
      title: args.title,
      justification: args.justification,
      documentId: args.documentId,
      status: "PENDING",
      items: {
        create: args.documentIds.map((documentId) => ({ documentId })),
      },
    },
    select: requestSelect,
  });
  return toListItem(row);
}

export interface DecideArgs {
  id: string;
  status: "APPROVED" | "REJECTED" | "FULFILLED";
  decidedById: string;
  decisionNote: string | null;
}

export async function decide(
  args: DecideArgs,
  tx?: Prisma.TransactionClient,
): Promise<RequestDetail> {
  const client = tx ?? prisma;
  const row = await client.documentRequest.update({
    where: { id: args.id },
    data: {
      status: args.status,
      decidedById: args.decidedById,
      decidedAt: new Date(),
      decisionNote: args.decisionNote,
    },
    select: requestSelect,
  });
  return toListItem(row);
}
