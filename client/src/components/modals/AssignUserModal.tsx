import { useState, useEffect } from "react"
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
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { toast } from "@/lib/toast"
import { listSystemUsers } from "@/services/admin"

interface AssignUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaId: string
  areaTitle?: string
  onSuccess?: (userIds: string[]) => void
}

interface AssignableUser {
  id: string
  name: string
  email: string
  role: string
}

export function AssignUserModal({ open, onOpenChange, areaTitle }: AssignUserModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [availableUsers, setAvailableUsers] = useState<AssignableUser[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listSystemUsers({ pageSize: 200 })
      .then((page) => {
        setAvailableUsers(
          page.items
            .filter((user) => user.status !== "ARCHIVED")
            .map((user) => ({
              id: user.id,
              name: [user.firstName, user.middleName, user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim(),
              email: user.email,
              role: user.roleName,
            })),
        )
        setLoading(false)
      })
      .catch(() => {
        setAvailableUsers([])
        setLoading(false)
      })
  }, [open])

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleAssign = async () => {
    setSaving(true)
    try {
      toast.info("Assignment is not available on the server yet — no changes were made")
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            {loading ? (
              <p className="text-[13px] text-gray-500 text-center py-4">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-[13px] text-gray-500 text-center py-4">No users found.</p>
            ) : (
              filteredUsers.map((user) => {
                const isAssigned = selectedUsers.includes(user.id)
                const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isAssigned
                        ? "border-primary/30 bg-primary-500"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-[11px] bg-gray-100 text-gray-700">{initials}</AvatarFallback>
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
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-5">
            Cancel
          </Button>
          <Button onClick={handleAssign} className="h-10 px-5 shadow-sm" disabled={saving}>
            {saving ? "Assigning..." : `Assign Users (${selectedUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
