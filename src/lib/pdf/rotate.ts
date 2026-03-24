import { PDFDocument, degrees } from '@cantoo/pdf-lib'

export type RotationAngle = 90 | 180 | 270

export async function rotatePDF(
  file:         File,
  angle:        RotationAngle,
  pageIndices?: number[]  // undefined = all pages
): Promise<Uint8Array> {
  const bytes  = await file.arrayBuffer()
  const doc    = await PDFDocument.load(bytes)
  const pages  = doc.getPages()
  const targets = pageIndices ?? pages.map((_, i) => i)

  targets.forEach(i => {
    if (i < 0 || i >= pages.length) return
    const current = pages[i].getRotation().angle
    pages[i].setRotation(degrees((current + angle) % 360))
  })

  return doc.save()
}
