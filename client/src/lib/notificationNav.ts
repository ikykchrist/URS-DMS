import type { Notification } from "@/types/domain"

export interface ResolvedRoute {
  page: string
  tab?: string
  portal: "admin" | "user"
}

export function resolveNotificationRoute(notif: Notification): ResolvedRoute | null {
  const entity = notif.entity
  const link = notif.link

  if (!entity && !link) return null

  const mapping: Record<string, ResolvedRoute> = {
    aaccup_submission: { page: "aaccup", tab: "submissions", portal: "admin" },
    aaccup_task: { page: "aaccup", tab: "tasks", portal: "user" },
    aaccup_area: { page: "aaccup", portal: "admin" },
    request: { page: "requests", portal: "user" },
    document: { page: "documents", portal: "user" },
    folder: { page: "documents", portal: "user" },
    audit_log: { page: "audit", portal: "admin" },
    notification: { page: "notifications", portal: "user" },
    session: { page: "profile", portal: "user" },
  }

  if (entity && mapping[entity]) {
    return mapping[entity]
  }

  if (link) {
    const [path, query] = link.split("?")
    const params = new URLSearchParams(query ?? "")
    const tab = params.get("tab") ?? undefined

    if (link.startsWith("/user/")) {
      const page = path.replace("/user/", "")
      return { page, tab, portal: "user" }
    }
    const page = path.replace("/", "")
    return { page, tab, portal: "admin" }
  }

  return null
}

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
