import { useEffect, useState } from "react"
import { ArrowLeft, Eye, FileText, LogOut } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { AccreditationScopeBrowser } from "@/components/aaccup/AccreditationScopeBrowser"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
import { accreditationAreaLabel, matchesAccreditationLocation, type AccreditationLocation } from "@/lib/accreditationLocation"
import {
  getAccreditorPreview,
  listAccreditorAreas,
  listAccreditorEvidence,
  listAccreditorOrganization,
  type AccreditationCampus,
  type ApprovedEvidence,
  type AreaSet,
  type OnlineAaccupArea,
} from "@/services/aaccup"

function EvidencePreview({ evidence, onClose }: { evidence: ApprovedEvidence; onClose: () => void }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof getAccreditorPreview>> | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    getAccreditorPreview(evidence.id)
      .then(async (result) => {
        if (!active) return
        if (result.mimeType.startsWith("text/")) {
          const response = await fetch(result.url, { signal: controller.signal, referrerPolicy: "no-referrer" })
          if (!response.ok) throw new Error("Unable to load the preview.")
          const content = await response.text()
          if (active) setText(content)
        }
        if (active) setPreview(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the preview.")
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [evidence.id])

  function renderPreview() {
    if (error) return <p role="alert" className="p-4 text-sm text-red-600">{error}</p>
    if (!preview) return <p role="status" className="p-4 text-sm text-gray-500">Loading preview…</p>
    const { filename, mimeType, url } = preview
    if (text !== null) return <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-gray-50 p-4 text-sm">{text}</pre>
    if (mimeType.startsWith("image/")) {
      return <img className="min-h-0 w-full flex-1 object-contain" src={url} alt={filename} referrerPolicy="no-referrer" />
    }
    if (mimeType.startsWith("video/")) {
      return <video className="min-h-0 w-full flex-1" src={url} controls controlsList="nodownload" aria-label={filename} />
    }
    if (mimeType.startsWith("audio/")) {
      return <audio className="w-full" src={url} controls controlsList="nodownload" aria-label={filename} />
    }
    return (
      <iframe
        className="min-h-0 w-full flex-1 rounded-lg border border-border bg-gray-50"
        src={`${url}#toolbar=0`}
        title={filename}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flex h-[88dvh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle className="break-all">{evidence.filename}</DialogTitle>
          <DialogDescription>{evidence.requirementTitle}</DialogDescription>
        </DialogHeader>
        {renderPreview()}
      </DialogContent>
    </Dialog>
  )
}

function ApprovedEvidenceList({ area }: { area: OnlineAaccupArea }) {
  const [evidence, setEvidence] = useState<ApprovedEvidence[] | null>(null)
  const [preview, setPreview] = useState<ApprovedEvidence | null>(null)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setError("")
    listAccreditorEvidence(area.id)
      .then((items) => { if (active) setEvidence(items) })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load approved files.")
      })
    return () => { active = false }
  }, [area.id, retry])

  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="text-lg font-semibold">{accreditationAreaLabel(area)}</h2>
        {area.description && <p className="text-sm text-gray-500">{area.description}</p>}
        <h3 className="text-sm font-semibold">Approved files</h3>
        {error ? (
          <div role="alert" className="text-sm text-red-600">
            {error} <Button size="sm" variant="ghost" onClick={() => setRetry((value) => value + 1)}>Retry</Button>
          </div>
        ) : evidence === null ? (
          <p role="status" className="text-sm text-gray-500">Loading approved files…</p>
        ) : evidence.length === 0 ? (
          <p className="text-sm text-gray-500">No approved files in this area.</p>
        ) : (
          <ul className="divide-y divide-border">
            {evidence.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">{item.filename}</p>
                  <p className="break-words text-xs text-gray-500">{item.requirementCode} · {item.requirementTitle}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPreview(item)} aria-label={`Preview ${item.filename}`}>
                  <Eye className="mr-1.5 h-4 w-4" /> Preview
                </Button>
              </li>
            ))}
          </ul>
        )}
        {preview && <EvidencePreview key={preview.id} evidence={preview} onClose={() => setPreview(null)} />}
      </CardContent>
    </Card>
  )
}

export default function AccreditorAccreditation() {
  const { logout } = useAuth()
  const [params, setParams] = useSearchParams()
  const areaSet: AreaSet = params.get("set") === "ISO" ? "ISO" : "AACCUP"
  const location: AccreditationLocation = {
    campus: params.get("campus") ?? "",
    college: params.get("college") ?? "",
    scope: params.get("scope") ?? "",
    program: params.get("program") ?? "",
  }
  const [catalog, setCatalog] = useState<{ areaSet: AreaSet; areas: OnlineAaccupArea[]; campuses: AccreditationCampus[] } | null>(null)
  const [error, setError] = useState<{ areaSet: AreaSet; message: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const currentCatalog = catalog?.areaSet === areaSet ? catalog : null
  const currentError = error?.areaSet === areaSet ? error.message : ""
  const areas = currentCatalog?.areas ?? []
  const campuses = currentCatalog?.campuses ?? []
  const selectedArea = areas.find((area) => area.id === params.get("area"))
  const college = campuses.find((campus) => campus.id === location.campus)?.colleges.find((item) => item.id === location.college)
  const showAreas = location.scope === "unassigned" || Boolean(college && (
    location.scope === "college" || (location.scope === "program" && college.programs.some((program) => program.id === location.program))
  ))
  const scopedAreas = showAreas ? areas.filter((area) => matchesAccreditationLocation(area, location)) : []

  useEffect(() => {
    let active = true
    setError(null)
    Promise.all([listAccreditorOrganization(), listAccreditorAreas(areaSet)])
      .then(([campuses, areas]) => { if (active) setCatalog({ areaSet, campuses, areas }) })
      .catch((reason: unknown) => {
        if (active) setError({ areaSet, message: reason instanceof Error ? reason.message : "Unable to load accreditation areas." })
      })
    return () => { active = false }
  }, [areaSet, retry])

  function updateParams(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="content-padding mx-auto max-w-7xl">
        <PageHeader
          title="Accreditation"
          actions={<Button variant="outline" onClick={() => void logout()}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>}
        />
        <div className="mb-4">
          <Select value={areaSet} onValueChange={(value) => updateParams({ set: value, area: "" })}>
            <SelectTrigger className="w-48" aria-label="Accreditation set"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AACCUP">AACCUP</SelectItem>
              <SelectItem value="ISO">ISO 21001:2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedArea ? (
          <>
            <Button className="mb-4" variant="ghost" onClick={() => updateParams({ area: "" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to areas
            </Button>
            <ApprovedEvidenceList key={selectedArea.id} area={selectedArea} />
          </>
        ) : (
          <>
            <AccreditationScopeBrowser
              campuses={campuses}
              areas={areas}
              location={location}
              onChange={(next) => updateParams({ ...next, area: "" })}
              loading={!currentCatalog && !currentError}
              error={currentError}
              onRetry={() => setRetry((value) => value + 1)}
            />
            {currentCatalog && params.has("area") && <p role="status" className="mb-4 text-sm text-gray-500">This area is unavailable.</p>}
            {currentCatalog && showAreas && (
              <Card>
                <CardContent>
                  <h2 className="mb-3 text-lg font-semibold">Areas</h2>
                  {scopedAreas.length === 0 ? (
                    <p className="text-sm text-gray-500">No areas in this scope.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {scopedAreas.map((area) => (
                        <li key={area.id} className="py-2">
                          <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => updateParams({ area: area.id })}>
                            {accreditationAreaLabel(area)}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  )
}
