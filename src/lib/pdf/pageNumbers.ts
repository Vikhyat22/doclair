import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right'

export type PageNumberFormat =
  | 'n'          // 1, 2, 3
  | 'n-of-total' // 1 of 12
  | 'page-n'     // Page 1
  | 'page-n-of-total' // Page 1 of 12

export interface PageNumberOptions {
  position:   PageNumberPosition
  format:     PageNumberFormat
  startAt:    number     // page number to start counting from (default 1)
  fontSize:   number     // default 11
  margin:     number     // distance from edge in points (default 28)
  skipFirst:  boolean    // skip adding number to page 1 (e.g. cover page)
  pageRange?: string     // optional: "1-5,8,10-12" — if omitted, all pages
}

function formatPageNumber(
  current:  number,
  total:    number,
  format:   PageNumberFormat,
): string {
  switch (format) {
    case 'n':               return `${current}`
    case 'n-of-total':      return `${current} of ${total}`
    case 'page-n':          return `Page ${current}`
    case 'page-n-of-total': return `Page ${current} of ${total}`
    default:                return `${current}`
  }
}

function parseRange(rangeStr: string, total: number): Set<number> {
  const indices = new Set<number>()
  for (const part of rangeStr.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.includes('-')) {
      const [a, b] = trimmed.split('-').map(Number)
      for (let i = a; i <= Math.min(b, total); i++) indices.add(i)
    } else {
      const n = Number(trimmed)
      if (n >= 1 && n <= total) indices.add(n)
    }
  }
  return indices
}

export async function pageNumbersPDF(
  file:    File,
  options: PageNumberOptions,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)
  const font  = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length

  const activePages: Set<number> = options.pageRange
    ? parseRange(options.pageRange, total)
    : new Set(Array.from({ length: total }, (_, i) => i + 1))

  let counter = options.startAt

  for (let idx = 0; idx < total; idx++) {
    const pageNum1 = idx + 1
    if (options.skipFirst && pageNum1 === 1) {
      counter++
      continue
    }
    if (!activePages.has(pageNum1)) {
      counter++
      continue
    }

    const page   = pages[idx]
    const { width, height } = page.getSize()
    const text   = formatPageNumber(counter, total, options.format)
    const size   = options.fontSize
    const margin = options.margin
    const textW  = font.widthOfTextAtSize(text, size)

    let x: number
    let y: number

    switch (options.position) {
      case 'bottom-center': x = (width - textW) / 2; y = margin; break
      case 'bottom-left':   x = margin;               y = margin; break
      case 'bottom-right':  x = width - textW - margin; y = margin; break
      case 'top-center':    x = (width - textW) / 2; y = height - margin - size; break
      case 'top-left':      x = margin;               y = height - margin - size; break
      case 'top-right':     x = width - textW - margin; y = height - margin - size; break
      default:              x = (width - textW) / 2; y = margin
    }

    page.drawText(text, {
      x, y, size,
      font,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.85,
    })

    counter++
  }

  return doc.save()
}
