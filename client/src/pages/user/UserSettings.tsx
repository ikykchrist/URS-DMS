import { useState, useEffect, useCallback } from "react"
import { Sun, Moon, Smartphone } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Switch } from "@/components/ui/Switch"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { getSystemSettings } from "@/services/admin"
import { deleteOnlineDocument, listOnlineDocuments } from "@/services/documents"
import type { AppSettings } from "@/types/domain"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"

export default function UserSettings() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("userViewMode")
    return (saved as "grid" | "list") || "list"
  })
  const [compactMode, setCompactMode] = useState(false)
  const [collapsedSidebar, setCollapsedSidebar] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message })
    setTimeout(() => setToastMessage(null), 3000)
  }

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
          notifications: { email: true, submissions: true, approvals: true, announcements: true, security: true },
          compactMode: false,
          collapsedSidebar: false,
          storageQuotaGB: 10,
        })
        setCompactMode(false)
        setCollapsedSidebar(false)
      }
    } catch { }
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

  const handleDownloadData = () => {
    if (!user) return
    const userData = {
      profile: { name: user.name, email: user.email, role: user.role, department: user.department },
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `urs-dms-${user.name}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', 'Your data has been downloaded')
  }

  const handleDeleteAll = async () => {
    if (!user) return
    const myDocs = await listOnlineDocuments({ ownerId: user.id, archived: false })
    for (const doc of myDocs) {
      try { await deleteOnlineDocument(doc.id) } catch { }
    }
    showToast('success', 'All your documents have been deleted')
    setIsDeleteConfirmOpen(false)
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
              { key: "email", label: "Email on Approval", desc: "Receive email when a request is approved" },
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
            <CardTitle className="text-[15px] font-semibold text-gray-900">Data & Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleDownloadData}>Download My Data</Button>
            <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setIsDeleteConfirmOpen(true)}>
              Delete All My Documents
            </Button>
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

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <span className="text-red-500">Delete All Documents</span>
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              Are you sure you want to delete all your documents? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="h-9">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAll} className="h-9">Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span className="text-[14px] font-medium">{toastMessage.message}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70 text-lg">×</button>
        </div>
      )}
    </div>
  )
}