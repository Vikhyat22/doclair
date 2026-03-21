import { PDFDocument } from 'pdf-lib'

const QUALITY_SETTINGS = {
  light:  { scale: 1.5, jpegQuality: 0.85 },
  medium: { scale: 1.2, jpegQuality: 0.70 },
  heavy:  { scale: 0.9, jpegQuality: 0.50 },
}

export async function compressPDF(
  file: File,
  quality: 'light' | 'medium' | 'heavy',
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  // Dynamic import keeps pdfjs-dist out of the SSR bundle (DOMMatrix etc. are browser-only)
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const settings = QUALITY_SETTINGS[quality]
  const bytes = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
  const totalPages = pdf.numPages
  const newDoc = await PDFDocument.create()

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(i, totalPages)

    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: settings.scale })

    const canvas = document.createElement('canvas')
    canvas.width  = viewport.width
    canvas.height = viewport.height

    await page.render({ canvas, viewport }).promise

    const blob = await new Promise<Blob>(resolve =>
      canvas.toBlob(b => resolve(b!), 'image/jpeg', settings.jpegQuality)
    )
    const imgBytes = await blob.arrayBuffer()
    const jpgImage = await newDoc.embedJpg(imgBytes)

    const newPage = newDoc.addPage([viewport.width, viewport.height])
    newPage.drawImage(jpgImage, {
      x: 0, y: 0,
      width:  viewport.width,
      height: viewport.height,
    })
  }

  return newDoc.save()
}
