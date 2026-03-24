'use client'

import { useState, useCallback, useRef } from 'react'
import { PDFDocument } from '@cantoo/pdf-lib'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'Can I rotate just some pages and not others?', a: 'Yes. Click ↺ or ↻ on individual page thumbnails to rotate specific pages. Or use the bulk controls to rotate all portrait or all landscape pages at once.' },
  { q: 'Is rotation permanent in the output PDF?', a: 'Yes. The rotation is applied to the page rotation metadata in the PDF, not just a CSS transform. Every PDF reader will display the pages in the rotated orientation.' },
  { q: 'Can I rotate 180° to flip a page upside down?', a: 'Yes. Use the "Flip 180°" option in the bulk controls, or click ↻ twice on an individual page thumbnail.' },
  { q: 'Is there a page limit?', a: 'No. Doclair processes the PDF entirely in your browser using pdf-lib, so there are no server-side limits.' },
  { q: 'Are my files uploaded to a server?', a: 'Never. Your PDF is processed using pdf-lib running directly in your browser. No data is sent to any server.' },
  { q: 'Can I rotate a PDF on iPhone or Android?', a: 'Yes. Doclair works in Safari on iPhone and iPad, and Chrome on Android. The visual thumbnails and rotation buttons all work on touch screens.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Rotate PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/rotate-pdf',
      description: 'Rotate PDF pages individually or in bulk — 90°, 180°, or 270°. Visual page preview. Files never leave your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Per-page rotation with visual preview',
        'Bulk rotate all, portrait-only, or landscape-only pages',
        '90°, 180°, 270° rotation support',
        'No file upload to server',
        'No watermark on output',
        'No sign-up required',
        'Works on mobile',
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
    { '@type': 'ListItem', position: 1, name: 'Home',       item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',      item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Rotate PDF', item: 'https://doclair.in/rotate-pdf' },
  ],
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function RotatePDFPage() {
  const [file, setFile]                     = useState<File | null>(null)
  const [totalPages, setTotalPages]         = useState(0)
  const [thumbnails, setThumbnails]         = useState<string[]>([])
  const [thumbsLoading, setThumbsLoading]   = useState(false)
  const [pageRotations, setPageRotations]   = useState<number[]>([])
  // bulkAngle state retained for interface but derived value used in applyBulkRotation
  const [, setBulkAngle]                    = useState<90 | 180 | 270>(90)
  const [bulkDirection, setBulkDirection]   = useState<'cw' | 'ccw' | 'flip'>('cw')
  const [toolState, setToolState]           = useState<ToolState>('idle')
  const [resultBytes, setResultBytes]       = useState<Uint8Array | null>(null)
  const [errorMessage, setErrorMessage]     = useState('')
  const thumbUrlsRef                        = useRef<string[]>([])

  async function generateThumbnails(fileBytes: ArrayBuffer, pageCount: number) {
    setThumbsLoading(true)
    const urls: string[] = []
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(fileBytes),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise

      for (let i = 1; i <= pageCount; i++) {
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.5 })
        const canvas   = document.createElement('canvas')
        canvas.width   = Math.floor(viewport.width)
        canvas.height  = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        // pdfjs v5 requires BOTH canvas and canvasContext
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('fail')), 'image/jpeg', 0.75)
        )
        const url = URL.createObjectURL(blob)
        urls.push(url)
        canvas.width = 0; canvas.height = 0
        setThumbnails([...urls])
      }
      thumbUrlsRef.current = urls
    } catch (e) {
      console.warn('Thumbnail generation failed:', e)
    } finally {
      setThumbsLoading(false)
    }
  }

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    thumbUrlsRef.current.forEach(URL.revokeObjectURL)
    thumbUrlsRef.current = []
    setThumbnails([])
    setResultBytes(null)
    setToolState('idle')

    const bytes = await f.arrayBuffer()
    const doc   = await PDFDocument.load(bytes)
    const count = doc.getPageCount()
    setFile(f)
    setTotalPages(count)
    setPageRotations(Array(count).fill(0))
    generateThumbnails(bytes, count)
  }, [])

  function rotatePage(index: number, delta: number) {
    setPageRotations(prev => {
      const next = [...prev]
      next[index] = ((prev[index] + delta) + 360) % 360
      return next
    })
  }

  function applyBulkRotation(scope: 'all' | 'portrait' | 'landscape') {
    const delta = bulkDirection === 'cw' ? 90 : bulkDirection === 'ccw' ? 270 : 180
    setPageRotations(prev => {
      const next = [...prev]
      prev.forEach((rot, i) => {
        const isPortrait  = rot === 0 || rot === 180
        const isLandscape = rot === 90 || rot === 270
        if (
          scope === 'all' ||
          (scope === 'portrait'  && isPortrait) ||
          (scope === 'landscape' && isLandscape)
        ) {
          next[i] = (rot + delta) % 360
        }
      })
      return next
    })
  }

  function resetAll() {
    setPageRotations(Array(totalPages).fill(0))
  }

  const modifiedCount  = pageRotations.filter(r => r !== 0).length
  const isSaveDisabled = modifiedCount === 0 || !file

  async function handleSave() {
    if (!file) return
    setToolState('merging')
    try {
      const { PDFDocument: PDFDoc, degrees } = await import('@cantoo/pdf-lib')
      const bytes = await file.arrayBuffer()
      const doc   = await PDFDoc.load(bytes)
      const pages = doc.getPages()
      pageRotations.forEach((rot, i) => {
        if (rot !== 0 && i < pages.length) {
          const current = pages[i].getRotation().angle
          pages[i].setRotation(degrees((current + rot) % 360))
        }
      })
      const saved = await doc.save()
      setResultBytes(saved)
      setToolState('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message)
      setToolState('error')
    }
  }

  function handleDownload() {
    if (!resultBytes) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_rotated.pdf`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    thumbUrlsRef.current.forEach(URL.revokeObjectURL)
    thumbUrlsRef.current = []
    setFile(null); setTotalPages(0); setThumbnails([])
    setPageRotations([]); setResultBytes(null)
    setToolState('idle'); setErrorMessage('')
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Organize Pages', slug: 'organize-pages', icon: '📋', colorBg: '#DBEAFE', desc: 'Reorder, rotate and delete pages' },
        { name: 'Split PDF', slug: 'split-pdf', icon: '✂️', colorBg: '#DBEAFE', desc: 'Extract pages or ranges' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',    slug: 'merge-pdf',              icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Compress PDF', slug: 'compress-pdf',           icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Split PDF',    slug: 'split-pdf',              icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract page ranges' },
        { name: 'PDF Viewer',   slug: 'pdf-viewer',             icon: '👁️', colorBg: '#FFF0DC', desc: 'View PDFs in browser' },
        { name: 'Remove Pages', slug: 'remove-pages-from-pdf',  icon: '🗑️', colorBg: '#FEE2E2', desc: 'Delete unwanted pages' },
      ]}
      blogPost={{ slug: 'how-to-rotate-pdf-pages', title: 'How to Rotate PDF Pages Free — Fix Upside-Down or Sideways Pages' }}
    />
  )

  return (
    <ToolPageLayout toolName="Rotate PDF" sidebar={sidebar}>
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
          <span style={{ color: 'var(--ink)' }}>Rotate PDF </span>
          <span style={{ color: 'var(--amber)' }}>Fix Page Orientation</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Rotate individual pages or the entire PDF. 90°, 180° or 270°. Visual preview. No upload, no watermark.
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
          icon="🔄"
          label="Drop your PDF here"
          subLabel="or click to browse — max 200 MB"
        />
      )}

      {/* State: idle, file selected */}
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
                {formatBytes(file.size)} · {totalPages} page{totalPages !== 1 ? 's' : ''}
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

          {/* Bulk Controls */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Bulk Rotation</div>

            {/* Row 1: Direction selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {([
                { value: 'cw',   label: '↻ Rotate Right' },
                { value: 'ccw',  label: '↺ Rotate Left' },
                { value: 'flip', label: '↕ Flip 180°' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setBulkDirection(opt.value)
                    setBulkAngle(opt.value === 'cw' ? 90 : opt.value === 'ccw' ? 270 : 180)
                  }}
                  style={{
                    flex: 1, minWidth: '110px', padding: '9px 14px', borderRadius: '100px',
                    border: `1px solid ${bulkDirection === opt.value ? 'var(--amber)' : 'var(--border)'}`,
                    background: bulkDirection === opt.value ? 'var(--amber)' : 'transparent',
                    color: bulkDirection === opt.value ? 'white' : 'var(--ink)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontSize: '13px', fontWeight: 500,
                  }}
                  onMouseEnter={e => {
                    if (bulkDirection !== opt.value) {
                      e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                      e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (bulkDirection !== opt.value) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Row 2: Apply to scope */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {([
                { scope: 'all' as const,       label: 'All Pages' },
                { scope: 'portrait' as const,  label: 'Portrait Only' },
                { scope: 'landscape' as const, label: 'Landscape Only' },
              ]).map(opt => (
                <button
                  key={opt.scope}
                  onClick={() => applyBulkRotation(opt.scope)}
                  style={{
                    flex: 1, minWidth: '100px', padding: '9px 14px', borderRadius: '100px',
                    border: '1px solid var(--ink)',
                    background: 'var(--ink)', color: 'white',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontSize: '13px', fontWeight: 500,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '0.85'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  {opt.label}
                </button>
              ))}

              <button
                onClick={resetAll}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
                  color: 'var(--muted)', textDecoration: 'underline', whiteSpace: 'nowrap',
                  marginLeft: 'auto', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Thumbnail Grid */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Page Preview ({totalPages} page{totalPages !== 1 ? 's' : ''})</div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '10px',
            }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                  {/* Thumbnail with CSS rotation */}
                  <div style={{ height: '140px', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {thumbsLoading && !thumbnails[i] ? (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        border: '3px solid #E5E7EB', borderTopColor: 'var(--amber)',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : thumbnails[i] ? (
                      <img
                        src={thumbnails[i]}
                        alt={`Page ${i + 1}`}
                        style={{
                          maxWidth: '90%', maxHeight: '130px', objectFit: 'contain',
                          transform: `rotate(${pageRotations[i] || 0}deg)`,
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        border: '3px solid #E5E7EB', borderTopColor: 'var(--amber)',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    )}
                  </div>

                  {/* Label + rotation badge */}
                  <div style={{ padding: '6px 8px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>
                      Page {i + 1}
                    </div>
                    {pageRotations[i] !== 0 && (
                      <span style={{
                        padding: '2px 6px', background: 'var(--amber)', color: 'white',
                        borderRadius: '100px', fontSize: '9px',
                        fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontWeight: 600,
                      }}>
                        {pageRotations[i]}°
                      </span>
                    )}
                  </div>

                  {/* Per-page rotation buttons */}
                  <div style={{ display: 'flex', gap: '4px', padding: '0 6px 6px' }}>
                    <button
                      onClick={() => rotatePage(i, -90)}
                      style={{
                        flex: 1, height: '24px', borderRadius: '4px',
                        border: '1px solid var(--border)', background: 'transparent',
                        cursor: 'pointer', fontSize: '13px', transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'rgba(26,22,18,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >↺</button>
                    <button
                      onClick={() => rotatePage(i, 90)}
                      style={{
                        flex: 1, height: '24px', borderRadius: '4px',
                        border: '1px solid var(--border)', background: 'transparent',
                        cursor: 'pointer', fontSize: '13px', transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'rgba(26,22,18,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >↻</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
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
            🔄 Save Rotated PDF ({modifiedCount} page{modifiedCount !== 1 ? 's' : ''} rotated)
          </button>
        </div>
      )}

      {/* State: merging / applying */}
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
          }}>Applying rotations…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>Writing rotation metadata to PDF pages</div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && (
        <DownloadCard
          filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_rotated.pdf`}
          description={`${modifiedCount} page${modifiedCount !== 1 ? 's' : ''} rotated`}
          onDownload={handleDownload}
          onReset={handleReset}
          title="PDF rotated!"
          resetLabel="Rotate another →"
          nextSteps={[
            { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
            { slug: 'organize-pages', name: 'Organize Pages', icon: '📋' },
            { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
          ]}
        />
      )}

      {toolState === 'error' && <ErrorCard message={errorMessage} onReset={handleReset} />}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Rotate PDF Pages Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Rotating PDF pages is instant and free with Doclair. No software to install, no account required, and your files never leave your browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Upload your PDF by clicking <strong>Drop your PDF here</strong> or dragging it into the upload area.',
            'Click <strong>↺</strong> or <strong>↻</strong> below any thumbnail to rotate individual pages, or use the <strong>Bulk Rotation</strong> controls to rotate all pages at once.',
            'Click <strong>Save Rotated PDF</strong> to apply the rotations and generate your output file.',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white',
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
              }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }} dangerouslySetInnerHTML={{ __html: step }} />
            </div>
          ))}
        </div>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '28px' }}>
          How do I rotate just one page in a PDF?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Click ↺ or ↻ below any page thumbnail. The rotation angle badge shows the accumulated rotation. Click multiple times to rotate further.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          How do I fix a landscape PDF that should be portrait?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Upload the PDF, click &apos;Portrait Only&apos; after selecting &apos;↻ Rotate Right&apos;. This applies 90° clockwise rotation to all landscape-oriented pages only.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Is rotation permanent in the saved PDF?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Yes. The output PDF has the rotation embedded in the page metadata. Every PDF reader — Adobe, Preview, Chrome, mobile — will display the page in the correct orientation.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
