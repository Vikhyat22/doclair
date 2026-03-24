'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolMode = 'select' | 'text' | 'signature'

interface TextOverlay {
  id: string
  type: 'text'
  pageIndex: number
  x: number // fraction 0-1 of rendered canvas width
  y: number // fraction 0-1 of rendered canvas height
  text: string
  fontSize: number
  color: string
  editing: boolean
}

interface SignatureOverlay {
  id: string
  type: 'signature'
  pageIndex: number
  x: number
  y: number
  dataUrl: string // PNG of the signature
  width: number
  height: number
}

type Overlay = TextOverlay | SignatureOverlay

const FAQS = [
  { q: 'Are my PDF files uploaded to a server?', a: 'No. Editing and signing happen entirely in your browser. Your PDF never leaves your device.' },
  { q: 'Can I add typed text and a signature?', a: 'Yes. Place text boxes anywhere on the page and create a drawn or typed signature, then download the updated PDF.' },
  { q: 'Is edit PDF free?', a: 'Yes. Doclair does not add a watermark to your downloaded file.' },
  { q: 'Can I use this on a phone or tablet?', a: 'Yes. Use a modern mobile browser. Touch works for placing text and drawing signatures.' },
]

const TOOL_SEO_NAME = 'Edit PDF + Sign'
const TOOL_SLUG = 'edit-pdf'
const TOOL_DESCRIPTION = 'Add text and signatures to PDF files free online. Click to place text, draw or type your signature. No upload, no watermark, files stay in your browser.'

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
        'Click to place editable text',
        'Draw or type signatures',
        'Download PDF with overlays',
        'Browser-only, no upload',
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

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({ onDone, onCancel }: { onDone: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typedText, setTypedText] = useState('')
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (mode === 'draw') {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, 400, 160)
        ctx.strokeStyle = '#1A1612'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [mode])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect()
    const isTouch = 'touches' in e
    const cx = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const cy = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    return { x: (cx - r.left) * (canvas.width / r.width), y: (cy - r.top) * (canvas.height / r.height) }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current!
    setDrawing(true)
    lastPoint.current = getPos(e, canvas)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || mode !== 'draw') return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pt = getPos(e, canvas)
    if (lastPoint.current) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(pt.x, pt.y)
      ctx.stroke()
    }
    lastPoint.current = pt
  }

  const endDraw = () => { setDrawing(false); lastPoint.current = null }

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, 400, 160)
  }

  const commit = () => {
    if (mode === 'draw') {
      onDone(canvasRef.current!.toDataURL('image/png'))
    } else {
      // Render typed text to a canvas
      const offscreen = document.createElement('canvas')
      offscreen.width = 300
      offscreen.height = 80
      const ctx = offscreen.getContext('2d')!
      ctx.font = `italic 48px Georgia, serif`
      ctx.fillStyle = '#1A1612'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedText || 'Signature', 8, 40)
      onDone(offscreen.toDataURL('image/png'))
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18 }}>Add Signature</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['draw', 'type'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '6px 16px', borderRadius: 8, border: '1.5px solid',
              borderColor: mode === m ? '#F59E0B' : '#e5e7eb',
              background: mode === m ? '#FFF8EC' : '#fff',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
            }}>{m}</button>
          ))}
        </div>
        {mode === 'draw' ? (
          <canvas ref={canvasRef} width={400} height={160} onMouseDown={startDraw} onMouseMove={draw}
            onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw}
            onTouchEnd={endDraw}
            style={{ border: '2px dashed #e5e7eb', borderRadius: 8, display: 'block', cursor: 'crosshair', width: '100%', height: 160, touchAction: 'none' }} />
        ) : (
          <input value={typedText} onChange={e => setTypedText(e.target.value)}
            placeholder="Type your name…"
            style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 32, fontFamily: 'Georgia, serif', fontStyle: 'italic', boxSizing: 'border-box' }} />
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          {mode === 'draw' && <button onClick={clearCanvas} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 13 }}>Clear</button>}
          <button onClick={onCancel} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={commit} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Add to PDF</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditPDFPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [canvasDataUrls, setCanvasDataUrls] = useState<string[]>([]) // rendered page images
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [tool, setTool] = useState<ToolMode>('select')
  const [fontSize, setFontSize] = useState(16)
  const [fontColor, setFontColor] = useState('#000000')
  const [showSigPad, setShowSigPad] = useState(false)
  const [sigPlacing, setSigPlacing] = useState<string | null>(null) // dataUrl waiting to be placed
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfDocRef = useRef<unknown>(null)

  const loadPDF = useCallback(async (file: File) => {
    const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
    const { GlobalWorkerOptions } = pdfjsLib
    GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const ab = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: ab }).promise
    pdfDocRef.current = doc
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
    setCanvasDataUrls(urls)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') { setPdfFile(file); loadPDF(file) }
  }, [loadPDF])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setPdfFile(file); loadPDF(file) }
  }

  // ── Click on canvas area to place overlay ──────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasDataUrls[currentPage]) return
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height

    if (tool === 'text') {
      const id = crypto.randomUUID()
      setOverlays(prev => [...prev, { id, type: 'text', pageIndex: currentPage, x: fx, y: fy, text: '', fontSize, color: fontColor, editing: true }])
      setEditingId(id)
    } else if (tool === 'signature' && sigPlacing) {
      const id = crypto.randomUUID()
      setOverlays(prev => [...prev, { id, type: 'signature', pageIndex: currentPage, x: fx, y: fy, dataUrl: sigPlacing, width: 160, height: 50 }])
      setSigPlacing(null)
      setTool('select')
    }
  }

  // ── Drag overlays ──────────────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent, id: string) => {
    if (tool !== 'select') return
    e.stopPropagation()
    const ov = overlays.find(o => o.id === id)!
    setDragging({ id, startX: e.clientX, startY: e.clientY, ox: ov.x, oy: ov.y })
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent) => {
      const cont = containerRef.current
      if (!cont) return
      const r = cont.getBoundingClientRect()
      const dx = (e.clientX - dragging.startX) / r.width
      const dy = (e.clientY - dragging.startY) / r.height
      setOverlays(prev => prev.map(o => o.id === dragging.id ? { ...o, x: dragging.ox + dx, y: dragging.oy + dy } : o))
    }
    const up = () => setDragging(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging])

  const updateTextOverlay = (id: string, text: string) =>
    setOverlays(prev => prev.map(o => o.id === id && o.type === 'text' ? { ...o, text } : o))

  const deleteOverlay = (id: string) => setOverlays(prev => prev.filter(o => o.id !== id))

  // ── Save PDF ───────────────────────────────────────────────────────────────
  const savePDF = async () => {
    if (!canvasDataUrls.length) return
    setSaving(true)
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const outDoc = await PDFDocument.create()

      for (let pi = 0; pi < canvasDataUrls.length; pi++) {
        // Composite: render base page + overlays onto an offscreen canvas
        const img = new Image()
        await new Promise<void>(res => { img.onload = () => res(); img.src = canvasDataUrls[pi] })

        const offscreen = document.createElement('canvas')
        offscreen.width = img.naturalWidth
        offscreen.height = img.naturalHeight
        const ctx = offscreen.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        const pageOverlays = overlays.filter(o => o.pageIndex === pi)
        for (const ov of pageOverlays) {
          const px = ov.x * offscreen.width
          const py = ov.y * offscreen.height
          if (ov.type === 'text') {
            ctx.font = `${ov.fontSize * 1.6}px Arial, sans-serif`
            ctx.fillStyle = ov.color
            ctx.fillText(ov.text, px, py)
          } else {
            const sigImg = new Image()
            await new Promise<void>(res => { sigImg.onload = () => res(); sigImg.src = ov.dataUrl })
            ctx.drawImage(sigImg, px, py, ov.width * 1.6, ov.height * 1.6)
          }
        }

        const jpegBytes = await new Promise<ArrayBuffer>(res => {
          offscreen.toBlob(async blob => {
            res(await blob!.arrayBuffer())
          }, 'image/jpeg', 0.92)
        })

        const pdfImg = await outDoc.embedJpg(jpegBytes)
        const page = outDoc.addPage([pdfImg.width, pdfImg.height])
        page.drawImage(pdfImg, { x: 0, y: 0, width: pdfImg.width, height: pdfImg.height })
      }

      const bytes = await outDoc.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFile ? pdfFile.name.replace(/\.pdf$/i, '-edited.pdf') : 'edited.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setSaving(false)
    }
  }

  const currentOverlays = overlays.filter(o => o.pageIndex === currentPage)
  const hasFile = canvasDataUrls.length > 0

  const toolBtn = (t: ToolMode, label: string, icon: string) => (
    <button onClick={() => { setTool(t); if (t === 'signature') setShowSigPad(true) }}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 12px', borderRadius: 10, border: '1.5px solid',
        borderColor: tool === t ? '#F59E0B' : '#e5e7eb',
        background: tool === t ? '#FFF8EC' : '#fff',
        cursor: 'pointer', fontSize: 11, fontWeight: 600, color: tool === t ? '#92400e' : '#374151',
        minWidth: 60,
      }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      {label}
    </button>
  )

  const sidebar = (
    <ToolSidebar
      reverseActions={[]}
      relatedTools={[
        { name: 'Sign PDF', slug: 'sign-pdf', icon: '✍️', colorBg: '#DBEAFE', desc: 'Draw or type your signature' },
        { name: 'Annotate PDF', slug: 'annotate-pdf', icon: '💬', colorBg: '#DBEAFE', desc: 'Highlight and comment' },
        { name: 'Redact PDF', slug: 'redact-pdf', icon: '⬛', colorBg: '#DBEAFE', desc: 'Permanently remove content' },
        { name: 'Add Watermark', slug: 'add-watermark', icon: '💧', colorBg: '#DBEAFE', desc: 'Stamp text or image watermark' },
        { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', colorBg: '#FFF0DC', desc: 'Combine multiple PDFs' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Edit PDF + Sign" sidebar={sidebar}>
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
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Edit PDF + Sign </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Add text and signatures to any PDF. No upload — everything runs in your browser.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20, padding: '12px 16px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        {toolBtn('select', 'Select', '↖')}
        {toolBtn('text', 'Text', 'T')}
        <button onClick={() => setShowSigPad(true)}
          title="Signature"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 12px', borderRadius: 10, border: '1.5px solid',
            borderColor: tool === 'signature' ? '#F59E0B' : '#e5e7eb',
            background: tool === 'signature' ? '#FFF8EC' : '#fff',
            cursor: 'pointer', fontSize: 11, fontWeight: 600, color: tool === 'signature' ? '#92400e' : '#374151', minWidth: 60,
          }}>
          <span style={{ fontSize: 22 }}>✍</span>Sign
        </button>

        <div style={{ width: 1, height: 40, background: '#e5e7eb', margin: '0 4px' }} />

        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Size</label>
        <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}>
          {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40].map(s => <option key={s}>{s}</option>)}
        </select>

        <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)}
          title="Text color"
          style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', padding: 2 }} />

        <div style={{ flex: 1 }} />

        {hasFile && (
          <button onClick={savePDF} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: saving ? '#fcd34d' : '#F59E0B', color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? 'Saving…' : 'Download PDF'}</button>
        )}
      </div>

      {/* Page navigation */}
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
            <input type="file" accept="application/pdf" onChange={handleFileInput} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <div ref={containerRef}
            onClick={handleCanvasClick}
            style={{ position: 'relative', cursor: tool === 'text' ? 'text' : tool === 'signature' ? 'crosshair' : 'default', display: 'inline-block', width: '100%' }}>
            {/* Base page image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={canvasDataUrls[currentPage]} alt={`Page ${currentPage + 1}`}
              style={{ width: '100%', display: 'block', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} draggable={false} />

            {/* Overlays */}
            {currentOverlays.map(ov => (
              <div key={ov.id}
                onMouseDown={e => startDrag(e, ov.id)}
                style={{
                  position: 'absolute',
                  left: `${ov.x * 100}%`,
                  top: `${ov.y * 100}%`,
                  cursor: tool === 'select' ? 'move' : 'default',
                  userSelect: 'none',
                }}>
                {ov.type === 'text' ? (
                  <div style={{ position: 'relative' }}>
                    {editingId === ov.id ? (
                      <input
                        autoFocus
                        value={ov.text}
                        onChange={e => updateTextOverlay(ov.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null) }}
                        style={{
                          fontSize: `${ov.fontSize}px`, color: ov.color,
                          border: '1px dashed #F59E0B', background: 'rgba(255,255,255,0.85)',
                          padding: '2px 4px', borderRadius: 4, minWidth: 60, outline: 'none',
                        }}
                      />
                    ) : (
                      <span onDoubleClick={e => { e.stopPropagation(); setEditingId(ov.id) }}
                        style={{ fontSize: `${ov.fontSize}px`, color: ov.color, display: 'block', whiteSpace: 'nowrap', padding: '2px 4px', borderRadius: 4, outline: '1px dashed transparent' }}>
                        {ov.text || <span style={{ color: '#ccc' }}>double-click to type</span>}
                      </span>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteOverlay(ov.id) }}
                      style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ov.dataUrl} alt="signature"
                      style={{ width: ov.width, height: ov.height, display: 'block' }} draggable={false} />
                    <button onClick={e => { e.stopPropagation(); deleteOverlay(ov.id) }}
                      style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {hasFile && (
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          {tool === 'text' && 'Click anywhere on the page to add text. Double-click to edit.'}
          {tool === 'signature' && sigPlacing && 'Click anywhere on the page to place your signature.'}
          {tool === 'select' && 'Drag overlays to reposition. Click × to delete.'}
        </p>
      )}

      {showSigPad && (
        <SignaturePad
          onDone={dataUrl => { setSigPlacing(dataUrl); setTool('signature'); setShowSigPad(false) }}
          onCancel={() => { setShowSigPad(false); if (tool === 'signature') setTool('select') }}
        />
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Edit a PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Add text and signatures to any PDF in seconds. Here&apos;s how:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Drop your PDF into the upload area above or click <strong>Choose PDF</strong>.',
            'Choose the <strong>Text</strong> tool and click anywhere on the page to add a text box. Double-click to edit.',
            'Use the <strong>Sign</strong> tool to draw or type your signature, then click on the page to place it.',
            'Click <strong>Download PDF</strong> to save your edited document. No watermark added.',
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
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Can I edit text in my PDF?
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65, marginBottom: '20px' }}>
          Doclair is an overlay editor — it adds new text boxes on top of your PDF rather than modifying the original text layer. This works for filling out forms, adding annotations, inserting notes, or signing documents, and requires no server upload.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Edit PDF on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }}>
          Doclair works in mobile Safari and Chrome. Tap to place text boxes, draw your signature with your finger, and download the finished PDF — all without installing an app.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
