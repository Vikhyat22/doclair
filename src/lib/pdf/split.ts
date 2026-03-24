import { PDFDocument } from '@cantoo/pdf-lib'

export interface SplitResult {
  filename:  string
  bytes:     Uint8Array
  pageCount: number
  pageRange: string
}

export async function splitPDF(
  file: File,
  mode: 'individual' | 'ranges' | 'interval',
  options: {
    ranges?:   string  // "1-3, 5, 7-10"
    interval?: number  // every N pages
  } = {}
): Promise<SplitResult[]> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)
  const total = doc.getPageCount()
  const results: SplitResult[] = []

  // ── individual: one file per page ────────────────────────────
  if (mode === 'individual') {
    for (let i = 0; i < total; i++) {
      const out = await PDFDocument.create()
      const [p] = await out.copyPages(doc, [i])
      out.addPage(p)
      results.push({
        filename:  `page-${i + 1}.pdf`,
        bytes:     await out.save(),
        pageCount: 1,
        pageRange: `Page ${i + 1}`,
      })
    }
    return results
  }

  // ── interval: every N pages ───────────────────────────────────
  if (mode === 'interval') {
    const n = Math.max(1, options.interval ?? 1)
    for (let start = 0; start < total; start += n) {
      const end     = Math.min(start + n, total)
      const indices = Array.from({ length: end - start }, (_, i) => start + i)
      const out     = await PDFDocument.create()
      const pages   = await out.copyPages(doc, indices)
      pages.forEach(p => out.addPage(p))
      const label = indices.length === 1
        ? `page-${start + 1}`
        : `pages-${start + 1}-${end}`
      results.push({
        filename:  `${label}.pdf`,
        bytes:     await out.save(),
        pageCount: indices.length,
        pageRange: indices.length === 1 ? `Page ${start + 1}` : `Pages ${start + 1}–${end}`,
      })
    }
    return results
  }

  // ── ranges: custom ranges like "1-3, 5, 7-10" ────────────────
  const rawParts = (options.ranges ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  for (const part of rawParts) {
    const out = await PDFDocument.create()
    let indices:    number[]
    let label:      string
    let rangeLabel: string

    if (part.includes('-')) {
      const [a, b] = part.split('-').map(n => parseInt(n.trim(), 10))
      const start  = Math.max(0, a - 1)
      const end    = Math.min(total - 1, b - 1)
      if (isNaN(a) || isNaN(b) || start > end) continue
      indices    = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      label      = `pages-${a}-${b}`
      rangeLabel = `Pages ${a}–${b}`
    } else {
      const n = parseInt(part.trim(), 10)
      if (isNaN(n) || n < 1 || n > total) continue
      indices    = [n - 1]
      label      = `page-${n}`
      rangeLabel = `Page ${n}`
    }

    const pages = await out.copyPages(doc, indices)
    pages.forEach(p => out.addPage(p))
    results.push({
      filename:  `${label}.pdf`,
      bytes:     await out.save(),
      pageCount: indices.length,
      pageRange: rangeLabel,
    })
  }
  return results
}

export async function bundleAsZip(results: SplitResult[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip   = new JSZip()
  results.forEach(r => zip.file(r.filename, r.bytes))
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

export function parseRangePreview(
  rangeStr:   string,
  totalPages: number
): { valid: boolean; parts: string[]; fileCount: number } {
  if (!rangeStr.trim()) return { valid: false, parts: [], fileCount: 0 }

  const rawParts = rangeStr.split(',').map(s => s.trim()).filter(Boolean)
  const parts: string[] = []

  for (const part of rawParts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(n => parseInt(n.trim(), 10))
      if (isNaN(a) || isNaN(b) || a < 1 || b > totalPages || a > b) {
        return { valid: false, parts: [], fileCount: 0 }
      }
      parts.push(a === b ? `Page ${a}` : `Pages ${a}–${b}`)
    } else {
      const n = parseInt(part.trim(), 10)
      if (isNaN(n) || n < 1 || n > totalPages) {
        return { valid: false, parts: [], fileCount: 0 }
      }
      parts.push(`Page ${n}`)
    }
  }

  return { valid: parts.length > 0, parts, fileCount: parts.length }
}
