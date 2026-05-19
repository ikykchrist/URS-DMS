import { useState } from "react"
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

interface AddAreaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const areaOptions = [
  "Area I",
  "Area II",
  "Area III",
  "Area IV",
  "Area V",
  "Area VI",
  "Area VII",
  "Area VIII",
  "Area IX",
  "Area X",
]

const departmentOptions = [
  "College of Science",
  "College of Engineering",
  "College of Education",
  "College of Industrial Technology",
  "College of Business",
  "College of Arts and Sciences",
  "College of Nursing",
  "College of Architecture",
]

export function AddAreaModal({ open, onOpenChange }: AddAreaModalProps) {
  const [areaName, setAreaName] = useState("")
  const [department, setDepartment] = useState("")

  const isValid = areaName && department

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setAreaName("")
      setDepartment("")
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = () => {
    if (isValid) {
      console.log("Add Area:", { areaName, department })
      setAreaName("")
      setDepartment("")
      onOpenChange(false)
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
                {areaOptions.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
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
                {departmentOptions.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
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
          <Button 
            onClick={handleSubmit} 
            className="h-9 shadow-sm"
            disabled={!isValid}
          >
            Create Area
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}