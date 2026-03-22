import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'

export interface FingerprintOptions {
  recipientId:  string
  invisible:    boolean
  visibleText?: string
}

export async function fingerprintPDF(
  file: File,
  opts: FingerprintOptions,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)
  const font  = await doc.embedFont(StandardFonts.Helvetica)

  const timestamp   = new Date().toISOString()
  const fingerprint = `DOCLAIR-FP:${opts.recipientId}:${timestamp}`

  // Embed in document metadata
  doc.setKeywords([fingerprint])

  if (opts.invisible) {
    doc.getPages().forEach(page => {
      const { width } = page.getSize()
      page.drawText(fingerprint, {
        x:       width / 2,
        y:       10,
        size:    6,
        font,
        color:   rgb(1, 1, 1),
        opacity: 0.005,
      })
    })
  } else if (opts.visibleText) {
    doc.getPages().forEach(page => {
      const { width, height } = page.getSize()
      page.drawText(opts.visibleText!, {
        x:       width / 2 - 100,
        y:       height / 2,
        size:    32,
        font,
        color:   rgb(0.9, 0.5, 0.05),
        opacity: 0.15,
      })
    })
  }

  return doc.save()
}
