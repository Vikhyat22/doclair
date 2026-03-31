'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { extractStructuredPDF, type StructuredLine, type StructuredPage } from '@/lib/pdf/extractStructured'

const FAQS = [
  { q: 'How does PDF to PowerPoint work?', a: 'Doclair first looks for clean text and table structure to rebuild as editable PowerPoint content. Pages with more complex layout or graphics fall back to a high-resolution page image so visual fidelity stays intact.' },
  { q: 'Will text be editable in PowerPoint?', a: 'For simple text-and-table PDFs, yes — Doclair rebuilds the slide with editable text and tables. Complex brochures, flyers, and design-heavy PDFs still export as page images to preserve the original look.' },
  { q: 'Are files uploaded to a server?', a: 'No. Rendering and PPTX creation run entirely in your browser.' },
  { q: 'Is PDF to PowerPoint free?', a: 'Yes. Doclair does not add a watermark to your presentation file.' },
]

const TOOL_SEO_NAME = 'PDF to PowerPoint'
const TOOL_SLUG = 'pdf-to-ppt'
const TOOL_DESCRIPTION = 'Convert PDF to PowerPoint PPTX free online. Simple PDFs become editable text and table slides, while complex pages are preserved as high-resolution slide visuals. No upload, no watermark, files stay in your browser.'

const PPT_PAGE_MARGIN = 0.55
const MAX_STRUCTURED_LINES = 28

type TableRegion = {
  startIndex: number
  endIndex: number
  columnCount: number
  rows: StructuredLine[]
}

function estimateColumnWidths(rows: StructuredLine[], columnCount: number) {
  const scores = Array.from({ length: columnCount }, () => 1)

  rows.forEach(row => {
    for (let index = 0; index < columnCount; index += 1) {
      const value = row.cells[index] ?? ''
      scores[index] = Math.max(scores[index], Math.min(5, value.length * 0.09))
    }
  })

  const total = scores.reduce((sum, score) => sum + score, 0)
  return scores.map(score => Number(((score / total) * 8.9).toFixed(2)))
}

function detectTableRegions(lines: StructuredLine[]) {
  const regions: TableRegion[] = []
  let startIndex = -1
  let columnCount = 0

  for (let index = 0; index <= lines.length; index += 1) {
    const line = lines[index]
    const currentColumnCount = line?.cells.length ?? 0
    const isCandidate = currentColumnCount >= 3

    if (isCandidate && (startIndex === -1 || currentColumnCount === columnCount)) {
      if (startIndex === -1) {
        startIndex = index
        columnCount = currentColumnCount
      }
      continue
    }

    if (startIndex !== -1 && index - startIndex >= 2) {
      regions.push({
        startIndex,
        endIndex: index - 1,
        columnCount,
        rows: lines.slice(startIndex, index),
      })
    }

    startIndex = isCandidate ? index : -1
    columnCount = isCandidate ? currentColumnCount : 0
  }

  return regions
}

function canBuildStructuredSlide(page: StructuredPage) {
  if (page.lines.length === 0 || page.lines.length > MAX_STRUCTURED_LINES) return false
  if (page.lines.some(line => line.text.length > 160)) return false
  return true
}

function renderStructuredSlide(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide: any,
  page: StructuredPage,
  aspectW: number,
  aspectH: number,
) {
  if (!canBuildStructuredSlide(page)) return false

  const lines = page.lines
  const tableRegions = detectTableRegions(lines)
  const primaryTable = tableRegions[0]
  const topLines = primaryTable ? lines.slice(0, primaryTable.startIndex) : lines
  const bottomLines = primaryTable ? lines.slice(primaryTable.endIndex + 1) : []
  let cursorY = PPT_PAGE_MARGIN
  const contentWidth = aspectW - (PPT_PAGE_MARGIN * 2)

  slide.background = { color: 'FFFFFF' }

  topLines.forEach((line, index) => {
    const isTitle = index === 0 && line.text.length <= 90
    const isSubtitle = index === 1 && line.text.length <= 110
    const fontSize = isTitle ? 22 : isSubtitle ? 13.5 : 11.5
    const bold = isTitle || isSubtitle
    const height = isTitle ? 0.55 : line.text.length > 96 ? 0.42 : 0.32

    slide.addText(line.text, {
      x: PPT_PAGE_MARGIN,
      y: cursorY,
      w: contentWidth,
      h: height,
      fontFace: isTitle ? 'Aptos Display' : 'Aptos',
      fontSize,
      bold,
      color: isTitle ? '111827' : '334155',
      margin: 0,
      fit: 'shrink',
    })

    cursorY += isTitle ? 0.5 : height
    if (isSubtitle) cursorY += 0.03
    if (!isTitle && !isSubtitle) cursorY += 0.05
  })

  if (primaryTable) {
    const tableRows = primaryTable.rows.map((row, rowIndex) =>
      row.cells.map(cell => ({
        text: cell,
        options: {
          bold: rowIndex === 0,
          color: rowIndex === 0 ? 'F8FAFC' : '0F172A',
          fill: { color: rowIndex === 0 ? '1F2937' : 'FFFFFF' },
          border: { color: 'CBD5E1', pt: 1 },
          margin: 4,
          fontFace: 'Aptos',
          fontSize: rowIndex === 0 ? 10.5 : 10,
          align: rowIndex === 0 ? 'center' : 'left',
          valign: 'mid',
        },
      })),
    )

    const tableHeight = Math.min(
      aspectH - cursorY - (bottomLines.length > 0 ? 1.15 : 0.75),
      0.45 + (primaryTable.rows.length * 0.42),
    )

    slide.addTable(tableRows, {
      x: PPT_PAGE_MARGIN,
      y: cursorY,
      w: contentWidth,
      h: Math.max(1.1, tableHeight),
      colW: estimateColumnWidths(primaryTable.rows, primaryTable.columnCount),
      rowH: primaryTable.rows.map((_, index) => index === 0 ? 0.34 : 0.4),
      margin: 0,
      border: { color: 'CBD5E1', pt: 1 },
      fill: { color: 'FFFFFF' },
      fontFace: 'Aptos',
      fontSize: 10,
      autoPage: false,
    })

    cursorY += Math.max(1.1, tableHeight) + 0.18
  }

  bottomLines.forEach(line => {
    slide.addText(line.text, {
      x: PPT_PAGE_MARGIN,
      y: cursorY,
      w: contentWidth,
      h: line.text.length > 100 ? 0.42 : 0.28,
      fontFace: 'Aptos',
      fontSize: 11,
      color: '334155',
      margin: 0,
      fit: 'shrink',
    })
    cursorY += line.text.length > 100 ? 0.44 : 0.31
  })

  slide.addText(`Page ${page.page}`, {
    x: aspectW - 1.05,
    y: aspectH - 0.35,
    w: 0.5,
    h: 0.15,
    fontFace: 'Aptos',
    fontSize: 8.5,
    color: '94A3B8',
    align: 'right',
    margin: 0,
  })

  return true
}

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
        'Editable text and tables for simple PDFs',
        'Image fallback for complex layouts',
        'Custom slide size from first page aspect ratio',
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

const sidebar = (
  <ToolSidebar
    reverseActions={[
      { name: 'PowerPoint → PDF', slug: 'ppt-to-pdf', icon: '📊', colorBg: '#D1FAE5', desc: 'Convert slides back to PDF' },
    ]}
    relatedTools={[
      { name: 'PDF → Text', slug: 'pdf-to-text', icon: '📝', colorBg: '#D1FAE5', desc: 'Extract all text from PDF' },
      { name: 'PDF → Word', slug: 'pdf-to-word', icon: '📝', colorBg: '#FFF0DC', desc: 'Convert PDF to editable Word' },
      { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size safely' },
      { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', colorBg: '#FFF0DC', desc: 'Combine multiple PDFs' },
    ]}
  />
)

export default function PdfToPptPage() {
  const [progress, setProgress] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [pageCount, setPageCount] = useState(0)

  const process = useCallback(async (file: File) => {
    setSaving(true); setDone(false); setProgress('')
    try {
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      setProgress('Analyzing PDF structure…')
      const structured = await extractStructuredPDF(file, (page, total) => {
        const currentPage = Math.min(total, Math.max(1, page + 1))
        setProgress(`Analyzing page ${currentPage} of ${total}…`)
      })
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
      setPageCount(doc.numPages)

      setProgress('Building PowerPoint…')
      const PptxGenJS = (await import('pptxgenjs')).default
      const pptx = new PptxGenJS()

      // Use aspect ratio of first page
      const firstPage = await doc.getPage(1)
      const first = firstPage.getViewport({ scale: 1 })
      const aspectW = 10  // inches
      const aspectH = (first.height / first.width) * aspectW
      pptx.defineLayout({ name: 'CUSTOM', width: aspectW, height: aspectH })
      pptx.layout = 'CUSTOM'

      for (let i = 1; i <= doc.numPages; i += 1) {
        setProgress(`Building slide ${i} of ${doc.numPages}…`)
        const slide = pptx.addSlide()
        const structuredPage = structured.pages[i - 1]
        const builtStructured = structuredPage
          ? renderStructuredSlide(slide, structuredPage, aspectW, aspectH)
          : false

        if (!builtStructured) {
          setProgress(`Rendering complex page ${i} of ${doc.numPages}…`)
          const page = await doc.getPage(i)
          const vp = page.getViewport({ scale: 2 })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width; canvas.height = vp.height
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (page.render as any)({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

          slide.addImage({
            data: dataUrl,
            x: 0, y: 0,
            w: aspectW, h: aspectH,
            sizing: { type: 'contain', w: aspectW, h: aspectH },
          })
        }
      }

      setProgress('Saving PPTX…')
      const name = file.name.replace(/\.pdf$/i, '') || 'presentation'
      await pptx.writeFile({ fileName: `${name}.pptx` })
      setDone(true)
    } catch (err) {
      setProgress(`Error: ${(err as Error).message}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <ToolPageLayout toolName="PDF to PowerPoint" sidebar={sidebar}>

{/* Tool Header Card */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to PowerPoint </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Convert PDF pages to PowerPoint slides with editable text and tables where possible, plus high-fidelity image fallback for complex pages. All processing happens in your browser.
        </p>
      </div>

      <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#92400e', maxWidth: 540 }}>
        <strong>How it works:</strong> Clean text-and-table pages are rebuilt as editable slide content. Design-heavy or irregular pages fall back to high-resolution slide images so the layout still looks right.
      </div>

      {!saving && !done && (
        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') process(f) }}
          onDragOver={e => e.preventDefault()}
          style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 72, textAlign: 'center', background: '#fafafa' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</p>
          <p style={{ color: '#9ca3af', marginBottom: 24 }}>Editable when simple, faithful when complex</p>
          <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Choose PDF
            <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {saving && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>{progress}</p>
        </div>
      )}

      {done && !saving && (
        <div style={{ textAlign: 'center', padding: 48, border: '2px solid #d1fae5', borderRadius: 16, background: '#f0fdf4' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: 18, color: '#166534', marginBottom: 16 }}>
            Downloaded — {pageCount} pages → {pageCount} slides
          </p>
          <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Convert Another
            <input type="file" accept="application/pdf" onChange={e => { setDone(false); const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', marginBottom: '16px' }}>How to Convert PDF to PowerPoint — Free</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.8, color: 'var(--ink)', opacity: 0.8 }}>
          <li>Drop your PDF or click to browse.</li>
          <li>Doclair detects whether each page can become editable slide content or should stay as a visual slide.</li>
          <li>Your .pptx file downloads automatically with one slide per page.</li>
        </ol>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '28px', marginBottom: '10px' }}>Will the text be editable in PowerPoint?</h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Simple reports, proposals, and table-based PDFs can now become editable PowerPoint text and tables. More visual PDFs still export as high-resolution slide images so graphics, spacing, and page composition stay intact.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '28px', marginBottom: '10px' }}>PDF to PowerPoint on iPhone and Android</h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Works in Safari and Chrome on mobile. The PPTX file downloads to your Files app and can be opened directly in the Microsoft PowerPoint app.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
