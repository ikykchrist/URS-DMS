import { useState } from "react"
import { KeyRound, Loader2 } from "lucide-react"
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
import { resetUserPassword } from "@/services/admin"
import { toast } from "@/lib/toast"

interface ResetPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  userName?: string
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  userId,
  userName,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("")
  const [mustChange, setMustChange] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleReset = async () => {
    if (!userId || !newPassword || newPassword.length < 8) return
    setSaving(true)
    try {
      await resetUserPassword(userId, { newPassword, mustChangePassword: mustChange })
      toast.success("Password has been reset")
      onOpenChange(false)
      setNewPassword("")
      setMustChange(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reset password")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary-600" />
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Set a new password for <strong>{userName ?? "this user"}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-[13px] font-medium mb-1.5 block">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="h-10"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mustChange}
              onChange={(e) => setMustChange(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <span className="text-[13px] text-gray-600">Require password change on next login</span>
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10">Cancel</Button>
          <Button onClick={() => void handleReset()} disabled={saving || newPassword.length < 8} className="h-10">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
