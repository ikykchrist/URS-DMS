import { Monitor, Smartphone, Globe, LogOut, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

interface Session {
  id: string
  device: string
  deviceIcon: React.ReactNode
  browser: string
  os: string
  location: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

interface SessionManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const sessions: Session[] = [
  {
    id: "1",
    device: "Windows Desktop",
    deviceIcon: <Monitor className="w-5 h-5" />,
    browser: "Chrome 120.0",
    os: "Windows 11",
    location: "Manila, Philippines",
    ipAddress: "192.168.1.100",
    lastActive: "Currently active",
    isCurrent: true,
  },
  {
    id: "2",
    device: "MacBook Pro",
    deviceIcon: <Monitor className="w-5 h-5" />,
    browser: "Safari 17.2",
    os: "macOS Sonoma",
    location: "Quezon City, Philippines",
    ipAddress: "192.168.1.105",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
  {
    id: "3",
    device: "iPhone 15",
    deviceIcon: <Smartphone className="w-5 h-5" />,
    browser: "Safari Mobile",
    os: "iOS 17.2",
    location: "Manila, Philippines",
    ipAddress: "192.168.1.120",
    lastActive: "Yesterday",
    isCurrent: false,
  },
]

export function SessionManagementModal({ open, onOpenChange }: SessionManagementModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Session Management</DialogTitle>
          <DialogDescription className="text-[14px]">
            Manage your active sessions across all devices
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <p className="text-[13px] text-gray-600">
            You are currently logged in on {sessions.length} device{sessions.length > 1 ? "s" : ""}. 
            If you notice any unfamiliar activity, log out of all sessions and change your password.
          </p>

          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-xl border ${
                  session.isCurrent
                    ? "border-primary/30 bg-primary-5"
                    : "border-gray-100 bg-white hover:bg-gray-50"
                } transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        session.isCurrent ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {session.deviceIcon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-gray-900">
                          {session.device}
                        </p>
                        {session.isCurrent && (
                          <Badge variant="default" className="text-[10px]">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        {session.browser} - {session.os}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-[12px] text-gray-400">
                          <Globe className="w-3.5 h-3.5" />
                          {session.location}
                        </div>
                        <span className="text-[12px] text-gray-300">|</span>
                        <span className="text-[12px] text-gray-400 font-mono">
                          {session.ipAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {session.isCurrent ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-[12px] font-medium">{session.lastActive}</span>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1.5" />
                        Logout
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5"
          >
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 shadow-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout All Sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
