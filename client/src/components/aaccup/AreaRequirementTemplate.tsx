import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { getAreaTemplateSetup, setAreaRequirementTemplate, type AreaTemplateSetup } from "@/services/aaccup"
import { toast } from "@/lib/toast"

export function AreaRequirementTemplate({ areaId, onApplied }: { areaId: string; onApplied: () => void }) {
  const [setup, setSetup] = useState<AreaTemplateSetup | null>(null)
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(""); setSetup(null); setSelected("")
    getAreaTemplateSetup(areaId).then((result) => {
      if (active) { setSetup(result); setSelected(result.templateId ?? "") }
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load templates.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [areaId, retry])
  async function apply(templateId: string | null) {
    setSaving(true); setError("")
    try {
      const result = await setAreaRequirementTemplate(areaId, templateId)
      setSetup(result); setSelected(result.templateId ?? "")
      toast.success(templateId ? "Template attached to this area" : "Template removed from this area")
      onApplied()
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update area template.") }
    finally { setSaving(false) }
  }
  return <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50/40 p-4">
    <Label htmlFor={`area-template-${areaId}`}>Requirement template</Label>
    <p className="mb-3 mt-1 text-[12px] text-gray-500">Attach an active template to this area to make its requirements available to users in the area's program. Library templates do not appear for users automatically.</p>
    {loading ? <p className="text-sm text-gray-500">Loading templates…</p> : setup && <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={selected} onValueChange={setSelected} disabled={saving || Boolean(setup.templateId)}>
        <SelectTrigger id={`area-template-${areaId}`} className="min-w-0 flex-1"><SelectValue placeholder="Choose a requirement template" /></SelectTrigger>
        <SelectContent>{setup.templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name} · v{template.version}</SelectItem>)}</SelectContent>
      </Select>
      {setup.templateId ? <Button variant="outline" disabled={saving} onClick={() => void apply(null)}>Remove template</Button>
        : <Button disabled={saving || !selected} onClick={() => void apply(selected)}>{saving ? "Applying…" : "Apply to area"}</Button>}
    </div>}
    {!loading && setup?.templates.length === 0 && <p className="mt-2 text-xs text-gray-500">No active template for this accreditation set. Create and activate one in Requirement Builder first.</p>}
    {error && <div className="mt-2 text-sm text-red-600" role="alert">{error} {!setup && <Button size="sm" variant="ghost" onClick={() => setRetry((value) => value + 1)}>Retry</Button>}</div>}
  </div>
}
