import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { unsubmitOnlineSubmission } from "@/services/aaccup"
import { toast } from "@/lib/toast"

export function UnsubmitEvidenceButton({ submission, onSuccess }: {
  submission: { id: string; status: string }
  onSuccess: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  if (submission.status !== "PENDING" && submission.status !== "NEEDS_REVISION") return null
  async function unsubmit() {
    if (busy) return
    setBusy(true)
    try {
      await unsubmitOnlineSubmission(submission.id)
      setOpen(false)
      toast.success("Evidence unsubmitted. Your file remains in My Documents.")
      await onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to unsubmit evidence")
      await onSuccess()
    } finally { setBusy(false) }
  }
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Unsubmit</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Unsubmit this evidence?</DialogTitle><DialogDescription>This removes it from the review queue. Your file stays in My Documents, and you can submit it again. Approved evidence cannot be unsubmitted.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={() => void unsubmit()}>{busy ? "Unsubmitting…" : "Unsubmit evidence"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
