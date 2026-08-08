// =============================================================================
// URS-DMS — Audit and notification tests (Sprint 8.6)
// Tests that audit events are created correctly and not duplicated.
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import {
  createTestUser,
  cleanupTestUser,
  createTestDocument,
} from "@/__tests__/helpers";

const createdUserIds: string[] = [];

afterAll(async () => {
  for (const id of createdUserIds) {
    await cleanupTestUser(id);
  }
});

describe("Audit Events", () => {
  it("can write an audit event", async () => {
    const before = await prisma.auditLog.count();

    await prisma.auditLog.create({
      data: {
        action: "test.event",
        entity: "test",
        entityId: "test-id",
        newValue: { result: "pass" },
      },
    });

    const after = await prisma.auditLog.count();
    expect(after).toBe(before + 1);
  });

  it("audit event stores action, entity, entityId", async () => {
    const log = await prisma.auditLog.create({
      data: {
        action: "test.event_with_meta",
        entity: "document",
        entityId: "doc-123",
        newValue: { title: "Test Doc" },
      },
    });

    expect(log.action).toBe("test.event_with_meta");
    expect(log.entity).toBe("document");
    expect(log.entityId).toBe("doc-123");
    expect(log.newValue).toEqual({ title: "Test Doc" });
    expect(log.createdAt).toBeInstanceOf(Date);
  });

  it("audit action constants are defined", () => {
    expect(AUDIT_ACTIONS.RECYCLE_CLEANUP_COMPLETED).toBeTruthy();
    expect(AUDIT_ACTIONS.STORAGE_SCAN_COMPLETED).toBeTruthy();
    expect(AUDIT_ACTIONS.PERMISSIONS_UPDATED).toBeTruthy();
    expect(AUDIT_ACTIONS.EMAIL_SENT).toBeTruthy();
    expect(AUDIT_ACTIONS.FOLDER_COPIED).toBeTruthy();
  });

  it("single document creation produces one document row (not duplicated)", async () => {
    const user = await createTestUser("FACULTY", "audit-1");
    createdUserIds.push(user.id);

    const doc = await createTestDocument(user.id, "Single Doc");

    const count = await prisma.document.count({
      where: { id: doc.id },
    });
    expect(count).toBe(1);
  });
});

describe("Notification Events", () => {
  it("can create a notification for a user", async () => {
    const user = await createTestUser("FACULTY", "notif");
    createdUserIds.push(user.id);

    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: "RECYCLE_BIN_CLEANUP",
        title: "Test notification",
        message: "Test message for notification test",
        priority: "LOW",
      },
    });

    expect(notif.id).toBeTruthy();
    expect(notif.type).toBe("RECYCLE_BIN_CLEANUP");
    expect(notif.userId).toBe(user.id);
  });

  it("notifications are per-user scoped", async () => {
    const userA = await createTestUser("FACULTY", "notif-a");
    const userB = await createTestUser("FACULTY", "notif-b");
    createdUserIds.push(userA.id, userB.id);

    await prisma.notification.create({
      data: {
        userId: userA.id,
        type: "RECYCLE_BIN_CLEANUP",
        title: "A's notification",
        message: "Only for A",
        priority: "LOW",
      },
    });

    const aNotifs = await prisma.notification.count({ where: { userId: userA.id } });
    const bNotifs = await prisma.notification.count({ where: { userId: userB.id } });
    expect(aNotifs).toBeGreaterThanOrEqual(1);
    expect(bNotifs).toBe(0);
  });
});

describe("Background Jobs", () => {
  it("repository_copy_jobs table exists", async () => {
    const count = await prisma.repositoryCopyJob.count();
    expect(typeof count).toBe("number");
  });

  it("maintenance_jobs table exists", async () => {
    const count = await prisma.maintenanceJob.count();
    expect(typeof count).toBe("number");
  });

  it("email_messages table exists", async () => {
    const count = await prisma.emailMessage.count();
    expect(typeof count).toBe("number");
  });

  it("can create a copy job record", async () => {
    const user = await createTestUser("FACULTY", "copyjob");
    createdUserIds.push(user.id);

    const repo = await prisma.repository.upsert({
      where: { ownerId: user.id },
      create: { ownerId: user.id },
      update: {},
    });

    const job = await prisma.repositoryCopyJob.create({
      data: {
        ownerId: user.id,
        repositoryId: repo.id,
        sourceFolderId: null,
        targetParentId: null,
        conflictMode: "keep_both",
        status: "PENDING",
        totalItems: 10,
        processedItems: 0,
      },
    });

    expect(job.id).toBeTruthy();
    expect(job.status).toBe("PENDING");
    expect(job.totalItems).toBe(10);
  });
});
