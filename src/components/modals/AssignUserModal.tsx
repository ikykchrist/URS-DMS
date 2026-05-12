import { UserPlus, Check } from "lucide-react"
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
import { Badge } from "@/components/ui/Badge"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"

interface User {
  id: string
  name: string
  email: string
  initials: string
  role: string
}

interface AssignUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaTitle?: string
}

const availableUsers: User[] = [
  { id: "1", name: "Dr. Maria Santos", email: "maria.santos@university.edu", initials: "MS", role: "System Administrator" },
  { id: "2", name: "Prof. John Doe", email: "john.doe@university.edu", initials: "JD", role: "Document Manager" },
  { id: "3", name: "Engr. Sarah Cruz", email: "sarah.cruz@university.edu", initials: "SC", role: "Reviewer" },
  { id: "4", name: "Dr. Peter Lim", email: "peter.lim@university.edu", initials: "PL", role: "Editor" },
  { id: "5", name: "Ms. Ana Reyes", email: "ana.reyes@university.edu", initials: "AR", role: "Viewer" },
]

const assignedUsers = ["1", "3"]

export function AssignUserModal({ open, onOpenChange, areaTitle }: AssignUserModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Assign Users
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Assign users to help with {areaTitle || "this area"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="relative">
            <Input
              placeholder="Search users..."
              className="h-10 pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableUsers.map((user) => {
              const isAssigned = assignedUsers.includes(user.id)
              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    isAssigned
                      ? "border-primary/30 bg-primary-5"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-[11px] bg-gray-100 text-gray-700">{user.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[14px] font-medium text-gray-900">{user.name}</p>
                      <p className="text-[12px] text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isAssigned ? "bg-primary text-white" : "border border-gray-300"
                  }`}>
                    {isAssigned && <Check className="w-4 h-4" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-5">
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)} className="h-10 px-5 shadow-sm">
            Assign Users
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
