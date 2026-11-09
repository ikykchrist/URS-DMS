import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { getAreaTemplateSetup, type AreaTemplateSetup } from "@/services/aaccup"

export function AreaRequirementTemplate({ areaId }: { areaId: string; onApplied?: () => void }) {
  const [setup, setSetup] = useState<AreaTemplateSetup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(""); setSetup(null)
    getAreaTemplateSetup(areaId).then((result) => {
      if (active) setSetup(result)
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load templates.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [areaId, retry])
  return <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50/40 p-4">
    <p className="text-[13px] font-semibold text-primary-800">Requirement template</p>
    <p className="mb-3 mt-1 text-[12px] text-gray-500">This area automatically uses the active universal template for its accreditation set. Updates from Requirement Builder apply here automatically.</p>
    {loading ? <p className="text-sm text-gray-500">Loading template…</p> : setup?.templateId ? <p className="text-sm font-medium text-primary-900">{setup.templates.find((template) => template.id === setup.templateId)?.name ?? "Active universal template"} · v{setup.templates.find((template) => template.id === setup.templateId)?.version ?? "—"}</p> : null}
    {!loading && setup?.templates.length === 0 && <p className="mt-2 text-xs text-gray-500">No active template for this accreditation set. Create and activate one in Requirement Builder first.</p>}
    {error && <div className="mt-2 text-sm text-red-600" role="alert">{error} {!setup && <Button size="sm" variant="ghost" onClick={() => setRetry((value) => value + 1)}>Retry</Button>}</div>}
  </div>
}
