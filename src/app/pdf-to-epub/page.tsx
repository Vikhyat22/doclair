'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ErrorCard from '@/components/ui/ErrorCard'
import ToolSidebar from '@/components/ui/ToolSidebar'
import FAQ from '@/components/ui/FAQ'
import { extractStructuredPDF, type StructuredLine } from '@/lib/pdf/extractStructured'

const SIDEBAR_RELATED = [
  { name: 'PDF to Text',     slug: 'pdf-to-text',     icon: '📝', colorBg: '#FFF0DC', desc: 'Extract plain text' },
  { name: 'PDF to Markdown', slug: 'pdf-to-markdown', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'Convert to Markdown' },
  { name: 'PDF to Word',     slug: 'pdf-to-word',     icon: '📄', colorBg: '#DBEAFE', desc: 'Convert to .docx' },
]

const FAQS = [
  { q: 'Will my ePub work on Kindle and Apple Books?', a: 'Yes. The output is a standard ePub package suitable for common eReaders, including Kindle (where supported), Kobo, and Apple Books.' },
  { q: 'Why is my ePub empty for some PDFs?', a: 'Scanned PDFs are images without extractable text. Use OCR PDF first on image-only documents, then convert to ePub.' },
  { q: 'Is my PDF uploaded anywhere?', a: 'No. Text extraction and ePub building run entirely in your browser.' },
  { q: 'Is PDF to ePub free?', a: 'Yes. Doclair does not add a watermark to your ePub file.' },
]

const TOOL_SEO_NAME = 'PDF to ePub'
const TOOL_SLUG = 'pdf-to-epub'
const TOOL_DESCRIPTION = 'Convert PDF files to ePub eBook format for Kindle, Kobo and Apple Books. 100% free, no upload, no watermark.'

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: `${TOOL_SEO_NAME} — Doclair`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: `https://doclair.in/${TOOL_SLUG}`,
      description: TOOL_DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'PDF text extracted into reflowable ePub',
        'Chapters per page with navigation',
        'Browser-only conversion',
        'No watermark',
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: TOOL_SEO_NAME, item: `https://doclair.in/${TOOL_SLUG}` },
  ],
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
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

function looksLikeHeaderRow(cells: string[], followingRows: string[][]) {
  if (cells.length < 2 || followingRows.length === 0) return false

  const shortLabels = cells.every(cell => cell.trim().length > 0 && cell.trim().length <= 24)
  const noSentencePunctuation = cells.every(cell => !/[.!?]$/.test(cell.trim()))
  const mostlyText = cells.every(cell => /[A-Za-z]/.test(cell) && !/^\d+(?:[.,]\d+)?$/.test(cell.trim()))
  const followingHasDifferentData = followingRows.some(row => row.some(cell => /\d/.test(cell) || cell.trim().length > 24))

  return shortLabels && noSentencePunctuation && mostlyText && followingHasDifferentData
}

function renderXhtmlTable(rows: string[][]) {
  const columnCount = Math.max(...rows.map(row => row.length))
  const normalized = rows.map(row => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''))
  const header = looksLikeHeaderRow(normalized[0], normalized.slice(1)) ? normalized[0] : null
  const bodyRows = header ? normalized.slice(1) : normalized

  const headHtml = header
    ? `<thead><tr>${header.map(cell => `<th>${escapeXml(cell)}</th>`).join('')}</tr></thead>`
    : ''
  const bodyHtml = bodyRows
    .map(row => `<tr>${row.map(cell => `<td>${escapeXml(cell)}</td>`).join('')}</tr>`)
    .join('')

  return `<div class="table-wrap"><table>${headHtml}<tbody>${bodyHtml}</tbody></table></div>`
}

function renderPageXhtml(lines: StructuredLine[]) {
  const parts: string[] = []
  let listItems: string[] = []
  let paragraphLines: string[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    parts.push(`<ul>${listItems.join('')}</ul>`)
    listItems = []
  }

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    parts.push(`<p>${escapeXml(paragraphLines.join(' ').replace(/\s+/g, ' ').trim())}</p>`)
    paragraphLines = []
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
        flushParagraph()
        flushList()
        parts.push(renderXhtmlTable(tableRows))
        index = cursor - 1
        continue
      }
    }

    if (/^(?:[-*•]|[0-9]+[.)])\s+/.test(clean)) {
      flushParagraph()
      listItems.push(`<li>${escapeXml(clean.replace(/^(?:[-*•]|[0-9]+[.)])\s+/, ''))}</li>`)
      continue
    }

    flushList()

    if (isHeading(clean)) {
      flushParagraph()
      parts.push(`<h2>${escapeXml(clean)}</h2>`)
      continue
    }

    paragraphLines.push(clean)
    if (/[.!?]$/.test(clean)) {
      flushParagraph()
    }
  }

  flushParagraph()
  flushList()

  return parts.join('\n') || '<p><em>No readable text found on this page.</em></p>'
}

function detectLanguage(text: string) {
  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'
  return 'en'
}

export default function PDFToEpubPage() {
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [done, setDone] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const process = useCallback(async (file: File) => {
    setSaving(true); setDone(false); setErrorMessage('')
    try {
      const structured = await extractStructuredPDF(file, (page, total) => {
        const current = Math.min(Math.max(page, 1), total)
        setProgress(`Extracting page ${current} of ${total}…`)
      })
      const title = structured.metadata.title?.trim() || file.name.replace(/\.pdf$/i, '')
      const author = structured.metadata.author?.trim() || 'Converted by Doclair'
      const language = detectLanguage(structured.pages.map(page => page.lines.map(line => line.text).join(' ')).join(' '))

      if (structured.totalWords === 0) {
        throw new Error('No readable text found in this PDF. If it is scanned, run OCR PDF first.')
      }

      setProgress('Building EPUB…')
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

      zip.folder('META-INF')!.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

      const oebps = zip.folder('OEBPS')!

      oebps.file('style.css', `
body { font-family: Georgia, serif; line-height: 1.7; margin: 1em 1.5em; color: #1a1a1a; }
h1 { font-size: 1.6em; margin: 0 0 0.25em; }
h2 { font-size: 1.1em; color: #444; border-bottom: 1px solid #eee; padding-bottom: 0.4em; margin-top: 1.4em; }
p { margin: 0.8em 0; }
ul { margin: 0.6em 0 1em 1.2em; }
li { margin: 0.25em 0; }
.meta { color: #666; font-size: 0.95em; }
.table-wrap { overflow-x: auto; margin: 1em 0; }
table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
th, td { border: 1px solid #ddd; padding: 0.45em 0.55em; text-align: left; vertical-align: top; }
thead th { background: #f6f2ea; font-weight: 700; }
`)

      oebps.file('title.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <p class="meta">${escapeXml(author)}</p>
  <p class="meta">${structured.pageCount} page${structured.pageCount === 1 ? '' : 's'} · ${structured.totalWords.toLocaleString()} words</p>
</body>
</html>`)

      const chapterIds: string[] = ['title']
      for (const page of structured.pages) {
        const id = `page${page.page}`
        chapterIds.push(id)
        oebps.file(`${id}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Page ${page.page}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<h2>Page ${page.page}</h2>
${renderPageXhtml(page.lines)}
</body>
</html>`)
      }

      const manifestItems = chapterIds.map(id =>
        `<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`
      ).join('\n    ')
      const spineItems = chapterIds.map(id => `<itemref idref="${id}"/>`).join('\n    ')
      oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${language}</dc:language>
    <dc:identifier id="uid">${escapeXml(title)}-doclair</dc:identifier>
    <dc:creator>${escapeXml(author)}</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`)

      const navPoints = chapterIds.map((id, i) => `
    <navPoint id="nav${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${id === 'title' ? 'Title Page' : `Page ${i}`}</text></navLabel>
      <content src="${id}.xhtml"/>
    </navPoint>`).join('')
      oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${escapeXml(title)}-doclair"/></head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`)

      setProgress('Compressing EPUB…')
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `${title}.epub`; a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Try a different file.')
    } finally { setSaving(false); setProgress('') }
  }, [])

  return (
    <ToolPageLayout toolName="PDF to ePub" sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}>
<div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to ePub </span>
          <span style={{ color: 'var(--amber)' }}>Convert to eBook Format</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
          Convert PDF files to ePub format for reading on Kindle, Kobo, Apple Books and other eReaders. Text is extracted and reflowed.
        </p>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#1e40af', marginBottom: 24, maxWidth: 540 }}>
          <strong>Note:</strong> Works best with text-based PDFs. Scanned image PDFs will produce empty chapters — use <a href="/ocr-pdf" style={{ color: '#1d4ed8' }}>OCR PDF</a> first.
        </div>
      </div>

      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') process(f) }}
        onDragOver={e => e.preventDefault()}
        style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 64, textAlign: 'center', background: '#fafafa' }}>
        {saving ? (
          <><div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div><p style={{ fontWeight: 600, color: '#374151' }}>{progress}</p></>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#374151' }}>Drop your PDF here</p>
            <p style={{ color: '#9ca3af', marginBottom: 20 }}>Converts to a readable .epub eBook file</p>
            <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
              Choose PDF
              <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
            </label>
            {done && <p style={{ color: '#10b981', fontWeight: 600, marginTop: 16, fontSize: 13 }}>✓ ePub downloaded!</p>}
          </>
        )}
      </div>

      {errorMessage && <ErrorCard message={errorMessage} onReset={() => setErrorMessage('')} />}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Convert PDF to EPUB — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          EPUB is the standard ebook format for e-readers like Kindle, Apple Books, and Kobo. Converting a PDF to EPUB extracts the text and produces a reflowable ebook that adjusts to any screen size.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your PDF or click to upload.</strong> No account or sign-up required.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Wait while text is extracted.</strong> Text is extracted and formatted as EPUB entirely in your browser.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the .epub file.</strong> The converted file saves directly to your device.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Open in your reader.</strong> Open it in Apple Books, Calibre, or any EPUB reader, or upload to your e-reader.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Will my PDF images and layout be preserved?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          EPUB is a reflowable format — text reflows to fit the screen. Images embedded in the PDF are included where possible, but complex layouts, columns, and tables may simplify. For layout-critical documents such as textbooks or magazines, PDF viewing is generally preferred.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          PDF to EPUB on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile Safari and Chrome. After downloading the EPUB, tap to open it in Apple Books (iPhone) or any installed EPUB reader on Android. No desktop software required.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
