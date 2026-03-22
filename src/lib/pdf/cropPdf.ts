import { PDFDocument } from '@cantoo/pdf-lib'

export interface CropOptions {
  top:    number  // points to remove from top
  right:  number
  bottom: number
  left:   number
}

export async function cropPDF(file: File, crop: CropOptions): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)

  doc.getPages().forEach(page => {
    const { width, height } = page.getSize()
    page.setCropBox(
      crop.left,
      crop.bottom,
      width  - crop.left - crop.right,
      height - crop.top  - crop.bottom,
    )
  })

  return doc.save()
}
