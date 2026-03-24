'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'What size is the blank page?', a: 'By default the blank page matches the size of your first PDF page. You can also choose A4 or US Letter from the options.' },
  { q: 'Can I add multiple blank pages?', a: 'Currently one blank page per operation. Run the tool again on the result to add more.' },
  { q: 'Can I add a blank page at the end?', a: 'Yes. Set the "Insert after page" value to the total number of pages and the blank page will be added at the very end.' },
  { q: 'Are my files uploaded to a server?', a: 'Never. Your PDF is processed using pdf-lib running directly in your browser tab. No data is sent anywhere.' },
  { q: 'Can I add a blank page on iPhone or Android?', a: 'Yes. Doclair works in Safari on iPhone and iPad, and Chrome on Android.' },
  { q: 'Will the blank page have the same orientation as the rest?', a: 'Yes, when using "Match document" size. The blank page inherits the dimensions of the first page, including landscape or portrait orientation.' },
]

const TOOL_SEO_NAME = 'Add Blank Page to PDF'
const TOOL_SLUG = 'add-blank-page'
const TOOL_DESCRIPTION = 'Insert a blank page anywhere in a PDF. Choose position and size — A4, US Letter, or match your document. 100% free, no upload, no watermark.'

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
        'Insert a blank page at any position',
        'A4, US Letter, or match document size',
        'Runs entirely in your browser',
        'No watermark on output',
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

type PageSize = 'match' | 'a4' | 'letter'

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

const PAGE_SIZES: Record<PageSize, { label: string; desc: string }> = {
  match:  { label: 'Match document', desc: 'Same size as first page' },
  a4:     { label: 'A4',             desc: '210 × 297 mm' },
  letter: { label: 'US Letter',      desc: '8.5 × 11 in' },
}

export default function AddBlankPagePage() {
  const [file, setFile]           = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [insertAfter, setInsertAfter] = useState(1)
  const [pageSize, setPageSize]   = useState<PageSize>('match')
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return
    setResultBytes(null); setToolState('idle')
    const { PDFDocument } = await import('@cantoo/pdf-lib')
    const doc = await PDFDocument.load(await f.arrayBuffer())
    const count = doc.getPageCount()
    setFile(f); setTotalPages(count); setInsertAfter(count)
  }, [])

  async function handleAdd() {
    if (!file) return
    setToolState('merging')
    try {
      const { PDFDocument, PageSizes } = await import('@cantoo/pdf-lib')
      const doc = await PDFDocument.load(await file.arrayBuffer())
      const pages = doc.getPages()

      let width: number, height: number
      if (pageSize === 'a4') {
        [width, height] = PageSizes.A4
      } else if (pageSize === 'letter') {
        [width, height] = PageSizes.Letter
      } else {
        // match first page
        const first = pages[0]
        width = first.getWidth(); height = first.getHeight()
      }

      // insertAfter is 1-based; index insertAfter means after page insertAfter
      const insertIndex = Math.min(Math.max(insertAfter, 0), doc.getPageCount())
      doc.insertPage(insertIndex, [width, height])
      setResultBytes(await doc.save())
      setToolState('done')
    } catch (err) {
      setToolState('idle')
      alert('Failed: ' + (err instanceof Error ? err.message : 'Unknown'))
    }
  }

  function handleDownload() {
    if (!resultBytes) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([resultBytes as BlobPart], { type: 'application/pdf' }))
    a.download = 'doclair-blank-page-added.pdf'; a.click()
  }

  function handleReset() {
    setFile(null); setTotalPages(0); setInsertAfter(1)
    setPageSize('match'); setResultBytes(null); setToolState('idle')
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Organize Pages', slug: 'organize-pages',        icon: '📋', colorBg: '#DBEAFE', desc: 'Reorder and delete pages visually' },
        { name: 'Add Pages',      slug: 'add-pages-to-pdf',      icon: '➕', colorBg: '#DCFCE7', desc: 'Insert pages from another PDF' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',          slug: 'merge-pdf',              icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Remove Pages',       slug: 'remove-pages-from-pdf',  icon: '🗑️', colorBg: '#FEE2E2', desc: 'Delete unwanted pages' },
        { name: 'Add Pages',          slug: 'add-pages-to-pdf',       icon: '➕', colorBg: '#DBEAFE', desc: 'Insert pages from another PDF' },
        { name: 'Rotate PDF',         slug: 'rotate-pdf',             icon: '🔄', colorBg: '#FFF0DC', desc: 'Fix page orientation' },
        { name: 'Split PDF',          slug: 'split-pdf',              icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract pages as files' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Add Blank Page" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Add Blank Page </span>
          <span style={{ color: 'var(--amber)' }}>to PDF</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Insert a blank page anywhere in a PDF. Choose size and position. No upload, no watermark.
        </p>
      </div>

      {toolState === 'idle' && !file && (
        <DropZone onFilesAdded={addFile} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={0}
          icon="📄" label="Drop your PDF here" subLabel="or click to browse — max 200 MB" />
      )}

      {toolState === 'idle' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* File row */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {formatBytes(file.size)} · {totalPages} pages
              </div>
            </div>
            <button onClick={handleReset} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--muted)' }}>✕</button>
          </div>

          {/* Options */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px' }}>// Blank Page Options</div>

            {/* Position */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>Insert after page</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="number" min={0} max={totalPages} value={insertAfter}
                  onChange={e => setInsertAfter(Math.min(Math.max(0, parseInt(e.target.value) || 0), totalPages))}
                  style={{ width: '80px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontWeight: 600, color: 'var(--ink)', background: 'white', textAlign: 'center' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {insertAfter === 0 ? '— blank page will be inserted at the beginning' : insertAfter === totalPages ? `— blank page will be added at the end (after page ${totalPages})` : `— blank page will appear between pages ${insertAfter} and ${insertAfter + 1}`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setInsertAfter(0)} style={{ padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border)', background: insertAfter === 0 ? 'var(--ink)' : 'transparent', color: insertAfter === 0 ? 'white' : 'var(--ink)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'all 0.12s' }}>At beginning</button>
                <button onClick={() => setInsertAfter(totalPages)} style={{ padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border)', background: insertAfter === totalPages ? 'var(--ink)' : 'transparent', color: insertAfter === totalPages ? 'white' : 'var(--ink)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'all 0.12s' }}>At end</button>
              </div>
            </div>

            {/* Page size */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>Blank page size</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(Object.entries(PAGE_SIZES) as [PageSize, { label: string; desc: string }][]).map(([key, { label, desc }]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${pageSize === key ? 'var(--amber)' : 'var(--border)'}`, background: pageSize === key ? '#FFFBF5' : 'white', cursor: 'pointer', transition: 'all 0.12s' }}>
                    <input type="radio" name="pageSize" value={key} checked={pageSize === key} onChange={() => setPageSize(key)} style={{ accentColor: 'var(--amber)' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleAdd}
            style={{ width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
            📄 Add Blank Page
          </button>
        </div>
      )}

      {toolState === 'merging' && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', color: 'white', marginBottom: '6px' }}>Inserting blank page…</div>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Rebuilding PDF with the new blank page</div>
        </div>
      )}

      {toolState === 'done' && (
        <DownloadCard filename="doclair-blank-page-added.pdf"
          description={`Blank page inserted after page ${insertAfter} · ${totalPages + 1} pages total`}
          onDownload={handleDownload} onReset={handleReset} />
      )}

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
