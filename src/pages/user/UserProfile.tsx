import { useState } from "react"
import { Save, Camera, Lock, CheckCircle as CheckCircleIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"
import { useAuth } from "@/context/AuthContext"
import { ChangePasswordModal } from "@/components/modals/ChangePasswordModal"

const getRoleBadge = (role: string) => {
  switch (role) {
    case "admin":
      return <Badge variant="default">Administrator</Badge>
    case "faculty":
      return <Badge variant="secondary">Faculty</Badge>
    case "department":
      return <Badge variant="secondary">Department Head</Badge>
    default:
      return <Badge variant="secondary">User</Badge>
  }
}

export default function UserProfile() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || "")
  const [department, setDepartment] = useState(user?.department || "")
  const [isEditing, setIsEditing] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "faculty":
        return "Faculty"
      case "department":
        return "Department Head"
      default:
        return "User"
    }
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSave = () => {
    if (!name.trim()) {
      showToast('error', 'Name cannot be empty')
      return
    }
    showToast('success', 'Profile updated successfully')
    setIsEditing(false)
  }

  const handleAvatarChange = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        showToast('success', 'Avatar updated successfully')
      }
    }
    input.click()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Profile"
        description="Manage your account information"
        actions={
          isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="h-9">
                Cancel
              </Button>
              <Button className="h-9 shadow-sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="h-9">
              Edit Profile
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatar || user?.name}`} />
                    <AvatarFallback className="text-lg bg-gray-100 text-gray-600">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors" onClick={handleAvatarChange}>
                    <Camera className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-gray-900">{user?.name}</h2>
                  <p className="text-[13px] text-gray-500">{user?.email}</p>
                  <div className="mt-1">{user?.role && getRoleBadge(user.role)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-[13px] font-medium">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    className="h-10"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-[13px] font-medium">Email Address</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="h-10 bg-gray-50"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="department" className="text-[13px] font-medium">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={!isEditing}
                    className="h-10"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role" className="text-[13px] font-medium">Role</Label>
                  <Input
                    id="role"
                    value={user?.role ? getRoleLabel(user.role) : ""}
                    disabled
                    className="h-10 bg-gray-50"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="member-since" className="text-[13px] font-medium">Member Since</Label>
                  <Input
                    id="member-since"
                    value={user?.memberSince || "2023"}
                    disabled
                    className="h-10 bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Security</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-start" onClick={() => setIsChangePasswordOpen(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
                <span className="text-[13px] text-gray-500">Documents Uploaded</span>
                <span className="text-[14px] font-semibold text-gray-900">12</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
                <span className="text-[13px] text-gray-500">Requests Made</span>
                <span className="text-[14px] font-semibold text-gray-900">8</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
                <span className="text-[13px] text-gray-500">Approved</span>
                <span className="text-[14px] font-semibold text-emerald-600">6</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordModal open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
          ) : (
            <div className="w-5 h-5 text-red-600 flex items-center justify-center">!</div>
          )}
          <span className="text-[14px] font-medium">{toastMessage.message}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70 text-lg">×</button>
        </div>
      )}
    </div>
  )
}