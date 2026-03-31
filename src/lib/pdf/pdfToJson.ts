'use client'

import { extractStructuredPDF, type StructuredLine } from './extractStructured'

export interface PDFLineJSON {
  y: number
  text: string
  cells: string[]
}

export interface PDFTableJSON {
  startLine: number
  endLine: number
  rows: string[][]
}

export interface PDFPageJSON {
  page: number
  text: string
  wordCount: number
  lines: PDFLineJSON[]
  tables: PDFTableJSON[]
}

export interface PDFDocJSON {
  filename: string
  pageCount: number
  totalWords: number
  pages: PDFPageJSON[]
  metadata: {
    title?: string
    author?: string
    subject?: string
  }
}

function normalizeMetadataValue(value?: string) {
  const clean = value?.trim()
  if (!clean) return undefined
  if (/^\((?:anonymous|unspecified)\)$/i.test(clean)) return undefined
  return clean
}

function isTableCandidate(line: StructuredLine) {
  if (line.cells.length < 2) return false
  const clean = line.text.trim()
  if (!clean) return false
  if (/^(?:[-*•]|[0-9]+[.)])\s+/.test(clean)) return false
  return line.cells.every(cell => cell.trim().length > 0)
}

function extractTables(lines: StructuredLine[]) {
  const tables: PDFTableJSON[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!isTableCandidate(line)) continue

    const rows: string[][] = [line.cells]
    let cursor = index + 1

    while (cursor < lines.length) {
      const next = lines[cursor]
      if (!isTableCandidate(next)) break

      const widthDelta = Math.abs(next.cells.length - rows[rows.length - 1].length)
      if (widthDelta > 1) break

      rows.push(next.cells)
      cursor += 1
    }

    const maxColumns = Math.max(...rows.map(row => row.length))
    if (rows.length >= 2 && maxColumns >= 3) {
      tables.push({
        startLine: index,
        endLine: cursor - 1,
        rows,
      })
      index = cursor - 1
    }
  }

  return tables
}

export async function pdfToJSON(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PDFDocJSON> {
  const structured = await extractStructuredPDF(file, onProgress)

  return {
    filename: file.name,
    pageCount: structured.pageCount,
    totalWords: structured.totalWords,
    pages: structured.pages.map(page => ({
      page: page.page,
      text: page.lines.map(line => line.text).join(' ').trim(),
      wordCount: page.wordCount,
      lines: page.lines.map(line => ({
        y: line.y,
        text: line.text,
        cells: line.cells,
      })),
      tables: extractTables(page.lines),
    })),
    metadata: {
      title: normalizeMetadataValue(structured.metadata.title),
      author: normalizeMetadataValue(structured.metadata.author),
      subject: normalizeMetadataValue(structured.metadata.subject),
    },
  }
}
