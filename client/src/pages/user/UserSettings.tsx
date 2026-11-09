import { useState } from "react"
import { toast } from "@/lib/toast"
import { Sun, Moon, Smartphone } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Switch } from "@/components/ui/Switch"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import type { AppSettings } from "@/types/domain"

export default function UserSettings() {
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState<AppSettings["notifications"]>(() => {
    try { return { submissions: true, approvals: true, announcements: true, security: true, ...JSON.parse(localStorage.getItem("notificationPreferences") || "{}") } }
    catch { return { submissions: true, approvals: true, announcements: true, security: true } }
  })
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => localStorage.getItem("userViewMode") === "grid" ? "grid" : "list")
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem("userCompactMode") === "true")
  const [collapsedSidebar, setCollapsedSidebar] = useState(() => localStorage.getItem("userSidebarCollapsed") === "true")

  const handleToggle = (field: "compactMode" | "collapsedSidebar", value: boolean) => {
    try {
      localStorage.setItem(field === "compactMode" ? "userCompactMode" : "userSidebarCollapsed", String(value))
      if (field === "compactMode") setCompactMode(value)
      else setCollapsedSidebar(value)
      window.dispatchEvent(new Event("urs:display-preferences"))
      toast.success("Display preference saved on this device")
    } catch { toast.error("Unable to save display preference") }
  }

  const handleNotificationToggle = (key: keyof AppSettings["notifications"], value: boolean) => {
    try {
      const next = { ...notifications, [key]: value }
      localStorage.setItem("notificationPreferences", JSON.stringify(next))
      setNotifications(next)
      toast.success("Notification preference saved on this device")
    } catch { toast.error("Unable to save notification preference") }
  }

  const handleViewModeChange = (mode: "grid" | "list") => {
    try {
      localStorage.setItem("userViewMode", mode)
      setViewMode(mode)
      toast.success("Default document view saved on this device")
    } catch { toast.error("Unable to save default view") }
  }

  return (
    <div className="content-padding">
      <PageHeader title="Settings" description="Manage your preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/70 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "submissions", label: "Submission Alerts", desc: "Get notified when documents are submitted" },
              { key: "approvals", label: "Approval Alerts", desc: "Get notified on approval/rejection actions" },
              { key: "announcements", label: "System Announcements", desc: "Receive system-wide announcements" },
              { key: "security", label: "Security Notifications", desc: "Get alerts for security-related events" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] font-medium text-gray-900">{label}</Label>
                  <p className="text-[12px] text-gray-500">{desc}</p>
                </div>
                <Switch
                  checked={notifications[key as keyof typeof notifications]}
                  onCheckedChange={(v) => handleNotificationToggle(key as keyof AppSettings["notifications"], v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[14px] font-medium text-gray-900">Default View</Label>
                <p className="text-[12px] text-gray-500">Documents view style</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className={cn("h-8", viewMode === "grid" ? "bg-primary text-white" : "")} onClick={() => handleViewModeChange("grid")}>Grid</Button>
                <Button variant="outline" size="sm" className={cn("h-8", viewMode === "list" ? "bg-primary text-white" : "")} onClick={() => handleViewModeChange("list")}>List</Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[14px] font-medium text-gray-900">Compact Mode</Label>
                <p className="text-[12px] text-gray-500">Show more items in less space</p>
              </div>
              <Switch checked={compactMode} onCheckedChange={(v) => handleToggle("compactMode", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[14px] font-medium text-gray-900">Sidebar Collapsed</Label>
                <p className="text-[12px] text-gray-500">Start with sidebar minimized</p>
              </div>
              <Switch checked={collapsedSidebar} onCheckedChange={(v) => handleToggle("collapsedSidebar", v)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-soft lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { mode: "light" as const, label: "Light", desc: "Light mode interface", icon: Sun, preview: "bg-white border border-border" },
                { mode: "dark" as const, label: "Dark", desc: "Dark mode interface", icon: Moon, preview: "bg-gray-900" },
                { mode: "system" as const, label: "System", desc: "Match system settings", icon: Smartphone, preview: "bg-gradient-to-r from-white to-gray-900 border border-border" },
              ].map(({ mode, label, desc, icon: Icon, preview }) => (
                <button
                  key={mode}
                  onClick={() => { setTheme(mode); toast.success("Theme updated") }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    theme === mode
                      ? "border-primary bg-primary-500"
                      : "border-border hover:border-gray-300"
                  )}
                >
                  <div className={cn("w-full h-16 rounded-lg mb-3 flex items-center justify-center", preview)}>
                    <Icon className={cn("w-6 h-6", mode === "dark" ? "text-gray-300" : "text-gray-600")} />
                  </div>
                  <p className="text-[14px] font-medium text-gray-900">{label}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13px] text-gray-500">
            <p><strong className="text-gray-900">QA-DMS</strong> v2.0.0</p>
            <p>University Research Services - Document Management System</p>
            <p>Developed for URS accreditation management</p>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
