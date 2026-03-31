'use client'

import { extractStructuredPDF, type StructuredLine } from './extractStructured'

export interface PageText {
  pageNum: number
  text:    string
  words:   string[]
}

export interface PDFTextContent {
  pages:      PageText[]
  totalWords: number
  language:   string
}

export async function extractPDFText(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PDFTextContent> {
  const structured = await extractStructuredPDF(file, onProgress)
  const pages: PageText[] = structured.pages.map(page => {
    const text = renderNarrationText(page.lines)
    return {
      pageNum: page.page,
      text,
      words: text.split(/\s+/).filter(Boolean),
    }
  })

  const totalWords = pages.reduce((sum, page) => sum + page.words.length, 0)
  const fullText = pages.map(p => p.text).join(' ')
  const language = detectLanguage(fullText)

  return { pages, totalWords, language }
}

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

function renderNarrationText(lines: StructuredLine[]) {
  const parts: string[] = []
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    parts.push(paragraphLines.join(' ').replace(/\s+/g, ' ').trim())
    paragraphLines = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const clean = line.text.trim()
    if (!clean) continue

    if (isTableCandidate(line)) {
      const tableRows = [line.cells]
      let cursor = index + 1

      while (cursor < lines.length) {
        const next = lines[cursor]
        if (!isTableCandidate(next)) break
        const widthDelta = Math.abs(next.cells.length - tableRows[tableRows.length - 1].length)
        if (widthDelta > 1) break
        tableRows.push(next.cells)
        cursor += 1
      }

      if (tableRows.length >= 2 && Math.max(...tableRows.map(row => row.length)) >= 3) {
        flushParagraph()
        parts.push(tableRows.map(row => row.join(', ')).join('. '))
        index = cursor - 1
        continue
      }
    }

    if (/^(?:[-*•]|[0-9]+[.)])\s+/.test(clean)) {
      flushParagraph()
      parts.push(clean.replace(/^[-*•]\s+/, ''))
      continue
    }

    if (isHeading(clean)) {
      flushParagraph()
      parts.push(clean)
      continue
    }

    paragraphLines.push(clean)

    if (/[.!?]$/.test(clean)) {
      flushParagraph()
    }
  }

  flushParagraph()
  return parts.join('\n\n').trim()
}

function detectLanguage(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'
  return 'en-IN'
}
