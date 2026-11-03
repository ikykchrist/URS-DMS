import { useEffect, useState } from "react"
import { Award, Pencil } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/Textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { createOnlineArea, updateOnlineArea, listAreaSetupPrograms, type AreaSetupProgram } from "@/services/aaccup"

interface AddAreaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaSet?: "aaccup" | "iso"
  area?: { id: string; name: string; description: string; campusId: string; collegeId: string; programId: string; isActive: boolean } | null
  onSuccess?: (area: { id: string; title: string }) => void
}

function areaCode(name: string, set: string, program: string) {
  const label = name.toUpperCase().replace(/[^A-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "AREA"
  return `${set.toUpperCase()}-${label}-${program.replace(/-/g, "").slice(0, 12).toUpperCase()}`.slice(0, 50)
}

export function AddAreaModal({ open, onOpenChange, areaSet = "aaccup", area, onSuccess }: AddAreaModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [programId, setProgramId] = useState("")
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE")
  const [programs, setPrograms] = useState<AreaSetupProgram[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!open) return
    let active = true
    setName(area?.name ?? ""); setDescription(area?.description ?? ""); setProgramId(area?.programId ?? "")
    setStatus(area?.isActive === false ? "INACTIVE" : "ACTIVE"); setError(""); setLoading(true)
    listAreaSetupPrograms().then((items) => { if (active) setPrograms(items) })
      .catch((reason: unknown) => { if (active) { setPrograms([]); setError(reason instanceof Error ? reason.message : "Unable to load programs.") } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, area, retry])
  const program = programs.find((item) => item.id === programId)
  async function save() {
    if (!name.trim() || !program || saving) return
    setSaving(true); setError("")
    try {
      const details = { name: name.trim(), description: description.trim(), programId: program.id, campusId: program.campusId, collegeId: program.collegeId, status }
      const result = area ? await updateOnlineArea(area.id, details) : await createOnlineArea({ ...details, code: areaCode(name, areaSet, program.id), areaSet: areaSet.toUpperCase() as "AACCUP" | "ISO" })
      onSuccess?.({ id: result.id, title: result.name }); onOpenChange(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save area.") }
    finally { setSaving(false) }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!saving) onOpenChange(value) }}>
    <DialogContent className="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">{area ? <Pencil className="h-4 w-4 text-primary" /> : <Award className="h-4 w-4 text-primary" />}{area ? "Edit" : "Add"} {areaSet.toUpperCase()} Area</DialogTitle>
        <DialogDescription>{area ? "Update this area's name and program." : "Name the area and choose its program. Add a requirement template inside the area afterward."}</DialogDescription>
      </DialogHeader>
      <div className="space-y-5 py-3">
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}{!programs.length && <Button variant="ghost" size="sm" onClick={() => setRetry((value) => value + 1)}>Retry</Button>}</div>}
        <div className="space-y-2"><Label htmlFor="area-name">Area name <span className="text-red-500">*</span></Label><Input autoFocus id="area-name" value={name} maxLength={255} onChange={(event) => setName(event.target.value)} placeholder="e.g. Area I — Instruction" disabled={saving} /></div>
        <div className="space-y-2"><Label htmlFor="area-program">Program <span className="text-red-500">*</span></Label>
          <Select value={programId} onValueChange={setProgramId} disabled={loading || saving}>
            <SelectTrigger id="area-program"><SelectValue placeholder={loading ? "Loading programs…" : "Choose program"} /></SelectTrigger>
            <SelectContent>{programs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.collegeName} · {item.campusName}</SelectItem>)}</SelectContent>
          </Select>
          {program && <p className="text-xs text-gray-500">{program.campusName} / {program.collegeName}</p>}
          {!loading && !programs.length && !error && <p className="text-xs text-amber-700">No programs have a complete campus and college scope. Configure them in Organization first.</p>}
        </div>
        <details className="rounded-lg border border-border p-3" open={Boolean(area)}>
          <summary className="cursor-pointer text-sm font-medium text-gray-600">Optional details</summary>
          <div className="mt-3 space-y-4">
            <div className="space-y-2"><Label htmlFor="area-description">Description</Label><Textarea id="area-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} disabled={saving} /></div>
            <div className="space-y-2"><Label htmlFor="area-status">Status</Label><Select value={status} onValueChange={(value) => setStatus(value as "ACTIVE" | "INACTIVE")} disabled={saving}><SelectTrigger id="area-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select><p className="text-xs text-gray-500">Inactive areas do not accept new submissions.</p></div>
          </div>
        </details>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={() => void save()} disabled={loading || saving || !name.trim() || !program}>{saving ? "Saving…" : area ? "Save changes" : "Create area"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
