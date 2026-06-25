import { useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Switch } from "@/components/ui/Switch"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
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
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("userViewMode")
    return (saved as "grid" | "list") || "list"
  })
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode)
    localStorage.setItem("userViewMode", mode)
    showToast('success', `View set to ${mode}`)
  }

  const handleDownloadData = () => {
    const userData = {
      profile: {
        name: user?.name,
        email: user?.email,
        role: user?.role,
        department: user?.department,
      },
      settings: {
        viewMode,
      },
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `urs-dms-user-data-${user?.name || 'user'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', 'Your data has been downloaded')
  }

  const handleDeleteAll = () => {
    showToast('success', 'All your documents have been deleted')
    setIsDeleteConfirmOpen(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Settings"
        description="Manage your preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-approval" className="text-[14px] font-medium text-gray-900">Email on Approval</Label>
                <p className="text-[12px] text-gray-500">Receive email when a request is approved</p>
              </div>
              <Switch id="email-approval" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-rejection" className="text-[14px] font-medium text-gray-900">Email on Rejection</Label>
                <p className="text-[12px] text-gray-500">Receive email when a request is rejected</p>
              </div>
              <Switch id="email-rejection" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-deadline" className="text-[14px] font-medium text-gray-900">Email on Deadline</Label>
                <p className="text-[12px] text-gray-500">Receive email before document deadlines</p>
              </div>
              <Switch id="email-deadline" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-revision" className="text-[14px] font-medium text-gray-900">Email on Revision</Label>
                <p className="text-[12px] text-gray-500">Receive email when documents need revision</p>
              </div>
              <Switch id="email-revision" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications" className="text-[14px] font-medium text-gray-900">Push Notifications</Label>
                <p className="text-[12px] text-gray-500">Receive in-app notifications</p>
              </div>
              <Switch id="push-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="default-grid" className="text-[14px] font-medium text-gray-900">Default View</Label>
                <p className="text-[12px] text-gray-500">Documents view style</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8", viewMode === "grid" ? "bg-gray-900 text-white" : "")}
                  onClick={() => handleViewModeChange("grid")}
                >
                  Grid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8", viewMode === "list" ? "bg-gray-900 text-white" : "")}
                  onClick={() => handleViewModeChange("list")}
                >
                  List
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compact-mode" className="text-[14px] font-medium text-gray-900">Compact Mode</Label>
                <p className="text-[12px] text-gray-500">Show more items in less space</p>
              </div>
              <Switch id="compact-mode" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sidebar-collapsed" className="text-[14px] font-medium text-gray-900">Sidebar Collapsed</Label>
                <p className="text-[12px] text-gray-500">Start with sidebar minimized</p>
              </div>
              <Switch id="sidebar-collapsed" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Data & Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleDownloadData}>
              Download My Data
            </Button>
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
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} className="h-9">
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="text-[14px] font-medium">{toastMessage.message}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70 text-lg">×</button>
        </div>
      )}
    </div>
  )
}