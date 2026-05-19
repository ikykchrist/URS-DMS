import { useState } from "react"
import {
  User,
  Shield,
  Bell,
  Settings2,
  Palette,
  FolderArchive,
  KeyRound,
  Camera,
  Monitor,
  Moon,
  Smartphone,
  Lock,
  LogOut,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Switch } from "@/components/ui/Switch"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { ChangePasswordModal } from "@/components/modals/ChangePasswordModal"
import { SessionManagementModal } from "@/components/modals/SessionManagementModal"
import { cn } from "@/lib/utils"

interface SettingsProps {
  sidebarCollapsed?: boolean
}

type SettingsSection = "profile" | "security" | "notifications" | "system" | "appearance" | "files" | "access"

const navItems = [
  { id: "profile" as const, label: "Profile Settings", icon: User },
  { id: "security" as const, label: "Account Security", icon: Shield },
  { id: "notifications" as const, label: "Notification Preferences", icon: Bell },
  { id: "system" as const, label: "System Preferences", icon: Settings2 },
  { id: "appearance" as const, label: "Appearance", icon: Palette },
  { id: "files" as const, label: "File Management", icon: FolderArchive },
  { id: "access" as const, label: "Access Control", icon: KeyRound },
]

export default function Settings({ sidebarCollapsed: _sidebarCollapsed = false }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile")
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isSessionManagementOpen, setIsSessionManagementOpen] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState("light")

  const [notifications, setNotifications] = useState({
    email: true,
    submissions: true,
    approvals: true,
    announcements: false,
    security: true,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
            title="Settings"
            description="Manage your account settings and preferences"
          />

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div className="w-full lg:w-64 flex-shrink-0">
              <Card className="border-gray-200/60 shadow-sm">
                <CardContent className="p-2">
                  <nav className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon
                      const isActive = activeSection === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150",
                            isActive
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          <Icon className="w-[18px] h-[18px]" />
                          {item.label}
                        </button>
                      )
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 min-w-0">
              {activeSection === "profile" && (
                <Card className="border-gray-200/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold">Profile Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          <AvatarFallback className="text-xl bg-primary text-white">
                            MS
                          </AvatarFallback>
                        </Avatar>
                        <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors">
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-gray-900">Dr. Maria Santos</p>
                        <p className="text-[13px] text-gray-500">System Administrator</p>
                        <Button variant="outline" size="sm" className="mt-2 h-8">
                          Change Photo
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Full Name</Label>
                        <Input defaultValue="Dr. Maria Santos" className="h-10" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Email Address</Label>
                        <Input defaultValue="maria.santos@university.edu" type="email" className="h-10" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Contact Number</Label>
                        <Input defaultValue="+63 912 345 6789" className="h-10" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Department</Label>
                        <Select defaultValue="cosi">
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cosi">College of Info Sciences</SelectItem>
                            <SelectItem value="coe">College of Engineering</SelectItem>
                            <SelectItem value="cas">College of Arts & Sciences</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-[13px] font-medium text-gray-700">Role</Label>
                      <Input value="System Administrator" disabled className="h-10 bg-gray-50" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <Button variant="outline" className="h-10 px-5">Cancel</Button>
                      <Button className="h-10 px-5 shadow-sm">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "security" && (
                <div className="space-y-6">
                  <Card className="border-gray-200/60 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[16px] font-semibold">Password</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-[14px] text-gray-600">
                        Update your password regularly to keep your account secure.
                      </p>
                      <Button onClick={() => setIsChangePasswordOpen(true)} className="h-10 px-5 shadow-sm">
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200/60 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[16px] font-semibold">Two-Factor Authentication</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-medium text-gray-900">Authenticator App</p>
                          <p className="text-[13px] text-gray-500 mt-0.5">
                            Use an authenticator app to get verification codes.
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200/60 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[16px] font-semibold">Active Sessions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-[14px] text-gray-600">
                        Manage your active sessions across all devices.
                      </p>
                      <div className="flex gap-3">
                        <Button onClick={() => setIsSessionManagementOpen(true)} variant="outline" className="h-10 px-5">
                          <Monitor className="w-4 h-4 mr-2" />
                          Manage Sessions
                        </Button>
                        <Button variant="outline" className="h-10 px-5 text-red-600 border-red-200 hover:bg-red-50">
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout All
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "notifications" && (
                <Card className="border-gray-200/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold">Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "email", label: "Email Notifications", desc: "Receive notifications via email" },
                      { key: "submissions", label: "Submission Alerts", desc: "Get notified when documents are submitted" },
                      { key: "approvals", label: "Approval Alerts", desc: "Get notified on approval/rejection actions" },
                      { key: "announcements", label: "System Announcements", desc: "Receive system-wide announcements" },
                      { key: "security", label: "Security Notifications", desc: "Get alerts for security-related events" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-[14px] font-medium text-gray-900">{item.label}</p>
                          <p className="text-[13px] text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifications[item.key as keyof typeof notifications]}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {activeSection === "system" && (
                <Card className="border-gray-200/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold">System Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Language</Label>
                        <Select defaultValue="en">
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English (US)</SelectItem>
                            <SelectItem value="fil">Filipino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Timezone</Label>
                        <Select defaultValue="pht">
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pht">Philippines (UTC+8)</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Date Format</Label>
                        <Select defaultValue="mdy">
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                            <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                            <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Default Dashboard View</Label>
                        <Select defaultValue="overview">
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overview">Overview</SelectItem>
                            <SelectItem value="submissions">Submissions</SelectItem>
                            <SelectItem value="documents">Documents</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "appearance" && (
                <Card className="border-gray-200/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold">Appearance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setSelectedTheme("light")}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          selectedTheme === "light"
                            ? "border-primary bg-primary-5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="w-full h-24 bg-white border border-gray-200 rounded-lg mb-3 flex items-center justify-center">
                          <Sun className="w-8 h-8 text-amber-500" />
                        </div>
                        <p className="text-[14px] font-medium text-gray-900">Light</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">Light mode interface</p>
                      </button>

                      <button
                        onClick={() => setSelectedTheme("dark")}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          selectedTheme === "dark"
                            ? "border-primary bg-primary-5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="w-full h-24 bg-gray-900 rounded-lg mb-3 flex items-center justify-center">
                          <Moon className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-[14px] font-medium text-gray-900">Dark</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">Dark mode interface</p>
                      </button>

                      <button
                        onClick={() => setSelectedTheme("system")}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          selectedTheme === "system"
                            ? "border-primary bg-primary-5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="w-full h-24 bg-gradient-to-r from-white to-gray-900 rounded-lg mb-3 flex items-center justify-center">
                          <Smartphone className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-[14px] font-medium text-gray-900">System</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">Match system settings</p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "files" && (
                <Card className="border-gray-200/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold">File Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">Default Upload Size Limit</Label>
                        <Select defaultValue="25">
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 MB</SelectItem>
                            <SelectItem value="25">25 MB</SelectItem>
                            <SelectItem value="50">50 MB</SelectItem>
                            <SelectItem value="100">100 MB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[13px] font-medium text-gray-700">File Retention Period</Label>
                        <Select defaultValue="365">
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="90">90 Days</SelectItem>
                            <SelectItem value="180">180 Days</SelectItem>
                            <SelectItem value="365">1 Year</SelectItem>
                            <SelectItem value="forever">Forever</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-[13px] font-medium text-gray-700">Allowed File Types</Label>
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                        {["PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "JPG", "PNG", "ZIP"].map((type) => (
                          <span key={type} className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-[12px] font-medium text-gray-600">
                            .{type}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] font-medium text-gray-700">Storage Used</Label>
                        <span className="text-[13px] text-gray-500">24.5 GB / 100 GB</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: "24.5%" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "access" && (
                <Card className="border-gray-200/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[16px] font-semibold">Access Control</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-[14px] text-gray-600">
                      Your current role permissions and access levels.
                    </p>

                    <div className="p-4 rounded-xl border border-primary/20 bg-primary-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-gray-900">System Administrator</p>
                          <p className="text-[13px] text-gray-600">Full access to all system features</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "View Documents", granted: true },
                        { label: "Upload Documents", granted: true },
                        { label: "Edit Documents", granted: true },
                        { label: "Delete Documents", granted: true },
                        { label: "Manage Users", granted: true },
                        { label: "View Audit Logs", granted: true },
                        { label: "Manage Settings", granted: true },
                        { label: "Approve Submissions", granted: true },
                      ].map((perm, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                          <span className="text-[13px] text-gray-700">{perm.label}</span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            perm.granted ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            {perm.granted ? "Granted" : "Denied"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <ChangePasswordModal
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />

      <SessionManagementModal
        open={isSessionManagementOpen}
        onOpenChange={setIsSessionManagementOpen}
      />
    </div>
  )
}

function Sun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="m4.93 4.93 1.41 1.41"/>
      <path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="m6.34 17.66-1.41 1.41"/>
      <path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  )
}
