import { toast } from "@/lib/toast"
import { useState, useEffect } from "react"
import { UserPlus } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { createSystemUser, listSystemRoles, type SystemRole } from "@/services/admin"
import { getOrganizationTree, type OrgTreeNode } from "@/services/root"

interface AddUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (userData: { name: string; email: string; role: string; program: string }) => void
}

export function AddUserModal({ open, onOpenChange, onSuccess }: AddUserModalProps) {
  const [isActive, setIsActive] = useState(true)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [campus, setCampus] = useState("")
  const [college, setCollege] = useState("")
  const [program, setProgram] = useState("")
  const [role, setRole] = useState("")
  const [roles, setRoles] = useState<SystemRole[]>([])
  const [campuses, setCampuses] = useState<OrgTreeNode[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    listSystemRoles({ pageSize: 100 })
      .then((page) => {
        setRoles(page.items)
        if (page.items.length > 0) {
          setRole((current) => current || page.items[0]!.id)
        }
      })
      .catch(() => setRoles([]))
    getOrganizationTree()
      .then((tree) => setCampuses(tree.campuses))
      .catch(() => setCampuses([]))
  }, [open])

  const handleSubmit = async () => {
    setError("")
    if (!fullName.trim()) { setError("Full name is required"); return }
    if (!email.trim()) { setError("Email is required"); return }
    if (!password) { setError("Password is required"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    if (password !== confirmPassword) { setError("Passwords do not match"); return }
    if (!campus) { setError("Campus is required"); return }
    if (!college) { setError("College is required"); return }
    if (!program) { setError("Program is required"); return }
    if (!role) { setError("Role is required"); return }
    setSaving(true)
    try {
      const nameParts = fullName.trim().split(/\s+/)
      const firstName = nameParts[0] ?? fullName.trim()
      const lastName = nameParts.slice(1).join(" ") || firstName
      // Employee IDs allow only letters/digits/'-'/'_' (server regex). The
      // email local part often contains dots, so sanitize before sending.
      const derivedEmployeeId = email.split("@")[0].replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 64)
      await createSystemUser({
        employeeId: derivedEmployeeId.length >= 2 ? derivedEmployeeId : "USER",
        email,
        password,
        firstName,
        lastName,
        roleId: role,
        campusId: campus,
        collegeId: college,
        programId: program,
        mustChangePassword: false,
      })
      const roleName = roles.find((r) => r.id === role)?.name ?? role
      const programName = programs.find((p) => p.id === program)?.name ?? program
      onSuccess?.({ name: fullName, email, role: roleName, program: programName })
      onOpenChange(false)
      setFullName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setCampus(""); setCollege(""); setProgram(""); setRole(roles[0]?.id ?? ""); setIsActive(true)
      toast.success("User created")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create user")
    } finally {
      setSaving(false)
    }
  }

  const selectedCampus = campuses.find((item) => item.id === campus)
  const colleges = selectedCampus?.colleges ?? []
  const programs = colleges.find((item) => item.id === college)?.programs ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New User
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Create a new user account. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="fullName" className="text-[13px] font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              autoFocus
              placeholder="Enter full name"
              className="h-10"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-[13px] font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              className="h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-[13px] font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                className="h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                className="h-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Campus <span className="text-red-500">*</span>
              </Label>
              <Select value={campus} onValueChange={(value) => { setCampus(value); setCollege(""); setProgram("") }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name === "ACCREDITOR" ? "Accreditor" : item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                College <span className="text-red-500">*</span>
              </Label>
              <Select value={college} onValueChange={(value) => { setCollege(value); setProgram("") }} disabled={!campus}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select college" /></SelectTrigger>
                <SelectContent>{colleges.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Program <span className="text-red-500">*</span>
              </Label>
              <Select value={program} onValueChange={setProgram} disabled={!college}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>{programs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="userActive" className="text-[14px] font-medium text-gray-700 cursor-pointer">
                Active Status
              </Label>
              <p className="text-[12px] text-gray-500">
                Enable to allow this user to access the system
              </p>
            </div>
            <Switch
              id="userActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
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
          <Button onClick={handleSubmit} className="h-10 px-5 shadow-soft" disabled={saving}>
            {saving ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
