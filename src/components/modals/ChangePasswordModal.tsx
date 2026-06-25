import { useState } from "react"
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
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

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  const getPasswordRequirements = (pwd: string) => [
    { label: "At least 8 characters", met: pwd.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(pwd) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(pwd) },
    { label: "Contains number", met: /[0-9]/.test(pwd) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ]

  const requirements = getPasswordRequirements(newPassword)

  const handleSubmit = () => {
    setError("")
    if (!currentPassword) {
      setError("Current password is required")
      return
    }
    if (!newPassword) {
      setError("New password is required")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    onOpenChange(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Change Password
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Update your password to keep your account secure
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="currentPassword" className="text-[13px] font-medium text-gray-700">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                className="h-10 pr-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPassword" className="text-[13px] font-medium text-gray-700">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="h-10 pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
            <p className="text-[12px] font-medium text-gray-700 mb-2">Password Requirements</p>
            <div className="space-y-1.5">
              {requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2">
                  {req.met ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-gray-300" />
                  )}
                  <span
                    className={`text-[12px] ${
                      req.met ? "text-emerald-600" : "text-gray-400"
                    }`}
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-gray-700">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="h-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
            onClick={handleSubmit}
            className="h-10 px-5 shadow-sm"
          >
            Update Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
