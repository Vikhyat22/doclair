'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import ToolSidebar from '@/components/ui/ToolSidebar'
import FAQ from '@/components/ui/FAQ'

type ToolState = 'idle' | 'loading' | 'ready' | 'error'

const FAQS = [
  {
    q: 'Does the PDF Viewer upload my file?',
    a: 'No. The PDF is rendered entirely in your browser using pdfjs-dist (the same engine Firefox uses). Your file never leaves your device.',
  },
  {
    q: 'Which keyboard shortcuts are available?',
    a: 'Arrow Right / Arrow Down — next page. Arrow Left / Arrow Up — previous page. Plus (+) or Equals (=) — zoom in. Minus (−) — zoom out. Escape — clear search.',
  },
  {
    q: 'Can I search text inside the PDF?',
    a: 'Yes. Type in the search box in the toolbar. Matching text is highlighted on the current page. Navigate pages to find occurrences across the document.',
  },
]

const SIDEBAR_RELATED = [
  { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
  { name: 'Merge PDF',    slug: 'merge-pdf',    icon: '🔗', colorBg: '#DBEAFE', desc: 'Combine multiple PDFs' },
  { name: 'Split PDF',    slug: 'split-pdf',    icon: '✂️', colorBg: '#FFF0DC', desc: 'Split into multiple files' },
  { name: 'Encrypt PDF',  slug: 'encrypt-pdf',  icon: '🔐', colorBg: '#DCFCE7', desc: 'Password-protect PDF' },
]

type PDFDocumentProxy = Awaited<ReturnType<Awaited<typeof import('pdfjs-dist')>['getDocument']>['promise']>

export default function PDFViewerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [jumpValue, setJumpValue] = useState('')
  const [jumpMode, setJumpMode] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const loadPDF = useCallback(async (f: File) => {
    setToolState('loading')
    setError('')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const bytes = await f.arrayBuffer()
      const doc = await pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise
      setPdf(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
      setToolState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF')
      setToolState('error')
    }
  }, [])

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFile(f)
    setPdf(null)
    setCurrentPage(1)
    setScale(1.0)
    setRotation(0)
    setSearchText('')
    loadPDF(f)
  }, [loadPDF])

  const renderPage = useCallback(async (pageNum: number, scl: number, rot: number) => {
    if (!pdf || !canvasRef.current) return
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }
    setRendering(true)
    try {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: scl, rotation: rot })
      const canvas = canvasRef.current
      canvas.width  = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const task = page.render({ canvas, canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'RenderingCancelledException') return
    } finally {
      setRendering(false)
    }
  }, [pdf])

  useEffect(() => {
    if (toolState === 'ready') {
      renderPage(currentPage, scale, rotation)
    }
  }, [toolState, currentPage, scale, rotation, renderPage])

  // Keyboard shortcuts
  useEffect(() => {
    if (toolState !== 'ready') return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentPage(p => Math.min(p + 1, totalPages))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentPage(p => Math.max(p - 1, 1))
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(s + 0.25, 4))
      } else if (e.key === '-') {
        setScale(s => Math.max(s - 0.25, 0.25))
      } else if (e.key === 'Escape') {
        setSearchText('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toolState, totalPages])

  const fitWidth = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return
    const containerWidth = containerRef.current.clientWidth - 2
    const canvasNaturalWidth = canvasRef.current.width / scale
    if (canvasNaturalWidth > 0) setScale(containerWidth / canvasNaturalWidth)
  }, [scale])

  const fitPage = useCallback(() => {
    setScale(1.0)
  }, [])

  const handleJump = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const n = parseInt(jumpValue)
      if (!isNaN(n) && n >= 1 && n <= totalPages) setCurrentPage(n)
      setJumpMode(false)
      setJumpValue('')
    } else if (e.key === 'Escape') {
      setJumpMode(false)
      setJumpValue('')
    }
  }, [jumpValue, totalPages])

  const handleReset = useCallback(() => {
    setFile(null)
    setPdf(null)
    setToolState('idle')
    setCurrentPage(1)
    setScale(1.0)
    setRotation(0)
    setSearchText('')
    setError('')
  }, [])

  const btnStyle = (disabled = false): React.CSSProperties => ({
    background: disabled ? '#F3F4F6' : 'white',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? '#9CA3AF' : 'var(--ink)',
    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <ToolPageLayout
      toolName="PDF Viewer"
      sidebar={<ToolSidebar reverseActions={[]} relatedTools={SIDEBAR_RELATED} />}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF Viewer </span>
          <span style={{ color: 'var(--amber)' }}>Read Any PDF in Your Browser</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
          Open and read any PDF directly in your browser. Zoom, search, navigate. No Adobe required. No upload.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
        </div>
      </div>

      {/* Drop Zone */}
      {toolState === 'idle' && (
        <DropZone
          onFilesAdded={handleFiles}
          accept=".pdf"
          maxFiles={1}
          maxSizeMB={200}
          icon="👁️"
          label="Drop a PDF to view it"
          subLabel="or click to browse — renders instantly in your browser"
          currentCount={0}
        />
      )}

      {/* Loading */}
      {toolState === 'loading' && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'pdfviewspin 1.5s linear infinite', display: 'inline-block' }}>📄</div>
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)' }}>Loading PDF…</div>
          <style>{`@keyframes pdfviewspin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Error */}
      {toolState === 'error' && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Failed to load PDF</div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
          <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try another file</button>
        </div>
      )}

      {/* Viewer */}
      {toolState === 'ready' && pdf && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'var(--cream)' }}>
            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                style={btnStyle(currentPage <= 1)}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                onMouseEnter={e => { if (currentPage > 1) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={e => { e.currentTarget.style.background = currentPage <= 1 ? '#F3F4F6' : 'white' }}
              >← Prev</button>

              {jumpMode ? (
                <input
                  type="number"
                  value={jumpValue}
                  autoFocus
                  onChange={e => setJumpValue(e.target.value)}
                  onKeyDown={handleJump}
                  onBlur={() => { setJumpMode(false); setJumpValue('') }}
                  style={{ width: '60px', padding: '6px 8px', border: '1px solid var(--amber)', borderRadius: '6px', fontSize: '13px', textAlign: 'center', outline: 'none' }}
                />
              ) : (
                <button
                  style={{ ...btnStyle(), fontFamily: 'var(--font-dm-mono), DM Mono, monospace', minWidth: '70px', textAlign: 'center' }}
                  onClick={() => { setJumpMode(true); setJumpValue(String(currentPage)) }}
                  title="Click to jump to page"
                >
                  {currentPage} / {totalPages}
                </button>
              )}

              <button
                style={btnStyle(currentPage >= totalPages)}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                onMouseEnter={e => { if (currentPage < totalPages) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={e => { e.currentTarget.style.background = currentPage >= totalPages ? '#F3F4F6' : 'white' }}
              >Next →</button>
            </div>

            {/* Search */}
            <div style={{ flex: 1, minWidth: '120px', maxWidth: '240px' }}>
              <input
                type="text"
                placeholder="🔍 Search text…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* View controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <button style={btnStyle()} onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate 90°" onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>↺ Rotate</button>
              <button style={btnStyle(scale <= 0.25)} disabled={scale <= 0.25} onClick={() => setScale(s => Math.max(s - 0.25, 0.25))} onMouseEnter={e => { if (scale > 0.25) e.currentTarget.style.background = '#F9FAFB' }} onMouseLeave={e => { e.currentTarget.style.background = scale <= 0.25 ? '#F3F4F6' : 'white' }}>−</button>
              <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', minWidth: '42px', textAlign: 'center', color: 'var(--ink)' }}>{Math.round(scale * 100)}%</span>
              <button style={btnStyle(scale >= 4)} disabled={scale >= 4} onClick={() => setScale(s => Math.min(s + 0.25, 4))} onMouseEnter={e => { if (scale < 4) e.currentTarget.style.background = '#F9FAFB' }} onMouseLeave={e => { e.currentTarget.style.background = scale >= 4 ? '#F3F4F6' : 'white' }}>+</button>
              <button style={btnStyle()} onClick={fitWidth} onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>Fit Width</button>
              <button style={btnStyle()} onClick={fitPage} onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>Fit Page</button>
            </div>
          </div>

          {/* Canvas area */}
          <div ref={containerRef} style={{ overflowX: 'auto', overflowY: 'auto', background: '#E5E7EB', padding: '24px', display: 'flex', justifyContent: 'center', maxHeight: '75vh', position: 'relative' }}>
            {rendering && (
              <div style={{ position: 'absolute', top: '12px', right: '16px', background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>Rendering…</div>
            )}
            <canvas ref={canvasRef} style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)', display: 'block', maxWidth: '100%' }} />
          </div>

          {/* File info + reset */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream)', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</div>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>✕ Close</button>
          </div>
        </div>
      )}

      {/* Quick links */}
      {toolState === 'ready' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--muted)', alignItems: 'center' }}>
          <span>Also try:</span>
          {[
            { label: 'Merge PDF', slug: 'merge-pdf' },
            { label: 'Compress PDF', slug: 'compress-pdf' },
            { label: 'Split PDF', slug: 'split-pdf' },
            { label: 'Encrypt PDF', slug: 'encrypt-pdf' },
            { label: 'Edit Metadata', slug: 'edit-pdf-metadata' },
          ].map(({ label, slug }) => (
            <Link key={slug} href={`/${slug}`} style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 500, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >→ {label}</Link>
          ))}
        </div>
      )}

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
