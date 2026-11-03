// =============================================================================
// URS-DMS — Repository/document/folder authorization regression tests
// -----------------------------------------------------------------------------
// Covers cross-user move destinations, shared-WRITE boundaries, and
// department-tag authorization. Each test asserts BOTH the rejection and the
// unchanged database state (plus the denial audit where applicable).
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { runWithRequestId } from "@/middlewares/requestContext";
import {
  createTestUser,
  cleanupTestUser,
  cleanupTestData,
  createTestDocument,
  createTestFolder,
  type TestUser,
} from "@/__tests__/helpers";
import * as foldersService from "@/modules/folders/folders.service";
import * as documentsService from "@/modules/documents/documents.service";

const createdUserIds: string[] = [];
const createdProgramIds: string[] = [];

afterAll(async () => {
  for (const id of createdUserIds) {
    await prisma.documentRequest.deleteMany({ where: { requesterId: id } });
    await cleanupTestData(id);
    await cleanupTestUser(id);
  }
  await prisma.user.updateMany({
    where: { id: { in: createdUserIds } },
    data: { programId: null },
  });
  await prisma.program.deleteMany({ where: { id: { in: createdProgramIds } } });
  await prisma.repository.deleteMany({ where: { ownerId: { in: createdUserIds } } });
});

function actorOf(user: TestUser) {
  return { id: user.id, permissions: [] as string[], ipAddress: "127.0.0.1", userAgent: "vitest" };
}

async function createProgram(label: string): Promise<string> {
  const program = await prisma.program.create({
    data: { name: `RT Authz ${label}`, code: `RT-${label}-${randomUUID().slice(0, 8)}` },
    select: { id: true },
  });
  createdProgramIds.push(program.id);
  return program.id;
}

async function pair(suffix: string): Promise<{ a: TestUser; b: TestUser }> {
  const a = await createTestUser("FACULTY", `${suffix}-a`);
  const b = await createTestUser("FACULTY", `${suffix}-b`);
  createdUserIds.push(a.id, b.id);
  return { a, b };
}

describe("folder move destination authorization", () => {
  it("rejects moving an owned folder under another user's folder and leaves the tree unchanged", async () => {
    const { a, b } = await pair("move-xuser");
    const folderA = await createTestFolder(a.id, null, "A Move Source");
    const folderB = await createTestFolder(b.id, null, "B Move Destination");
    const corr = `test-move-xuser-${randomUUID()}`;

    await runWithRequestId(corr, async () => {
      await expect(
        foldersService.updateFolder(folderA.id, { parentId: folderB.id }, actorOf(a)),
      ).rejects.toThrow();
    });

    const after = await prisma.folder.findUnique({ where: { id: folderA.id } });
    expect(after?.parentId).toBeNull();

    const denials = await prisma.auditLog.findMany({ where: { correlationId: corr } });
    expect(denials).toHaveLength(1);
    expect(denials[0]!.action).toBe("auth.access_denied");
    expect(denials[0]!.result).toBe("DENIED");
    expect(denials[0]!.category).toBe("SECURITY");
    expect(denials[0]!.userId).toBe(a.id);
    expect(denials[0]!.entityId).toBe(folderB.id);
  });

  it("allows moving into a folder shared with EDITOR", async () => {
    const { a, b } = await pair("move-shared");
    const folderA = await createTestFolder(a.id, null, "A Shared Move Source");
    const folderB = await createTestFolder(b.id, null, "B Shared Move Destination");
    await prisma.folderShare.create({
      data: { folderId: folderB.id, recipientType: "USER", userId: a.id, permission: "WRITE", createdById: b.id },
    });

    const moved = await foldersService.updateFolder(folderA.id, { parentId: folderB.id }, actorOf(a));
    expect(moved.parentId).toBe(folderB.id);
  });

  it("still rejects self-parenting and moving into own subtree", async () => {
    const { a } = await pair("move-cycle");
    const root = await createTestFolder(a.id, null, "A Cycle Root");
    const child = await createTestFolder(a.id, root.id, "A Cycle Child");

    await expect(foldersService.updateFolder(root.id, { parentId: root.id }, actorOf(a))).rejects.toThrow();
    await expect(foldersService.updateFolder(root.id, { parentId: child.id }, actorOf(a))).rejects.toThrow();
    const after = await prisma.folder.findUnique({ where: { id: root.id } });
    expect(after?.parentId).toBeNull();
  });
});

describe("shared-WRITE document boundaries", () => {
  it("rejects a WRITE sharee changing departmentId and leaves the document unchanged", async () => {
    const { a, b } = await pair("doc-dept");
    const program = await createProgram("doc-program");
    const doc = await createTestDocument(b.id, "B Dept Doc");
    await prisma.documentShare.create({
      data: { documentId: doc.id, userId: a.id, permission: "WRITE" },
    });
    const corr = `test-doc-dept-${randomUUID()}`;

    await runWithRequestId(corr, async () => {
      await expect(
        documentsService.updateDocument(doc.id, { programId: program }, actorOf(a)),
      ).rejects.toThrow();
    });

    const after = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(after?.programId).toBeNull();

    const denials = await prisma.auditLog.findMany({ where: { correlationId: corr } });
    expect(denials).toHaveLength(1);
    expect(denials[0]!.action).toBe("auth.access_denied");
    expect(denials[0]!.result).toBe("DENIED");
    expect(denials[0]!.category).toBe("SECURITY");
    expect(denials[0]!.userId).toBe(a.id);
    expect(denials[0]!.entityId).toBe(doc.id);
  });

  it("allows the owner to change the document department", async () => {
    const { b } = await pair("doc-dept-owner");
    const program = await createProgram("doc-program-owner");
    const doc = await createTestDocument(b.id, "B Own Dept Doc");

    const updated = await documentsService.updateDocument(doc.id, { programId: program }, actorOf(b));
    expect(updated.programId).toBe(program);
  });

  it("still allows a WRITE sharee to rename the document (non-sensitive edit)", async () => {
    const { a, b } = await pair("doc-rename");
    const doc = await createTestDocument(b.id, "B Rename Doc");
    await prisma.documentShare.create({
      data: { documentId: doc.id, userId: a.id, permission: "WRITE" },
    });

    const updated = await documentsService.updateDocument(doc.id, { title: "Renamed by sharee" }, actorOf(a));
    expect(updated.title).toBe("Renamed by sharee");
  });
});

describe("folder department tagging authorization", () => {
  it("rejects tagging a folder to a department the actor does not belong to", async () => {
    const { a } = await pair("folder-dept");
    const own = await createProgram("folder-program-own");
    const other = await createProgram("folder-program-other");
    await prisma.user.update({ where: { id: a.id }, data: { programId: own } });

    const corr = `test-folder-dept-${randomUUID()}`;
    await runWithRequestId(corr, async () => {
      await expect(
        foldersService.createFolder({ name: "Cross Program Folder", programId: other }, actorOf(a)),
      ).rejects.toThrow();
    });

    const created = await prisma.folder.findFirst({ where: { ownerId: a.id, name: "Cross Program Folder" } });
    expect(created).toBeNull();

    const denials = await prisma.auditLog.findMany({ where: { correlationId: corr } });
    expect(denials).toHaveLength(1);
    expect(denials[0]!.action).toBe("auth.access_denied");
    expect(denials[0]!.result).toBe("DENIED");
    expect(denials[0]!.category).toBe("SECURITY");
    expect(denials[0]!.userId).toBe(a.id);
  });

  it("allows tagging a folder to the actor's own department", async () => {
    const { a } = await pair("folder-dept-own");
    const own = await createProgram("folder-program-allowed");
    await prisma.user.update({ where: { id: a.id }, data: { programId: own } });

    const folder = await foldersService.createFolder(
      { name: "Own Program Folder", programId: own },
      actorOf(a),
    );
    expect(folder.programId).toBe(own);
  });
});
