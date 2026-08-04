import {
  Clock,
  Activity,
  Monitor,
  Globe,
  FileText,
  Shield,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  userRole: string
  initials: string
  action: string
  module: string
  ipAddress: string
  status: "Success" | "Warning" | "Failed"
  details: string
  device: string
  browser: string
  os: string
}

interface LogDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: AuditLog | null
}

const statusVariant = {
  Success: "success",
  Warning: "warning",
  Failed: "danger",
} as const

export function LogDetailsModal({ open, onOpenChange, log }: LogDetailsModalProps) {
  if (!log) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Log Details
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            View detailed information about this activity
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-[14px] bg-primary text-white font-medium">
                {log.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-gray-900">{log.user}</h3>
                <Badge variant="secondary" className="text-[10px]">{log.userRole}</Badge>
              </div>
              <p className="text-[13px] text-gray-500 mt-0.5">{log.action}</p>
            </div>
            <Badge variant={statusVariant[log.status]} className="text-[11px] font-medium">
              {log.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Timestamp</p>
                <p className="text-[13px] font-medium text-gray-900 mt-0.5">{log.timestamp}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Module</p>
                <p className="text-[13px] font-medium text-gray-900 mt-0.5">{log.module}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">IP Address</p>
                <p className="text-[13px] font-medium text-gray-900 mt-0.5">{log.ipAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Device</p>
                <p className="text-[13px] font-medium text-gray-900 mt-0.5">{log.device}</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-gray-400" />
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">System Information</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-[11px] text-gray-400">Browser</p>
                <p className="text-[13px] text-gray-700 font-medium">{log.browser}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Operating System</p>
                <p className="text-[13px] text-gray-700 font-medium">{log.os}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Event Description</p>
            </div>
            <p className="text-[14px] text-gray-700 leading-relaxed mt-3">
              {log.details}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
