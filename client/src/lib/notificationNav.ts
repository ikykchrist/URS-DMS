// =============================================================================
// URS-DMS — Notification navigation resolver (Sprint 8.9)
// Maps notification entity type to correct portal, page, and tab for routing.
// =============================================================================

import type { Notification } from "@/types/domain"

export interface ResolvedRoute {
  page: string
  tab?: string
  portal: "admin" | "user"
}

/**
 * Resolves a notification to a navigation target.
 * Falls back to actionUrl if entity type is unknown.
 */
export function resolveNotificationRoute(notif: Notification): ResolvedRoute | null {
  const entity = notif.entity
  const link = notif.link

  if (!entity && !link) return null

  const mapping: Record<string, ResolvedRoute> = {
    aaccup_submission: { page: "aaccup", tab: "submissions", portal: "admin" },
    aaccup_task: { page: "aaccup", tab: "tasks", portal: "user" },
    request: { page: "requests", portal: "user" },
    document: { page: "documents", portal: "user" },
  }

  if (entity && mapping[entity]) {
    return mapping[entity]
  }

  if (link) {
    if (link.startsWith("/user/")) {
      const page = link.replace("/user/", "")
      return { page, portal: "user" }
    }
    const page = link.replace("/", "")
    return { page, portal: "admin" }
  }

  return null
}

/**
 * Builds a full URL from a resolved route and optional highlight entity ID.
 */
export function buildNotificationUrl(
  route: ResolvedRoute,
  entityId?: string,
): string {
  const base = route.portal === "user" ? `/user/${route.page}` : `/${route.page}`
  const params = new URLSearchParams()
  if (route.tab) params.set("tab", route.tab)
  if (entityId) params.set("highlight", entityId)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
