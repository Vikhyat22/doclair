import Papa from 'papaparse'
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'

export async function csvToPDF(file: File): Promise<Uint8Array> {
  const text   = await file.text()
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const rows   = result.data

  if (rows.length === 0) throw new Error('No data found in CSV')

  const doc   = await PDFDocument.create()
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontR = await doc.embedFont(StandardFonts.Helvetica)

  const pageW    = 841.89  // A4 Landscape
  const pageH    = 595.28
  const margin   = 40
  const rowH     = 20
  const fontSize = 9

  const cols = rows[0].length
  const colW = (pageW - margin * 2) / Math.max(cols, 1)

  let page = doc.addPage([pageW, pageH])
  let y    = pageH - margin

  rows.forEach((row, ri) => {
    if (y < margin + rowH) {
      page = doc.addPage([pageW, pageH])
      y    = pageH - margin
    }

    // Header row background
    if (ri === 0) {
      page.drawRectangle({
        x: margin, y: y - rowH + 4,
        width: pageW - margin * 2, height: rowH,
        color: rgb(0.1, 0.08, 0.07),
      })
    } else if (ri % 2 === 0) {
      page.drawRectangle({
        x: margin, y: y - rowH + 4,
        width: pageW - margin * 2, height: rowH,
        color: rgb(0.97, 0.96, 0.94),
      })
    }

    row.forEach((cell, ci) => {
      const x    = margin + ci * colW
      const txt  = String(cell ?? '').slice(0, 30)
      page.drawText(txt, {
        x: x + 4, y: y - 4,
        size: fontSize,
        font: ri === 0 ? fontB : fontR,
        color: ri === 0 ? rgb(1, 1, 1) : rgb(0.1, 0.08, 0.07),
        maxWidth: colW - 8,
      })
    })

    // Row separator
    if (ri > 0) {
      page.drawLine({
        start: { x: margin,         y: y - rowH + 4 },
        end:   { x: pageW - margin, y: y - rowH + 4 },
        thickness: 0.5,
        color: rgb(0.88, 0.85, 0.8),
      })
    }

    y -= rowH
  })

  return doc.save()
}
