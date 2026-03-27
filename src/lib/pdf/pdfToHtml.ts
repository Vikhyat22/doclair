import { extractStructuredPDF, type StructuredLine } from './extractStructured'

export interface PDFToHTMLResult {
  html: string
  previewHtml: string
  pageCount: number
  wordCount: number
  warnings: string[]
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

function renderPage(lines: StructuredLine[]) {
  const parts: string[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    parts.push(`<ul>${listItems.join('')}</ul>`)
    listItems = []
  }

  for (const line of lines) {
    const clean = line.text.trim()
    if (!clean) continue

    if (/^(?:[-*•]|[0-9]+[.)])\s+/.test(clean)) {
      const item = clean.replace(/^(?:[-*•]|[0-9]+[.)])\s+/, '')
      listItems.push(`<li>${escapeHtml(item)}</li>`)
      continue
    }

    flushList()

    if (isHeading(clean)) {
      parts.push(`<h2>${escapeHtml(clean)}</h2>`)
    } else {
      parts.push(`<p>${escapeHtml(clean)}</p>`)
    }
  }

  flushList()
  return parts.join('')
}

export async function pdfToHTML(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PDFToHTMLResult> {
  const structured = await extractStructuredPDF(file, onProgress)
  const warnings: string[] = []

  if (structured.totalWords === 0) {
    warnings.push('No text could be extracted from this PDF. If the PDF is scanned, run OCR PDF first.')
  }

  const title = structured.metadata.title || file.name.replace(/\.pdf$/i, '') || 'Converted PDF'
  const sections = structured.pages
    .map(page => {
      const body = renderPage(page.lines)
      return `<section class="pdf-page" data-page="${page.page}">
  <div class="page-label">Page ${page.page}</div>
  ${body || '<p class="muted">No readable text found on this page.</p>'}
</section>`
    })
    .join('\n')

  const previewHtml = `<article class="pdf-doc">${sections}</article>`
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1a1612;
      --muted: #7a6e62;
      --border: #e0d8cc;
      --paper: #fffdf9;
      --accent: #e8820c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background: #f5f0e8;
      line-height: 1.7;
    }
    .pdf-doc {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px 80px;
    }
    .pdf-page {
      background: var(--paper);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(26, 22, 18, 0.04);
    }
    .page-label {
      font: 500 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 18px;
    }
    h2 {
      margin: 18px 0 10px;
      font-size: 1.3rem;
      line-height: 1.3;
    }
    p, ul {
      margin: 0 0 12px;
    }
    ul {
      padding-left: 1.25rem;
    }
    .muted {
      color: var(--muted);
      font-style: italic;
    }
  </style>
</head>
<body>
  ${previewHtml}
</body>
</html>`

  return {
    html,
    previewHtml,
    pageCount: structured.pageCount,
    wordCount: structured.totalWords,
    warnings,
  }
}
