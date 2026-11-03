import type { Prisma } from "@prisma/client";

/** Legacy area-authored requirements and templates explicitly attached to an area. */
export const areaRequirementVisibility = {
  OR: [
    { sourceNodeId: null },
    { sourceAssignment: { deletedAt: null, targetType: "AACCUP_AREA", template: { deletedAt: null, status: "ACTIVE" } } },
  ],
} satisfies Prisma.AaccupRequirementWhereInput;
