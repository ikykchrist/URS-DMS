import { useState } from "react"
import { Bell, Check, CheckCheck, Users, Upload, AlertTriangle, Clock, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "approval" | "revision" | "upload" | "assignment" | "security" | "deadline"
  title: string
  message: string
  time: string
  read: boolean
  actionUrl?: string
}

const initialNotifications: Notification[] = [
  { id: "n1", type: "approval", title: "Document Approved", message: "Self-Study Report has been approved by Dr. Santos", time: "2 min ago", read: false },
  { id: "n2", type: "revision", title: "Revision Requested", message: "Curriculum Revision needs revision - missing pages", time: "15 min ago", read: false },
  { id: "n3", type: "upload", title: "New Document Uploaded", message: "Annual Report 2023 uploaded by Mr. Wilson", time: "1 hour ago", read: false },
  { id: "n4", type: "deadline", title: "Deadline Approaching", message: "Area 6: Physical Plant is overdue - 3 days past due", time: "2 hours ago", read: true },
  { id: "n5", type: "assignment", title: "Task Assigned", message: "New task assigned to you: Review Faculty Credentials", time: "3 hours ago", read: true },
  { id: "n6", type: "upload", title: "New Document Uploaded", message: "Laboratory Equipment Inventory uploaded by Ms. Reyes", time: "Yesterday", read: true },
  { id: "n7", type: "security", title: "Password Reset", message: "Password was reset for user account", time: "Yesterday", read: true },
  { id: "n8", type: "deadline", title: "Deadline Approaching", message: "Area 3: Curriculum due in 2 days", time: "Yesterday", read: true },
]

const typeConfig = {
  approval: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50", label: "Approvals" },
  revision: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", label: "Revisions" },
  upload: { icon: Upload, color: "text-blue-600", bg: "bg-blue-50", label: "Uploads" },
  assignment: { icon: Users, color: "text-violet-600", bg: "bg-violet-50", label: "Assignments" },
  security: { icon: Settings, color: "text-gray-600", bg: "bg-gray-100", label: "Security" },
  deadline: { icon: Clock, color: "text-red-600", bg: "bg-red-50", label: "Deadlines" },
}

const groupedNotifications = () => {
  const groups: Record<string, Notification[]> = {
    Approvals: [],
    Revisions: [],
    Uploads: [],
    Assignments: [],
    Security: [],
    Deadlines: [],
  }
  initialNotifications.forEach((n) => {
    const label = typeConfig[n.type].label
    groups[label]?.push(n)
  })
  return groups
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [activeTab, setActiveTab] = useState<string>("All")

  const unreadCount = notifications.filter((n) => !n.read).length

  const grouped = groupedNotifications()
  const tabs = ["All", ...Object.keys(grouped).filter((k) => grouped[k].length > 0)]

  const displayedNotifications =
    activeTab === "All"
      ? notifications
      : notifications.filter((n) => typeConfig[n.type].label === activeTab)

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const getNotificationsByGroup = (group: string) => {
    return notifications.filter((n) => typeConfig[n.type].label === group)
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
              {displayedNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-[13px] text-gray-500">No notifications</p>
                </div>
              ) : (
                displayedNotifications.map((notification) => {
                  const config = typeConfig[notification.type]
                  const Icon = config.icon
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
                          config.bg
                        )}
                      >
                        <Icon className={cn("w-4 h-4", config.color)} />
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
                        <p className="text-[11px] text-gray-400 mt-1">{notification.time}</p>
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
