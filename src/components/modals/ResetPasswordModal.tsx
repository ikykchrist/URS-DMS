import { KeyRound, Mail, Info } from "lucide-react"
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

interface ResetPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail?: string
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  userEmail,
}: ResetPasswordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Send a password reset link to the user's email address.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="resetEmail" className="text-[13px] font-medium text-gray-700">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="resetEmail"
                type="email"
                defaultValue={userEmail}
                placeholder="Enter email address"
                className="h-10 pl-10"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-blue-800">Information</p>
              <p className="text-[12px] text-blue-600/80 mt-1 leading-relaxed">
                A password reset link will be sent to the email address above. The link will expire in 24 hours for security purposes.
              </p>
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
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 shadow-sm"
          >
            Send Reset Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
