import * as XLSX from 'xlsx'
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'

export interface SheetData {
  name: string
  rows: string[][]
  html: string
}

interface MeasuringFont {
  widthOfTextAtSize(text: string, size: number): number
}

export function parseExcelFile(buffer: ArrayBuffer): SheetData[] {
  const wb = XLSX.read(buffer, { type: 'array' })

  return wb.SheetNames.map(name => {
    const ws   = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1, defval: '',
    }) as string[][]
    const html = XLSX.utils.sheet_to_html(ws, {
      id:       'sheet',
      editable: false,
    })
    return { name, rows, html }
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function fitColumnWidths(widths: number[], availableWidth: number, minWidth: number) {
  const columnCount = Math.max(widths.length, 1)
  let adjusted = widths.map(width => Math.max(minWidth, width))
  let total = adjusted.reduce((sum, width) => sum + width, 0)

  if (total <= availableWidth) return adjusted

  const evenWidth = Math.max(minWidth, availableWidth / columnCount)
  adjusted = adjusted.map(() => evenWidth)
  total = adjusted.reduce((sum, width) => sum + width, 0)

  if (total <= availableWidth) return adjusted

  const scale = availableWidth / total
  return adjusted.map(width => width * scale)
}

function wrapText(text: string, font: MeasuringFont, fontSize: number, maxWidth: number) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ['']
  if (maxWidth <= 0) return [normalized]

  const words = normalized.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate
      continue
    }

    if (current) lines.push(current)

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word
      continue
    }

    let remainder = word
    while (remainder.length > 0) {
      let chunk = remainder
      while (chunk.length > 1 && font.widthOfTextAtSize(chunk, fontSize) > maxWidth) {
        chunk = chunk.slice(0, -1)
      }
      lines.push(chunk)
      remainder = remainder.slice(chunk.length)
    }
    current = ''
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

function measureColumns(rows: string[][], font: MeasuringFont, fontSize: number, columnCount: number) {
  const measured = Array.from({ length: columnCount }, () => 56)

  rows.slice(0, 80).forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (columnIndex >= columnCount) return
      const text = String(cell ?? '').replace(/\s+/g, ' ').trim()
      if (!text) return
      const sample = text.slice(0, 42)
      const padding = rowIndex === 0 ? 26 : 20
      measured[columnIndex] = Math.max(
        measured[columnIndex],
        font.widthOfTextAtSize(sample, fontSize) + padding,
      )
    })
  })

  return measured
}

export async function sheetsToPDF(sheets: SheetData[]): Promise<Uint8Array> {
  if (sheets.length === 0) throw new Error('No sheets found in workbook')

  const doc = await PDFDocument.create()
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 841.89
  const pageHeight = 595.28
  const marginX = 36
  const marginTop = 40
  const marginBottom = 30
  const contentWidth = pageWidth - marginX * 2
  const bodyFontSize = 9
  const headerFontSize = 14
  const subtitleFontSize = 8
  const rowFontSize = 8.5
  const lineHeight = 11
  const cellPaddingX = 5
  const cellPaddingY = 5
  const sectionGap = 14

  let workbookPageNumber = 0

  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [['']]
    const columnCount = Math.max(...rows.map(row => row.length), 1)
    const widths = fitColumnWidths(
      measureColumns(rows, fontRegular, rowFontSize, columnCount),
      contentWidth,
      56,
    )

    let page = doc.addPage([pageWidth, pageHeight])
    workbookPageNumber += 1
    let y = pageHeight - marginTop

    const drawSheetChrome = (repeatHeaderRow: boolean) => {
      page.drawText(sheet.name || 'Sheet', {
        x: marginX,
        y,
        size: headerFontSize,
        font: fontBold,
        color: rgb(0.1, 0.08, 0.07),
      })
      page.drawText(`Workbook page ${workbookPageNumber}`, {
        x: pageWidth - marginX - fontRegular.widthOfTextAtSize(`Workbook page ${workbookPageNumber}`, subtitleFontSize),
        y: y + 2,
        size: subtitleFontSize,
        font: fontRegular,
        color: rgb(0.55, 0.55, 0.55),
      })
      y -= 18

      if (!repeatHeaderRow) {
        page.drawText(
          `${rows.length - 1} data row${rows.length - 1 === 1 ? '' : 's'} • ${columnCount} column${columnCount === 1 ? '' : 's'}`,
          {
            x: marginX,
            y,
            size: subtitleFontSize,
            font: fontRegular,
            color: rgb(0.55, 0.55, 0.55),
          },
        )
        y -= 16
      }

      const headerHeight = lineHeight + cellPaddingY * 2
      let x = marginX
      rows[0].forEach((cell, columnIndex) => {
        const width = widths[columnIndex] ?? widths[widths.length - 1]
        page.drawRectangle({
          x,
          y: y - headerHeight,
          width,
          height: headerHeight,
          color: rgb(0.1, 0.08, 0.07),
        })
        page.drawText(String(cell ?? '').slice(0, 80) || ' ', {
          x: x + cellPaddingX,
          y: y - headerHeight + cellPaddingY + 2,
          size: rowFontSize,
          font: fontBold,
          color: rgb(1, 1, 1),
          maxWidth: width - cellPaddingX * 2,
        })
        x += width
      })
      y -= headerHeight
    }

    drawSheetChrome(false)

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex]
      const wrapped = Array.from({ length: columnCount }, (_, columnIndex) => {
        const width = (widths[columnIndex] ?? widths[widths.length - 1]) - cellPaddingX * 2
        return wrapText(String(row[columnIndex] ?? ''), fontRegular, rowFontSize, width)
      })
      const rowHeight = Math.max(
        lineHeight + cellPaddingY * 2,
        Math.max(...wrapped.map(lines => lines.length), 1) * lineHeight + cellPaddingY * 2,
      )

      if (y - rowHeight < marginBottom) {
        page = doc.addPage([pageWidth, pageHeight])
        workbookPageNumber += 1
        y = pageHeight - marginTop
        drawSheetChrome(true)
      }

      if (rowIndex % 2 === 1) {
        page.drawRectangle({
          x: marginX,
          y: y - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(0.98, 0.97, 0.95),
        })
      }

      let x = marginX
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const width = widths[columnIndex] ?? widths[widths.length - 1]
        const lines = wrapped[columnIndex]

        page.drawRectangle({
          x,
          y: y - rowHeight,
          width,
          height: rowHeight,
          borderWidth: 0.5,
          borderColor: rgb(0.86, 0.82, 0.78),
          color: rgb(1, 1, 1),
          opacity: 0,
        })

        lines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: x + cellPaddingX,
            y: y - cellPaddingY - rowFontSize - lineIndex * lineHeight + 2,
            size: rowFontSize,
            font: fontRegular,
            color: rgb(0.15, 0.13, 0.11),
            maxWidth: width - cellPaddingX * 2,
          })
        })

        x += width
      }

      y -= rowHeight
    }

    y -= sectionGap
    if (y > marginBottom + 10) {
      page.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 0.75,
        color: rgb(0.92, 0.88, 0.84),
      })
    }
  }

  return doc.save()
}
