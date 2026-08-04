import { z } from "zod";
import { NOTIFICATION_TYPE_VALUES } from "@/modules/notifications/notifications.events";

// =============================================================================
// URS-DMS — Notifications validators (Sprint 7.3)
// =============================================================================

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  unreadOnly: z.coerce.boolean().default(false),
  type: z.enum(NOTIFICATION_TYPE_VALUES).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    actionUrl: z.string().trim().max(2048).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
