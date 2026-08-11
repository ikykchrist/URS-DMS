import { listMyOnlineTasks } from "@/services/aaccup"
import { listAllOnlineSubmissions } from "@/services/aaccup"
import { listRequests } from "@/services/requests"
import type { OnlineAaccupTask, OnlineSubmissionListItem } from "@/services/aaccup"
import type { DocumentRequest } from "@/types/domain"

export interface UserAttention {
  returnedSubmissions: number
  dueSoonTasks: number
  overdueTasks: number
  openTasks: number
  pendingRequests: number
  fulfilledRequests: number
  refusedRequests: number
  allSubmissions: OnlineSubmissionListItem[]
  returnedSubmissionsList: OnlineSubmissionListItem[]
  overdueTasksList: OnlineAaccupTask[]
  dueSoonTasksList: OnlineAaccupTask[]
  recentRequestUpdates: DocumentRequest[]
  loading: boolean
}

let cached: UserAttention | null = null
let lastFetch = 0
const listeners = new Set<(a: UserAttention) => void>()
const FETCH_COOLDOWN_MS = 5000
const NOW = () => Date.now()
const within7Days = (dateStr: string | null) => {
  if (!dateStr) return false
  const d = new Date(dateStr).getTime()
  return d >= NOW() && d <= NOW() + 7 * 24 * 60 * 60 * 1000
}
const isOverdue = (dateStr: string | null, status: string) => {
  if (!dateStr || status === "COMPLETED" || status === "CANCELLED") return false
  return new Date(dateStr).getTime() < NOW()
}

export async function refreshUserAttention(userId: string): Promise<void> {
  if (cached && NOW() - lastFetch < FETCH_COOLDOWN_MS) {
    listeners.forEach((l) => l(cached!))
    return
  }
  try {
    const [tasks, submissions, requests] = await Promise.all([
      listMyOnlineTasks(),
      listAllOnlineSubmissions(),
      listRequests({ submittedBy: userId }),
    ])
    const returnedSubs = submissions.filter((s) => s.status === "NEEDS_REVISION")
    const dueSoon = tasks.filter((t) => within7Days(t.dueDate) && t.status !== "COMPLETED" && t.status !== "CANCELLED")
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status))
    const openTaskList = tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
    const pendingReqs = requests.filter((r) => r.status === "Pending")
    const fulfilledReqs = requests.filter((r) => r.status === "Fulfilled")
    const rejectedReqs = requests.filter((r) => r.status === "Rejected")
    const requestUpdates = requests
      .filter((r) => r.status !== "Pending")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)

    cached = {
      returnedSubmissions: returnedSubs.length,
      dueSoonTasks: dueSoon.length,
      overdueTasks: overdue.length,
      openTasks: openTaskList.length,
      pendingRequests: pendingReqs.length,
      fulfilledRequests: fulfilledReqs.length,
      refusedRequests: rejectedReqs.length,
      allSubmissions: submissions,
      returnedSubmissionsList: returnedSubs,
      overdueTasksList: overdue,
      dueSoonTasksList: dueSoon,
      recentRequestUpdates: requestUpdates,
      loading: false,
    }
    lastFetch = NOW()
    listeners.forEach((l) => l(cached!))
  } catch {
    cached = cached ?? {
      returnedSubmissions: 0,
      dueSoonTasks: 0,
      overdueTasks: 0,
      openTasks: 0,
      pendingRequests: 0,
      fulfilledRequests: 0,
      refusedRequests: 0,
      allSubmissions: [],
      returnedSubmissionsList: [],
      overdueTasksList: [],
      dueSoonTasksList: [],
      recentRequestUpdates: [],
      loading: false,
    }
    listeners.forEach((l) => l(cached!))
  }
}

export function getCachedAttention(): UserAttention {
  return cached ?? {
    returnedSubmissions: 0,
    dueSoonTasks: 0,
    overdueTasks: 0,
    openTasks: 0,
    pendingRequests: 0,
    fulfilledRequests: 0,
    refusedRequests: 0,
    allSubmissions: [],
    returnedSubmissionsList: [],
    overdueTasksList: [],
    dueSoonTasksList: [],
    recentRequestUpdates: [],
    loading: true,
  }
}

export function subscribeUserAttention(fn: (a: UserAttention) => void): () => void {
  listeners.add(fn)
  if (cached) fn(cached)
  return () => { listeners.delete(fn) }
}
