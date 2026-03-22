import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'

export interface TextToPdfOptions {
  fontSize:   number
  fontFamily: 'monospace' | 'serif' | 'sans'
  lineHeight: number
  margin:     number
  pageSize:   'a4' | 'letter'
}

export async function textToPDF(
  text: string,
  opts: TextToPdfOptions = {
    fontSize: 12, fontFamily: 'sans',
    lineHeight: 1.5, margin: 50, pageSize: 'a4',
  },
): Promise<Uint8Array> {
  const doc  = await PDFDocument.create()
  const font = await doc.embedFont(
    opts.fontFamily === 'monospace'
      ? StandardFonts.Courier
      : opts.fontFamily === 'serif'
        ? StandardFonts.TimesRoman
        : StandardFonts.Helvetica,
  )

  const [pageW, pageH] = opts.pageSize === 'a4'
    ? [595.28, 841.89] : [612, 792]
  const maxW   = pageW - opts.margin * 2
  const lineH  = opts.fontSize * opts.lineHeight
  const lines: string[] = []

  // Word-wrap each paragraph
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue }
    const words = para.split(' ')
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(test, opts.fontSize) > maxW) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }

  let page = doc.addPage([pageW, pageH])
  let y    = pageH - opts.margin

  for (const line of lines) {
    if (y < opts.margin + lineH) {
      page = doc.addPage([pageW, pageH])
      y    = pageH - opts.margin
    }
    if (line) {
      page.drawText(line, {
        x: opts.margin, y,
        size: opts.fontSize, font,
        color: rgb(0.1, 0.08, 0.07),
      })
    }
    y -= lineH
  }

  return doc.save()
}
