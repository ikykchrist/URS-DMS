import { useState } from "react"
import {
  User,
  Mail,
  Building2,
  Shield,
  KeyRound,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Switch } from "@/components/ui/Switch"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: "Active" | "Inactive"
  lastLogin: string
  dateCreated: string
  initials: string
}

interface UserDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onResetPassword?: () => void
  onDelete?: () => void
  onSave?: (userId: string, data: { isActive: boolean }) => void
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "success" | "warning" | "danger"> = {
  "System Administrator": "default",
  "Document Manager": "success",
  "Reviewer": "warning",
  "Editor": "secondary",
  "Viewer": "secondary",
  "Department User": "secondary",
}

export function UserDetailsModal({
  open,
  onOpenChange,
  user,
  onResetPassword,
  onDelete,
  onSave,
}: UserDetailsModalProps) {
  const [isActive, setIsActive] = useState(user?.status === "Active")
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const handleSave = () => {
    if (!user) return
    onSave?.(user.id, { isActive })
    onOpenChange(false)
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">User Details</DialogTitle>
          <DialogDescription className="text-[14px]">
            View and manage user account information
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg bg-primary text-white">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-[16px] font-semibold text-gray-900">{user.name}</h3>
              <p className="text-[13px] text-gray-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={roleBadgeVariant[user.role] || "secondary"}>
                  {user.role}
                </Badge>
                <Badge variant={user.status === "Active" ? "success" : "danger"}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-3">
              Account Information
            </p>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[12px] text-gray-500 flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Full Name
                  </Label>
                  <Input
                    defaultValue={user.name}
                    className="h-9 text-[14px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[12px] text-gray-500 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    defaultValue={user.email}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[12px] text-gray-500 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" />
                    Department
                  </Label>
                  <Select defaultValue={user.department}>
                    <SelectTrigger className="h-9 text-[14px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cosi">College of Info Sciences</SelectItem>
                      <SelectItem value="coe">College of Engineering</SelectItem>
                      <SelectItem value="cas">College of Arts & Sciences</SelectItem>
                      <SelectItem value="cba">College of Business Admin</SelectItem>
                      <SelectItem value="con">College of Nursing</SelectItem>
                      <SelectItem value="dean">Dean Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[12px] text-gray-500 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Role
                  </Label>
                  <Select defaultValue={user.role.toLowerCase().replace(" ", "_")}>
                    <SelectTrigger className="h-9 text-[14px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system_administrator">System Administrator</SelectItem>
                      <SelectItem value="document_manager">Document Manager</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="department_user">Department User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="editUserActive" className="text-[14px] font-medium text-gray-700 cursor-pointer">
                    Active Status
                  </Label>
                  <p className="text-[12px] text-gray-500">
                    {isActive ? "User can access the system" : "User is blocked from accessing"}
                  </p>
                </div>
                <Switch
                  id="editUserActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-3">
              Security
            </p>
            <div className="space-y-2">
              <button
                onClick={onResetPassword}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-medium text-gray-700">Reset Password</p>
                  <p className="text-[12px] text-gray-500">Send password reset link to user</p>
                </div>
              </button>
            </div>
          </div>

          <div className={cn(
            "p-4 rounded-xl border transition-all duration-200",
            isDeleteConfirmOpen ? "border-red-200 bg-red-50/50" : "border-gray-100 bg-gray-50/50"
          )}>
            {isDeleteConfirmOpen ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-red-700">Confirm Deletion</p>
                    <p className="text-[12px] text-red-600/80 mt-0.5">
                      Are you sure you want to delete this user? This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete()
                      setIsDeleteConfirmOpen(false)
                      onOpenChange(false)
                    }}
                    className="h-8"
                  >
                    Delete User
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-medium text-red-600">Delete User</p>
                  <p className="text-[12px] text-red-500/80">Permanently remove this user account</p>
                </div>
              </button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="h-10 px-5 shadow-sm"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
