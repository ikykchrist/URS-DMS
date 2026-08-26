import { useState, useEffect } from "react"
import { FileCheck2, Pencil } from "lucide-react"
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
import {
  createOnlineRequirement,
  updateOnlineRequirement,
  type OnlineAaccupRequirement,
} from "@/services/aaccup"

// =============================================================================
// RequirementModal — add / edit a submission requirement on an AACCUP area.
// Only manual areas (not managed by the Root Requirement Builder) accept
// direct requirements; server errors are surfaced as-is.
// =============================================================================

interface RequirementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaId: string
  areaTitle?: string
  requirement?: OnlineAaccupRequirement | null
  onSuccess?: () => void
}

export function RequirementModal({
  open,
  onOpenChange,
  areaId,
  areaTitle,
  requirement,
  onSuccess,
}: RequirementModalProps) {
  const isEditing = Boolean(requirement)
  const [title, setTitle] = useState("")
  const [documentCode, setDocumentCode] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState("")
  const [isRequired, setIsRequired] = useState<"required" | "optional">("required")
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE")
  const [displayOrder, setDisplayOrder] = useState("0")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setError("")
    setTitle(requirement?.title ?? "")
    setDocumentCode(requirement?.documentCode ?? "")
    setDescription(requirement?.description ?? "")
    setCategory(requirement?.category ?? "")
    setPriority(requirement?.priority ?? "")
    setIsRequired(requirement ? (requirement.isRequired ? "required" : "optional") : "required")
    setStatus(requirement?.status ?? "ACTIVE")
    setDisplayOrder(String(requirement?.displayOrder ?? 0))
  }, [open, requirement])

  const isValid =
    title.trim().length > 0 &&
    documentCode.trim().length > 0 &&
    /^[A-Za-z0-9._-]+$/.test(documentCode.trim())

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setTitle(""); setDocumentCode(""); setDescription(""); setCategory(""); setPriority("")
      setIsRequired("required"); setStatus("ACTIVE"); setDisplayOrder("0"); setError("")
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    setError("")
    if (!isValid) {
      setError("Title and a valid document code (letters, digits, dots, underscores, dashes) are required")
      return
    }
    setSaving(true)
    try {
      const base = {
        title: title.trim(),
        documentCode: documentCode.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        priority: priority.trim() || null,
        isRequired: isRequired === "required",
        status,
        displayOrder: Number(displayOrder) || 0,
      }
      if (isEditing && requirement) {
        await updateOnlineRequirement(requirement.id, base)
      } else {
        await createOnlineRequirement({ areaId, ...base })
      }
      onSuccess?.()
      handleClose(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : isEditing ? "Failed to update the requirement" : "Failed to create the requirement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            {isEditing ? <Pencil className="w-5 h-5 text-primary" /> : <FileCheck2 className="w-5 h-5 text-primary" />}
            {isEditing ? "Edit Requirement" : "Add Requirement"}
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            {isEditing ? "Update this submission requirement." : `Add a submission requirement to ${areaTitle || "this area"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {error && (
            <div className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="reqTitle" className="text-[13px] font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reqTitle"
              autoFocus
              placeholder="e.g. Faculty Development Programs"
              className="h-10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="reqCode" className="text-[13px] font-medium text-gray-700">
                Document Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reqCode"
                placeholder="e.g. AREA1-FDP"
                className="h-10 font-mono"
                value={documentCode}
                onChange={(e) => setDocumentCode(e.target.value)}
              />
              <p className="text-[11px] text-gray-500">Letters, digits, dots, underscores, dashes</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reqOrder" className="text-[13px] font-medium text-gray-700">
                Display Order
              </Label>
              <Input
                id="reqOrder"
                type="number"
                min="0"
                className="h-10"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reqDesc" className="text-[13px] font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="reqDesc"
              placeholder="Optional description of what must be submitted..."
              className="min-h-[80px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">Category</Label>
              <Input
                placeholder="e.g. Documentation"
                className="h-10"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">Requirement Type</Label>
              <Select value={isRequired} onValueChange={(v) => setIsRequired(v as "required" | "optional")}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium text-gray-700">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="h-10 px-5">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !isValid} className="h-10 px-5 shadow-soft">
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Requirement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
