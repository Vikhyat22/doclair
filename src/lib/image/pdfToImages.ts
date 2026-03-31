export type ImageFormat = 'jpg' | 'png' | 'webp'
export type ImageDPI    = 72 | 150 | 300 | 600

export interface ImageResult {
  filename:  string
  blob:      Blob
  pageNum:   number
  width:     number
  height:    number
  sizeBytes: number
}

function sanitizeSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'document'
}

export function getPdfImageBaseName(filename: string): string {
  return sanitizeSegment(filename)
}

export function getPdfImageArchiveName(
  filename: string,
  format: string,
  dpi: number
): string {
  return `${getPdfImageBaseName(filename)}-${format}-${dpi}dpi.zip`
}

export async function pdfToImages(
  file:        File,
  format:      ImageFormat,
  dpi:         ImageDPI,
  onProgress?: (current: number, total: number) => void
): Promise<ImageResult[]> {
  // Dynamic import — avoids SSR crash (pdfjs uses DOMMatrix at module eval time)
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data:            bytes,
    cMapUrl:         `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked:      true,
    useWorkerFetch:  false,
    isEvalSupported: false,
  }).promise

  const total  = pdf.numPages
  const scale  = dpi / 72
  const digits = Math.max(String(total).length, 2)
  const baseName = getPdfImageBaseName(file.name)
  const results: ImageResult[] = []

  const mimeType =
    format === 'jpg'  ? 'image/jpeg' :
    format === 'png'  ? 'image/png'  :
    'image/webp'

  const quality =
    format === 'jpg'  ? 0.92 :
    format === 'webp' ? 0.90 :
    undefined  // PNG is lossless — no quality param

  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total)

    const page     = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas  = document.createElement('canvas')
    canvas.width  = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    const ctx = canvas.getContext('2d', {
      alpha:              format === 'png',
      willReadFrequently: false,
    })!

    // White background for JPG and WebP (PDF background is transparent by default)
    if (format !== 'png') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // intent:'print' — maximum quality rendering (full-res fonts, antialiasing)
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      intent: 'print',
    }).promise

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('toBlob failed')),
        mimeType,
        quality
      )
    )

    results.push({
      filename:  `${baseName}-page-${String(i).padStart(digits, '0')}.${format}`,
      blob,
      pageNum:   i,
      width:     canvas.width,
      height:    canvas.height,
      sizeBytes: blob.size,
    })

    // CRITICAL: Release canvas memory after each page.
    // Without this, a 50-page 300 DPI PDF will exhaust GPU memory and crash the tab.
    canvas.width  = 0
    canvas.height = 0
  }

  return results
}

export async function imagesToZip(results: ImageResult[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip   = new JSZip()
  for (const r of results) {
    zip.file(r.filename, r.blob)
  }
  // STORE — images are already compressed, DEFLATE adds latency with no size benefit
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
