'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnotationTool = 'highlight' | 'underline' | 'draw' | 'comment' | 'select'
type AnnotationColor = string

interface RectAnnotation {
  id: string
  type: 'highlight' | 'underline'
  pageIndex: number
  x: number // fraction of canvas width
  y: number
  w: number
  h: number
  color: string
}

interface DrawAnnotation {
  id: string
  type: 'draw'
  pageIndex: number
  points: { x: number; y: number }[] // fractions
  color: string
  lineWidth: number
}

interface CommentAnnotation {
  id: string
  type: 'comment'
  pageIndex: number
  x: number
  y: number
  text: string
}

type Annotation = RectAnnotation | DrawAnnotation | CommentAnnotation

// ─── Main Page ────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS: AnnotationColor[] = ['#FBBF24', '#34D399', '#60A5FA', '#F87171', '#A78BFA']

export default function AnnotatePDFPage() {
  const [canvasUrls, setCanvasUrls] = useState<string[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [tool, setTool] = useState<AnnotationTool>('highlight')
  const [color, setColor] = useState('#FBBF24')
  const [lineWidth, setLineWidth] = useState(3)
  const [saving, setSaving] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [activeComment, setActiveComment] = useState<string | null>(null)

  // Drawing state
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const currentDrawId = useRef<string | null>(null)

  const loadPDF = useCallback(async (file: File) => {
    const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    setPageCount(doc.numPages)
    setCurrentPage(0)
    const urls: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 1.6 })
      const canvas = document.createElement('canvas')
      canvas.width = vp.width
      canvas.height = vp.height
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (page.render as any)({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
      urls.push(canvas.toDataURL('image/jpeg', 0.92))
    }
    setCanvasUrls(urls)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') { setPdfFile(file); loadPDF(file) }
  }, [loadPDF])

  // ── Canvas event helpers ───────────────────────────────────────────────────
  const getFrac = (e: React.MouseEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasUrls[currentPage]) return
    const frac = getFrac(e, e.currentTarget)
    isDrawing.current = true
    startPoint.current = frac

    if (tool === 'draw') {
      const id = crypto.randomUUID()
      currentDrawId.current = id
      setAnnotations(prev => [...prev, { id, type: 'draw', pageIndex: currentPage, points: [frac], color, lineWidth }])
    } else if (tool === 'comment') {
      const id = crypto.randomUUID()
      setAnnotations(prev => [...prev, { id, type: 'comment', pageIndex: currentPage, x: frac.x, y: frac.y, text: '' }])
      setActiveComment(id)
      isDrawing.current = false
    }
  }

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing.current || !startPoint.current) return
    const frac = getFrac(e, e.currentTarget)

    if (tool === 'draw' && currentDrawId.current) {
      setAnnotations(prev => prev.map(a =>
        a.id === currentDrawId.current && a.type === 'draw'
          ? { ...a, points: [...a.points, frac] }
          : a
      ))
    } else if ((tool === 'highlight' || tool === 'underline')) {
      // Live preview via a temporary annotation
      const id = '__preview__'
      const sp = startPoint.current
      setAnnotations(prev => {
        const filtered = prev.filter(a => a.id !== id)
        return [...filtered, {
          id, type: tool, pageIndex: currentPage,
          x: Math.min(sp.x, frac.x), y: Math.min(sp.y, frac.y),
          w: Math.abs(frac.x - sp.x), h: Math.abs(frac.y - sp.y),
          color,
        }]
      })
    }
  }

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing.current || !startPoint.current) return
    const frac = getFrac(e, e.currentTarget)
    isDrawing.current = false
    currentDrawId.current = null

    if (tool === 'highlight' || tool === 'underline') {
      const sp = startPoint.current
      const w = Math.abs(frac.x - sp.x)
      const h = Math.abs(frac.y - sp.y)
      if (w < 0.005 && h < 0.005) {
        // Too small, remove preview
        setAnnotations(prev => prev.filter(a => a.id !== '__preview__'))
      } else {
        // Commit preview
        setAnnotations(prev => prev.map(a => a.id === '__preview__' ? { ...a, id: crypto.randomUUID() } : a))
      }
    }
    startPoint.current = null
  }

  const deleteAnnotation = (id: string) => setAnnotations(prev => prev.filter(a => a.id !== id))

  // ── Render annotation overlay on canvas ───────────────────────────────────
  const renderAnnotations = useCallback((
    ctx: CanvasRenderingContext2D,
    annots: Annotation[],
    cw: number,
    ch: number
  ) => {
    for (const a of annots) {
      if (a.type === 'highlight') {
        ctx.save()
        ctx.globalAlpha = 0.35
        ctx.fillStyle = a.color
        ctx.fillRect(a.x * cw, a.y * ch, a.w * cw, a.h * ch)
        ctx.restore()
      } else if (a.type === 'underline') {
        ctx.save()
        ctx.strokeStyle = a.color
        ctx.lineWidth = 2.5
        ctx.beginPath()
        const y = (a.y + a.h) * ch
        ctx.moveTo(a.x * cw, y)
        ctx.lineTo((a.x + a.w) * cw, y)
        ctx.stroke()
        ctx.restore()
      } else if (a.type === 'draw') {
        if (a.points.length < 2) continue
        ctx.save()
        ctx.strokeStyle = a.color
        ctx.lineWidth = a.lineWidth * 1.6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(a.points[0].x * cw, a.points[0].y * ch)
        for (let i = 1; i < a.points.length; i++) {
          ctx.lineTo(a.points[i].x * cw, a.points[i].y * ch)
        }
        ctx.stroke()
        ctx.restore()
      }
    }
  }, [])

  // ── Save PDF ───────────────────────────────────────────────────────────────
  const savePDF = async () => {
    if (!canvasUrls.length) return
    setSaving(true)
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const outDoc = await PDFDocument.create()

      for (let pi = 0; pi < canvasUrls.length; pi++) {
        const img = new Image()
        await new Promise<void>(res => { img.onload = () => res(); img.src = canvasUrls[pi] })

        const offscreen = document.createElement('canvas')
        offscreen.width = img.naturalWidth
        offscreen.height = img.naturalHeight
        const ctx = offscreen.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        const pageAnnots = annotations.filter(a => a.pageIndex === pi && a.type !== 'comment')
        renderAnnotations(ctx, pageAnnots, offscreen.width, offscreen.height)

        const jpegBuf = await new Promise<ArrayBuffer>(res => {
          offscreen.toBlob(async b => res(await b!.arrayBuffer()), 'image/jpeg', 0.92)
        })
        const pdfImg = await outDoc.embedJpg(jpegBuf)
        const page = outDoc.addPage([pdfImg.width, pdfImg.height])
        page.drawImage(pdfImg, { x: 0, y: 0, width: pdfImg.width, height: pdfImg.height })
      }

      const bytes = await outDoc.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFile ? pdfFile.name.replace(/\.pdf$/i, '-annotated.pdf') : 'annotated.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setSaving(false)
    }
  }

  const pageAnnotations = annotations.filter(a => a.pageIndex === currentPage)
  const hasFile = canvasUrls.length > 0

  const toolBtn = (t: AnnotationTool, label: string, icon: string) => (
    <button key={t} onClick={() => setTool(t)} title={label} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '10px 12px', borderRadius: 10, border: '1.5px solid',
      borderColor: tool === t ? '#F59E0B' : '#e5e7eb',
      background: tool === t ? '#FFF8EC' : '#fff',
      cursor: 'pointer', fontSize: 11, fontWeight: 600,
      color: tool === t ? '#92400e' : '#374151', minWidth: 60,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label}
    </button>
  )

  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 200px)', padding: '40px 16px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1px', marginBottom: 8 }}>Annotate PDF</h1>
          <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 32 }}>
            Highlight, underline, and draw on any PDF. No upload — everything stays in your browser.
          </p>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20, padding: '12px 16px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            {toolBtn('highlight', 'Highlight', '🖊')}
            {toolBtn('underline', 'Underline', 'U̲')}
            {toolBtn('draw', 'Draw', '✏️')}
            {toolBtn('comment', 'Comment', '💬')}

            <div style={{ width: 1, height: 40, background: '#e5e7eb', margin: '0 4px' }} />

            {/* Color palette */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 24, height: 24, borderRadius: '50%', background: c, border: `2px solid ${color === c ? '#374151' : 'transparent'}`,
                  cursor: 'pointer', padding: 0,
                }} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)} title="Custom color"
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', padding: 2 }} />
            </div>

            {tool === 'draw' && (
              <>
                <div style={{ width: 1, height: 40, background: '#e5e7eb', margin: '0 4px' }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Width</label>
                <input type="range" min={1} max={12} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
                  style={{ width: 80 }} />
              </>
            )}

            <div style={{ flex: 1 }} />

            {hasFile && annotations.length > 0 && (
              <button onClick={() => setAnnotations(prev => prev.filter(a => a.pageIndex !== currentPage))}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#ef4444' }}>
                Clear page
              </button>
            )}
            {hasFile && (
              <button onClick={savePDF} disabled={saving} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: saving ? '#fcd34d' : '#F59E0B', color: '#fff',
                fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
              }}>{saving ? 'Saving…' : 'Download PDF'}</button>
            )}
          </div>

          {/* Page nav */}
          {hasFile && pageCount > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>←</button>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Page {currentPage + 1} of {pageCount}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))} disabled={currentPage === pageCount - 1}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>→</button>
            </div>
          )}

          {/* Drop zone or canvas */}
          {!hasFile ? (
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 80, textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</p>
              <p style={{ color: '#9ca3af', marginBottom: 24 }}>or</p>
              <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Choose PDF
                <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); loadPDF(f) } }} style={{ display: 'none' }} />
              </label>
            </div>
          ) : (
            <div style={{ position: 'relative', userSelect: 'none' }}>
              <div ref={containerRef}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                style={{
                  position: 'relative', display: 'inline-block', width: '100%',
                  cursor: tool === 'draw' ? 'crosshair' : tool === 'comment' ? 'cell' : 'crosshair',
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={canvasUrls[currentPage]} alt={`Page ${currentPage + 1}`}
                  style={{ width: '100%', display: 'block', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} draggable={false} />

                {/* SVG annotation layer */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {pageAnnotations.map(a => {
                    if (a.type === 'highlight') return (
                      <rect key={a.id} x={`${a.x * 100}%`} y={`${a.y * 100}%`}
                        width={`${a.w * 100}%`} height={`${a.h * 100}%`}
                        fill={a.color} opacity="0.35" />
                    )
                    if (a.type === 'underline') return (
                      <line key={a.id}
                        x1={`${a.x * 100}%`} y1={`${(a.y + a.h) * 100}%`}
                        x2={`${(a.x + a.w) * 100}%`} y2={`${(a.y + a.h) * 100}%`}
                        stroke={a.color} strokeWidth="2.5" />
                    )
                    if (a.type === 'draw' && a.points.length > 1) {
                      const d = a.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * 100}% ${p.y * 100}%`).join(' ')
                      return <path key={a.id} d={d} stroke={a.color} strokeWidth={a.lineWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    }
                    return null
                  })}
                </svg>

                {/* Comment badges (interactive layer, needs pointer events) */}
                {pageAnnotations.filter(a => a.type === 'comment').map(a => {
                  const ca = a as CommentAnnotation
                  return (
                    <div key={ca.id} style={{
                      position: 'absolute', left: `${ca.x * 100}%`, top: `${ca.y * 100}%`,
                      pointerEvents: 'all',
                    }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ background: '#FBBF24', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                          onClick={() => setActiveComment(activeComment === ca.id ? null : ca.id)}>
                          💬
                        </div>
                        {activeComment === ca.id && (
                          <div style={{ position: 'absolute', left: 28, top: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 200 }}>
                            <textarea value={ca.text}
                              onChange={e => setAnnotations(prev => prev.map(x => x.id === ca.id ? { ...x, text: e.target.value } : x))}
                              placeholder="Type comment…"
                              rows={3}
                              style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
                              <button onClick={() => deleteAnnotation(ca.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                              <button onClick={() => setActiveComment(null)} style={{ fontSize: 11, background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}>Done</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hasFile && (
            <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
              {tool === 'highlight' && 'Click and drag to highlight text areas.'}
              {tool === 'underline' && 'Click and drag to underline text areas.'}
              {tool === 'draw' && 'Click and drag to draw freehand.'}
              {tool === 'comment' && 'Click to place a comment pin.'}
              {tool === 'select' && 'Select mode.'}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
