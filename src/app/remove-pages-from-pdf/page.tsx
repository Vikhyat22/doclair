'use client'

import { useState, useCallback, useRef } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import type { ToolState } from '@/types'

const TOOL_SEO_NAME = 'Remove Pages from PDF'
const TOOL_SLUG = 'remove-pages-from-pdf'
const TOOL_DESCRIPTION = 'Remove unwanted pages from PDF files online free. Visual page selector with thumbnails. No upload, no watermark.'

const FAQS = [
  { q: 'Can I remove multiple pages at once?', a: 'Yes. Check all the pages you want to delete, then click "Remove Selected Pages". All checked pages are removed in one step.' },
  { q: 'Is there a page limit?', a: 'No page limit. Doclair processes the PDF entirely in your browser so there are no server-side restrictions.' },
  { q: 'Are my files uploaded to a server?', a: 'Never. Your PDF is processed using pdf-lib running directly in your browser tab. No data is sent anywhere.' },
  { q: 'Can I undo the removal?', a: 'Not within the tool — the original file on your device is never modified. Re-upload your original PDF to start over.' },
  { q: 'Can I remove pages from a password-protected PDF?', a: 'Only if the PDF does not require a password to open. If it does, decrypt it first using the Remove Password tool.' },
  { q: 'Can I remove pages on iPhone or Android?', a: 'Yes. Doclair works in Safari on iPhone and iPad, and Chrome on Android.' },
]

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
      featureList: ['Visual page thumbnails', 'Select multiple pages', 'One-click removal', 'Browser-only processing'],
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

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function RemovePagesPage() {
  const [file, setFile]               = useState<File | null>(null)
  const [totalPages, setTotalPages]   = useState(0)
  const [thumbnails, setThumbnails]   = useState<string[]>([])
  const [thumbsLoading, setThumbsLoading] = useState(false)
  const [selected, setSelected]       = useState<Set<number>>(new Set())
  const [toolState, setToolState]     = useState<ToolState>('idle')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const thumbUrlsRef                  = useRef<string[]>([])
  const fileBufferRef                 = useRef<ArrayBuffer | null>(null)

  async function generateThumbnails(bytes: ArrayBuffer, count: number) {
    setThumbsLoading(true)
    const urls: string[] = []
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false }).promise
      for (let i = 1; i <= count; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.45 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('fail')), 'image/jpeg', 0.7))
        urls.push(URL.createObjectURL(blob))
        canvas.width = 0; canvas.height = 0
        setThumbnails([...urls])
      }
      thumbUrlsRef.current = urls
    } catch (e) { console.warn('Thumbnails failed:', e) }
    finally { setThumbsLoading(false) }
  }

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return
    thumbUrlsRef.current.forEach(URL.revokeObjectURL); thumbUrlsRef.current = []
    setThumbnails([]); setSelected(new Set()); setResultBytes(null); setToolState('idle')
    const bytes = await f.arrayBuffer()
    fileBufferRef.current = bytes
    const { PDFDocument } = await import('@cantoo/pdf-lib')
    const doc = await PDFDocument.load(bytes)
    setFile(f); setTotalPages(doc.getPageCount())
    generateThumbnails(bytes, doc.getPageCount())
  }, [])

  function togglePage(i: number) {
    setSelected(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }
  function selectAll()    { setSelected(new Set(Array.from({ length: totalPages }, (_, i) => i))) }
  function selectNone()   { setSelected(new Set()) }
  function invertSel()    { setSelected(prev => new Set(Array.from({ length: totalPages }, (_, i) => i).filter(i => !prev.has(i)))) }

  async function handleRemove() {
    if (!file || selected.size === 0 || selected.size >= totalPages) return
    setToolState('merging')
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const doc = await PDFDocument.load(fileBufferRef.current!)
      Array.from(selected).sort((a, b) => b - a).forEach(i => doc.removePage(i))
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
    a.download = `${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_pages-removed.pdf`; a.click()
  }

  function handleReset() {
    thumbUrlsRef.current.forEach(URL.revokeObjectURL); thumbUrlsRef.current = []
    fileBufferRef.current = null
    setFile(null); setTotalPages(0); setThumbnails([]); setSelected(new Set())
    setResultBytes(null); setToolState('idle')
  }

  const remaining = totalPages - selected.size

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Organize Pages', slug: 'organize-pages',  icon: '📋', colorBg: '#DBEAFE', desc: 'Reorder and delete pages visually' },
        { name: 'Split PDF',      slug: 'split-pdf',        icon: '✂️', colorBg: '#DBEAFE', desc: 'Extract page ranges' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',       slug: 'merge-pdf',        icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Split PDF',       slug: 'split-pdf',        icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract pages as files' },
        { name: 'Rotate PDF',      slug: 'rotate-pdf',       icon: '🔄', colorBg: '#FFF0DC', desc: 'Fix page orientation' },
        { name: 'Add Blank Page',  slug: 'add-blank-page',   icon: '📄', colorBg: '#DCFCE7', desc: 'Insert blank pages' },
        { name: 'Add Pages',       slug: 'add-pages-to-pdf', icon: '➕', colorBg: '#DBEAFE', desc: 'Insert pages from another PDF' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Remove Pages from PDF" sidebar={sidebar}>
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
          <span style={{ color: 'var(--ink)' }}>Remove Pages </span>
          <span style={{ color: 'var(--amber)' }}>from PDF</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Click pages to mark them for deletion. Visual preview. No upload, no watermark.
        </p>
      </div>

      {toolState === 'idle' && !file && (
        <DropZone onFilesAdded={addFile} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={0}
          icon="🗑️" label="Drop your PDF here" subLabel="or click to browse — max 200 MB" />
      )}

      {toolState === 'idle' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* File row */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: '#FEE2E2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {formatBytes(file.size)} · {totalPages} pages · {selected.size > 0 ? `${selected.size} marked for removal · ${remaining} will remain` : 'click pages below to mark for removal'}
              </div>
            </div>
            <button onClick={handleReset} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--muted)' }}>✕</button>
          </div>

          {/* Selection controls */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: '4px' }}>// Quick select</div>
            {[{ label: 'All', fn: selectAll }, { label: 'None', fn: selectNone }, { label: 'Invert', fn: invertSel }].map(({ label, fn }) => (
              <button key={label} onClick={fn} style={{ padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 500, color: 'var(--ink)', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                {label}
              </button>
            ))}
            {selected.size > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>{selected.size} page{selected.size !== 1 ? 's' : ''} selected</span>}
          </div>

          {/* Thumbnail grid */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>// Pages — click to mark for removal</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
              {Array.from({ length: totalPages }, (_, i) => {
                const isSelected = selected.has(i)
                return (
                  <div key={i} onClick={() => togglePage(i)} style={{ border: `2px solid ${isSelected ? '#DC2626' : 'var(--border)'}`, borderRadius: '8px', overflow: 'hidden', background: isSelected ? '#FEF2F2' : 'white', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', background: '#DC2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                        <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>✕</span>
                      </div>
                    )}
                    <div style={{ height: '130px', background: isSelected ? '#FEF2F2' : '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {(thumbsLoading && !thumbnails[i]) || !thumbnails[i] ? (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: 'var(--amber)', animation: 'spin 0.8s linear infinite' }} />
                      ) : (
                        <img src={thumbnails[i]} alt={`Page ${i + 1}`} style={{ maxWidth: '90%', maxHeight: '120px', objectFit: 'contain', opacity: isSelected ? 0.35 : 1, transition: 'opacity 0.15s' }} />
                      )}
                    </div>
                    <div style={{ padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: isSelected ? '#DC2626' : 'var(--muted)', fontWeight: isSelected ? 700 : 400 }}>Page {i + 1}</div>
                      {isSelected && <span style={{ fontSize: '9px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', color: '#DC2626', fontWeight: 700 }}>DELETE</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button onClick={handleRemove} disabled={selected.size === 0 || selected.size >= totalPages}
            style={{ width: '100%', background: selected.size > 0 ? '#DC2626' : 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', border: 'none', cursor: selected.size === 0 ? 'not-allowed' : 'pointer', opacity: selected.size === 0 ? 0.4 : 1, transition: 'all 0.15s' }}
            onMouseEnter={e => { if (selected.size > 0) e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
            🗑️ {selected.size > 0 ? `Remove ${selected.size} Page${selected.size !== 1 ? 's' : ''} — ${remaining} will remain` : 'Select pages to remove'}
          </button>
        </div>
      )}

      {toolState === 'merging' && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', color: 'white', marginBottom: '6px' }}>Removing pages…</div>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Rebuilding PDF without the selected pages</div>
        </div>
      )}

      {toolState === 'done' && (
        <DownloadCard
          filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_pages-removed.pdf`}
          description={`${selected.size} page${selected.size !== 1 ? 's' : ''} removed · ${remaining} page${remaining !== 1 ? 's' : ''} remaining`}
          onDownload={handleDownload}
          onReset={handleReset}
          title="Pages removed!"
          resetLabel="Remove from another →"
          nextSteps={[
            { slug: 'organize-pages', name: 'Organize Pages', icon: '📋' },
            { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
            { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
          ]}
        />
      )}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Remove Pages from a PDF — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Whether you need to delete a blank page, remove a confidential section, or trim an appendix, Doclair makes it easy to select and remove any page from your PDF without uploading to a server.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your PDF or click to upload.</strong> Page thumbnails load automatically.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click the pages you want to remove.</strong> A red X appears on selected pages.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click &quot;Remove Selected Pages&quot;.</strong> The PDF is rebuilt without the selected pages.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the cleaned PDF.</strong> Your original file is never modified.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Can I remove multiple pages at once?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Yes. Click all the pages you want to delete before hitting Remove. There is no limit on how many pages you can remove in a single operation.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Remove Pages from PDF on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in Safari and Chrome on mobile. Thumbnail generation works on all modern mobile browsers — tap pages to select them, then download the cleaned PDF.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
