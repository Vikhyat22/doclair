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

function normalizeCell(cell: string | undefined) {
  return String(cell ?? '').replace(/\s+/g, ' ').trim()
}

function countUsedColumns(row: string[]) {
  for (let index = row.length - 1; index >= 0; index -= 1) {
    if (normalizeCell(row[index])) return index + 1
  }
  return 0
}

function isBlankRow(row: string[]) {
  return countUsedColumns(row) === 0
}

function getRowSlice(row: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => normalizeCell(row[index]))
}

function splitSheetRows(rows: string[][]) {
  const normalizedRows = rows.map(row => row.map(cell => String(cell ?? '')))
  let titleRows: string[][] = []
  let startIndex = 0

  while (startIndex < normalizedRows.length) {
    const row = normalizedRows[startIndex]
    const used = countUsedColumns(row)
    if (used === 0) {
      startIndex += 1
      continue
    }
    if (used <= 1) {
      titleRows.push(getRowSlice(row, used || 1))
      startIndex += 1
      continue
    }
    break
  }

  const sections: string[][][] = []
  let current: string[][] = []
  for (let index = startIndex; index < normalizedRows.length; index += 1) {
    const row = normalizedRows[index]
    if (isBlankRow(row)) {
      if (current.length > 0) {
        sections.push(current)
        current = []
      }
      continue
    }
    current.push(row)
  }
  if (current.length > 0) sections.push(current)

  if (titleRows.length === 0 && sections.length > 0 && countUsedColumns(sections[0][0]) === 1) {
    titleRows = [getRowSlice(sections[0][0], 1)]
    sections[0] = sections[0].slice(1)
    if (sections[0].length === 0) sections.shift()
  }

  return { titleRows, sections }
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
    const { titleRows, sections } = splitSheetRows(rows)

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
        const sectionRowCount = sections.reduce((sum, section) => sum + Math.max(section.length - 1, 0), 0)
        const maxColumns = Math.max(...sections.map(section => Math.max(...section.map(countUsedColumns), 0)), 1)
        page.drawText(
          `${sectionRowCount} data row${sectionRowCount === 1 ? '' : 's'} • ${maxColumns} column${maxColumns === 1 ? '' : 's'}`,
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
    }

    drawSheetChrome(false)

    titleRows.forEach((titleRow, index) => {
      const title = normalizeCell(titleRow[0])
      if (!title) return
      page.drawText(title, {
        x: marginX,
        y,
        size: bodyFontSize + (index === 0 ? 2 : 0),
        font: index === 0 ? fontBold : fontRegular,
        color: rgb(0.15, 0.13, 0.11),
      })
      y -= index === 0 ? 20 : 14
    })

    for (const [sectionIndex, section] of sections.entries()) {
      if (section.length === 0) continue
      const columnCount = Math.max(...section.map(countUsedColumns), 1)
      const sectionRows = section.map(row => getRowSlice(row, columnCount))
      const widths = fitColumnWidths(
        measureColumns(sectionRows, fontRegular, rowFontSize, columnCount),
        contentWidth,
        56,
      )
      const sectionWidth = widths.reduce((sum, width) => sum + width, 0)
      const headerRow = sectionRows[0]
      const dataRows = sectionRows.slice(1)
      const headerHeight = lineHeight + cellPaddingY * 2

      const drawSectionHeader = () => {
        let x = marginX
        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
          const width = widths[columnIndex] ?? widths[widths.length - 1]
          page.drawRectangle({
            x,
            y: y - headerHeight,
            width,
            height: headerHeight,
            color: rgb(0.1, 0.08, 0.07),
          })
          page.drawText(headerRow[columnIndex] || ' ', {
            x: x + cellPaddingX,
            y: y - headerHeight + cellPaddingY + 2,
            size: rowFontSize,
            font: fontBold,
            color: rgb(1, 1, 1),
            maxWidth: width - cellPaddingX * 2,
          })
          x += width
        }
        y -= headerHeight
      }

      if (sectionIndex > 0) y -= 6
      drawSectionHeader()

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
        const row = dataRows[rowIndex]
        const wrapped = Array.from({ length: columnCount }, (_, columnIndex) => {
          const width = (widths[columnIndex] ?? widths[widths.length - 1]) - cellPaddingX * 2
          return wrapText(row[columnIndex], fontRegular, rowFontSize, width)
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
          drawSectionHeader()
        }

        if (rowIndex % 2 === 0) {
          page.drawRectangle({
            x: marginX,
            y: y - rowHeight,
            width: sectionWidth,
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
    }

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
