import { PDFDocument } from '@cantoo/pdf-lib'

export interface BlankPageResult {
  blankPageIndices: number[]
  totalPages: number
}

export async function detectBlankPages(
  file: File,
  threshold = 250,
): Promise<BlankPageResult> {
  // Dynamic import — pdfjs-dist uses DOMMatrix at eval time (not available in SSR)
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise
  const total = pdf.numPages
  const blank: number[] = []

  for (let i = 1; i <= total; i++) {
    const page     = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 0.2 })
    const canvas   = document.createElement('canvas')
    canvas.width   = Math.floor(viewport.width)
    canvas.height  = Math.floor(viewport.height)
    const ctx      = canvas.getContext('2d')!
    ctx.fillStyle  = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // pdfjs v5: BOTH canvas AND canvasContext required
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const data    = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let nonWhite  = 0
    const samples = Math.floor(data.length / 4 / 10)
    for (let px = 0; px < samples; px++) {
      const idx = px * 40
      const r = data[idx], g = data[idx+1], b = data[idx+2]
      if (r < threshold || g < threshold || b < threshold) {
        nonWhite++
        if (nonWhite > 5) break
      }
    }
    if (nonWhite <= 5) blank.push(i - 1)
    canvas.width = 0; canvas.height = 0
  }
  return { blankPageIndices: blank, totalPages: total }
}

export async function removeBlankPagesFromPDF(
  file: File,
  indicesToRemove: number[],
): Promise<Uint8Array> {
  const bytes  = await file.arrayBuffer()
  const src    = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
  const out    = await PDFDocument.create()
  const total  = src.getPageCount()
  const removeSet = new Set(indicesToRemove)
  const keepIndices = Array.from({ length: total }, (_, i) => i).filter(i => !removeSet.has(i))
  const pages = await out.copyPages(src, keepIndices)
  pages.forEach(p => out.addPage(p))
  return out.save()
}
