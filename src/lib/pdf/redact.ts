import { PDFDocument } from '@cantoo/pdf-lib'

export interface RedactionBox {
  page:   number   // 0-indexed
  x:      number   // fraction of page width  0–1
  y:      number   // fraction of page height 0–1
  width:  number   // fraction of page width
  height: number   // fraction of page height
}

async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  return pdfjsLib
}

/**
 * True redaction: re-render every page to a canvas, draw solid black
 * rectangles over the redaction boxes, then embed the result as a new
 * PNG image page.  The original text/vector data is permanently destroyed.
 */
export async function redactPDF(
  file:        File,
  boxes:       RedactionBox[],
  onProgress?: (page: number, total: number) => void,
): Promise<Uint8Array> {
  const pdfjsLib = await getPdfJs()

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data:            bytes,
    cMapUrl:         `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked:      true,
    useWorkerFetch:  false,
    isEvalSupported: false,
  }).promise

  const total  = pdf.numPages
  const outDoc = await PDFDocument.create()

  for (let i = 1; i <= total; i++) {
    onProgress?.(i - 1, total)

    const page     = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })  // ~144 DPI

    const canvas   = document.createElement('canvas')
    canvas.width   = viewport.width
    canvas.height  = viewport.height
    const ctx      = canvas.getContext('2d')!

    // pdfjs v5: BOTH canvas AND canvasContext required in RenderParameters
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      intent: 'print',
    }).promise

    // Draw solid black redaction boxes — permanently destroys underlying pixels
    const pageBoxes = boxes.filter(b => b.page === i - 1)
    if (pageBoxes.length > 0) {
      ctx.fillStyle = '#000000'
      for (const box of pageBoxes) {
        ctx.fillRect(
          box.x      * canvas.width,
          box.y      * canvas.height,
          box.width  * canvas.width,
          box.height * canvas.height,
        )
      }
    }

    // Convert canvas to PNG blob
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(
        b => b ? res(b) : rej(new Error('toBlob failed')),
        'image/png',
      )
    )

    // Embed PNG as new page — original text data is gone
    const imgBytes = await blob.arrayBuffer()
    const img      = await outDoc.embedPng(imgBytes)

    // Output at half the canvas resolution (rendered at 2x for quality)
    const outW    = viewport.width  / 2
    const outH    = viewport.height / 2
    const newPage = outDoc.addPage([outW, outH])
    newPage.drawImage(img, { x: 0, y: 0, width: outW, height: outH })

    // Release GPU memory
    canvas.width  = 0
    canvas.height = 0

    onProgress?.(i, total)
  }

  return outDoc.save()
}

/**
 * Find all occurrences of searchText in PDF text content and return
 * their bounding boxes as fraction coordinates (0–1 each axis).
 */
export async function findTextInPDF(
  file:       File,
  searchText: string,
): Promise<RedactionBox[]> {
  const pdfjsLib = await getPdfJs()

  const bytes  = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({
    data:            bytes,
    useWorkerFetch:  false,
    isEvalSupported: false,
  }).promise

  const total  = pdf.numPages
  const boxes: RedactionBox[] = []
  const search = searchText.toLowerCase().trim()
  if (!search) return boxes

  for (let i = 1; i <= total; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const vp      = page.getViewport({ scale: 1 })

    for (const item of content.items) {
      if (!('str' in item)) continue
      if (!item.str.toLowerCase().includes(search)) continue

      const t = (item as { transform: number[] }).transform
      const w = (item as { width?: number }).width ?? search.length * 6
      const h = (item as { height?: number }).height ?? 12

      boxes.push({
        page:   i - 1,
        x:      t[4]          / vp.width,
        y:      1 - (t[5] + h) / vp.height,
        width:  (w + 4)       / vp.width,
        height: (h + 4)       / vp.height,
      })
    }
  }

  return boxes
}
