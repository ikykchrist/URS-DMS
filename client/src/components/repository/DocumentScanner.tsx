import { useEffect, useRef, useState } from "react"
import { Camera, Check, ChevronLeft, Loader2, Trash2, X } from "lucide-react"
import { PDFDocument, rgb } from "pdf-lib"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { toast } from "@/lib/toast"
import { uploadOnlineDocumentWithProgress } from "@/services/documents"

interface ScanPage {
  id: number
  blob: Blob
  url: string
}

interface DocumentScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded?: () => void
}

interface OcrWord {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

async function createPdf(pages: ScanPage[], title: string, onProgress?: (fraction: number) => void): Promise<File> {
  const pdf = await PDFDocument.create()
  const { createWorker } = await import("tesseract.js")
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null
  try { worker = await createWorker("eng") } catch { /* PDF creation remains available without OCR */ }
  try {
    for (const [index, page] of pages.entries()) {
      const bytes = new Uint8Array(await page.blob.arrayBuffer())
      const image = await pdf.embedJpg(bytes)
      const scale = Math.min(1, 1600 / image.width)
      const width = image.width * scale
      const height = image.height * scale
      const pdfPage = pdf.addPage([width, height])
      pdfPage.drawImage(image, { x: 0, y: 0, width, height })
      let words: OcrWord[] = []
      if (worker) {
        try {
          const ocr = await worker.recognize(page.blob, {}, { hocr: true })
          words = (ocr.data as unknown as { words?: OcrWord[] }).words ?? []
        } catch {
          await worker.terminate()
          worker = null
        }
      }
      for (const word of words) {
        const text = word.text.trim()
        if (!text) continue
        pdfPage.drawText(text, {
          x: word.bbox.x0 * scale,
          y: height - word.bbox.y1 * scale,
          size: Math.max(4, (word.bbox.y1 - word.bbox.y0) * scale),
          color: rgb(1, 1, 1),
          opacity: 0.01,
        })
      }
      onProgress?.(((index + 1) / pages.length) * 0.6)
    }
  } finally {
    if (worker) await worker.terminate()
  }
  const bytes = await pdf.save()
  const safeTitle = title.trim().replace(/[\\/:*?"<>|]+/g, "-") || "Scanned Document"
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return new File([buffer], `${safeTitle}.pdf`, { type: "application/pdf" })
}

export function DocumentScanner({ open, onOpenChange, onUploaded }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [pages, setPages] = useState<ScanPage[]>([])
  const [title, setTitle] = useState("")
  const [phase, setPhase] = useState<"camera" | "review" | "uploading">("camera")
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const clearPages = () => {
    pages.forEach((page) => URL.revokeObjectURL(page.url))
    setPages([])
  }

  const close = () => {
    stopCamera()
    clearPages()
    setTitle("")
    setPhase("camera")
    setError("")
    setProgress(0)
    onOpenChange(false)
  }

  useEffect(() => {
    if (!open) return
    setError("")
    setPhase("camera")
    setPages([])
    setTitle("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning is not supported by this browser. Please use a recent mobile Chrome or Safari.")
      return
    }
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 2560 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      })
      .catch(() => setError("Camera permission is required. Allow camera access and try again."))
    return () => { cancelled = true; stopCamera() }
  }, [open])

  const capturePage = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    const maxWidth = 1800
    const scale = Math.min(1, maxWidth / video.videoWidth)
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext("2d")
    if (!context) return
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const page = { id: Date.now(), blob, url: URL.createObjectURL(blob) }
      setPages((current) => [...current, page])
    }, "image/jpeg", 0.88)
  }

  const removePage = (id: number) => {
    setPages((current) => {
      const page = current.find((item) => item.id === id)
      if (page) URL.revokeObjectURL(page.url)
      return current.filter((item) => item.id !== id)
    })
  }

  const upload = async () => {
    if (!pages.length || !title.trim()) return
    setPhase("uploading")
    setError("")
    try {
      const file = await createPdf(pages, title, (fraction) => setProgress(fraction))
      await uploadOnlineDocumentWithProgress({
        title: title.trim(),
        file,
        classification: "INTERNAL",
        metadata: { scanned: true, scanPageCount: pages.length },
        changeNote: "Phone document scan",
      }, (fraction) => setProgress(0.6 + fraction * 0.4))
      toast.success("Scanned document saved to your repository")
      onUploaded?.()
      close()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to save the scanned document")
      setPhase("review")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none bg-slate-950 p-0 text-white sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-white/10 px-4 py-3 text-left sm:px-5">
          <div><DialogTitle className="text-white">Scan Documents</DialogTitle><DialogDescription className="text-slate-400">Capture one page at a time, then save everything as one PDF.</DialogDescription></div>
          <Button type="button" variant="ghost" size="icon" onClick={close} className="text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Close scanner"><X className="h-5 w-5" /></Button>
        </DialogHeader>

        {phase === "camera" ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
              <video ref={videoRef} className="h-full w-full object-contain" playsInline muted />
              <div className="pointer-events-none absolute inset-5 rounded-xl border-2 border-dashed border-white/60 sm:inset-12" />
              <div className="absolute left-0 right-0 top-3 text-center text-xs text-white/80">Page {pages.length + 1} · Keep the document inside the frame</div>
              {error && <div className="absolute left-4 right-4 top-12 rounded-lg bg-red-950/90 p-3 text-center text-sm text-red-200">{error}</div>}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-950 px-4 py-4 pb-6 sm:pb-4">
              <Button type="button" variant="ghost" onClick={() => pages.length ? setPhase("review") : close()} className="text-slate-300 hover:bg-white/10 hover:text-white">{pages.length ? "Review" : "Cancel"}</Button>
              <button type="button" onClick={capturePage} disabled={Boolean(error)} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white text-slate-900 shadow-xl transition-transform active:scale-90 disabled:opacity-40" aria-label="Capture page"><Camera className="h-7 w-7" /></button>
              <span className="w-16 text-right text-xs text-slate-400">{pages.length} page{pages.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        ) : phase === "review" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 p-4 text-slate-900 sm:p-6">
            <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Review scan</h3><p className="text-xs text-slate-500">{pages.length} page{pages.length === 1 ? "" : "s"} ready</p></div><Button type="button" variant="outline" size="sm" onClick={() => setPhase("camera")}><ChevronLeft className="mr-1 h-4 w-4" />Add page</Button></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {pages.map((page, index) => <div key={page.id} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft"><img src={page.url} alt={`Scanned page ${index + 1}`} className="aspect-[3/4] w-full object-cover" /><span className="absolute left-1.5 top-1.5 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] text-white">Page {index + 1}</span><button type="button" onClick={() => removePage(page.id)} className="absolute right-1.5 top-1.5 rounded bg-red-600 p-1.5 text-white" aria-label={`Remove page ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}
            </div>
            {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <div className="mt-6 space-y-2"><Label htmlFor="scan-title">Document name</Label><Input id="scan-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Faculty Evaluation Form" className="h-11 bg-white" /></div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="button" onClick={() => void upload()} disabled={!pages.length || !title.trim()}><Check className="mr-2 h-4 w-4" />Save as PDF</Button></div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center text-slate-900"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /><p className="font-medium">{progress < 0.6 ? "Reading text with OCR..." : "Saving scanned document..."}</p><div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div><p className="text-xs text-slate-500">{Math.round(progress * 100)}%</p><Button type="button" variant="outline" onClick={close}>Cancel</Button></div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
