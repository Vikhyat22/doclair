'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { redactPDF, findTextInPDF } from '@/lib/pdf/redact'
import type { RedactionBox } from '@/lib/pdf/redact'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'Is redaction permanent?', a: 'Yes. Doclair re-renders each page as an image and draws black pixels over the redacted areas. The original text data is completely destroyed and cannot be recovered by any software.' },
  { q: 'How is this different from drawing a black box?', a: 'A black box drawn over PDF text only hides it visually — the text data remains in the file and can be revealed by copying, searching, or removing the annotation. True redaction removes the data entirely by replacing the page with a rasterised image.' },
  { q: 'Can I redact images and photos, not just text?', a: 'Yes. Draw a redaction box over any area — text, images, signatures, faces, anything visible on the page. The entire region is permanently blacked out.' },
  { q: 'Is my PDF uploaded to a server?', a: 'Never. Tesseract and pdf-lib run entirely in your browser. Your document never leaves your device.' },
  { q: 'Does redacting leave any traces?', a: 'No metadata, hidden layers, or recoverable data remains in the redacted areas. The output PDF is a clean image-based document with no original content.' },
  { q: 'How do I redact multiple pages at once?', a: 'Use the text search feature: type the sensitive word or phrase, click Find All Instances, then Mark All for Redaction. Boxes are added across all pages. You can then review each page before applying.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Redact PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/redact-pdf',
      description: 'Permanently remove sensitive content from PDF files. Draw redaction boxes or use text search. 100% free, no upload, GDPR-compliant.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'True redaction — permanently destroys content',
        'Draw boxes over any area',
        'Text search and redact across all pages',
        'No file upload to server',
        'No watermark on output',
        'No sign-up required',
        'GDPR-compliant',
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
    { '@type': 'ListItem', position: 3, name: 'Redact PDF', item: 'https://doclair.in/redact-pdf' },
  ],
}

export default function RedactPDFPage() {
  const [file, setFile]                       = useState<File | null>(null)
  const [totalPages, setTotalPages]           = useState(0)
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1)
  const [pageUrls, setPageUrls]               = useState<string[]>([])
  const [loadingPages, setLoadingPages]       = useState(false)
  const [loadProgress, setLoadProgress]       = useState(0)
  const [boxes, setBoxes]                     = useState<RedactionBox[]>([])
  const [drawing, setDrawing]                 = useState<{
    active: boolean; page: number
    startX: number; startY: number
    currentX: number; currentY: number
  } | null>(null)
  const [searchText, setSearchText]           = useState('')
  const [searchResults, setSearchResults]     = useState<RedactionBox[]>([])
  const [searchCount, setSearchCount]         = useState<{ boxes: number; pages: number } | null>(null)
  const [toolState, setToolState]             = useState<'idle' | 'loadingPages' | 'ready' | 'processing' | 'done' | 'error'>('idle')
  const [resultBytes, setResultBytes]         = useState<Uint8Array | null>(null)
  const [progress, setProgress]               = useState({ n: 0, total: 0 })
  const pageImageRef                          = useRef<HTMLImageElement>(null)
  const overlayRef                            = useRef<HTMLDivElement>(null)
  const pageUrlsRef                           = useRef<string[]>([])

  // Suppress unused variable warnings
  void loadingPages

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return

    // Revoke any existing page URLs
    pageUrlsRef.current.forEach(URL.revokeObjectURL)
    pageUrlsRef.current = []
    setPageUrls([])
    setBoxes([])
    setDrawing(null)
    setSearchText('')
    setSearchResults([])
    setSearchCount(null)
    setResultBytes(null)
    setCurrentPreviewPage(1)
    setLoadProgress(0)
    setFile(f)
    setToolState('loadingPages')
    setLoadingPages(true)

    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

      const bytes = await f.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise

      const count = pdf.numPages
      setTotalPages(count)

      const urls: string[] = []

      for (let i = 1; i <= count; i++) {
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas   = document.createElement('canvas')
        canvas.width   = Math.floor(viewport.width)
        canvas.height  = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.8)
        )
        const url = URL.createObjectURL(blob)
        urls.push(url)
        canvas.width = 0; canvas.height = 0
        setLoadProgress(Math.round((i / count) * 100))
      }

      pageUrlsRef.current = urls
      setPageUrls(urls)
      setToolState('ready')
    } catch (err) {
      console.error('Page rendering failed:', err)
      setToolState('error')
    } finally {
      setLoadingPages(false)
    }
  }, [])

  function handleReset() {
    pageUrlsRef.current.forEach(URL.revokeObjectURL)
    pageUrlsRef.current = []
    setFile(null)
    setTotalPages(0)
    setCurrentPreviewPage(1)
    setPageUrls([])
    setLoadingPages(false)
    setLoadProgress(0)
    setBoxes([])
    setDrawing(null)
    setSearchText('')
    setSearchResults([])
    setSearchCount(null)
    setToolState('idle')
    setResultBytes(null)
    setProgress({ n: 0, total: 0 })
  }

  async function handleFindText() {
    if (!file || !searchText.trim()) return
    const results = await findTextInPDF(file, searchText)
    setSearchResults(results)
    const uniquePages = new Set(results.map(r => r.page)).size
    setSearchCount({ boxes: results.length, pages: uniquePages })
  }

  function handleMarkAllForRedaction() {
    setBoxes(prev => [...prev, ...searchResults])
    setSearchResults([])
    setSearchCount(null)
    setSearchText('')
  }

  // Returns pointer position in natural-image pixel space, correcting for CSS scaling
  function getImgCoords(e: React.PointerEvent<HTMLDivElement>) {
    const img = pageImageRef.current
    if (!img) return null
    const rect   = img.getBoundingClientRect()
    const scaleX = img.naturalWidth  / rect.width
    const scaleY = img.naturalHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = overlayRef.current
    if (!el) return
    const coords = getImgCoords(e)
    if (!coords) return
    el.setPointerCapture(e.pointerId)
    setDrawing({
      active:   true,
      page:     currentPreviewPage - 1,
      startX:   coords.x,
      startY:   coords.y,
      currentX: coords.x,
      currentY: coords.y,
    })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawing || !drawing.active) return
    const img    = pageImageRef.current
    if (!img) return
    const coords = getImgCoords(e)
    if (!coords) return
    const currentX = Math.max(0, Math.min(img.naturalWidth,  coords.x))
    const currentY = Math.max(0, Math.min(img.naturalHeight, coords.y))
    setDrawing(prev => prev ? { ...prev, currentX, currentY } : null)
  }

  function handlePointerUp() {
    if (!drawing || !drawing.active) return
    const img = pageImageRef.current
    if (!img) return
    const { page, startX, startY, currentX, currentY } = drawing
    const x      = Math.min(startX, currentX)  / img.naturalWidth
    const y      = Math.min(startY, currentY)  / img.naturalHeight
    const width  = Math.abs(currentX - startX) / img.naturalWidth
    const height = Math.abs(currentY - startY) / img.naturalHeight
    if (width > 0.01 && height > 0.01) {
      setBoxes(prev => [...prev, { page, x, y, width, height }])
    }
    setDrawing(null)
  }

  async function handleApplyRedactions() {
    if (!file || boxes.length === 0) return
    setToolState('processing')
    try {
      const result = await redactPDF(file, boxes, (page, total) => setProgress({ n: page, total }))
      setResultBytes(result)
      setToolState('done')
    } catch (err) {
      console.error('Redaction failed:', err)
      setToolState('error')
    }
  }

  function handleDownload() {
    if (!resultBytes || !file) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '-redacted.pdf')
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const currentPageBoxes = boxes.filter(b => b.page === currentPreviewPage - 1)
  const isApplyDisabled  = boxes.length === 0

  useEffect(() => {
    return () => {
      pageUrlsRef.current.forEach(URL.revokeObjectURL)
    }
  }, [])

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Privacy Scanner', slug: 'privacy-scanner', icon: '🔍', colorBg: '#DBEAFE', desc: 'Detect sensitive data in PDFs' },
        { name: 'Flatten PDF',     slug: 'flatten-pdf',     icon: '🔥', colorBg: '#FEE2E2', desc: 'Flatten annotations and forms' },
      ]}
      relatedTools={[
        { name: 'Encrypt PDF',         slug: 'encrypt-pdf',      icon: '🔐', colorBg: '#DCFCE7', desc: 'Password-protect PDF' },
        { name: 'Edit PDF Metadata',   slug: 'edit-metadata',    icon: '✏️', colorBg: '#EDE9FE', desc: 'Edit title, author, dates' },
        { name: 'Fingerprint PDF',     slug: 'fingerprint-pdf',  icon: '🪪', colorBg: '#FFF0DC', desc: 'Add invisible tracking marks' },
        { name: 'Compress PDF',        slug: 'compress-pdf',     icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Redact PDF" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ GDPR Compliant</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Redact PDF </span>
          <span style={{ color: 'var(--amber)' }}>Permanently Remove Sensitive Content</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Draw over text or images to permanently destroy the data — not just cover it. True redaction. Free, no upload, GDPR-compliant.
        </p>
      </div>

      {/* State: idle — drop zone */}
      {toolState === 'idle' && (
        <DropZone
          onFilesAdded={addFile}
          accept=".pdf"
          maxFiles={1}
          maxSizeMB={200}
          currentCount={0}
          icon="🔏"
          label="Drop your PDF here"
          subLabel="or click to browse — max 200 MB"
        />
      )}

      {/* State: loading pages */}
      {toolState === 'loadingPages' && (
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
            fontSize: '24px', color: 'white', marginBottom: '16px',
          }}>Rendering pages…</div>
          <div style={{
            width: '100%', maxWidth: '320px', margin: '0 auto', height: '6px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden',
          }}>
            <div style={{
              width: `${loadProgress}%`, height: '100%',
              background: 'var(--amber)', borderRadius: '100px',
              transition: 'width 0.2s ease',
            }} />
          </div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', marginTop: '10px',
          }}>{loadProgress}%</div>
        </div>
      )}

      {/* State: ready — redaction UI */}
      {toolState === 'ready' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Amber disclaimer */}
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '16px',
            display: 'flex', gap: '12px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#92400E', margin: 0 }}>
              <strong>True redaction permanently destroys content</strong> — it cannot be recovered by anyone.
              This is different from drawing a black box, which only hides text visually.
              Doclair&apos;s redaction re-renders pages as images, completely removing the original text data from the file.
            </p>
          </div>

          {/* Text search section */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Find &amp; Redact Text</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Find and redact text…"
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setSearchCount(null); setSearchResults([]) }}
                onKeyDown={e => { if (e.key === 'Enter') handleFindText() }}
                style={{
                  flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px',
                  border: '1px solid var(--border)', fontSize: '14px',
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  color: 'var(--ink)', outline: 'none', background: 'white',
                }}
              />
              <button
                onClick={handleFindText}
                disabled={!searchText.trim()}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--ink)',
                  background: 'var(--ink)', color: 'white', cursor: searchText.trim() ? 'pointer' : 'not-allowed',
                  opacity: searchText.trim() ? 1 : 0.4,
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', fontWeight: 500,
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (searchText.trim()) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = searchText.trim() ? '1' : '0.4' }}
              >
                Find All Instances
              </button>
            </div>

            {searchCount !== null && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'var(--muted)',
                }}>
                  {searchCount.boxes} instance{searchCount.boxes !== 1 ? 's' : ''} found across {searchCount.pages} page{searchCount.pages !== 1 ? 's' : ''}
                </span>
                {searchCount.boxes > 0 && (
                  <button
                    onClick={handleMarkAllForRedaction}
                    style={{
                      padding: '6px 14px', borderRadius: '100px',
                      border: '1px solid var(--red)', background: 'var(--red)', color: 'white',
                      cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                      fontSize: '12px', fontWeight: 500, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    Mark All for Redaction
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Page navigator */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setCurrentPreviewPage(p => Math.max(1, p - 1))}
              disabled={currentPreviewPage <= 1}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', cursor: currentPreviewPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPreviewPage <= 1 ? 0.35 : 1,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px',
                color: 'var(--ink)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (currentPreviewPage > 1) e.currentTarget.style.background = 'var(--cream)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >← Previous</button>
            <span style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', color: 'var(--ink)',
            }}>
              Page {currentPreviewPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPreviewPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPreviewPage >= totalPages}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', cursor: currentPreviewPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPreviewPage >= totalPages ? 0.35 : 1,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px',
                color: 'var(--ink)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (currentPreviewPage < totalPages) e.currentTarget.style.background = 'var(--cream)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >Next →</button>
          </div>

          {/* Canvas area */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Draw Redaction Boxes — Click &amp; Drag</div>

            <div style={{ position: 'relative', display: 'inline-block', width: '100%', lineHeight: 0 }}>
              {/* Base page image */}
              <img
                ref={pageImageRef}
                src={pageUrls[currentPreviewPage - 1]}
                alt={`Page ${currentPreviewPage}`}
                style={{ width: '100%', display: 'block', borderRadius: '4px', userSelect: 'none' }}
                draggable={false}
              />

              {/* Interaction overlay */}
              <div
                ref={overlayRef}
                style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {/* Saved boxes for current page */}
                {currentPageBoxes.map((box, idx) => {
                  const globalIdx = boxes.findIndex(b => b === box)
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: box.x * 100 + '%',
                        top: box.y * 100 + '%',
                        width: box.width * 100 + '%',
                        height: box.height * 100 + '%',
                        background: '#000000',
                        pointerEvents: 'none',
                      }}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setBoxes(prev => prev.filter((_, i) => i !== globalIdx))
                        }}
                        style={{
                          position: 'absolute', right: '-6px', top: '-6px',
                          width: '18px', height: '18px', borderRadius: '50%',
                          border: 'none', background: '#EF4444', color: 'white',
                          cursor: 'pointer', fontSize: '10px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          pointerEvents: 'all', lineHeight: 1, padding: 0,
                        }}
                      >✕</button>
                    </div>
                  )
                })}

                {/* Live rubber-band while drawing */}
                {drawing && drawing.active && drawing.page === currentPreviewPage - 1 && (() => {
                  const nw = pageImageRef.current?.naturalWidth  || 1
                  const nh = pageImageRef.current?.naturalHeight || 1
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left:   `${Math.min(drawing.startX, drawing.currentX)  / nw * 100}%`,
                        top:    `${Math.min(drawing.startY, drawing.currentY)  / nh * 100}%`,
                        width:  `${Math.abs(drawing.currentX - drawing.startX) / nw * 100}%`,
                        height: `${Math.abs(drawing.currentY - drawing.startY) / nh * 100}%`,
                        background: 'rgba(0,0,0,0.4)',
                        border: '2px dashed var(--amber)',
                        pointerEvents: 'none',
                      }}
                    />
                  )
                })()}
              </div>
            </div>

            {/* Boxes summary */}
            <div style={{
              marginTop: '12px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap',
            }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'var(--muted)',
              }}>
                {currentPageBoxes.length} box{currentPageBoxes.length !== 1 ? 'es' : ''} on this page · {boxes.length} total
              </span>
              {boxes.length > 0 && (
                <button
                  onClick={() => setBoxes([])}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0',
                    fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
                    color: 'var(--muted)', textDecoration: 'underline', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Apply button */}
          <div>
            <button
              onClick={handleApplyRedactions}
              disabled={isApplyDisabled}
              style={{
                width: '100%', background: isApplyDisabled ? 'var(--muted)' : '#111',
                color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none',
                cursor: isApplyDisabled ? 'not-allowed' : 'pointer',
                opacity: isApplyDisabled ? 0.4 : 1,
                transition: 'transform 0.15s, opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
              onMouseEnter={e => { if (!isApplyDisabled) e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              🔏 Apply Redactions Permanently
            </button>
            <p style={{
              textAlign: 'center', marginTop: '8px',
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
              color: '#B45309',
            }}>
              ⚠ This is permanent and irreversible.
            </p>
          </div>
        </div>
      )}

      {/* State: processing */}
      {toolState === 'processing' && (
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
          }}>
            Redacting page {progress.n} of {progress.total}…
          </div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>
            Rebuilding page images — content permanently removed
          </div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && file && (
        <DownloadCard
          filename={file.name.replace('.pdf', '-redacted.pdf')}
          description={`${boxes.length} redaction${boxes.length !== 1 ? 's' : ''} applied · content permanently removed`}
          onDownload={handleDownload}
          onReset={handleReset}
        />
      )}

      {/* State: error */}
      {toolState === 'error' && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: '18px', color: '#991B1B', marginBottom: '8px',
          }}>Something went wrong</div>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 24px', borderRadius: '100px', border: '1px solid #991B1B',
              background: '#991B1B', color: 'white', cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px',
            }}
          >Try Again</button>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Redact a PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Redacting a PDF permanently removes sensitive content so it cannot be recovered. Doclair&apos;s browser-based tool requires no software and no account.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Upload your PDF by clicking <strong>Drop your PDF here</strong> or dragging it into the upload area.',
            'Draw redaction boxes over sensitive areas by clicking and dragging on the page preview. Use the text search to find and mark all instances of specific words or phrases.',
            'Click <strong>Apply Redactions Permanently</strong> to destroy the content and download your redacted PDF.',
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
          True redaction vs drawing a black box — the difference
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Drawing a black rectangle over text in a standard PDF editor only hides it visually. The underlying text data remains in the file and can be exposed by anyone who removes the annotation, copies the text, or uses a screen reader. True redaction works differently: it re-renders each page as a raster image and draws solid black pixels over the sensitive area. The original vector text is gone — there is no annotation layer to remove, no hidden characters, no recoverable data.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          GDPR compliance and PDF redaction
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Under GDPR and other privacy regulations, simply covering data is not sufficient — the data must be irreversibly removed. Doclair&apos;s true redaction approach satisfies this requirement. Because all processing happens in your browser, no personal data is transmitted to any server, making it safe to use on regulated documents such as medical records, legal contracts, and financial statements.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Redact PDF on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in Safari on iPhone and iPad, and Chrome on Android. The touch-based drawing interface lets you draw redaction boxes by tapping and dragging directly on the page preview. No app download required.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
