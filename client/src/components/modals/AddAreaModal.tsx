import { useState, useEffect } from "react"
import { Award } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { createOnlineArea } from "@/services/aaccup"
import { listSystemDepartments, type SystemDepartment } from "@/services/admin"
import { cn } from "@/lib/utils"

interface AddAreaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaSet?: "aaccup" | "iso" | "cert"
  onSuccess?: (area: { id: string; title: string }) => void
}

const setLabel = {
  aaccup: "AACCUP",
  iso: "ISO",
  cert: "Certification",
} as const

const setBadgeIcon = {
  aaccup: "bg-amber-100 text-amber-600",
  iso: "bg-blue-100 text-blue-600",
  cert: "bg-emerald-100 text-emerald-600",
} as const

// Server requires codes of [A-Z0-9._-] (uppercase). Derive a valid code from
// the area name so the "Create Area" flow never fails on formatting.
function toAreaCode(name: string): string {
  const sanitized = name
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
  return sanitized || "AREA"
}

export function AddAreaModal({ open, onOpenChange, areaSet = "aaccup", onSuccess }: AddAreaModalProps) {
  const [areaName, setAreaName] = useState("")
  const [department, setDepartment] = useState("")
  const [departments, setDepartments] = useState<SystemDepartment[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setError("")
    listSystemDepartments({ pageSize: 100 })
      .then((page) => setDepartments(page.items))
      .catch(() => setDepartments([]))
  }, [open])

  const isValid = areaName.trim().length > 0 && department

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setAreaName(""); setDepartment(""); setError("")
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    setError("")
    if (!isValid) return
    setSaving(true)
    try {
      const name = areaName.trim()
      const area = await createOnlineArea({
        code: toAreaCode(name),
        name,
        description: "",
        departmentId: department,
        areaSet: areaSet.toUpperCase() as "AACCUP" | "ISO" | "CERT",
      })
      onSuccess?.({ id: area.id, title: area.name })
      setAreaName(""); setDepartment("")
      onOpenChange(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create area")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", setBadgeIcon[areaSet])}>
              <Award className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg">Add {setLabel[areaSet]} Area</DialogTitle>
          </div>
          <DialogDescription className="text-[14px]">
            Create and assign a new {setLabel[areaSet]} accreditation area.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="areaName" className="text-[13px] font-medium">
              Area Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="areaName"
              autoFocus
              placeholder="e.g. Area I - Instruction"
              className="h-10"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
            />
            <p className="text-[11px] text-gray-500">
              Name of the {setLabel[areaSet]} accreditation area
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="department" className="text-[13px] font-medium">
              Department <span className="text-red-500">*</span>
            </Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger id="department" className="h-10">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-500">
              Assign the responsible department
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 my-2" />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="h-9">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="h-9 shadow-sm" disabled={!isValid || saving}>
            {saving ? "Creating..." : "Create Area"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}