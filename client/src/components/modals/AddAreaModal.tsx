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

interface AddAreaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaSet?: "aaccup" | "iso" | "cert"
  onSuccess?: (area: { id: string; title: string }) => void
}

const areaNumberOptions = [
  { label: "Area I", value: "Area I" },
  { label: "Area II", value: "Area II" },
  { label: "Area III", value: "Area III" },
  { label: "Area IV", value: "Area IV" },
  { label: "Area V", value: "Area V" },
  { label: "Area VI", value: "Area VI" },
  { label: "Area VII", value: "Area VII" },
  { label: "Area VIII", value: "Area VIII" },
  { label: "Area IX", value: "Area IX" },
  { label: "Area X", value: "Area X" },
]

export function AddAreaModal({ open, onOpenChange, onSuccess }: AddAreaModalProps) {
  const [areaName, setAreaName] = useState("")
  const [department, setDepartment] = useState("")
  const [departments, setDepartments] = useState<SystemDepartment[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    listSystemDepartments({ pageSize: 100 })
      .then((page) => setDepartments(page.items))
      .catch(() => setDepartments([]))
  }, [open])

  const isValid = areaName && department

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setAreaName(""); setDepartment("")
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      const area = await createOnlineArea({
        code: areaName,
        name: areaName,
        description: "",
        departmentId: department,
      })
      onSuccess?.({ id: area.id, title: area.name })
      setAreaName(""); setDepartment("")
      onOpenChange(false)
    } catch { } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <DialogTitle className="text-lg">Add AACCUP Area</DialogTitle>
          </div>
          <DialogDescription className="text-[14px]">
            Create and assign a new accreditation area.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="areaName" className="text-[13px] font-medium">
              Area Name
            </Label>
            <Select value={areaName} onValueChange={setAreaName}>
              <SelectTrigger id="areaName" className="h-10">
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
<SelectContent>
                  {areaNumberOptions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-500">
              Select the AACCUP accreditation area
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="department" className="text-[13px] font-medium">
              Department
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