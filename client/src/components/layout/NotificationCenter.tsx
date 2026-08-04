import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, Users, Upload, AlertTriangle, Clock, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { notificationService } from "@/services/notifications"
import type { Notification } from "@/types/domain"

const typeConfig = {
  approval: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50", label: "Approvals" },
  revision: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", label: "Revisions" },
  upload: { icon: Upload, color: "text-blue-600", bg: "bg-blue-50", label: "Uploads" },
  assignment: { icon: Users, color: "text-violet-600", bg: "bg-violet-50", label: "Assignments" },
  security: { icon: Settings, color: "text-gray-600", bg: "bg-gray-100", label: "Security" },
  deadline: { icon: Clock, color: "text-red-600", bg: "bg-red-50", label: "Deadlines" },
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("All")

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    notificationService.listAll().then(n => { setNotifications(n); setLoading(false) }).catch(() => setLoading(false))
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !n.read).length

  const getNotificationsByGroup = (group: string) => {
    return notifications.filter((n) => typeConfig[n.type as keyof typeof typeConfig]?.label === group)
  }

  const grouped: Record<string, Notification[]> = {}
  notifications.forEach((n) => {
    const label = typeConfig[n.type as keyof typeof typeConfig]?.label ?? "Other"
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(n)
  })
  const tabs = ["All", ...Object.keys(grouped).filter((k) => grouped[k].length > 0)]

  const displayedNotifications =
    activeTab === "All"
      ? notifications
      : notifications.filter((n) => typeConfig[n.type as keyof typeof typeConfig]?.label === activeTab)

  const markRead = (id: string) => {
    notificationService.markRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllRead = () => {
    notificationService.markAllReadForUser()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return "Yesterday"
    return `${days}d ago`
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative w-9 h-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="high" className="text-[10px]">{unreadCount} new</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  className="p-1.5 hover:bg-gray-100 rounded-md text-[12px] text-gray-500 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-md"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const count =
                  tab === "All"
                    ? unreadCount
                    : getNotificationsByGroup(tab).filter((n) => !n.read).length
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors",
                      activeTab === tab
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    {tab}
                    {count > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary px-1">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center text-[13px] text-gray-500">Loading...</div>
              ) : displayedNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-[13px] text-gray-500">No notifications</p>
                </div>
              ) : (
                displayedNotifications.map((notification) => {
                  const cfg = typeConfig[notification.type as keyof typeof typeConfig]
                  const Icon = cfg?.icon ?? Bell
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => markRead(notification.id)}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                          cfg?.bg ?? "bg-gray-100"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", cfg?.color ?? "text-gray-500")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-gray-900">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">{formatTime(notification.createdAt)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
              <button className="w-full text-center text-[12px] text-primary hover:text-primary font-medium">
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
