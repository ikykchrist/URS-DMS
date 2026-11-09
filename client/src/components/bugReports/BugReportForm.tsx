import { useRef, useState, type FormEvent } from "react"
import { Bug, Paperclip, Send, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/Textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { toastStore } from "@/lib/toast"
import { BUG_REPORT_TABS, createBugReport, uploadBugReportAttachment, type ReportAttachment } from "@/services/bugReports"

export function BugReportForm() {
  const [tab, setTab] = useState<string>("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploaded, setUploaded] = useState<ReportAttachment | undefined>()
  const fileInput = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tab || description.trim().length < 10) {
      toastStore.error("Choose a tab and describe the issue in at least 10 characters.")
      return
    }
    setSubmitting(true)
    try {
      const attachment = file ? uploaded ?? await uploadBugReportAttachment(file) : undefined
      setUploaded(attachment)
      await createBugReport({ tab, description: description.trim(), attachment })
      setTab("")
      setDescription("")
      setFile(null)
      setUploaded(undefined)
      if (fileInput.current) fileInput.current.value = ""
      toastStore.success("Bug report submitted. Thank you.")
    } catch (error) {
      toastStore.error(error instanceof Error ? error.message : "Unable to submit bug report.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2"><Bug className="h-4 w-4 text-primary" />Report an issue</CardTitle>
        <p className="text-[13px] text-gray-500">Select the affected page and describe what happened so the team can investigate.</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="bug-tab">Affected tab</Label>
            <Select value={tab} onValueChange={setTab}>
              <SelectTrigger id="bug-tab"><SelectValue placeholder="Select a tab" /></SelectTrigger>
              <SelectContent>{BUG_REPORT_TABS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bug-description">What problem did you encounter?</Label>
            <Textarea id="bug-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the steps you took, what happened, and what you expected instead." maxLength={2000} className="min-h-[150px]" />
            <p className="text-right text-[12px] text-gray-400">{description.length}/2000</p>
          </div>
          {file && <div className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" aria-live="polite">
            <Paperclip className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
            <span className="shrink-0 text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove attachment" disabled={submitting} onClick={() => {
              setFile(null); setUploaded(undefined)
              if (fileInput.current) fileInput.current.value = ""
            }}><X className="h-4 w-4" /></Button>
          </div>}
          <div className="flex flex-wrap justify-end gap-2">
            <input ref={fileInput} type="file" aria-label="Report attachment" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" disabled={submitting} onChange={(event) => {
              const selected = event.target.files?.[0]
              if (!selected) return
              if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(selected.type) || selected.size === 0 || selected.size > 5 * 1024 * 1024) {
                toastStore.error("Choose a PNG, JPG, WebP or PDF up to 5 MB.")
                event.target.value = ""
                return
              }
              setFile(selected); setUploaded(undefined)
            }} />
            <Button type="button" variant="outline" disabled={submitting} onClick={() => fileInput.current?.click()} title="PNG, JPG, WebP or PDF, up to 5 MB"><Paperclip className="mr-2 h-4 w-4" />{file ? "Change attachment" : "Attach file"}</Button>
            <Button type="submit" disabled={submitting}><Send className="mr-2 h-4 w-4" />{submitting ? "Submitting…" : "Submit report"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
