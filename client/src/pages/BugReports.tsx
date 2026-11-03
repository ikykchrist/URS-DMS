import { useEffect, useState } from "react"
import { Paperclip, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { BugReportForm } from "@/components/bugReports/BugReportForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { downloadBugReportAttachment, listBugReports, type BugReport } from "@/services/bugReports"
import { toastStore } from "@/lib/toast"

export default function BugReports() {
  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setReports((await listBugReports()).items)
    } catch (error) {
      toastStore.error(error instanceof Error ? error.message : "Unable to load bug reports.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="content-padding">
      <PageHeader title="Bug Reports" description="Review issues submitted by users and administrators." actions={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <BugReportForm />
        <Card>
          <CardHeader className="pb-4"><CardTitle>Submitted reports</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Reporter</TableHead><TableHead>Tab</TableHead><TableHead>Issue</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-gray-500">Loading reports…</TableCell></TableRow> : reports.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-gray-500">No bug reports submitted yet.</TableCell></TableRow> : reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell><p className="font-medium text-gray-900">{report.reporter.firstName} {report.reporter.lastName}</p><p className="text-[12px] text-gray-500">{report.reporter.email}</p></TableCell>
                    <TableCell>{report.tab}</TableCell>
                    <TableCell className="max-w-sm whitespace-pre-wrap">{report.description}
                      {report.attachmentKey && <button type="button" className="mt-2 flex max-w-full items-center gap-1 text-left text-xs text-primary hover:underline" onClick={() => void downloadBugReportAttachment(report.id).catch((error: unknown) => toastStore.error(error instanceof Error ? error.message : "Unable to download attachment."))}><Paperclip className="h-3 w-3 shrink-0" /><span className="truncate">{report.attachmentName ?? "Attachment"}</span></button>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(report.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
