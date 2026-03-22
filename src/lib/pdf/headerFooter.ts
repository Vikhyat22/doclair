import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'

export interface HeaderFooterSection {
  left:   string
  center: string
  right:  string
}

export interface HeaderFooterOptions {
  header:    HeaderFooterSection
  footer:    HeaderFooterSection
  fontSize:  number   // default 10
  color:     string   // hex default '#000000'
  margin:    number   // default 20pt
  skipFirst: boolean  // skip first page (title pages)
}

function resolveTokens(text: string, pageNum: number, totalPages: number): string {
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  return text
    .replace(/\{page\}/gi,  String(pageNum))
    .replace(/\{total\}/gi, String(totalPages))
    .replace(/\{date\}/gi,  date)
}

export async function addHeaderFooter(
  file: File,
  opts: HeaderFooterOptions,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)
  const pages = doc.getPages()
  const total = pages.length
  const font  = await doc.embedFont(StandardFonts.Helvetica)

  const hex = opts.color.replace('#', '')
  const r   = parseInt(hex.slice(0, 2), 16) / 255
  const g   = parseInt(hex.slice(2, 4), 16) / 255
  const b   = parseInt(hex.slice(4, 6), 16) / 255
  const color = rgb(r, g, b)

  pages.forEach((page, idx) => {
    if (opts.skipFirst && idx === 0) return
    const pageNum = idx + 1
    const { width, height } = page.getSize()
    const size = opts.fontSize

    const drawSection = (
      text: string,
      x: number,
      y: number,
      align: 'left' | 'center' | 'right',
    ) => {
      const resolved = resolveTokens(text, pageNum, total)
      if (!resolved.trim()) return
      const textW  = font.widthOfTextAtSize(resolved, size)
      let drawX    = x
      if (align === 'center') drawX = x - textW / 2
      if (align === 'right')  drawX = x - textW
      page.drawText(resolved, { x: drawX, y, size, font, color })
    }

    // Header row
    const headerY = height - opts.margin
    drawSection(opts.header.left,   opts.margin,            headerY, 'left')
    drawSection(opts.header.center, width / 2,              headerY, 'center')
    drawSection(opts.header.right,  width - opts.margin,    headerY, 'right')

    // Footer row
    const footerY = opts.margin
    drawSection(opts.footer.left,   opts.margin,            footerY, 'left')
    drawSection(opts.footer.center, width / 2,              footerY, 'center')
    drawSection(opts.footer.right,  width - opts.margin,    footerY, 'right')
  })

  return doc.save()
}
