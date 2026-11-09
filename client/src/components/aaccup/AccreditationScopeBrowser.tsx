import type { ReactNode } from "react"
import { Building2, ChevronRight, Landmark } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import type { AccreditationCampus, OnlineAaccupArea } from "@/services/aaccup"

import { type AccreditationLocation } from "@/lib/accreditationLocation"

interface Props {
  campuses: AccreditationCampus[]
  areas: OnlineAaccupArea[]
  location: AccreditationLocation
  onChange: (value: AccreditationLocation) => void
  loading: boolean
  error: string
  onRetry: () => void
}

export function AccreditationScopeBrowser({ campuses, areas, location, onChange, loading, error, onRetry }: Props) {
  const campus = campuses.find((item) => item.id === location.campus)
  const college = campus?.colleges.find((item) => item.id === location.college)
  const program = college?.programs.find((item) => item.id === location.program)
  const unassigned = areas.filter((area) => !area.campusId || !area.collegeId)
  const go = (patch: Partial<AccreditationLocation>) => onChange({ ...location, ...patch })
  const root = { campus: "", college: "", scope: "", program: "" }
  const tile = (id: string, name: string, detail: string, icon: ReactNode, action: () => void) => (
    <button key={id} type="button" onClick={action} className="text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={name}>
      <Card className="border-border/70 shadow-soft hover:shadow-lift hover:border-primary/30 transition-all h-full sm:aspect-square">
        <CardContent className="p-4 md:p-4 flex flex-col items-start gap-3 h-full min-h-[150px]">
          <span className="rounded-xl bg-primary/10 text-primary p-2.5">{icon}</span>
          <div className="w-full"><h3 className="font-semibold text-navy-900 break-words">{name}</h3><p className="mt-1 text-xs text-gray-500">{detail}</p></div>
          <ChevronRight className="h-4 w-4 text-gray-400 self-end mt-auto" />
        </CardContent>
      </Card>
    </button>
  )
  return <div className="mb-4 space-y-3">
    <nav aria-label="Accreditation location" className="flex flex-wrap items-center gap-1 text-sm">
      <Button variant="ghost" size="sm" onClick={() => onChange(root)}>Campuses</Button>
      {campus && <><ChevronRight className="w-3 h-3 text-gray-400" /><Button variant="ghost" size="sm" onClick={() => go({ college: "", scope: "", program: "" })}>{campus.name}</Button></>}
      {college && <><ChevronRight className="w-3 h-3 text-gray-400" /><Button variant="ghost" size="sm" onClick={() => go({ scope: "college", program: "" })}>{college.name}</Button></>}
      {location.scope === "unassigned" && <span className="text-gray-500">/ Unassigned areas</span>}
    </nav>
    {loading ? <p role="status" className="p-6 text-sm text-gray-500">Loading campuses and colleges…</p> : error ? <Card><CardContent className="p-6"><p role="alert" className="text-sm text-red-600">{error}</p><Button variant="outline" className="mt-3" onClick={onRetry}>Retry</Button></CardContent></Card> : <>
      {location.scope !== "unassigned" && !campus && <><h2 className="text-lg font-semibold text-navy-900">Campuses</h2><div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">{campuses.map((item) => tile(item.id, item.name, `${item.colleges.length} ${item.colleges.length === 1 ? "college" : "colleges"}`, <Landmark className="w-5 h-5" />, () => onChange({ campus: item.id, college: "", scope: "", program: "" })))}</div>{!campuses.length && <p className="text-sm text-gray-500">No campuses configured in Organization.</p>}{unassigned.length > 0 && <Button variant="outline" onClick={() => onChange({ ...root, scope: "unassigned" })}>Unassigned areas ({unassigned.length})</Button>}</>}
      {campus && !college && <><h2 className="text-lg font-semibold text-navy-900">Colleges</h2><div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">{campus.colleges.map((item) => tile(item.id, item.name, `${item.programs.length} ${item.programs.length === 1 ? "program" : "programs"}`, <Building2 className="w-5 h-5" />, () => go({ college: item.id, scope: "college", program: "" })))}</div>{!campus.colleges.length && <p className="text-sm text-gray-500">No colleges configured in this campus.</p>}</>}
      {college && <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-white border border-border p-1 shadow-soft">
          <Button size="sm" variant={location.scope === "college" ? "default" : "ghost"} onClick={() => go({ scope: "college", program: "" })}>College-wide</Button>
          <Button size="sm" variant={location.scope === "program" ? "default" : "ghost"} onClick={() => go({ scope: "program", program: "" })}>By program</Button>
        </div>
        {location.scope === "program" && <Select value={program?.id ?? ""} onValueChange={(value) => go({ program: value })}><SelectTrigger aria-label="Program" className="w-full sm:w-[260px]"><SelectValue placeholder="Choose a program" /></SelectTrigger><SelectContent>{college.programs.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
        {location.scope === "college" && <span className="text-xs text-gray-500">Applies to: Entire college</span>}
        {program && <span className="text-xs text-gray-500">Applies to: {program.name}</span>}
        {location.scope === "program" && !college.programs.length && <p className="text-sm text-gray-500">No programs configured in this college.</p>}
      </div>}
    </>}
  </div>
}
