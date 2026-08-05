import { prisma } from "@/lib/prisma";

// =============================================================================
// URS-DMS — Personal repository repository
// =============================================================================

export async function ensureRepository(ownerId: string): Promise<string> {
  const existing = await prisma.repository.findUnique({ where: { ownerId } });
  if (existing) return existing.id;
  const created = await prisma.repository.create({ data: { ownerId } });
  return created.id;
}

export async function backfillRepositories(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  let created = 0;
  for (const user of users) {
    const existing = await prisma.repository.findUnique({ where: { ownerId: user.id } });
    if (!existing) {
      await prisma.repository.create({ data: { ownerId: user.id } });
      created += 1;
    }
  }
  return created;
}

export async function linkFolderToRepository(folderId: string, repositoryId: string): Promise<void> {
  await prisma.folder.update({ where: { id: folderId }, data: { repositoryId } });
}

export async function linkDocumentToRepository(documentId: string, repositoryId: string): Promise<void> {
  await prisma.document.update({ where: { id: documentId }, data: { repositoryId } });
}

export async function getRepositoryStats(ownerId: string) {
  const [folderCount, documentCount, sizeAggregate] = await Promise.all([
    prisma.folder.count({ where: { ownerId, deletedAt: null } }),
    prisma.document.count({ where: { ownerId, deletedAt: null } }),
    prisma.documentVersion.aggregate({
      where: { document: { ownerId, deletedAt: null } },
      _sum: { sizeBytes: true },
    }),
  ]);
  return {
    folderCount,
    documentCount,
    storageBytes: (sizeAggregate._sum.sizeBytes ?? BigInt(0)).toString(),
  };
}

export async function hasActiveEmergencyAccess(
  adminId: string,
  ownerId: string,
): Promise<boolean> {
  const grant = await prisma.emergencyAccess.findFirst({
    where: {
      adminId,
      ownerId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return grant !== null;
}

export async function grantEmergencyAccess(args: {
  adminId: string;
  ownerId: string;
  reason: string;
  durationMinutes: number;
  grantedBy: string;
}): Promise<{ id: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + args.durationMinutes * 60 * 1000);
  const row = await prisma.emergencyAccess.create({
    data: {
      adminId: args.adminId,
      ownerId: args.ownerId,
      reason: args.reason,
      grantedBy: args.grantedBy,
      expiresAt,
    },
  });
  return { id: row.id, expiresAt };
}

export async function revokeEmergencyAccess(
  id: string,
): Promise<{ id: string } | null> {
  const existing = await prisma.emergencyAccess.findUnique({ where: { id } });
  if (!existing) return null;
  if (!existing.revokedAt) {
    await prisma.emergencyAccess.update({ where: { id }, data: { revokedAt: new Date() } });
  }
  return { id };
}

export async function listEmergencyAccessForAdmin(
  adminId: string,
): Promise<Array<{
  id: string;
  adminId: string;
  ownerId: string;
  ownerName: string;
  reason: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}>> {
  const rows = await prisma.emergencyAccess.findMany({
    where: { adminId },
    orderBy: { grantedAt: "desc" },
    include: { owner: { select: { firstName: true, lastName: true, email: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    adminId: row.adminId,
    ownerId: row.ownerId,
    ownerName: `${row.owner.firstName} ${row.owner.lastName}`.trim(),
    reason: row.reason,
    grantedBy: row.grantedBy,
    grantedAt: row.grantedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  }));
}

export async function listRepositoriesForOwner(
  ownerId: string,
): Promise<Array<{ id: string; ownerId: string; createdAt: Date }>> {
  return prisma.repository.findMany({
    where: { ownerId },
    select: { id: true, ownerId: true, createdAt: true },
  });
}
