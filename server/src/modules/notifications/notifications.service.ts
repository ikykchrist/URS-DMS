import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/utils/errors";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { sendEmail } from "@/modules/email/email.service";
import {
  NOTIFICATION_EVENTS,
  type NotificationEventSpec,
} from "@/modules/notifications/notifications.events";
import * as repo from "@/modules/notifications/notifications.repository";
import type { NotificationRow } from "@/modules/notifications/notifications.repository";
import type {
  CreateAnnouncementInput,
  NotificationListItem,
  NotifyInput,
  UnreadCountResult,
} from "@/modules/notifications/notifications.types";
import type { ListNotificationsQuery } from "@/modules/notifications/notifications.validator";

// =============================================================================
// URS-DMS — Notifications service (Sprint 7.3)
// -----------------------------------------------------------------------------
// Two surfaces, one module:
//
//   * User surface (actor-scoped, permission `notification.read`) — own-inbox
//     list / unread-count / mark-read / mark-all-read / delete. The repository
//     enforces ownership; the service adds RBAC re-assertion, mapping and
//     audit. Read/deletion of one's own row is a per-user action, so
//     `notification.read` covers the whole surface (no separate "write"
//     permission — the spec's notification.manage is the admin surface).
//
//   * Admin surface (permission `notification.manage`) — createAnnouncement
//     fans out a SYSTEM_ANNOUNCEMENT row to every ACTIVE user.
//
// Programmatic emit surface (notifyUser / notifyUsers): the module-agnostic
// entry point for future event emitters (document / request / aaccup /
// auth flows). Events fill their title/message/priority from the catalog in
// notifications.events.ts when the caller omits them; an optional `email`
// payload additionally routes through the durable email queue. Programmatic
// notifications are NOT audited (they are system-generated, not actor actions
// — announcing them would flood the log; see constants.ts).
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

function assertPermission(actor: Actor, permission: string): void {
  if (!actor.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

function toListItem(row: NotificationRow): NotificationListItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    priority: row.priority,
    entity: row.entity,
    entityId: row.entityId,
    actionUrl: row.actionUrl,
    metadata: row.metadata,
    isRead: row.readAt !== null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// -----------------------------------------------------------------------------
// User surface
// -----------------------------------------------------------------------------
export async function listNotifications(
  query: ListNotificationsQuery,
  actor: Actor,
): Promise<{ items: NotificationListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  assertPermission(actor, "notification.read");
  const { items, total } = await repo.listByUser(actor.id, query);
  return {
    items: items.map(toListItem),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function getUnreadCount(actor: Actor): Promise<UnreadCountResult> {
  assertPermission(actor, "notification.read");
  return { unread: await repo.countUnread(actor.id) };
}

export async function markNotificationRead(id: string, actor: Actor): Promise<NotificationListItem> {
  assertPermission(actor, "notification.read");
  const row = await repo.findOwned(actor.id, id);
  if (!row) throw new NotFoundError("Notification not found");
  const updated = await repo.markRead(actor.id, id);
  if (updated > 0) {
    void writeAudit({
      action: AUDIT_ACTIONS.NOTIFICATION_MARKED_READ,
      userId: actor.id,
      entity: "notification",
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  }
  return toListItem({ ...row, readAt: new Date() });
}

export async function markAllNotificationsRead(
  actor: Actor,
): Promise<{ updated: number }> {
  assertPermission(actor, "notification.read");
  const updated = await repo.markAllRead(actor.id);
  if (updated > 0) {
    void writeAudit({
      action: AUDIT_ACTIONS.NOTIFICATION_MARKED_READ,
      userId: actor.id,
      entity: "notification",
      newValue: { count: updated },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  }
  return { updated };
}

export async function deleteNotification(id: string, actor: Actor): Promise<void> {
  assertPermission(actor, "notification.read");
  const row = await repo.findOwned(actor.id, id);
  if (!row) throw new NotFoundError("Notification not found");
  const deleted = await repo.softDelete(actor.id, id);
  if (deleted > 0) {
    void writeAudit({
      action: AUDIT_ACTIONS.NOTIFICATION_DELETED,
      userId: actor.id,
      entity: "notification",
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  }
}

// -----------------------------------------------------------------------------
// Admin surface
// -----------------------------------------------------------------------------
export async function createAnnouncement(
  input: CreateAnnouncementInput,
  actor: Actor,
): Promise<{ created: number }> {
  assertPermission(actor, "notification.manage");
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  const created = await repo.createManyForUsers(
    users.map((u) => u.id),
    {
      type: "SYSTEM_ANNOUNCEMENT",
      title: input.title,
      message: input.message,
      priority: input.priority ?? "HIGH",
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata,
    },
  );
  if (created > 0) {
    void writeAudit({
      action: AUDIT_ACTIONS.NOTIFICATION_CREATED,
      userId: actor.id,
      entity: "notification",
      newValue: { type: "SYSTEM_ANNOUNCEMENT", recipients: created },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  }
  return { created };
}

// -----------------------------------------------------------------------------
// Programmatic emit surface
// -----------------------------------------------------------------------------
function resolveSpec(type: NotificationType): NotificationEventSpec {
  const spec = NOTIFICATION_EVENTS[type];
  if (!spec) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  return spec;
}

function buildPayload(
  type: NotificationType,
  input: NotifyInput,
): { title: string; message: string; priority: NotificationPriorityLike; email?: { subject: string; body: string } } {
  const spec = resolveSpec(type);
  return {
    title: input.title ?? spec.defaultTitle,
    message: input.message ?? spec.defaultMessage,
    priority: input.priority ?? spec.defaultPriority,
    ...(input.email
      ? { email: input.email }
      : spec.email
        ? { email: spec.email }
        : {}),
  };
}

export async function notifyUser(
  userId: string,
  type: NotificationType,
  input: NotifyInput = {},
): Promise<NotificationListItem | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, status: true },
  });
  if (!user) throw new NotFoundError("Recipient user not found");

  const payload = buildPayload(type, input);
  const row = await repo.createForUser(userId, {
    type,
    title: payload.title,
    message: payload.message,
    priority: payload.priority,
    entity: input.entity,
    entityId: input.entityId,
    actionUrl: input.actionUrl,
    metadata: input.metadata,
  });

  if (payload.email && user.status === "ACTIVE") {
    void sendEmail({ to: user.email, subject: payload.email.subject, body: payload.email.body });
  }

  return toListItem(row);
}

export async function notifyUsers(
  userIds: string[],
  type: NotificationType,
  input: NotifyInput = {},
): Promise<number> {
  if (userIds.length === 0) return 0;
  const payload = buildPayload(type, input);
  const uniqueIds = [...new Set(userIds)];
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, email: true, status: true },
  });
  const foundIds = users.map((u) => u.id);
  const created = await repo.createManyForUsers(foundIds, {
    type,
    title: payload.title,
    message: payload.message,
    priority: payload.priority,
    entity: input.entity,
    entityId: input.entityId,
    actionUrl: input.actionUrl,
    metadata: input.metadata,
  });
  if (created > 0 && payload.email) {
    for (const user of users) {
      if (user.status !== "ACTIVE") continue;
      void sendEmail({ to: user.email, subject: payload.email.subject, body: payload.email.body });
    }
  }
  return created;
}

type NotificationPriorityLike = "LOW" | "MEDIUM" | "HIGH";
