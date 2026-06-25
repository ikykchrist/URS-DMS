import { useState } from "react"
import { Download, Calendar, FileText, Filter } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"

interface ExportLogsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport?: (options: { dateFrom: string; dateTo: string; format: string; exportType: string; includeHeaders: boolean }) => void
}

export function ExportLogsModal({ open, onOpenChange, onExport }: ExportLogsModalProps) {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [format, setFormat] = useState("csv")
  const [exportType, setExportType] = useState("all")
  const [includeHeaders, setIncludeHeaders] = useState(true)

  const handleExport = () => {
    onExport?.({ dateFrom, dateTo, format, exportType, includeHeaders })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Logs
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Export audit logs with your preferred settings
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-[11px] text-gray-500">From</Label>
                <Input type="date" className="h-10 text-[14px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] text-gray-500">To</Label>
                <Input type="date" className="h-10 text-[14px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              File Format
            </Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated)</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-gray-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Export Type
            </Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logs</SelectItem>
                <SelectItem value="success">Successful Actions Only</SelectItem>
                <SelectItem value="warning">Warnings Only</SelectItem>
                <SelectItem value="failed">Failed Actions Only</SelectItem>
                <SelectItem value="auth">Authentication Events</SelectItem>
                <SelectItem value="data">Data Modifications</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-700">Include Column Headers</p>
                <p className="text-[12px] text-gray-500 mt-0.5">Add headers to exported file</p>
              </div>
              <div className="relative inline-block w-11 h-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="peer sr-only"
                  id="includeHeaders"
                />
                <label
                  htmlFor="includeHeaders"
                  className="absolute inset-0 bg-gray-200 peer-checked:bg-primary rounded-full transition-colors cursor-pointer"
                />
                <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="h-10 px-5 shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
