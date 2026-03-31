'use client'

import { useState, useRef, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

interface ScannedPage {
  id: string
  dataUrl: string
  rotation: number // 0, 90, 180, 270
}

const FAQS = [
  { q: 'Does Doclair upload my scans?', a: 'No. Camera captures and uploaded images are assembled into a PDF using pdf-lib in your browser. Nothing is sent to a server.' },
  { q: 'Can I scan without a camera?', a: 'Yes. You can add photos or images from your device and combine them into one PDF.' },
  { q: 'Can I choose page size?', a: 'Yes. Pick A4, US Letter, or auto sizing before building your PDF.' },
  { q: 'Is scan to PDF free?', a: 'Yes. Doclair does not add a watermark to your PDF.' },
]

const TOOL_SEO_NAME = 'Scan to PDF'
const TOOL_SLUG = 'scan-to-pdf'
const TOOL_DESCRIPTION = 'Use your device camera to scan documents and convert them to PDF online free. No upload, no watermark, files stay in your browser.'

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
        'Capture pages with device camera',
        'Add images and build a multi-page PDF',
        'A4, Letter, or auto page sizing',
        'Local processing, no watermark',
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

export default function ScanToPDFPage() {
  const [pages, setPages] = useState<ScannedPage[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'auto'>('A4')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch {
      setCameraError('Camera access denied or not available. You can still upload images below.')
    }
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPages(prev => [...prev, { id: crypto.randomUUID(), dataUrl, rotation: 0 }])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        if (ev.target?.result) {
          setPages(prev => [...prev, { id: crypto.randomUUID(), dataUrl: ev.target!.result as string, rotation: 0 }])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const rotatePage = (id: string) =>
    setPages(prev => prev.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))

  const deletePage = (id: string) => setPages(prev => prev.filter(p => p.id !== id))

  const movePage = (id: string, dir: -1 | 1) => {
    setPages(prev => {
      const idx = prev.findIndex(p => p.id === id)
      if (idx < 0) return prev
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
  }

  const savePDF = async () => {
    if (!pages.length) return
    setSaving(true)
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const outDoc = await PDFDocument.create()

      for (const pg of pages) {
        const img = new Image()
        await new Promise<void>(res => { img.onload = () => res(); img.src = pg.dataUrl })

        // Apply rotation
        const rotated = pg.rotation !== 0
        const cw = rotated && pg.rotation % 180 !== 0 ? img.naturalHeight : img.naturalWidth
        const ch = rotated && pg.rotation % 180 !== 0 ? img.naturalWidth : img.naturalHeight

        const offscreen = document.createElement('canvas')
        offscreen.width = cw
        offscreen.height = ch
        const ctx = offscreen.getContext('2d')!
        ctx.translate(cw / 2, ch / 2)
        ctx.rotate((pg.rotation * Math.PI) / 180)
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

        const jpegBuf = await new Promise<ArrayBuffer>(res => {
          offscreen.toBlob(async b => res(await b!.arrayBuffer()), 'image/jpeg', 0.92)
        })
        const pdfImg = await outDoc.embedJpg(jpegBuf)

        let w = pdfImg.width
        let h = pdfImg.height

        if (pageSize === 'A4') { w = 595; h = 842 }
        else if (pageSize === 'Letter') { w = 612; h = 792 }

        const page = outDoc.addPage([w, h])
        // Scale image to fit page
        const scale = Math.min(w / pdfImg.width, h / pdfImg.height)
        const imgW = pdfImg.width * scale
        const imgH = pdfImg.height * scale
        page.drawImage(pdfImg, {
          x: (w - imgW) / 2,
          y: (h - imgH) / 2,
          width: imgW,
          height: imgH,
        })
      }

      const bytes = await outDoc.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'scanned-document.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setSaving(false)
    }
  }

  const sidebar = (
    <ToolSidebar relatedTools={[
      { name: 'JPG → PDF', slug: 'jpg-to-pdf', icon: '🖼️', colorBg: '#FFF0DC', desc: 'Convert images to PDF' },
      { name: 'Image → PDF', slug: 'image-to-pdf', icon: '🖼️', colorBg: '#D1FAE5', desc: 'Convert any image to PDF' },
      { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size safely' },
      { name: 'OCR PDF', slug: 'ocr-pdf', icon: '👁️', colorBg: '#EDE9FE', desc: 'Make scanned text searchable' },
      { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', colorBg: '#FFF0DC', desc: 'Combine multiple PDFs' },
    ]} />
  )

  return (
    <ToolPageLayout toolName="Scan to PDF" sidebar={sidebar}>

{/* Tool Header Card */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Scan to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Use your device camera to scan documents and convert them to a multi-page PDF. No upload — all processing happens in your browser.
        </p>
      </div>

      {/* Camera section */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        {!cameraActive ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: '#374151' }}>Scan with your camera</p>
            {cameraError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{cameraError}</p>}
            <button onClick={startCamera} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Open Camera
            </button>
          </div>
        ) : (
          <div>
            <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block', maxHeight: 480, objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={capture} style={{
                padding: '14px 40px', borderRadius: 50, border: '4px solid #F59E0B',
                background: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(245,158,11,0.3)',
              }}>
                📸 Capture
              </button>
              <button onClick={stopCamera} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#6b7280' }}>
                Stop Camera
              </button>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 20, paddingTop: 20, textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Or upload images directly</p>
          <label style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px dashed #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            + Add Images (JPG, PNG, HEIC)
            <input type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Pages preview */}
      {pages.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Page size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value as typeof pageSize)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}>
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="auto">Auto (image size)</option>
              </select>
              <button onClick={savePDF} disabled={saving} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: saving ? '#fcd34d' : '#F59E0B', color: '#fff',
                fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
              }}>{saving ? 'Creating PDF…' : 'Download PDF'}</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {pages.map((pg, idx) => (
              <div key={pg.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', background: '#f3f4f6', height: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pg.dataUrl} alt={`Page ${idx + 1}`}
                    style={{ maxWidth: '100%', maxHeight: '100%', transform: `rotate(${pg.rotation}deg)`, transition: 'transform 0.2s' }} />
                  <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{idx + 1}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, padding: 8, justifyContent: 'center' }}>
                  <button onClick={() => movePage(pg.id, -1)} disabled={idx === 0} title="Move left"
                    style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 14 }}>←</button>
                  <button onClick={() => rotatePage(pg.id)} title="Rotate"
                    style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 14 }}>↻</button>
                  <button onClick={() => movePage(pg.id, 1)} disabled={idx === pages.length - 1} title="Move right"
                    style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 14 }}>→</button>
                  <button onClick={() => deletePage(pg.id)} title="Delete"
                    style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 14, color: '#ef4444' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.5px', marginBottom: '24px' }}>
          How to Scan a Document to PDF — Free
        </h2>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.8, color: 'var(--ink)', opacity: 0.8 }}>
          <li>Click <strong>Open Camera</strong> to use your device&apos;s back camera.</li>
          <li>Click <strong>Capture</strong> to photograph each page of your document.</li>
          <li>Reorder or rotate pages using the controls below each thumbnail.</li>
          <li>Choose page size (A4, Letter, or auto) and click <strong>Download PDF</strong>.</li>
        </ol>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '32px', marginBottom: '12px' }}>
          Can I use photos from my camera roll instead of scanning?
        </h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Yes. Click &quot;+ Add Images&quot; to upload photos directly from your device. You can mix scanned captures and uploaded photos in the same PDF.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '32px', marginBottom: '12px' }}>
          Scan PDF on iPhone and Android
        </h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Works in mobile Safari and Chrome. Use your phone&apos;s rear camera for best quality. After scanning, add the PDF to your Files app for easy sharing.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
