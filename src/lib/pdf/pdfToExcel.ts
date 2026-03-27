import * as XLSX from 'xlsx'
import { extractStructuredPDF } from './extractStructured'

export interface PDFToExcelSheet {
  name: string
  rows: string[][]
  html: string
}

export interface PDFToExcelResult {
  blob: Blob
  pageCount: number
  rowCount: number
  warnings: string[]
  sheets: PDFToExcelSheet[]
}

function getSheetName(pageNum: number) {
  return `Page ${pageNum}`.slice(0, 31)
}

function rowsForPage(lines: Array<{ text: string; cells: string[] }>) {
  const rows = lines.map(line => (line.cells.length > 0 ? line.cells : [line.text]))
  const firstMultiColumnRow = rows.findIndex(row => row.length > 1)

  // If the page clearly contains a table, drop title/subtitle lines that sit
  // above the first tabular row. This keeps exported sheets cleaner.
  if (firstMultiColumnRow > 0) {
    const multiColumnRowCount = rows.filter(row => row.length > 1).length
    if (multiColumnRowCount >= 2) {
      return rows.slice(firstMultiColumnRow)
    }
  }

  return rows
}

export async function pdfToExcel(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PDFToExcelResult> {
  const structured = await extractStructuredPDF(file, onProgress)
  const warnings: string[] = []
  const workbook = XLSX.utils.book_new()
  const sheets: PDFToExcelSheet[] = []
  let rowCount = 0
  let multiColumnRows = 0

  for (const page of structured.pages) {
    const rows = rowsForPage(page.lines)
    rowCount += rows.length
    multiColumnRows += rows.filter(row => row.length > 1).length

    const worksheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['']])
    const name = getSheetName(page.page)
    XLSX.utils.book_append_sheet(workbook, worksheet, name)

    sheets.push({
      name,
      rows,
      html: XLSX.utils.sheet_to_html(worksheet, {
        id: `pdf-sheet-${page.page}`,
        editable: false,
      }),
    })
  }

  if (rowCount === 0) {
    warnings.push('No text could be extracted from this PDF. If the PDF is scanned, run OCR PDF first.')
  } else if (multiColumnRows === 0) {
    warnings.push('No clear columns were detected, so lines were exported as single text cells. Complex tables may need cleanup in Excel.')
  } else if (multiColumnRows < Math.max(3, Math.floor(rowCount * 0.25))) {
    warnings.push('Some rows were split into columns, but complex tables may still need cleanup after export.')
  }

  const buffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  return {
    blob: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    pageCount: structured.pageCount,
    rowCount,
    warnings,
    sheets,
  }
}
