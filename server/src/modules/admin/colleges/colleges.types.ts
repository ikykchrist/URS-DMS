import type { Prisma } from "@prisma/client";

// =============================================================================
// URS-DMS — Admin · Colleges domain shapes (Sprint 7.1)
// -----------------------------------------------------------------------------
// Mirrors the read shape used by the departments module. A college's only
// relation exposed on the list/detail view is a `_count` of live child
// departments, so the controller never needs a second round-trip.
// =============================================================================

export interface CollegeListItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departmentCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type CollegeDetail = CollegeListItem;

export type CollegeWithRelations = Prisma.CollegeGetPayload<{
  select: typeof collegeSelect;
}>;

export const collegeSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: {
    select: {
      departments: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.CollegeSelect;
