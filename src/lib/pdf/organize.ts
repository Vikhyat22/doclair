import { PDFDocument, degrees } from '@cantoo/pdf-lib'

export interface PageOp {
  originalIndex:   number
  currentRotation: number   // accumulated 0–359°
  deleted:         boolean
  duplicated:      boolean  // true if this is a copy
  duplicateOf?:    number   // originalIndex of source
}

export async function organizePDF(
  file: File,
  ops:  PageOp[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const src   = await PDFDocument.load(bytes)
  const out   = await PDFDocument.create()

  const activeOps = ops.filter(op => !op.deleted)

  for (const op of activeOps) {
    const [page] = await out.copyPages(src, [op.originalIndex])
    if (op.currentRotation !== 0) {
      const current = page.getRotation().angle
      page.setRotation(degrees((current + op.currentRotation) % 360))
    }
    out.addPage(page)
  }

  return out.save()
}
