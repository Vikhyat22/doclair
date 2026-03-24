'use client'

import { useState, useCallback } from 'react'
import { PDFDocument } from '@cantoo/pdf-lib'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { pageNumbersPDF } from '@/lib/pdf/pageNumbers'
import type { PageNumberPosition, PageNumberFormat } from '@/lib/pdf/pageNumbers'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'Can I add page numbers to only some pages?', a: "Yes. Use the 'Apply to pages' field with a range like '2-10, 15, 20-25'. Leave it empty to number all pages." },
  { q: 'Can I skip the first page (cover)?', a: "Yes. Enable 'Skip first page' to leave the cover unnumbered. Counting still starts from the configured Start At value." },
  { q: 'What font is used for page numbers?', a: 'Doclair uses Helvetica — a universally supported PDF font — in the size and colour you choose. The numbers are drawn directly onto the page in gray at 85% opacity for a subtle look.' },
  { q: 'Are my files uploaded?', a: 'Never. pdf-lib runs entirely in your browser. No data leaves your device.' },
  { q: 'Can I set the numbering to start at a specific number?', a: "Yes. Use the 'Start at' field. For example if your document starts at chapter 5, set Start at to 5 and page 1 of your PDF will be labelled 5." },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Add Page Numbers — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/add-page-numbers',
      description: 'Add page numbers to PDF pages free. Choose position, format, font size and page range. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        '6 position options (top/bottom × left/center/right)',
        '4 format options including Page N of Total',
        'Custom start number',
        'Skip first page (cover)',
        'Apply to specific page ranges',
        'No file upload to server',
        'No watermark on output',
        'No sign-up required',
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
    { '@type': 'ListItem', position: 1, name: 'Home',             item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',            item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Add Page Numbers', item: 'https://doclair.in/add-page-numbers' },
  ],
}

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: 'top-left',      label: 'Top Left' },
  { value: 'top-center',    label: 'Top Center' },
  { value: 'top-right',     label: 'Top Right' },
  { value: 'bottom-left',   label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right',  label: 'Bottom Right' },
]

const FORMATS: { value: PageNumberFormat; getLabel: (count: number) => string }[] = [
  { value: 'n',               getLabel: ()  => '1' },
  { value: 'n-of-total',      getLabel: (c) => `1 of ${c}` },
  { value: 'page-n',          getLabel: ()  => 'Page 1' },
  { value: 'page-n-of-total', getLabel: (c) => `Page 1 of ${c}` },
]

export default function AddPageNumbersPage() {
  const [file, setFile]               = useState<File | null>(null)
  const [pageCount, setPageCount]     = useState(0)
  const [toolState, setToolState]     = useState<ToolState>('idle')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [position, setPosition]       = useState<PageNumberPosition>('bottom-center')
  const [format, setFormat]           = useState<PageNumberFormat>('n')
  const [startAt, setStartAt]         = useState(1)
  const [fontSize, setFontSize]       = useState(11)
  const [margin, setMargin]           = useState(28)
  const [skipFirst, setSkipFirst]     = useState(false)
  const [pageRange, setPageRange]     = useState('')

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setResultBytes(null)
    setToolState('idle')
    const bytes = await f.arrayBuffer()
    const doc   = await PDFDocument.load(bytes)
    setFile(f)
    setPageCount(doc.getPageCount())
  }, [])

  async function handleAddNumbers() {
    if (!file) return
    setToolState('merging')
    try {
      const result = await pageNumbersPDF(file, {
        position,
        format,
        startAt,
        fontSize,
        margin,
        skipFirst,
        pageRange: pageRange.trim() || undefined,
      })
      setResultBytes(result)
      setToolState('done')
    } catch (err) {
      setToolState('idle')
      alert('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  function handleDownload() {
    if (!resultBytes) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'doclair-numbered.pdf'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    setFile(null)
    setPageCount(0)
    setToolState('idle')
    setResultBytes(null)
    setPosition('bottom-center')
    setFormat('n')
    setStartAt(1)
    setFontSize(11)
    setMargin(28)
    setSkipFirst(false)
    setPageRange('')
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Organize Pages', slug: 'organize-pages', icon: '📋', colorBg: '#DCFCE7', desc: 'Reorder, rotate and delete pages' },
      ]}
      relatedTools={[
        { name: 'Add Watermark',     slug: 'add-watermark', icon: '💧', colorBg: '#EDE9FE', desc: 'Stamp text or image watermarks' },
        { name: 'Edit PDF Metadata', slug: 'edit-metadata', icon: '🏷️', colorBg: '#FFF0DC', desc: 'Update title, author, keywords' },
        { name: 'Merge PDF',         slug: 'merge-pdf',     icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Compress PDF',      slug: 'compress-pdf',  icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Split PDF',         slug: 'split-pdf',     icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract page ranges' },
      ]}
    />
  )

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
    fontSize: '10px',
    color: 'var(--amber)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '12px',
  }

  const isSaveDisabled = !file

  return (
    <ToolPageLayout toolName="Add Page Numbers" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Add Page Numbers </span>
          <span style={{ color: 'var(--amber)' }}>to Any PDF</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Add page numbers to PDF pages free. Choose position, format, font size and page range. No upload, no watermark.
        </p>
      </div>

      {/* State: idle, no file */}
      {toolState === 'idle' && !file && (
        <DropZone
          onFilesAdded={addFile}
          accept=".pdf"
          maxFiles={1}
          maxSizeMB={200}
          currentCount={0}
          icon="🔢"
          label="Drop your PDF here"
          subLabel="or click to browse — max 200 MB"
        />
      )}

      {/* State: idle, file loaded — configuration */}
      {toolState === 'idle' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Selected file row */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', background: '#FFF0DC', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {pageCount} page{pageCount !== 1 ? 's' : ''}
              </div>
            </div>
            <button
              onClick={handleReset}
              style={{
                width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                background: 'transparent', cursor: 'pointer', fontSize: '14px',
                color: 'var(--muted)', transition: 'all 0.15s', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
            >✕</button>
          </div>

          {/* Configuration panel */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Position */}
            <div>
              <div style={labelStyle}>// Position</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {POSITIONS.map(opt => {
                  const isActive = position === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPosition(opt.value)}
                      style={{
                        padding: '9px 8px', borderRadius: '8px',
                        border: `1px solid ${isActive ? 'var(--amber)' : 'var(--border)'}`,
                        background: isActive ? 'var(--amber)' : 'transparent',
                        color: isActive ? 'white' : 'var(--ink)',
                        cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                        fontSize: '12px', fontWeight: 500, textAlign: 'center',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                          e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Format */}
            <div>
              <div style={labelStyle}>// Format</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {FORMATS.map(opt => {
                  const isActive = format === opt.value
                  const label    = opt.getLabel(pageCount)
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFormat(opt.value)}
                      style={{
                        padding: '8px 16px', borderRadius: '100px',
                        border: `1px solid ${isActive ? 'var(--amber)' : 'var(--border)'}`,
                        background: isActive ? 'var(--amber)' : 'transparent',
                        color: isActive ? 'white' : 'var(--ink)',
                        cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                        fontSize: '12px', fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                          e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Options */}
            <div>
              <div style={labelStyle}>// Options</div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink)', opacity: 0.65 }}>Start at</label>
                  <input
                    type="number"
                    value={startAt}
                    onChange={e => setStartAt(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '80px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink)', opacity: 0.65 }}>Font size</label>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={e => setFontSize(Math.min(24, Math.max(6, parseInt(e.target.value) || 11)))}
                    min={6}
                    max={24}
                    style={{ width: '80px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink)', opacity: 0.65 }}>Margin (pt)</label>
                  <input
                    type="number"
                    value={margin}
                    onChange={e => setMargin(Math.min(72, Math.max(4, parseInt(e.target.value) || 28)))}
                    min={4}
                    max={72}
                    style={{ width: '80px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Skip first page */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', cursor: 'pointer',
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink)',
              }}>
                <input
                  type="checkbox"
                  checked={skipFirst}
                  onChange={e => setSkipFirst(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--amber)', cursor: 'pointer' }}
                />
                Skip first page (cover)
              </label>

              {/* Page range */}
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink)', opacity: 0.65 }}>Apply to pages (optional)</label>
                <input
                  type="text"
                  value={pageRange}
                  onChange={e => setPageRange(e.target.value)}
                  placeholder="e.g. 2-10, 15, 20-end"
                  style={{
                    padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px',
                    fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px',
                    color: 'var(--ink)', outline: 'none', maxWidth: '280px',
                  }}
                />
                <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>
                  Leave empty to number all pages
                </span>
              </div>
            </div>
          </div>

          {/* Add Page Numbers button */}
          <button
            onClick={handleAddNumbers}
            disabled={isSaveDisabled}
            style={{
              width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px',
              borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700, fontSize: '17px', border: 'none',
              cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
              opacity: isSaveDisabled ? 0.4 : 1,
              transition: 'transform 0.15s, opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { if (!isSaveDisabled) e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            🔢 Add Page Numbers
          </button>
        </div>
      )}

      {/* State: merging */}
      {toolState === 'merging' && (
        <div style={{
          background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--amber)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 24px',
          }} />
          <div style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: '24px', color: 'white', marginBottom: '6px',
          }}>Adding page numbers…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>Rendering numbers with Helvetica font</div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && (
        <DownloadCard
          filename="doclair-numbered.pdf"
          description={`${pageCount} pages numbered`}
          onDownload={handleDownload}
          onReset={handleReset}
        />
      )}

      {/* SEO Section */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Add Page Numbers to a PDF — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Page numbers make long documents easier to navigate and reference. Doclair stamps page numbers at the top or bottom of every page, with options for position, font size, and starting number.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your PDF or click to upload.</strong> Select your PDF from your device.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose position</strong> (top-left, top-center, top-right, bottom-left, bottom-center, bottom-right).</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Set font size and starting number.</strong> Adjust the margin if needed.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Add Page Numbers and download</strong> the numbered PDF.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Can I start from a custom number?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Yes. If your document is a chapter starting at page 47, set the start number to 47 and Doclair will number from there. This is useful for multi-chapter documents where each chapter is a separate PDF.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Add Page Numbers on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile Safari and Chrome. Upload your PDF from the Files app, configure numbering, and download the numbered PDF directly to your device.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
