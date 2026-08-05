// =============================================================================
// Upload activity bus — a tiny module-level counter + subscribers so ANY
// surface (logout, sidebar navigation) can warn while uploads are active
// (rule 6: warning before refresh, closing, navigation or logout).
// =============================================================================

let activeCount = 0
const listeners = new Set<(active: boolean) => void>()

export function registerUpload(): () => void {
  activeCount += 1
  notify()
  let done = false
  return () => {
    if (done) return
    done = true
    activeCount = Math.max(0, activeCount - 1)
    notify()
  }
}

export function hasActiveUploads(): boolean {
  return activeCount > 0
}

export function onUploadActivity(listener: (active: boolean) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  const active = activeCount > 0
  for (const listener of listeners) listener(active)
}

/** Returns true when it is safe to navigate (no active uploads, or confirmed). */
export function confirmLeaveIfUploading(): boolean {
  if (!hasActiveUploads()) return true
  return window.confirm("Uploads are still in progress. Leave anyway?")
}
