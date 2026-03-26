'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'Is my PDF uploaded to a server when I sign it?', a: 'Never. Doclair signs PDFs entirely in your browser. Your document is never transmitted to any server.' },
  { q: 'Can I draw my signature with a mouse or stylus?', a: 'Yes. Switch to Draw mode in the signature panel and draw directly on the canvas using your mouse, trackpad, or stylus.' },
  { q: 'How do I place my signature on a specific page?', a: 'Navigate to the desired page using the page controls, then click the "Add Signature" button and click anywhere on the page to place it.' },
  { q: 'Can I resize my signature after placing it?', a: 'Yes. Drag the amber handle in the bottom-right corner of your placed signature to resize it proportionally.' },
  { q: 'Can I sign PDF on iPhone or Android?', a: 'Yes. Doclair works in mobile Safari and Chrome. Touch works for drawing signatures and placing them on the page.' },
  { q: 'Will the signed PDF have a watermark?', a: 'Never. Doclair adds zero watermarks to any output. The signed PDF downloads exactly as-is.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Sign PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/sign-pdf',
      description: 'Sign PDF documents online free. Draw, type or upload your signature and place it anywhere. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
    { '@type': 'ListItem', position: 3, name: 'Sign PDF', item: 'https://doclair.in/sign-pdf' },
  ],
}

// ─── Signature Pad ────────────────────────────────────────────────────────────

type SigMode = 'draw' | 'type' | 'upload'

function SignatureModal({ onDone, onCancel }: { onDone: (dataUrl: string, w: number, h: number) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<SigMode>('draw')
  const [typedText, setTypedText] = useState('')
  const [typedFont, setTypedFont] = useState('italic 52px Georgia, serif')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPt = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect()
    const isTouch = 'touches' in e
    return {
      x: ((isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - r.left) * (c.width / r.width),
      y: ((isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - r.top) * (c.height / r.height),
    }
  }

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true
    lastPt.current = getPos(e, canvasRef.current!)
  }
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    ctx.strokeStyle = '#1A1612'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const pt = getPos(e, c)
    if (lastPt.current) { ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(pt.x, pt.y); ctx.stroke() }
    lastPt.current = pt
  }
  const onUp = () => { drawing.current = false; lastPt.current = null }
  const clear = () => canvasRef.current?.getContext('2d')?.clearRect(0, 0, 480, 180)

  const commit = () => {
    if (mode === 'draw') {
      const c = canvasRef.current!
      // Crop to actual drawn bounds
      const ctx = c.getContext('2d')!
      const data = ctx.getImageData(0, 0, c.width, c.height)
      let minX = c.width, maxX = 0, minY = c.height, maxY = 0
      for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i + 3] > 0) {
          const x = (i / 4) % c.width
          const y = Math.floor((i / 4) / c.width)
          if (x < minX) minX = x; if (x > maxX) maxX = x
          if (y < minY) minY = y; if (y > maxY) maxY = y
        }
      }
      if (maxX <= minX) { onDone(c.toDataURL(), 200, 60); return }
      const pad = 10
      const oc = document.createElement('canvas')
      oc.width = maxX - minX + pad * 2; oc.height = maxY - minY + pad * 2
      oc.getContext('2d')!.putImageData(ctx.getImageData(minX - pad, minY - pad, oc.width, oc.height), 0, 0)
      onDone(oc.toDataURL(), oc.width, oc.height)
    } else if (mode === 'type') {
      const text = typedText || 'Your Signature'
      const oc = document.createElement('canvas')
      oc.width = 400; oc.height = 90
      const ctx = oc.getContext('2d')!
      ctx.font = typedFont; ctx.fillStyle = '#1A1612'; ctx.textBaseline = 'middle'
      ctx.fillText(text, 6, 45)
      onDone(oc.toDataURL(), 400, 90)
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => onDone(img.src, img.naturalWidth, img.naturalHeight)
      img.src = ev.target!.result as string
    }
    reader.readAsDataURL(file)
  }

  const FONTS = [
    { label: 'Script', value: 'italic 52px Georgia, serif' },
    { label: 'Print', value: '500 48px Arial, sans-serif' },
    { label: 'Mono', value: '500 44px "Courier New", monospace' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 540, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20 }}>Create Your Signature</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {([['draw', 'Draw'], ['type', 'Type'], ['upload', 'Upload Image']] as const).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
              background: mode === m ? '#fff' : 'transparent',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              color: mode === m ? '#1A1612' : '#6b7280',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {mode === 'draw' && (
          <>
            <canvas ref={canvasRef} width={480} height={180}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
              style={{ border: '2px dashed #d1d5db', borderRadius: 10, display: 'block', width: '100%', height: 180, cursor: 'crosshair', touchAction: 'none' }} />
            <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 8 }}>Draw your signature above</p>
            <button onClick={clear} style={{ marginTop: 4, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>Clear</button>
          </>
        )}

        {mode === 'type' && (
          <>
            <input value={typedText} onChange={e => setTypedText(e.target.value)}
              placeholder="Type your name…"
              style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 28, fontFamily: 'Georgia, serif', fontStyle: 'italic', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FONTS.map(f => (
                <button key={f.value} onClick={() => setTypedFont(f.value)} style={{
                  padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                  borderColor: typedFont === f.value ? '#F59E0B' : '#e5e7eb',
                  background: typedFont === f.value ? '#FFF8EC' : '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>{f.label}</button>
              ))}
            </div>
          </>
        )}

        {mode === 'upload' && (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, border: '3px dashed #e5e7eb', borderRadius: 12, padding: '48px 24px', cursor: 'pointer', background: '#fafafa' }}>
            <span style={{ fontSize: 40 }}>🖼️</span>
            <span style={{ fontWeight: 600, color: '#374151' }}>Click to upload signature image</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>PNG with transparent background works best</span>
            <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
        )}

        {mode !== 'upload' && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={commit} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Use This Signature →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Signature Field (placed on PDF) ─────────────────────────────────────────

interface SigField {
  id: string
  pageIndex: number
  x: number // fraction
  y: number
  dataUrl: string
  w: number  // display width px (on rendered canvas)
  h: number
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SignPDFPage() {
  const [pageUrls, setPageUrls] = useState<string[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [fields, setFields] = useState<SigField[]>([])
  const [showModal, setShowModal] = useState(false)
  const [pendingSig, setPendingSig] = useState<{ dataUrl: string; w: number; h: number } | null>(null)
  const [placing, setPlacing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; startW: number; startH: number; startX: number; startY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadPDF = useCallback(async (file: File) => {
    const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    setPageCount(doc.numPages)
    setCurrentPage(0)
    const urls: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 1.6 })
      const canvas = document.createElement('canvas')
      canvas.width = vp.width; canvas.height = vp.height
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (page.render as any)({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
      urls.push(canvas.toDataURL('image/jpeg', 0.92))
    }
    setPageUrls(urls)
  }, [])

  const handleFile = (file: File) => { setPdfFile(file); loadPDF(file) }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing || !pendingSig) return
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    // Scale signature to reasonable size on the page
    const scaledW = Math.min(pendingSig.w, rect.width * 0.35)
    const scaledH = (pendingSig.h / pendingSig.w) * scaledW
    setFields(prev => [...prev, {
      id: crypto.randomUUID(), pageIndex: currentPage,
      x: fx, y: fy,
      dataUrl: pendingSig.dataUrl,
      w: scaledW, h: scaledH,
    }])
    setPendingSig(null)
    setPlacing(false)
  }

  // Drag
  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const f = fields.find(x => x.id === id)!
    setDragging({ id, ox: f.x, oy: f.y, sx: e.clientX, sy: e.clientY })
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent) => {
      const c = containerRef.current!
      const r = c.getBoundingClientRect()
      setFields(prev => prev.map(f => f.id === dragging.id ? {
        ...f,
        x: dragging.ox + (e.clientX - dragging.sx) / r.width,
        y: dragging.oy + (e.clientY - dragging.sy) / r.height,
      } : f))
    }
    const up = () => setDragging(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging])

  // Resize
  const startResize = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const f = fields.find(x => x.id === id)!
    setResizing({ id, startW: f.w, startH: f.h, startX: e.clientX, startY: e.clientY })
  }

  useEffect(() => {
    if (!resizing) return
    const move = (e: MouseEvent) => {
      const dx = e.clientX - resizing.startX
      const f = fields.find(x => x.id === resizing.id)!
      const ratio = f.h / f.w
      const newW = Math.max(40, resizing.startW + dx)
      setFields(prev => prev.map(x => x.id === resizing.id ? { ...x, w: newW, h: newW * ratio } : x))
    }
    const up = () => setResizing(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [resizing, fields])

  const deleteField = (id: string) => setFields(prev => prev.filter(f => f.id !== id))

  const savePDF = async () => {
    if (!pageUrls.length) return
    setSaving(true)
    setSaveError('')
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const out = await PDFDocument.create()
      for (let pi = 0; pi < pageUrls.length; pi++) {
        const img = new Image()
        await new Promise<void>(r => { img.onload = () => r(); img.src = pageUrls[pi] })
        const oc = document.createElement('canvas')
        oc.width = img.naturalWidth; oc.height = img.naturalHeight
        const ctx = oc.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        for (const f of fields.filter(x => x.pageIndex === pi)) {
          const si = new Image()
          await new Promise<void>(r => { si.onload = () => r(); si.src = f.dataUrl })
          ctx.drawImage(si, f.x * oc.width, f.y * oc.height, f.w * (oc.width / (containerRef.current?.getBoundingClientRect().width || 800)), f.h * (oc.width / (containerRef.current?.getBoundingClientRect().width || 800)))
        }
        const buf = await new Promise<ArrayBuffer>(r => oc.toBlob(async b => r(await b!.arrayBuffer()), 'image/jpeg', 0.94))
        const pdfImg = await out.embedJpg(buf)
        const page = out.addPage([pdfImg.width, pdfImg.height])
        page.drawImage(pdfImg, { x: 0, y: 0, width: pdfImg.width, height: pdfImg.height })
      }
      const bytes = await out.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = pdfFile ? pdfFile.name.replace(/\.pdf$/i, '-signed.pdf') : 'signed.pdf'
      a.click(); URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save signed PDF')
    } finally { setSaving(false) }
  }

  const pageFields = fields.filter(f => f.pageIndex === currentPage)
  const hasFile = pageUrls.length > 0

  const sidebar = (
    <ToolSidebar
      reverseActions={[]}
      relatedTools={[
        { name: 'Edit PDF', slug: 'edit-pdf', icon: '✍️', colorBg: '#DBEAFE', desc: 'Add text and signatures' },
        { name: 'Annotate PDF', slug: 'annotate-pdf', icon: '💬', colorBg: '#DBEAFE', desc: 'Highlight and comment' },
        { name: 'Redact PDF', slug: 'redact-pdf', icon: '⬛', colorBg: '#DBEAFE', desc: 'Permanently remove content' },
        { name: 'Encrypt PDF', slug: 'encrypt-pdf', icon: '🔐', colorBg: '#FEE2E2', desc: 'Add password protection' },
        { name: 'PDF Viewer', slug: 'pdf-viewer', icon: '👓', colorBg: '#F3F4F6', desc: 'View PDFs in browser' },
      ]}
      blogPost={{ slug: 'how-to-sign-pdf-free', title: 'How to Sign a PDF Free — Add Your Signature Without Printing' }}
    />
  )

  return (
    <ToolPageLayout toolName="Sign PDF" sidebar={sidebar}>
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
          <span style={{ color: 'var(--ink)' }}>Sign PDF </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Draw, type, or upload your signature and place it anywhere on the PDF. Fully private — nothing leaves your browser.
        </p>
      </div>

      {/* Toolbar */}
      {hasFile && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20, padding: '12px 16px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <button onClick={() => setShowModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 10, border: '1.5px solid #F59E0B',
            background: '#FFF8EC', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#92400e',
          }}>
            ✍️ Add Signature
          </button>
          {placing && (
            <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
              ↖ Click on the document to place your signature
            </span>
          )}
          <div style={{ flex: 1 }} />
          {fields.length > 0 && (
            <span style={{ fontSize: 13, color: '#6b7280' }}>{fields.length} signature{fields.length !== 1 ? 's' : ''} placed</span>
          )}
          <button onClick={savePDF} disabled={saving} style={{
            padding: '10px 28px', borderRadius: 10, border: 'none',
            background: saving ? '#fcd34d' : '#F59E0B', color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? 'Saving…' : 'Download Signed PDF'}</button>
        </div>
      )}
      {saveError && <div style={{ color: '#DC2626', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>{saveError}</div>}

      {/* Page nav */}
      {hasFile && pageCount > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Page {currentPage + 1} / {pageCount}</span>
          <button onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))} disabled={currentPage === pageCount - 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>→</button>
        </div>
      )}

      {/* Drop zone or PDF view */}
      {!hasFile ? (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 80, textAlign: 'center', background: '#fafafa' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✍️</div>
          <p style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Drop your PDF here to sign</p>
          <p style={{ color: '#9ca3af', marginBottom: 28 }}>or</p>
          <label style={{ padding: '14px 32px', borderRadius: 12, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>
            Choose PDF
            <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
          </label>
          <div style={{ marginTop: 28, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['No uploads — browser only', 'Free forever', 'Draw, type or upload sig'].map(t => (
              <span key={t} style={{ fontSize: 13, color: '#6b7280' }}>✓ {t}</span>
            ))}
          </div>
        </div>
      ) : (
        <div ref={containerRef}
          onClick={handleCanvasClick}
          style={{ position: 'relative', display: 'inline-block', width: '100%', cursor: placing ? 'crosshair' : 'default' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pageUrls[currentPage]} alt={`Page ${currentPage + 1}`}
            style={{ width: '100%', display: 'block', borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} draggable={false} />
          {pageFields.map(f => (
            <div key={f.id} style={{ position: 'absolute', left: `${f.x * 100}%`, top: `${f.y * 100}%`, cursor: 'move', userSelect: 'none' }}
              onMouseDown={e => startDrag(e, f.id)}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.dataUrl} alt="signature" style={{ width: f.w, height: f.h, display: 'block', pointerEvents: 'none' }} draggable={false} />
                {/* Delete */}
                <button onClick={e => { e.stopPropagation(); deleteField(f.id) }} style={{
                  position: 'absolute', top: -10, right: -10, background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
                {/* Resize handle */}
                <div onMouseDown={e => startResize(e, f.id)} style={{
                  position: 'absolute', bottom: -6, right: -6, width: 14, height: 14,
                  background: '#F59E0B', borderRadius: 3, cursor: 'se-resize',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasFile && (
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
          {placing ? 'Click anywhere on the page to place your signature' : 'Drag signatures to reposition · Resize with the amber handle · Click × to delete'}
        </p>
      )}

      {showModal && (
        <SignatureModal
          onDone={(dataUrl, w, h) => { setPendingSig({ dataUrl, w, h }); setShowModal(false); setPlacing(true) }}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Sign a PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Adding your signature to a PDF takes seconds with Doclair. Here&apos;s how:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Open the tool and drop your PDF into the upload area above.',
            'Click <strong>Add Signature</strong> — draw with your mouse or stylus, type your name, or upload a signature image.',
            'Click on the page to place your signature. Drag to reposition it anywhere you like.',
            'Click <strong>Download Signed PDF</strong> to save your document. No watermark, no upload.',
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
          Is it safe to sign confidential PDFs online?
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65, marginBottom: '20px' }}>
          Completely safe. Doclair processes everything in your browser using JavaScript — your PDF is never uploaded to any server. Legal contracts, medical forms, and business documents stay 100% on your device.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Sign PDF on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }}>
          Doclair works in mobile Safari and Chrome. Touch support lets you draw your signature directly with your finger or stylus and tap the page to place it — no app download required.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
