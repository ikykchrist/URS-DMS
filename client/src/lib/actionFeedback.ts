import { toast } from "@/lib/toast"

/** Finish the batch before reporting; skipped rows never count as successes. */
export async function runBulkAction(
  ids: Iterable<string>,
  action: (id: string) => Promise<boolean>,
  completedMessage: string,
): Promise<void> {
  let completed = 0
  let failed = 0
  let skipped = 0
  for (const id of ids) {
    try {
      if (await action(id)) completed++
      else skipped++
    } catch { failed++ }
  }
  if (completed) toast.success(`${completed} ${completedMessage}`)
  if (failed) toast.error(`${failed} item(s) failed. Refresh and retry those items.`)
  if (skipped) toast.info(`${skipped} item(s) skipped because they are no longer eligible.`)
}
