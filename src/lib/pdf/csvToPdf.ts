import Papa from 'papaparse'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from '@cantoo/pdf-lib'

const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28
const PAGE_MARGIN = 36
const CELL_PADDING_X = 6
const CELL_PADDING_Y = 5

function normalizeCell(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function isNumericCell(value: string) {
  if (!value) return false
  const normalized = value.replace(/[$,%\s]/g, '').replace(/,/g, '')
  return /^-?\d+(?:\.\d+)?$/.test(normalized)
}

function splitLongToken(token: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const pieces: string[] = []
  let current = ''

  for (const char of token) {
    const candidate = current + char
    if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      pieces.push(current)
      current = char
      continue
    }
    current = candidate
  }

  if (current) pieces.push(current)
  return pieces
}

function wrapCellText(text: string, maxWidth: number, font: PDFFont, fontSize: number) {
  if (!text) return ['']

  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  const pushCurrent = () => {
    if (current) {
      lines.push(current)
      current = ''
    }
  }

  for (const word of words) {
    if (!word) continue

    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      pushCurrent()
      lines.push(...splitLongToken(word, maxWidth, font, fontSize))
      continue
    }

    const candidate = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      pushCurrent()
      current = word
    } else {
      current = candidate
    }
  }

  pushCurrent()
  return lines.length > 0 ? lines : ['']
}

function detectNumericColumns(rows: string[][], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => {
    let numeric = 0
    let populated = 0

    rows.slice(1).forEach(row => {
      const cell = row[index] ?? ''
      if (!cell) return
      populated += 1
      if (isNumericCell(cell)) numeric += 1
    })

    return populated > 0 && numeric / populated >= 0.7
  })
}

function getColumnWidths(
  rows: string[][],
  columnCount: number,
  usableWidth: number,
  font: PDFFont,
  boldFont: PDFFont,
  fontSize: number,
) {
  const minWidth = 54
  const maxWidth = 180
  const targetWidths = Array.from({ length: columnCount }, () => minWidth)
  const sampleRows = rows.slice(0, Math.min(rows.length, 40))

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const measured = sampleRows.map((row, rowIndex) => {
      const value = row[columnIndex] ?? ''
      const activeFont = rowIndex === 0 ? boldFont : font
      return activeFont.widthOfTextAtSize(value.slice(0, 80), fontSize) + (CELL_PADDING_X * 2)
    })
    targetWidths[columnIndex] = Math.max(minWidth, Math.min(maxWidth, Math.max(...measured, minWidth)))
  }

  const totalTargetWidth = targetWidths.reduce((sum, width) => sum + width, 0)
  if (totalTargetWidth <= usableWidth) return targetWidths

  const shrinkableWidth = targetWidths.reduce((sum, width) => sum + Math.max(0, width - minWidth), 0)
  if (shrinkableWidth <= 0) {
    return Array.from({ length: columnCount }, () => usableWidth / columnCount)
  }

  const overflow = totalTargetWidth - usableWidth
  return targetWidths.map(width => {
    const shrinkShare = Math.max(0, width - minWidth) / shrinkableWidth
    return width - (overflow * shrinkShare)
  })
}

export async function csvToPDF(file: File): Promise<Uint8Array> {
  const text = await file.text()
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const rawRows = result.data

  if (rawRows.length === 0) throw new Error('No data found in CSV')

  const columnCount = Math.max(...rawRows.map(row => row.length), 1)
  const rows = rawRows.map(row =>
    Array.from({ length: columnCount }, (_, index) => normalizeCell(row[index])),
  )

  const doc = await PDFDocument.create()
  const headerFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica)

  const baseFontSize = columnCount > 10 ? 7.5 : columnCount > 6 ? 8.25 : 9
  const lineHeight = baseFontSize * 1.2
  const usableWidth = PAGE_WIDTH - (PAGE_MARGIN * 2)
  const columnWidths = getColumnWidths(rows, columnCount, usableWidth, bodyFont, headerFont, baseFontSize)
  const numericColumns = detectNumericColumns(rows, columnCount)

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursorY = PAGE_HEIGHT - PAGE_MARGIN

  const drawRow = (row: string[], rowIndex: number) => {
    const isHeader = rowIndex === 0
    const activeFont = isHeader ? headerFont : bodyFont
    const wrappedCells = row.map((cell, columnIndex) =>
      wrapCellText(cell, Math.max(24, columnWidths[columnIndex] - (CELL_PADDING_X * 2)), activeFont, baseFontSize),
    )
    const lineCount = Math.max(...wrappedCells.map(lines => lines.length), 1)
    const rowHeight = (CELL_PADDING_Y * 2) + (lineCount * lineHeight)

    if (cursorY - rowHeight < PAGE_MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      cursorY = PAGE_HEIGHT - PAGE_MARGIN
      if (!isHeader) drawRow(rows[0], 0)
    }

    let cursorX = PAGE_MARGIN
    const fillColor = isHeader
      ? rgb(0.1, 0.08, 0.07)
      : rowIndex % 2 === 0
        ? rgb(0.97, 0.96, 0.94)
        : rgb(1, 1, 1)

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const width = columnWidths[columnIndex]
      const lines = wrappedCells[columnIndex]

      page.drawRectangle({
        x: cursorX,
        y: cursorY - rowHeight,
        width,
        height: rowHeight,
        color: fillColor,
        borderColor: rgb(0.88, 0.85, 0.8),
        borderWidth: 0.5,
      })

      lines.forEach((line, lineIndex) => {
        const textWidth = activeFont.widthOfTextAtSize(line, baseFontSize)
        const textX = numericColumns[columnIndex] && !isHeader
          ? cursorX + width - CELL_PADDING_X - textWidth
          : cursorX + CELL_PADDING_X

        page.drawText(line, {
          x: textX,
          y: cursorY - CELL_PADDING_Y - baseFontSize - (lineIndex * lineHeight) + 1,
          size: baseFontSize,
          font: activeFont,
          color: isHeader ? rgb(1, 1, 1) : rgb(0.1, 0.08, 0.07),
          maxWidth: width - (CELL_PADDING_X * 2),
        })
      })

      cursorX += width
    }

    cursorY -= rowHeight
  }

  rows.forEach((row, rowIndex) => {
    drawRow(row, rowIndex)
  })

  return doc.save()
}
