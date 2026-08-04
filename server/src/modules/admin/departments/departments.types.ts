// =============================================================================
// URS-DMS — Admin · Departments domain shapes (Sprint 7.1)
// -----------------------------------------------------------------------------
// Mirrors the read shapes used by other admin-style modules (e.g. users).
// Every list/detail view resolves the head + college via a single nested
// include so the controller never hits a second round-trip.
// =============================================================================

import type { Prisma } from "@prisma/client";

export interface DepartmentListItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  headId: string | null;
  headName: string | null;
  collegeId: string | null;
  collegeName: string | null;
  userCount: number;
  documentCount: number;
  folderCount: number;
  areaCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type DepartmentDetail = DepartmentListItem;

export type DepartmentWithRelations = Prisma.DepartmentGetPayload<{
  select: typeof departmentSelect;
}>;

export const departmentSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  headId: true,
  collegeId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  head: { select: { firstName: true, lastName: true, email: true } },
  college: { select: { id: true, name: true } },
  _count: {
    select: {
      users: { where: { deletedAt: null } },
      documents: { where: { deletedAt: null } },
      folders: { where: { deletedAt: null } },
      aaccupAreas: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.DepartmentSelect;
