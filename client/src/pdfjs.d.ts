declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export function getDocument(options: { data: ArrayBuffer; disableWorker?: boolean }): {
    promise: Promise<{
      numPages: number
      getPage(pageNumber: number): Promise<{
        getViewport(options: { scale: number }): { width: number; height: number }
        render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> }
      }>
    }>
  }
}
