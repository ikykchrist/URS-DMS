import { useState, useEffect } from "react"
import { Plus, User, Building2 } from "lucide-react"
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
import { createOnlineTask, listTaskRequirementTemplates, listTaskAssignees, listAllOnlineAaccupAreas, type OnlineAaccupArea, type TaskRequirementTemplateOption } from "@/services/aaccup"
import { cn } from "@/lib/utils"

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaId?: string
  areaTitle?: string
  onSuccess?: () => void
}

type AssigneeKind = "USER" | "DEPARTMENT"

export function CreateTaskModal({ open, onOpenChange, areaId, areaTitle, onSuccess }: CreateTaskModalProps) {
  const [taskName, setTaskName] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [assigneeKind, setAssigneeKind] = useState<AssigneeKind>("USER")
  const [assigneeId, setAssigneeId] = useState("")
  const [requirementTemplateId, setRequirementTemplateId] = useState("")
  const [requirementTemplates, setRequirementTemplates] = useState<TaskRequirementTemplateOption[]>([])
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [category, setCategory] = useState("documentation")
  const [activeUsers, setActiveUsers] = useState<Array<{ id: string; label: string }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; label: string }>>([])
  const [areas, setAreas] = useState<OnlineAaccupArea[]>([])
  const [pickedAreaId, setPickedAreaId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const effectiveAreaId = areaId ?? pickedAreaId
  const effectiveAreaTitle = areaId ? areaTitle : areas.find((a) => a.id === pickedAreaId)?.name

  useEffect(() => {
    if (!open) return
    setError("")
    setSaving(false)
    setRequirementTemplateId("")
    setPickedAreaId("")
    Promise.all([
      listTaskAssignees().then((result) => ({
        users: result.users.map((user) => ({ id: user.id, label: user.fullName })),
        departments: result.departments.map((department) => ({ id: department.id, label: department.name })),
      })),
      areaId
        ? Promise.resolve([])
        : listAllOnlineAaccupAreas({ status: "ACTIVE" }).then((items) =>
            items.sort((a, b) => a.areaSet.localeCompare(b.areaSet) || a.name.localeCompare(b.name)),
          ),
    ])
      .then(([assignees, areaItems]) => {
        setActiveUsers(assignees.users)
        setDepartments(assignees.departments)
        setAreas(areaItems)
      })
      .catch(() => {
        setActiveUsers([])
        setDepartments([])
        setAreas([])
      })
  }, [open, areaId])

  useEffect(() => {
    if (!open || !effectiveAreaId) {
      setRequirementTemplates([])
      setRequirementTemplateId("")
      return
    }
    setRequirementTemplateId("")
    listTaskRequirementTemplates(effectiveAreaId)
      .then((items) => {
        setRequirementTemplates(items)
        if (items.length === 1) setRequirementTemplateId(items[0].id)
      })
      .catch(() => setRequirementTemplates([]))
  }, [open, effectiveAreaId])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setTaskName(""); setTaskDescription(""); setAssigneeId(""); setDueDate(""); setRequirementTemplateId("")
      setPriority("MEDIUM"); setCategory("documentation"); setAssigneeKind("USER"); setError(""); setPickedAreaId("")
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    setError("")
    if (!taskName.trim()) { setError("Task name is required"); return }
    if (!effectiveAreaId) { setError("No area selected"); return }
    if (!requirementTemplateId) { setError("Please assign an active requirement template to this area first"); return }
    if (!assigneeId) { setError("Please select an assignee"); return }

    setSaving(true)
    try {
      await createOnlineTask({
        areaId: effectiveAreaId,
        title: taskName,
        description: taskDescription,
        category,
        priority,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        requirementTemplateId,
        assigneeType: assigneeKind,
        assigneeId,
      })
      onSuccess?.()
      handleClose(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create task. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Task
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Create a new task for {effectiveAreaTitle || "an accreditation area"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {!areaId && (
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Area <span className="text-red-500">*</span>
              </Label>
              <Select value={pickedAreaId} onValueChange={setPickedAreaId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select an accreditation area" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      [{area.areaSet}] {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {areas.length === 0 && (
                <p className="text-[12px] text-gray-500">
                  No active areas available for task assignment.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="taskName" className="text-[13px] font-medium text-gray-700">
              Task Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="taskName"
              autoFocus
              placeholder="Enter task name"
              className="h-10"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
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
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700">
              Requirement Template <span className="text-red-500">*</span>
            </Label>
            <Select value={requirementTemplateId} onValueChange={setRequirementTemplateId} disabled={requirementTemplates.length === 0}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select the complete requirement template" />
              </SelectTrigger>
              <SelectContent>
                {requirementTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} — v{template.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-500">
              This task will cover the complete template and all of its document requirements.
            </p>
            {effectiveAreaId && requirementTemplates.length === 0 && (
              <p className="text-[11px] text-amber-700">No active template is assigned to this area yet. Assign one in Requirement Builder first.</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700">
              Assign To <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border p-1 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => { setAssigneeKind("USER"); setAssigneeId("") }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                    assigneeKind === "USER" ? "bg-white text-gray-900 shadow-soft" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  Active User
                </button>
                <button
                  type="button"
                  onClick={() => { setAssigneeKind("DEPARTMENT"); setAssigneeId("") }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                    assigneeKind === "DEPARTMENT" ? "bg-white text-gray-900 shadow-soft" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Department
                </button>
              </div>
              <Select
                value={assigneeId}
                onValueChange={setAssigneeId}
                disabled={(assigneeKind === "USER" ? activeUsers : departments).length === 0}
              >
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue
                    placeholder={
                      assigneeKind === "USER"
                        ? "Select active user"
                        : "Select department"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assigneeKind === "USER"
                    ? activeUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.label}
                        </SelectItem>
                      ))
                    : departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.label}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
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
              Due Date
            </Label>
            <Input type="date" className="h-10" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="h-10 px-5">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="h-10 px-5 shadow-soft">
            {saving ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
