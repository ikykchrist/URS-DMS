import { useState, useEffect, useCallback } from "react"
import { Bell, Check, CheckCheck, Search } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { notificationService } from "@/services/notifications"
import type { Notification } from "@/types/domain"

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "approval": return <Check className="w-4 h-4 text-emerald-500" />
    case "rejection": return <Bell className="w-4 h-4 text-red-500" />
    case "upload": return <Bell className="w-4 h-4 text-blue-500" />
    case "request": return <Bell className="w-4 h-4 text-orange-500" />
    default: return <Bell className="w-4 h-4 text-gray-400" />
  }
}

const getTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
}

interface UserNotificationsProps {}

export default function UserNotifications(_props: UserNotificationsProps) {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await notificationService.listForUser()
      setNotifs(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const unreadCount = notifs.filter((n) => !n.read).length

  const filteredNotifs = notifs.filter((notif) => {
    const matchesSearch =
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "unread" && !notif.read) ||
      (activeTab === "requests" && (notif.type === "approval" || notif.type === "rejection")) ||
      (activeTab === "documents" && (notif.type === "upload" || notif.type === "system"))
    return matchesSearch && matchesTab
  })

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markRead(id)
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    } catch { }
  }

  const markAllAsRead = async () => {
    if (!user) return
    try {
      await notificationService.markAllReadForUser()
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch { }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
          ) : undefined
        }
      />

      <Card className="border-gray-200/60 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="h-9 p-1 bg-gray-100 rounded-lg">
                <TabsTrigger value="all" className="text-[12px] h-7 px-3">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-[12px] h-7 px-3">Unread</TabsTrigger>
                <TabsTrigger value="requests" className="text-[12px] h-7 px-3">Requests</TabsTrigger>
                <TabsTrigger value="documents" className="text-[12px] h-7 px-3">Documents</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {loading ? (
          <Card className="border-gray-200/60 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-[14px] text-gray-500">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : filteredNotifs.length === 0 ? (
          <Card className="border-gray-200/60 shadow-sm">
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-[14px] text-gray-500">No notifications found</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifs.map((notif) => (
            <Card
              key={notif.id}
              className={cn("border-gray-200/60 shadow-sm transition-all", !notif.read && "bg-primary/5 border-l-4 border-l-primary")}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[14px] font-semibold text-gray-900">{notif.title}</h3>
                        <p className="text-[13px] text-gray-500 mt-1">{notif.message}</p>
                      </div>
                      {!notif.read && (
                        <button onClick={() => markAsRead(notif.id)} className="text-[12px] text-primary hover:underline whitespace-nowrap">
                          Mark as read
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-400 mt-2">{getTimeAgo(notif.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}