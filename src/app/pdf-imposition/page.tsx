'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ErrorCard from '@/components/ui/ErrorCard'
import ToolSidebar from '@/components/ui/ToolSidebar'
import FAQ from '@/components/ui/FAQ'

const SIDEBAR_RELATED = [
  { name: 'PDF to Booklet', slug: 'pdf-to-booklet', icon: '📚', colorBg: '#FFF0DC', desc: 'Booklet layout' },
  { name: 'Cut PDF',        slug: 'cut-pdf',        icon: '✂️', colorBg: '#DBEAFE', desc: 'Split pages in half' },
  { name: 'Crop PDF',       slug: 'crop-pdf',       icon: '🖼',  colorBg: '#EDE9FE', desc: 'Trim page margins' },
]

type NUp = '2' | '4' | '6' | '9'
type PageSize = 'A4' | 'Letter'

const NUP_CONFIG: Record<NUp, { cols: number; rows: number }> = {
  '2': { cols: 2, rows: 1 },
  '4': { cols: 2, rows: 2 },
  '6': { cols: 3, rows: 2 },
  '9': { cols: 3, rows: 3 },
}
const PAGE_SIZES: Record<PageSize, [number, number]> = {
  A4: [595, 842],
  Letter: [612, 792],
}

const FAQS = [
  { q: 'What is PDF imposition?', a: 'Imposition places multiple PDF pages on a single printed sheet (2-up, 4-up, etc.) to save paper and simplify printing.' },
  { q: 'Are my files uploaded?', a: 'No. Rendering and layout are done with PDF.js and pdf-lib in your browser.' },
  { q: 'Can I choose sheet size and orientation?', a: 'Yes. Pick A4 or Letter and portrait or landscape before you drop your PDF.' },
  { q: 'Is imposition free?', a: 'Yes. The downloaded PDF has no Doclair watermark.' },
]

const TOOL_SEO_NAME = 'PDF Imposition'
const TOOL_SLUG = 'pdf-imposition'
const TOOL_DESCRIPTION = 'N-up PDF printing layout — arrange multiple pages on one sheet. 100% free, no upload, no watermark.'

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
        '2-up, 4-up, 6-up, and 9-up layouts',
        'A4 or Letter with portrait or landscape',
        'Local browser processing',
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

export default function PDFImpositionPage() {
  const [nup, setNup] = useState<NUp>('2')
  const [pageSize, setPageSize] = useState<PageSize>('A4')
  const [landscape, setLandscape] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const process = useCallback(async (file: File) => {
    setSaving(true); setErrorMessage('')
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const sourceBytes = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(sourceBytes)
      const srcPages = srcDoc.getPages()
      const { cols, rows } = NUP_CONFIG[nup]
      const nPerSheet = cols * rows

      let [sheetW, sheetH] = PAGE_SIZES[pageSize]
      if (landscape) [sheetW, sheetH] = [sheetH, sheetW]
      const margin = 12
      const cellW = (sheetW - margin * (cols + 1)) / cols
      const cellH = (sheetH - margin * (rows + 1)) / rows

      const out = await PDFDocument.create()
      const embeddedPages = await Promise.all(srcPages.map(page => out.embedPage(page)))
      let pageIdx = 0
      while (pageIdx < embeddedPages.length) {
        const sheet = out.addPage([sheetW, sheetH])
        for (let slot = 0; slot < nPerSheet && pageIdx < embeddedPages.length; slot++, pageIdx++) {
          const col = slot % cols
          const row = Math.floor(slot / cols)
          const embeddedPage = embeddedPages[pageIdx]
          // Fit image into cell preserving aspect ratio
          const imgRatio = embeddedPage.width / embeddedPage.height
          let dw = cellW, dh = cellH
          if (cellW / cellH > imgRatio) { dw = cellH * imgRatio } else { dh = cellW / imgRatio }
          const dx = margin + col * (cellW + margin) + (cellW - dw) / 2
          const slotTop = sheetH - margin - row * (cellH + margin)
          const dy = slotTop - cellH + (cellH - dh) / 2
          sheet.drawPage(embeddedPage, { x: dx, y: dy, width: dw, height: dh })
        }
      }

      const outputBytes = await out.save()
      const outputBuffer = Uint8Array.from(outputBytes).buffer as ArrayBuffer
      const blob = new Blob([outputBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = file.name.replace(/\.pdf$/i, `-${nup}up.pdf`); a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Try a different file.')
    } finally { setSaving(false) }
  }, [nup, pageSize, landscape])

  const handleFile = (file: File) => { setPdfFile(file); process(file) }

  return (
    <ToolPageLayout toolName="PDF Imposition" sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}>
<div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF Imposition </span>
          <span style={{ color: 'var(--amber)' }}>N-Up Print Layout</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '24px' }}>
          Arrange multiple PDF pages on a single sheet — 2-up, 4-up, 6-up, or 9-up layouts for efficient printing.
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Pages per sheet</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['2', '4', '6', '9'] as NUp[]).map(n => (
              <button key={n} onClick={() => setNup(n)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: nup === n ? '#F59E0B' : '#e5e7eb',
                background: nup === n ? '#FFF8EC' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>{n}-up</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Sheet size</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['A4', 'Letter'] as PageSize[]).map(s => (
              <button key={s} onClick={() => setPageSize(s)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: pageSize === s ? '#F59E0B' : '#e5e7eb',
                background: pageSize === s ? '#FFF8EC' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Orientation</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[false, true].map(l => (
              <button key={String(l)} onClick={() => setLandscape(l)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: landscape === l ? '#F59E0B' : '#e5e7eb',
                background: landscape === l ? '#FFF8EC' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>{l ? 'Landscape' : 'Portrait'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f) }}
        onDragOver={e => e.preventDefault()}
        style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 64, textAlign: 'center', background: '#fafafa', cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p style={{ fontWeight: 600, color: '#374151' }}>Processing imposition…</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📐</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#374151' }}>Drop PDF here to impose</p>
            <p style={{ color: '#9ca3af', marginBottom: 20 }}>Will create a {nup}-up layout on {pageSize} {landscape ? 'landscape' : 'portrait'}</p>
            <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
              Choose PDF
              <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
            </label>
            {pdfFile && <p style={{ color: '#10b981', fontWeight: 600, marginTop: 12, fontSize: 13 }}>✓ Done! Check your downloads.</p>}
          </>
        )}
      </div>

      {errorMessage && <ErrorCard message={errorMessage} onReset={() => setErrorMessage('')} />}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Use PDF Imposition — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          PDF imposition arranges multiple pages onto a single printed sheet, saving paper and simplifying large print runs. Doclair supports 2-up, 4-up, 6-up, and 9-up layouts with A4 or Letter paper in portrait or landscape.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose your N-up layout.</strong> Pick 2, 4, 6, or 9 pages per sheet.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Select paper size and orientation.</strong> Choose A4 or Letter in portrait or landscape.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your PDF or click to upload.</strong> Processing happens instantly in your browser.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download and print.</strong> The imposed PDF downloads automatically — print double-sided to create a booklet or handout.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          What is N-up printing?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          N-up printing places N document pages on a single physical sheet. 2-up is common for handouts, 4-up for presentation notes, and 9-up for thumbnail proofs. Imposition is used in professional printing to reduce paper and production costs.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          PDF Imposition on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile Safari and Chrome. Upload your PDF from the Files app, configure the layout, and download the imposed PDF directly to your device.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
