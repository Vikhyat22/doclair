import { extractStructuredPDF, type StructuredLine } from './extractStructured'

function isHeading(line: string) {
  const clean = line.trim()
  if (!clean) return false

  const isShort = clean.length <= 80
  const noEndPunctuation = !/[.!?,;:]$/.test(clean)
  const isAllCaps = clean === clean.toUpperCase() && /[A-Z]/.test(clean)
  const isTitleCase = /^[A-Z][A-Za-z0-9].+/.test(clean)

  return isShort && noEndPunctuation && (isAllCaps || (isTitleCase && clean.length <= 56))
}

function isTableCandidate(line: StructuredLine) {
  if (line.cells.length < 2) return false
  const clean = line.text.trim()
  if (!clean) return false
  if (/^(?:[-*•]|[0-9]+[.)])\s+/.test(clean)) return false
  return line.cells.every(cell => cell.trim().length > 0)
}

function looksLikeHeaderRow(cells: string[], followingRows: string[][]) {
  if (cells.length < 2 || followingRows.length === 0) return false

  const shortLabels = cells.every(cell => cell.trim().length > 0 && cell.trim().length <= 24)
  const noSentencePunctuation = cells.every(cell => !/[.!?]$/.test(cell.trim()))
  const mostlyText = cells.every(cell => /[A-Za-z]/.test(cell) && !/^\d+(?:[.,]\d+)?$/.test(cell.trim()))
  const followingHasDifferentData = followingRows.some(row => row.some(cell => /\d/.test(cell) || cell.trim().length > 24))

  return shortLabels && noSentencePunctuation && mostlyText && followingHasDifferentData
}

function escapeMarkdown(value: string) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ').trim()
}

function renderMarkdownTable(rows: string[][]) {
  const columnCount = Math.max(...rows.map(row => row.length))
  const normalized = rows.map(row => Array.from({ length: columnCount }, (_, index) => escapeMarkdown(row[index] ?? '')))
  const header = looksLikeHeaderRow(normalized[0], normalized.slice(1)) ? normalized[0] : normalized[0].map((_, index) => `Column ${index + 1}`)
  const bodyRows = looksLikeHeaderRow(normalized[0], normalized.slice(1)) ? normalized.slice(1) : normalized

  const headerLine = `| ${header.join(' | ')} |`
  const dividerLine = `| ${header.map(() => '---').join(' | ')} |`
  const bodyLines = bodyRows.map(row => `| ${row.join(' | ')} |`)

  return [headerLine, dividerLine, ...bodyLines].join('\n')
}

function renderPage(lines: StructuredLine[]) {
  const parts: string[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    parts.push(listItems.join('\n'))
    listItems = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const clean = line.text.trim()
    if (!clean) continue

    if (isTableCandidate(line)) {
      const tableRows: string[][] = [line.cells]
      let cursor = index + 1

      while (cursor < lines.length) {
        const next = lines[cursor]
        if (!isTableCandidate(next)) break

        const widthDelta = Math.abs(next.cells.length - tableRows[tableRows.length - 1].length)
        if (widthDelta > 1) break

        tableRows.push(next.cells)
        cursor += 1
      }

      const maxColumns = Math.max(...tableRows.map(row => row.length))
      if (tableRows.length >= 2 && maxColumns >= 3) {
        flushList()
        parts.push(renderMarkdownTable(tableRows))
        index = cursor - 1
        continue
      }
    }

    if (/^(?:[-*•]|[0-9]+[.)])\s+/.test(clean)) {
      const marker = clean.match(/^(?:[-*•]|[0-9]+[.)])/)?.[0] ?? '-'
      const item = clean.replace(/^(?:[-*•]|[0-9]+[.)])\s+/, '')
      const normalizedMarker = /^\d/.test(marker) ? `${marker.replace(/\)$/, '.')}` : '-'
      listItems.push(`${normalizedMarker} ${item}`)
      continue
    }

    flushList()

    if (isHeading(clean)) {
      parts.push(`## ${clean}`)
    } else {
      parts.push(clean)
    }
  }

  flushList()
  return parts.join('\n\n')
}

export async function pdfToMarkdown(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<string> {
  const structured = await extractStructuredPDF(file, onProgress)
  const parts: string[] = []

  for (const page of structured.pages) {
    if (structured.pageCount > 1) {
      parts.push(`<!-- Page ${page.page} -->`)
    }

    parts.push(renderPage(page.lines))

    if (page.page < structured.pageCount) {
      parts.push('---')
    }
  }

  return parts.filter(Boolean).join('\n\n').trim()
}
