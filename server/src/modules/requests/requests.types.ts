import type { Prisma } from "@prisma/client";

// =============================================================================
// URS-DMS — document requests domain shapes
// =============================================================================

export interface RequestItemInfo {
  documentId: string;
  title: string | null;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  ownerName: string | null;
  uploadedAt: Date | null;
}

export interface RequestListItem {
  id: string;
  title: string;
  justification: string;
  status: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string | null;
  documentId: string | null;
  documentTitle: string | null;
  items: RequestItemInfo[];
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RequestDetail = RequestListItem;

export type RequestWithRelations = Prisma.DocumentRequestGetPayload<{
  select: typeof requestSelect;
}>;

export const requestSelect = {
  id: true,
  title: true,
  justification: true,
  status: true,
  requesterId: true,
  documentId: true,
  decidedById: true,
  decidedAt: true,
  decisionNote: true,
  createdAt: true,
  updatedAt: true,
  requester: { select: { firstName: true, lastName: true, email: true } },
  document: { select: { id: true, title: true } },
  decidedBy: { select: { firstName: true, lastName: true } },
  items: {
    select: {
      documentId: true,
      document: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          currentVersion: { select: { filename: true, mimeType: true, sizeBytes: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.DocumentRequestSelect;
