import { Plus } from "lucide-react"
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
import { Textarea } from "@/components/ui/Textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaTitle?: string
}

export function CreateTaskModal({ open, onOpenChange, areaTitle }: CreateTaskModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Task
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Create a new task for {areaTitle || "this area"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="taskName" className="text-[13px] font-medium text-gray-700">
              Task Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="taskName"
              placeholder="Enter task name"
              className="h-10"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="taskDescription" className="text-[13px] font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="taskDescription"
              placeholder="Enter task description..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Assign To <span className="text-red-500">*</span>
              </Label>
              <Select>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maria">Dr. Maria Santos</SelectItem>
                  <SelectItem value="john">Prof. John Doe</SelectItem>
                  <SelectItem value="sarah">Engr. Sarah Cruz</SelectItem>
                  <SelectItem value="peter">Dr. Peter Lim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Priority
              </Label>
              <Select defaultValue="medium">
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Due Date
              </Label>
              <Input type="date" className="h-10" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Category
              </Label>
              <Select defaultValue="documentation">
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="upload">File Upload</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700">
              Required Documents
            </Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50/50">
              {["Annual Report", "Supporting Docs", "Evidence Files", "Statistics"].map((doc) => (
                <label key={doc} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="rounded" />
                  <span className="text-[12px] text-gray-700">{doc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-5">
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)} className="h-10 px-5 shadow-sm">
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
