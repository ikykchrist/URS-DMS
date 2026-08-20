import { useState, useEffect, useCallback } from "react"
import { Sun, Moon, Smartphone } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Switch } from "@/components/ui/Switch"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { getSystemSettings } from "@/services/admin"
import type { AppSettings } from "@/types/domain"

export default function UserSettings() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("userViewMode")
    return (saved as "grid" | "list") || "list"
  })
  const [compactMode, setCompactMode] = useState(false)
  const [collapsedSidebar, setCollapsedSidebar] = useState(false)
  const fetchSettings = useCallback(async () => {
    try {
      const s = await getSystemSettings()
      if (s) {
        setSettings({
          id: "system",
          theme: "light",
          uploadSizeLimit: Number(s.maxUploadSizeBytes ?? 0),
          retentionDays: 0,
          language: "en",
          timezone: "",
          dateFormat: "mdy",
          defaultDashboardView: "overview",
           notifications: { submissions: true, approvals: true, announcements: true, security: true },
          compactMode: false,
          collapsedSidebar: false,
          storageQuotaGB: 10,
        })
        setCompactMode(false)
        setCollapsedSidebar(false)
      }
    } catch {
      // Settings are optional; retain the local defaults when unavailable.
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleToggle = (field: keyof AppSettings, value: boolean) => {
    const patch = { [field]: value }
    setSettings((prev) => prev ? { ...prev, ...patch } : prev)
  }

  const handleNotificationToggle = (key: keyof AppSettings["notifications"], value: boolean) => {
    if (!settings) return
    const newNotifs = { ...settings.notifications, [key]: value }
    setSettings((prev) => prev ? { ...prev, notifications: newNotifs } : prev)
  }

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode)
    localStorage.setItem("userViewMode", mode)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Settings" description="Manage your preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200/60 shadow-sm">
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
                  checked={settings?.notifications[key as keyof typeof settings.notifications] ?? true}
                  onCheckedChange={(v) => handleNotificationToggle(key as keyof AppSettings["notifications"], v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 shadow-sm">
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
                <Button variant="outline" size="sm" className={cn("h-8", viewMode === "grid" ? "bg-gray-900 text-white" : "")} onClick={() => handleViewModeChange("grid")}>Grid</Button>
                <Button variant="outline" size="sm" className={cn("h-8", viewMode === "list" ? "bg-gray-900 text-white" : "")} onClick={() => handleViewModeChange("list")}>List</Button>
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

        <Card className="border-gray-200/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { mode: "light" as const, label: "Light", desc: "Light mode interface", icon: Sun, preview: "bg-white border border-gray-200" },
                { mode: "dark" as const, label: "Dark", desc: "Dark mode interface", icon: Moon, preview: "bg-gray-900" },
                { mode: "system" as const, label: "System", desc: "Match system settings", icon: Smartphone, preview: "bg-gradient-to-r from-white to-gray-900 border border-gray-200" },
              ].map(({ mode, label, desc, icon: Icon, preview }) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    theme === mode
                      ? "border-primary bg-primary-500"
                      : "border-gray-200 hover:border-gray-300"
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

        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13px] text-gray-500">
            <p><strong className="text-gray-900">URS-DMS</strong> v1.0.0</p>
            <p>University Research Services - Document Management System</p>
            <p>Developed for URS accreditation management</p>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
