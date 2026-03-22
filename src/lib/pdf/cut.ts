import { PDFDocument } from '@cantoo/pdf-lib'

export type CutDirection = 'horizontal' | 'vertical'

export async function cutPDF(file: File, direction: CutDirection): Promise<Uint8Array> {
  const bytes  = await file.arrayBuffer()
  const src    = await PDFDocument.load(bytes)
  const out    = await PDFDocument.create()
  const pages  = src.getPages()

  for (let i = 0; i < pages.length; i++) {
    const srcPage            = pages[i]
    const { width, height } = srcPage.getSize()

    if (direction === 'horizontal') {
      // Top half
      const [top] = await out.copyPages(src, [i])
      top.setCropBox(0, height / 2, width, height / 2)
      out.addPage(top)
      // Bottom half
      const [bottom] = await out.copyPages(src, [i])
      bottom.setCropBox(0, 0, width, height / 2)
      out.addPage(bottom)
    } else {
      // Left half
      const [left] = await out.copyPages(src, [i])
      left.setCropBox(0, 0, width / 2, height)
      out.addPage(left)
      // Right half
      const [right] = await out.copyPages(src, [i])
      right.setCropBox(width / 2, 0, width / 2, height)
      out.addPage(right)
    }
  }

  return out.save()
}
