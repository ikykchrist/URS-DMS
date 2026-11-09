import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** A null program is college-wide only when both college and campus are set. */
export function areaAudienceScope(user: {
  programId: string | null;
  campusId: string | null;
  collegeId: string | null;
} | null): Prisma.AaccupAreaWhereInput {
  const scopes: Prisma.AaccupAreaWhereInput[] = [];
  if (user?.programId) scopes.push({ programId: user.programId });
  if (user?.campusId && user.collegeId) {
    scopes.push({ programId: null, campusId: user.campusId, collegeId: user.collegeId });
  }
  return { OR: scopes };
}

export async function actorAreaScope(userId: string): Promise<Prisma.AaccupAreaWhereInput> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { programId: true, campusId: true, collegeId: true },
  });
  return areaAudienceScope(user);
}
