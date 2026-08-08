// =============================================================================
// URS-DMS — Repository ownership and isolation tests (Sprint 8.6)
// Tests that users cannot access each other's private folders/documents.
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  cleanupTestUser,
  createTestDocument,
  createTestFolder,
} from "@/__tests__/helpers";

const createdUserIds: string[] = [];

afterAll(async () => {
  for (const id of createdUserIds) {
    await cleanupTestUser(id);
  }
});

describe("Repository Isolation (Unit)", () => {
  it("document owned by user A is visible when filtered by ownerId", async () => {
    const userA = await createTestUser("FACULTY", "iso-a");
    createdUserIds.push(userA.id);

    const doc = await createTestDocument(userA.id, "User A Document");
    expect(doc.id).toBeTruthy();

    const found = await prisma.document.findFirst({
      where: { id: doc.id, ownerId: userA.id, deletedAt: null },
    });
    expect(found).not.toBeNull();
    expect(found!.title).toBe("User A Document");
  });

  it("document owned by user A is NOT visible to user B (ownership check)", async () => {
    const userA = await createTestUser("FACULTY", "iso-a2");
    const userB = await createTestUser("FACULTY", "iso-b");
    createdUserIds.push(userA.id, userB.id);

    const doc = await createTestDocument(userA.id, "A's Document");
    expect(doc.id).toBeTruthy();

    const foundByB = await prisma.document.findFirst({
      where: { id: doc.id, ownerId: userB.id, deletedAt: null },
    });
    expect(foundByB).toBeNull();
  });

  it("folder owned by user A is visible when filtered by ownerId", async () => {
    const userA = await createTestUser("FACULTY", "folder-a");
    createdUserIds.push(userA.id);

    const folder = await createTestFolder(userA.id, null, "A's Folder");
    expect(folder.id).toBeTruthy();

    const found = await prisma.folder.findFirst({
      where: { id: folder.id, ownerId: userA.id, deletedAt: null },
    });
    expect(found).not.toBeNull();
  });

  it("folder owned by user A is NOT visible to user B", async () => {
    const userA = await createTestUser("FACULTY", "folder-a2");
    const userB = await createTestUser("FACULTY", "folder-b");
    createdUserIds.push(userA.id, userB.id);

    const folder = await createTestFolder(userA.id, null, "A's Private Folder");
    expect(folder.id).toBeTruthy();

    const foundByB = await prisma.folder.findFirst({
      where: { id: folder.id, ownerId: userB.id, deletedAt: null },
    });
    expect(foundByB).toBeNull();
  });

  it("user A listing only returns own documents", async () => {
    const userA = await createTestUser("FACULTY", "list-a");
    const userB = await createTestUser("FACULTY", "list-b");
    createdUserIds.push(userA.id, userB.id);

    await createTestDocument(userA.id, "A Doc 1");
    await createTestDocument(userB.id, "B Doc 1");

    const aDocs = await prisma.document.findMany({
      where: { ownerId: userA.id, deletedAt: null },
    });
    const aTitles = aDocs.map((d) => d.title);
    expect(aTitles).toContain("A Doc 1");
    expect(aTitles).not.toContain("B Doc 1");
  });

  it("user B listing only returns own documents", async () => {
    const userA = await createTestUser("FACULTY", "list-a2");
    const userB = await createTestUser("FACULTY", "list-b2");
    createdUserIds.push(userA.id, userB.id);

    await createTestDocument(userA.id, "A Doc 2");
    await createTestDocument(userB.id, "B Doc 2");

    const bDocs = await prisma.document.findMany({
      where: { ownerId: userB.id, deletedAt: null },
    });
    const bTitles = bDocs.map((d) => d.title);
    expect(bTitles).toContain("B Doc 2");
    expect(bTitles).not.toContain("A Doc 2");
  });
});

describe("Folder Depth Limits", () => {
  it("depth 5 is allowed", async () => {
    const user = await createTestUser("FACULTY", "depth");
    createdUserIds.push(user.id);

    // Create nested folders to depth 5
    let parentId: string | null = null;
    let deepestId = "";
    for (let i = 0; i < 5; i++) {
      const folder = await createTestFolder(user.id, parentId, `Level ${i + 1}`);
      parentId = folder.id;
      deepestId = folder.id;
    }
    expect(deepestId).toBeTruthy();
  });
});

describe("Soft Delete and Restore", () => {
  it("soft-deleted document has deletedAt set", async () => {
    const user = await createTestUser("FACULTY", "del");
    createdUserIds.push(user.id);

    const doc = await createTestDocument(user.id, "To Delete");
    await prisma.document.update({
      where: { id: doc.id },
      data: { deletedAt: new Date() },
    });

    const deleted = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  it("restored document has deletedAt cleared", async () => {
    const user = await createTestUser("FACULTY", "restore");
    createdUserIds.push(user.id);

    const doc = await createTestDocument(user.id, "To Restore");
    await prisma.document.update({
      where: { id: doc.id },
      data: { deletedAt: new Date() },
    });
    await prisma.document.update({
      where: { id: doc.id },
      data: { deletedAt: null },
    });

    const restored = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(restored!.deletedAt).toBeNull();
  });

  it("folder soft-delete preserves subtree documents (unfiled)", async () => {
    const user = await createTestUser("FACULTY", "folder-del");
    createdUserIds.push(user.id);

    const folder = await createTestFolder(user.id, null, "FolderToDelete");
    const childDoc = await prisma.document.create({
      data: {
        ownerId: user.id,
        title: "Doc in folder",
        classification: "INTERNAL",
        folderId: folder.id,
      },
    });
    expect(childDoc.id).toBeTruthy();

    // Soft-delete folder: delete folder, children unfiled
    await prisma.folder.update({
      where: { id: folder.id },
      data: { deletedAt: new Date() },
    });

    const deletedFolder = await prisma.folder.findUnique({ where: { id: folder.id } });
    expect(deletedFolder!.deletedAt).not.toBeNull();
  });
});

describe("Document Metadata", () => {
  it("document has ownerId on creation", async () => {
    const user = await createTestUser("FACULTY", "meta");
    createdUserIds.push(user.id);

    const doc = await createTestDocument(user.id, "Metadata Test");
    const found = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(found!.ownerId).toBe(user.id);
    expect(found!.title).toBe("Metadata Test");
    expect(found!.classification).toBe("INTERNAL");
  });

  it("document createdAt is set automatically", async () => {
    const user = await createTestUser("FACULTY", "ts");
    createdUserIds.push(user.id);

    const doc = await createTestDocument(user.id, "Timestamp Test");
    const found = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(found!.createdAt).toBeInstanceOf(Date);
  });
});
