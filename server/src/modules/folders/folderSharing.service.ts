import { prisma } from "@/lib/prisma";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { notifyUsers } from "@/modules/notifications/notifications.service";
import type { FolderShareRecipientType, SharePermission } from "@prisma/client";

export type FolderAccess = "NONE" | "VIEWER" | "EDITOR" | "OWNER";
export type FolderSharePermission = "VIEWER" | "EDITOR";

const rank: Record<FolderAccess, number> = { NONE: 0, VIEWER: 1, EDITOR: 2, OWNER: 3 };

function toAccess(permission: SharePermission): FolderAccess {
  return permission === "WRITE" ? "EDITOR" : "VIEWER";
}

export async function resolveFolderAccess(actorId: string, folderId: string): Promise<FolderAccess> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { programId: true } });
  if (!actor) return "NONE";

  let currentId: string | null = folderId;
  let effective: FolderAccess = "NONE";
  let depth = 0;
  while (currentId && depth++ < 50) {
    const folder = await prisma.folder.findFirst({
      where: { id: currentId, deletedAt: null },
      select: {
        id: true,
        ownerId: true,
        parentId: true,
        programId: true,
        shares: {
          where: {
            OR: [
              { recipientType: "USER", userId: actorId },
              ...(actor.programId ? [{ recipientType: "PROGRAM" as const, programId: actor.programId }] : []),
            ],
          },
          select: { permission: true },
        },
      },
    }) as { id: string; ownerId: string | null; parentId: string | null; programId: string | null; shares: Array<{ permission: SharePermission }> } | null;
    if (!folder) return "NONE";
    if (folder.ownerId === actorId) return "OWNER";
    // Program-owned repository folders are visible only to members of the
    // matching program. Explicit shares still apply to personal folders.
    if (folder.programId && folder.programId === actor.programId) return "VIEWER";
    for (const share of folder.shares) {
      const candidate = toAccess(share.permission);
      if (rank[candidate] > rank[effective]) effective = candidate;
    }
    currentId = folder.parentId;
  }
  return effective;
}

export function canEditFolder(access: FolderAccess): boolean {
  return access === "OWNER" || access === "EDITOR";
}

export function canManageFolderShares(access: FolderAccess): boolean {
  return access === "OWNER";
}

export async function assertFolderAccess(actorId: string, folderId: string, minimum: "VIEWER" | "EDITOR" | "OWNER"): Promise<FolderAccess> {
  const access = await resolveFolderAccess(actorId, folderId);
  if (rank[access] < rank[minimum]) throw new NotFoundError("Folder not found");
  return access;
}

async function ownerFolder(folderId: string, actorId: string) {
  const folder = await prisma.folder.findFirst({ where: { id: folderId, deletedAt: null }, select: { id: true, name: true, ownerId: true, programId: true, owner: { select: { campusId: true, collegeId: true, programId: true } } } });
  if (!folder || folder.ownerId !== actorId) throw new NotFoundError("Folder not found");
  return folder;
}

async function assertShareableUser(actorId: string, userId: string, ownerCampusId: string | null) {
  if (actorId === userId) throw new BadRequestError("You cannot share a folder with yourself");
  const user = await prisma.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null }, select: { id: true, campusId: true } });
  if (!user || !ownerCampusId || user.campusId !== ownerCampusId) throw new BadRequestError("The recipient must be an active user in your campus");
  return user;
}

export async function listShareableUsers(actorId: string, scope: "CAMPUS" | "COLLEGE" | "PROGRAM" = "CAMPUS") {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, campusId: true, collegeId: true, programId: true },
  });
  if (!actor?.campusId) return [];
  if (scope === "COLLEGE" && !actor.collegeId) return [];
  if (scope === "PROGRAM" && !actor.programId) return [];

  return prisma.user.findMany({
    where: {
      campusId: actor.campusId,
      ...(scope === "COLLEGE" ? { collegeId: actor.collegeId! } : {}),
      ...(scope === "PROGRAM" ? { programId: actor.programId! } : {}),
      status: "ACTIVE",
      deletedAt: null,
      id: { not: actor.id },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      campusId: true,
      collegeId: true,
      programId: true,
      campus: { select: { name: true } },
      college: { select: { name: true } },
      program: { select: { name: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

function permissionValue(permission: FolderSharePermission): SharePermission {
  return permission === "EDITOR" ? "WRITE" : "READ";
}

export async function listFolderShares(folderId: string, actorId: string) {
  await ownerFolder(folderId, actorId);
  return prisma.folderShare.findMany({
    // Older databases may retain a retired DEPARTMENT enum row from the
    // scope cutover. Never let an unreadable legacy row break the owner's
    // sharing screen; the repair migration converts valid rows to PROGRAM.
    where: { folderId, recipientType: { in: ["USER", "PROGRAM"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, recipientType: true, permission: true, userId: true, programId: true, createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      program: { select: { name: true, code: true } },
    },
  });
}

export async function shareFolder(folderId: string, actorId: string, input: { recipientType: FolderShareRecipientType; userIds?: string[]; programId?: string; permission: FolderSharePermission }, auditContext?: { ipAddress?: string; userAgent?: string }) {
  const folder = await ownerFolder(folderId, actorId);
  if (input.recipientType === "USER") {
    const userIds = [...new Set(input.userIds ?? [])];
    if (!userIds.length) throw new BadRequestError("Select at least one user");
    await Promise.all(userIds.map((id) => assertShareableUser(actorId, id, folder.owner?.campusId ?? null)));
    await prisma.$transaction(userIds.map((userId) => prisma.folderShare.upsert({
      where: { folderId_userId: { folderId, userId } },
      create: { folderId, recipientType: "USER", userId, permission: permissionValue(input.permission), createdById: actorId },
      update: { permission: permissionValue(input.permission) },
    })));
  } else {
    if (!input.programId || input.programId !== (folder.owner?.programId ?? null)) throw new BadRequestError("You may share only with your own program");
    await prisma.program.findFirstOrThrow({ where: { id: input.programId, deletedAt: null } });
    await prisma.folderShare.upsert({
      where: { folderId_programId: { folderId, programId: input.programId } },
      create: { folderId, recipientType: "PROGRAM", programId: input.programId, permission: permissionValue(input.permission), createdById: actorId },
      update: { permission: permissionValue(input.permission) },
    });
  }
  void notifyShareRecipients(folderId, folder.name, input).catch(() => undefined);
  await writeAudit({ action: AUDIT_ACTIONS.FOLDER_SHARED, userId: actorId, entity: "folder", entityId: folderId, newValue: { folderName: folder.name, recipientType: input.recipientType, userIds: input.userIds, programId: input.programId, permission: input.permission }, ...auditContext });
  return listFolderShares(folderId, actorId);
}

async function notifyShareRecipients(folderId: string, folderName: string, input: { recipientType: FolderShareRecipientType; userIds?: string[]; programId?: string; permission: FolderSharePermission }) {
  const userIds = input.recipientType === "USER"
    ? [...new Set(input.userIds ?? [])]
    : input.programId
      ? (await prisma.user.findMany({ where: { programId: input.programId, status: "ACTIVE", deletedAt: null }, select: { id: true } })).map((user) => user.id)
      : [];
  await notifyUsers(userIds, "FOLDER_SHARED_ACCESS", {
    entity: "folder",
    entityId: folderId,
    actionUrl: `/documents?folderId=${folderId}`,
    title: "Folder shared with you",
    message: `The folder "${folderName}" was shared with you as ${input.permission.toLowerCase()}.`,
    metadata: { folderId, permission: input.permission },
  });
}

export async function updateFolderShare(folderId: string, shareId: string, actorId: string, permission: FolderSharePermission, auditContext?: { ipAddress?: string; userAgent?: string }) {
  await ownerFolder(folderId, actorId);
  const share = await prisma.folderShare.findFirst({ where: { id: shareId, folderId } });
  if (!share) throw new NotFoundError("Share not found");
  const updated = await prisma.folderShare.update({ where: { id: shareId }, data: { permission: permissionValue(permission) } });
  await writeAudit({ action: AUDIT_ACTIONS.FOLDER_SHARE_PERMISSION_CHANGED, userId: actorId, entity: "folder_share", entityId: shareId, oldValue: { permission: share.permission }, newValue: { permission }, ...auditContext });
  return updated;
}

export async function removeFolderShare(folderId: string, shareId: string, actorId: string, auditContext?: { ipAddress?: string; userAgent?: string }) {
  await ownerFolder(folderId, actorId);
  const share = await prisma.folderShare.findFirst({ where: { id: shareId, folderId } });
  if (!share) throw new NotFoundError("Share not found");
  await prisma.folderShare.delete({ where: { id: shareId } });
  await writeAudit({ action: AUDIT_ACTIONS.FOLDER_SHARE_REMOVED, userId: actorId, entity: "folder_share", entityId: shareId, oldValue: { recipientType: share.recipientType, userId: share.userId, programId: share.programId, permission: share.permission }, ...auditContext });
}

export async function listSharedWithMe(actorId: string) {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { programId: true } });
  if (!actor) return [];
  const shares = await prisma.folderShare.findMany({
    where: { OR: [{ recipientType: "USER", userId: actorId }, ...(actor.programId ? [{ recipientType: "PROGRAM" as const, programId: actor.programId }] : [])], folder: { deletedAt: null, ownerId: { not: actorId } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      permission: true,
      recipientType: true,
      folder: {
        select: {
          id: true, name: true, parentId: true, ownerId: true, programId: true,
          color: true, icon: true, createdAt: true, updatedAt: true,
          _count: { select: { children: { where: { deletedAt: null } }, documents: { where: { deletedAt: null } } } },
        },
      },
    },
  });
  const result = [];
  for (const share of shares) {
    const access = await resolveFolderAccess(actorId, share.folder.id);
    if (access === "VIEWER" || access === "EDITOR") result.push({ ...share.folder, permission: access, shareId: share.id });
  }
  return result;
}
