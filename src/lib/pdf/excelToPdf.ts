import * as XLSX from 'xlsx'

export interface SheetData {
  name: string
  rows: string[][]
  html: string
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
