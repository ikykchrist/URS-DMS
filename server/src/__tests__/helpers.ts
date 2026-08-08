// =============================================================================
// URS-DMS — Test helpers (Sprint 8.6)
// Factory functions for creating test data. All created records use a unique
// test stamp for identification and cleanup.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

let testStamp: string;

export function getTestStamp(): string {
  if (!testStamp) {
    testStamp = `test-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
  }
  return testStamp;
}

export interface TestUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
}

export interface TestDocument {
  id: string;
  title: string;
  versionId?: string;
  objectKey?: string;
}

export interface TestFolder {
  id: string;
  name: string;
}

let roleCache: Map<string, string> | null = null;

export async function getRoleId(name: string): Promise<string> {
  if (!roleCache) {
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    roleCache = new Map(roles.map((r) => [r.name, r.id]));
  }
  const id = roleCache.get(name);
  if (!id) throw new Error(`Role not found: ${name}`);
  return id;
}

let rootIdCache: string | null = null;

export async function getRootId(): Promise<string> {
  if (rootIdCache) return rootIdCache;
  const user = await prisma.user.findFirst({
    where: { role: { name: "ROOT" }, deletedAt: null },
    select: { id: true },
  });
  if (!user) throw new Error("No ROOT user found");
  rootIdCache = user.id;
  return rootIdCache;
}

export async function createTestUser(roleName: string, suffix?: string): Promise<TestUser> {
  const randPart = randomUUID().slice(0, 6);
  const uniqueSuffix = suffix ? `${suffix}-${randPart}` : randPart;
  const roleId = await getRoleId(roleName);
  const email = `smk.test.${roleName.toLowerCase()}.${uniqueSuffix}@urs.local`;

  const user = await prisma.user.create({
    data: {
      employeeId: `SMK-TEST-${uniqueSuffix}`,
      email,
      firstName: "Test",
      lastName: roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase(),
      roleId,
      status: "ACTIVE",
      passwordHash: "$argon2id$test-hash-not-real",
    },
    select: { id: true, email: true, roleId: true },
  });

  return { id: user.id, email: user.email, roleId: user.roleId, roleName };
}

export async function cleanupTestUser(userId: string): Promise<void> {
  try {
    // Soft-delete user's documents and folders first
    await prisma.document.updateMany({
      where: { ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await prisma.folder.updateMany({
      where: { ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    // Soft-delete user (archive, don't hard-delete — FKs protect referenced rows)
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  } catch {
    // Best-effort cleanup
  }
}

export async function createTestDocument(ownerId: string, title?: string): Promise<TestDocument> {
  const stamp = getTestStamp();
  const doc = await prisma.document.create({
    data: {
      ownerId,
      title: title ?? `SMK Test Doc ${stamp}`,
      classification: "INTERNAL",
    },
    select: { id: true, title: true },
  });
  return { id: doc.id, title: doc.title };
}

export async function createTestFolder(
  ownerId: string,
  parentId: string | null,
  name?: string,
): Promise<TestFolder> {
  const stamp = getTestStamp();
  const folder = await prisma.folder.create({
    data: {
      ownerId,
      name: name ?? `SMK Test Folder ${stamp}`,
      parentId,
    },
    select: { id: true, name: true },
  });
  return { id: folder.id, name: folder.name };
}

export async function cleanupTestData(ownerId: string): Promise<void> {
  try {
    await prisma.document.deleteMany({ where: { ownerId } });
    await prisma.folder.deleteMany({ where: { ownerId } });
  } catch {
    // Best-effort
  }
}
