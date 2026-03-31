import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from '@cantoo/pdf-lib'

export interface TextToPdfOptions {
  fontSize:   number
  fontFamily: 'monospace' | 'serif' | 'sans'
  lineHeight: number
  margin:     number
  pageSize:   'a4' | 'letter'
}

type Block =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; bullet: string; text: string }
  | { kind: 'spacer'; lines: number }

function wrapLongToken(token: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const parts: string[] = []
  let current = ''

  for (const char of token) {
    const candidate = current + char
    if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      parts.push(current)
      current = char
      continue
    }
    current = candidate
  }

  if (current) parts.push(current)
  return parts
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number) {
  if (!text) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of text.split(/\s+/)) {
    if (!word) continue

    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      if (current) {
        lines.push(current)
        current = ''
      }
      lines.push(...wrapLongToken(word, maxWidth, font, fontSize))
      continue
    }

    const candidate = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

function isLikelyTitle(line: string) {
  if (line.length > 80 || line.length < 5) return false
  if (/[.!?]$/.test(line)) return false
  return line.split(/\s+/).length <= 8
}

function isLikelyHeading(line: string) {
  if (line.length > 70 || line.length < 3) return false
  if (/[.!?]$/.test(line)) return false
  if (line.endsWith(':')) return true
  if (/^[A-Z0-9\s/-]+$/.test(line)) return true
  const words = line.split(/\s+/)
  return words.length <= 6 && words.every(word => /^[A-Z][a-z0-9'-]*$/.test(word))
}

function parseBlocks(text: string, monospaceMode: boolean): Block[] {
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let titleUsed = false

  rawLines.forEach((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      const previous = blocks.at(-1)
      if (previous?.kind !== 'spacer') blocks.push({ kind: 'spacer', lines: 1 })
      return
    }

    const listMatch = trimmed.match(/^([-*•]|\d+[.)])\s+(.*)$/)
    if (listMatch) {
      blocks.push({ kind: 'list', bullet: listMatch[1], text: listMatch[2] })
      return
    }

    if (!monospaceMode && !titleUsed && index < 3 && isLikelyTitle(trimmed)) {
      blocks.push({ kind: 'title', text: trimmed })
      titleUsed = true
      return
    }

    if (!monospaceMode && isLikelyHeading(trimmed)) {
      blocks.push({ kind: 'heading', text: trimmed.replace(/:$/, '') })
      return
    }

    blocks.push({ kind: 'paragraph', text: monospaceMode ? line : trimmed })
  })

  return blocks
}

function getPageSize(pageSize: TextToPdfOptions['pageSize']) {
  return pageSize === 'a4' ? [595.28, 841.89] : [612, 792]
}

export async function textToPDF(
  text: string,
  opts: TextToPdfOptions = {
    fontSize: 12, fontFamily: 'sans',
    lineHeight: 1.5, margin: 50, pageSize: 'a4',
  },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regularFont = await doc.embedFont(
    opts.fontFamily === 'monospace'
      ? StandardFonts.Courier
      : opts.fontFamily === 'serif'
        ? StandardFonts.TimesRoman
        : StandardFonts.Helvetica,
  )
  const boldFont = await doc.embedFont(
    opts.fontFamily === 'monospace'
      ? StandardFonts.CourierBold
      : opts.fontFamily === 'serif'
        ? StandardFonts.TimesRomanBold
        : StandardFonts.HelveticaBold,
  )

  const [pageW, pageH] = getPageSize(opts.pageSize)
  const maxW = pageW - (opts.margin * 2)
  const baseLineH = opts.fontSize * opts.lineHeight
  const blocks = parseBlocks(text, opts.fontFamily === 'monospace')
  const pages: PDFPage[] = []

  let page = doc.addPage([pageW, pageH])
  pages.push(page)
  let y = pageH - opts.margin

  const ensureSpace = (requiredHeight: number) => {
    if (y - requiredHeight >= opts.margin) return
    page = doc.addPage([pageW, pageH])
    pages.push(page)
    y = pageH - opts.margin
  }

  const drawLine = (
    line: string,
    x: number,
    size: number,
    font: PDFFont,
    color = rgb(0.1, 0.08, 0.07),
  ) => {
    page.drawText(line, {
      x,
      y,
      size,
      font,
      color,
      maxWidth: pageW - x - opts.margin,
    })
    y -= size * opts.lineHeight
  }

  for (const block of blocks) {
    if (block.kind === 'spacer') {
      y -= baseLineH * 0.45 * block.lines
      continue
    }

    if (block.kind === 'title') {
      const titleSize = Math.max(opts.fontSize + 8, opts.fontSize * 1.8)
      const lines = wrapText(block.text, maxW, boldFont, titleSize)
      ensureSpace(lines.length * titleSize * 1.15 + baseLineH * 0.35)
      lines.forEach(line => {
        const lineWidth = boldFont.widthOfTextAtSize(line, titleSize)
        drawLine(line, opts.margin + ((maxW - lineWidth) / 2), titleSize, boldFont)
      })
      y -= baseLineH * 0.2
      continue
    }

    if (block.kind === 'heading') {
      const headingSize = Math.max(opts.fontSize + 2, opts.fontSize * 1.22)
      const lines = wrapText(block.text, maxW, boldFont, headingSize)
      ensureSpace(lines.length * headingSize * 1.15 + baseLineH * 0.35)
      lines.forEach(line => drawLine(line, opts.margin, headingSize, boldFont))
      page.drawLine({
        start: { x: opts.margin, y: y + 4 },
        end: { x: pageW - opts.margin, y: y + 4 },
        thickness: 0.5,
        color: rgb(0.88, 0.85, 0.8),
      })
      y -= baseLineH * 0.15
      continue
    }

    if (block.kind === 'list') {
      const bulletWidth = regularFont.widthOfTextAtSize(`${block.bullet} `, opts.fontSize)
      const listIndent = opts.margin + bulletWidth + 6
      const lines = wrapText(block.text, maxW - bulletWidth - 6, regularFont, opts.fontSize)
      ensureSpace(lines.length * baseLineH + baseLineH * 0.2)
      lines.forEach((line, index) => {
        if (index === 0) {
          page.drawText(block.bullet, {
            x: opts.margin,
            y,
            size: opts.fontSize,
            font: boldFont,
            color: rgb(0.1, 0.08, 0.07),
          })
        }
        drawLine(line, listIndent, opts.fontSize, regularFont)
      })
      y -= baseLineH * 0.1
      continue
    }

    const lines = wrapText(block.text, maxW, regularFont, opts.fontSize)
    ensureSpace(lines.length * baseLineH + baseLineH * 0.15)
    lines.forEach(line => drawLine(line, opts.margin, opts.fontSize, regularFont))
    y -= baseLineH * 0.1
  }

  pages.forEach((pdfPage, index) => {
    const label = `${index + 1}`
    const size = 9
    const width = regularFont.widthOfTextAtSize(label, size)
    pdfPage.drawText(label, {
      x: pageW - opts.margin - width,
      y: opts.margin * 0.45,
      size,
      font: regularFont,
      color: rgb(0.55, 0.55, 0.55),
    })
  })

  return doc.save()
}
