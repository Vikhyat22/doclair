'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PDFDocument } from '@cantoo/pdf-lib'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { addWatermark } from '@/lib/pdf/watermark'
import type { WatermarkOptions, WatermarkPosition, WatermarkType } from '@/lib/pdf/watermark'

const PRESETS = ['DRAFT', 'CONFIDENTIAL', 'COPY', 'FOR REVIEW', 'SAMPLE']

const FAQS = [
  { q: 'Can I add an image watermark instead of text?', a: 'Yes. Switch to Image watermark mode and upload a PNG or JPG logo. Supported: PNG (with transparency), JPEG.' },
  { q: 'Will Doclair add its own watermark on my PDF?', a: 'Never. Your output PDF is completely clean. Doclair is free with no branding added to your documents.' },
  { q: 'Can I add CONFIDENTIAL or DRAFT as a watermark?', a: 'Yes — click any of the quick presets (DRAFT, CONFIDENTIAL, COPY, FOR REVIEW, SAMPLE) to fill in the text instantly.' },
  { q: 'Is the watermark permanent?', a: 'Yes. The watermark is drawn directly into the PDF page content and cannot be removed with standard PDF editors. For a removable visual overlay, use annotation layers instead.' },
  { q: 'Are my files uploaded to add the watermark?', a: 'Never. @cantoo/pdf-lib runs entirely in your browser. Your PDF never leaves your device.' },
  { q: 'Can I control the watermark opacity?', a: 'Yes. Use the Opacity slider from 5% (very subtle) to 95% (fully bold). A typical DRAFT watermark looks best at 20–30% opacity.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Add Watermark to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/add-watermark',
      description: 'Add text or image watermarks to any PDF. Control opacity, rotation and position. Live CSS preview. Free, no upload, no watermark from Doclair.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Text watermark with custom font size, color and rotation',
        'Image watermark with PNG and JPEG support',
        'Live CSS preview before applying',
        'Opacity, rotation and position controls',
        'No file upload to server',
        'No watermark on output from Doclair',
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
    { '@type': 'ListItem', position: 1, name: 'Home',          item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',         item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Add Watermark', item: 'https://doclair.in/add-watermark' },
  ],
}

type ToolState = 'idle' | 'loadingPreview' | 'ready' | 'processing' | 'done' | 'error'

const POSITION_GRID: Array<Array<{ pos: WatermarkPosition | null; glyph: string }>> = [
  [{ pos: 'top-left', glyph: '↖' }, { pos: 'top-center', glyph: '↑' }, { pos: 'top-right', glyph: '↗' }],
  [{ pos: null, glyph: '' },        { pos: 'center', glyph: '⊕' },      { pos: null, glyph: '' }],
  [{ pos: 'bottom-left', glyph: '↙' }, { pos: 'bottom-center', glyph: '↓' }, { pos: 'bottom-right', glyph: '↘' }],
]

function getOverlayCss(pos: WatermarkPosition, rotation: number): React.CSSProperties {
  switch (pos) {
    case 'top-left':      return { top: '5%', left: '5%', transform: `rotate(${rotation}deg)` }
    case 'top-center':    return { top: '5%', left: '50%', transform: `translateX(-50%) rotate(${rotation}deg)` }
    case 'top-right':     return { top: '5%', right: '5%', left: 'auto', transform: `rotate(${rotation}deg)` }
    case 'bottom-left':   return { bottom: '5%', left: '5%', top: 'auto', transform: `rotate(${rotation}deg)` }
    case 'bottom-center': return { bottom: '5%', left: '50%', top: 'auto', transform: `translateX(-50%) rotate(${rotation}deg)` }
    case 'bottom-right':  return { bottom: '5%', right: '5%', left: 'auto', top: 'auto', transform: `rotate(${rotation}deg)` }
    default:              return { top: '50%', left: '50%', transform: `translate(-50%,-50%) rotate(${rotation}deg)` }
  }
}

export default function AddWatermarkPage() {
  const [file, setFile]                       = useState<File | null>(null)
  const [pageCount, setPageCount]             = useState(0)
  const [previewUrl, setPreviewUrl]           = useState<string | null>(null)
  const [pdfPageW, setPdfPageW]               = useState(0)
  const [pdfPageH, setPdfPageH]               = useState(0)
  const [imageNatW, setImageNatW]             = useState(0)
  const [imageNatH, setImageNatH]             = useState(0)
  const [watermarkType, setWatermarkType]     = useState<WatermarkType>('text')
  const [text, setText]                       = useState('CONFIDENTIAL')
  const [imageFile, setImageFile]             = useState<File | null>(null)
  const [imageThumb, setImageThumb]           = useState<string | null>(null)
  const [opacity, setOpacity]                 = useState(0.3)
  const [rotation, setRotation]               = useState(45)
  const [position, setPosition]               = useState<WatermarkPosition>('center')
  const [fontSize, setFontSize]               = useState(48)
  const [color, setColor]                     = useState('#000000')
  const [scale, setScale]                     = useState(0.3)
  const [toolState, setToolState]             = useState<ToolState>('idle')
  const [errorMessage, setErrorMessage]       = useState('')
  const [resultBytes, setResultBytes]         = useState<Uint8Array | null>(null)
  const [progress, setProgress]               = useState({ n: 0, total: 0 })

  const previewUrlRef  = useRef<string | null>(null)
  const imageThumbRef  = useRef<string | null>(null)
  const previewImgRef  = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      if (imageThumbRef.current) URL.revokeObjectURL(imageThumbRef.current)
    }
  }, [])

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setToolState('loadingPreview')
    setResultBytes(null)
    try {
      const bytes = await f.arrayBuffer()
      const doc   = await PDFDocument.load(bytes)
      const count = doc.getPageCount()
      setFile(f)
      setPageCount(count)

      // Render page 1 via pdfjs
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const pdf  = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false }).promise
      const page = await pdf.getPage(1)
      // Scale=1 viewport gives us the page dimensions in PDF points
      const vp1  = page.getViewport({ scale: 1 })
      setPdfPageW(vp1.width)
      setPdfPageH(vp1.height)
      const vp   = page.getViewport({ scale: 0.8 })
      const canvas       = document.createElement('canvas')
      canvas.width       = Math.floor(vp.width)
      canvas.height      = Math.floor(vp.height)
      const ctx          = canvas.getContext('2d')!
      ctx.fillStyle      = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      canvas.width  = 0; canvas.height = 0

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      setPreviewUrl(dataUrl)
      previewUrlRef.current = null // it's a dataURL, no revoke needed

      setToolState('ready')
    } catch (err) {
      console.error('Failed to load PDF:', err)
      const message = err instanceof Error ? err.message : 'Failed to load PDF.'
      setErrorMessage(message)
      setToolState('error')
    }
  }, [])

  function handleImageFile(files: File[]) {
    const f = files[0]
    if (!f) return
    if (imageThumbRef.current) {
      URL.revokeObjectURL(imageThumbRef.current)
      imageThumbRef.current = null
    }
    const url = URL.createObjectURL(f)
    imageThumbRef.current = url
    setImageFile(f)
    setImageThumb(url)
    // Capture natural dimensions so we can scale the preview correctly
    const img = new Image()
    img.onload = () => { setImageNatW(img.naturalWidth); setImageNatH(img.naturalHeight) }
    img.src = url
  }

  function clearImageFile() {
    if (imageThumbRef.current) {
      URL.revokeObjectURL(imageThumbRef.current)
      imageThumbRef.current = null
    }
    setImageFile(null)
    setImageThumb(null)
    setImageNatW(0)
    setImageNatH(0)
  }

  async function handleApply() {
    if (!file) return
    if (watermarkType === 'text' && !text) return
    if (watermarkType === 'image' && !imageFile) return
    setToolState('processing')
    setProgress({ n: 0, total: pageCount })
    try {
      const opts: WatermarkOptions = {
        type:      watermarkType,
        text:      watermarkType === 'text' ? text : undefined,
        imageFile: watermarkType === 'image' ? imageFile! : undefined,
        opacity,
        rotation,
        position,
        fontSize:  watermarkType === 'text' ? fontSize : undefined,
        color:     watermarkType === 'text' ? color : undefined,
        scale:     watermarkType === 'image' ? scale : undefined,
      }
      const result = await addWatermark(file, opts, (n, total) => setProgress({ n, total }))
      setResultBytes(result)
      setToolState('done')
    } catch (err) {
      console.error('Watermark failed:', err)
      const message = err instanceof Error ? err.message : 'Watermark could not be applied.'
      setErrorMessage(message)
      setToolState('error')
    }
  }

  function handleDownload() {
    if (!resultBytes || !file) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace('.pdf', '-watermarked.pdf')
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
    if (imageThumbRef.current) { URL.revokeObjectURL(imageThumbRef.current); imageThumbRef.current = null }
    setFile(null)
    setPageCount(0)
    setPreviewUrl(null)
    setPdfPageW(0)
    setPdfPageH(0)
    setWatermarkType('text')
    setText('CONFIDENTIAL')
    setImageFile(null)
    setImageThumb(null)
    setImageNatW(0)
    setImageNatH(0)
    setOpacity(0.3)
    setRotation(45)
    setPosition('center')
    setFontSize(48)
    setColor('#000000')
    setScale(0.3)
    setToolState('idle')
    setErrorMessage('')
    setResultBytes(null)
    setProgress({ n: 0, total: 0 })
  }

  const isApplyDisabled = !file ||
    (watermarkType === 'text' && !text) ||
    (watermarkType === 'image' && !imageFile)

  const overlayCss = getOverlayCss(position, rotation)

  // Scale factor from PDF points → preview CSS pixels.
  // The preview <img> renders at width: 100% of its container, so clientWidth / pdfPageW
  // gives us how many CSS pixels correspond to one PDF point.
  const displayScale = (pdfPageW > 0 && previewImgRef.current?.clientWidth)
    ? previewImgRef.current.clientWidth / pdfPageW
    : 0.55
  // Font size in preview pixels that matches the actual PDF output
  const previewFontSizePx = Math.round(fontSize * displayScale)
  // Image width in preview pixels that matches the actual PDF output (imageNatW * scale points in PDF)
  const previewImgWidthPx = imageNatW > 0 ? Math.round(imageNatW * scale * displayScale) : Math.round(scale * 200)

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Watermark Removal', slug: 'flatten-pdf', icon: '🔥', colorBg: '#FEE2E2', desc: 'Flatten PDF to make watermarks permanent' },
      ]}
      relatedTools={[
        { name: 'Encrypt PDF',       slug: 'encrypt-pdf',         icon: '🔐', colorBg: '#DCFCE7', desc: 'Password-protect your PDF' },
        { name: 'Flatten PDF',       slug: 'flatten-pdf',         icon: '🔥', colorBg: '#FEE2E2', desc: 'Flatten annotations permanently' },
        { name: 'Add Page Numbers',  slug: 'add-page-numbers',    icon: '🔢', colorBg: '#EDE9FE', desc: 'Stamp page numbers on PDF' },
        { name: 'Redact PDF',        slug: 'redact-pdf',          icon: '⬛', colorBg: '#1A1612', desc: 'Permanently remove sensitive text' },
        { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata',       icon: '🏷️', colorBg: '#FFF0DC', desc: 'Change title, author and more' },
      ]}
      blogPost={{ slug: 'how-to-add-watermark-to-pdf', title: 'How to Add a Watermark to PDF Free' }}
    />
  )

  return (
    <ToolPageLayout toolName="Add Watermark" sidebar={sidebar}>
{/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark From Doclair</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Add Watermark to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Stamp Text or Logo</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Add text or image watermarks to any PDF. Control opacity, rotation and position. Live CSS preview. Free, no upload, no watermark from Doclair.
        </p>
      </div>

      {/* Idle: drop zone */}
      {toolState === 'idle' && (
        <DropZone
          onFilesAdded={addFile}
          accept=".pdf"
          maxFiles={1}
          maxSizeMB={200}
          currentCount={0}
          icon="🖊️"
          label="Drop your PDF here"
          subLabel="or click to browse — max 200 MB"
        />
      )}

      {/* Loading preview */}
      {toolState === 'loadingPreview' && (
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
            fontSize: '22px', color: 'white', marginBottom: '6px',
          }}>Loading PDF…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>Rendering page preview</div>
        </div>
      )}

      {/* Ready: two-column editor */}
      {(toolState === 'ready') && file && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Left column: options */}
          <div style={{ flex: '0 0 380px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* File info row */}
            <div style={{
              background: 'white', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '36px', height: '36px', background: '#FFF0DC', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0,
              }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
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

            {/* Options panel */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Quick presets (text mode) */}
              {watermarkType === 'text' && (
                <div>
                  <div style={{
                    fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                    color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px',
                  }}>// Quick Presets</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {PRESETS.map(preset => (
                      <button
                        key={preset}
                        onClick={() => setText(preset)}
                        style={{
                          padding: '6px 12px', borderRadius: '100px',
                          border: `1px solid ${text === preset ? 'var(--amber)' : 'var(--border)'}`,
                          background: text === preset ? 'var(--amber)' : 'transparent',
                          color: text === preset ? 'white' : 'var(--ink)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                          fontSize: '11px', fontWeight: 500,
                        }}
                        onMouseEnter={e => {
                          if (text !== preset) {
                            e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                            e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (text !== preset) {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.background = 'transparent'
                          }
                        }}
                      >{preset}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Type selector tabs */}
              <div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                  {(['text', 'image'] as WatermarkType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setWatermarkType(t)}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: `2px solid ${watermarkType === t ? 'var(--amber)' : 'transparent'}`,
                        background: 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                        fontSize: '13px', fontWeight: 500,
                        color: watermarkType === t ? 'var(--ink)' : 'var(--muted)',
                        transition: 'all 0.15s',
                        marginBottom: '-1px',
                      }}
                    >
                      {t === 'text' ? 'Text watermark' : 'Image watermark'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text mode options */}
              {watermarkType === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid var(--border)', fontSize: '14px',
                        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                        color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
                      }}
                      placeholder="e.g. CONFIDENTIAL"
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Font size: {fontSize}pt
                    </label>
                    <input
                      type="range" min={24} max={96} step={2} value={fontSize}
                      onChange={e => setFontSize(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--amber)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Color
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="color" value={color}
                        onChange={e => setColor(e.target.value)}
                        style={{ width: '40px', height: '40px', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
                      />
                      <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', color: 'var(--ink)' }}>{color}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Image mode options */}
              {watermarkType === 'image' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {!imageThumb ? (
                    <DropZone
                      onFilesAdded={handleImageFile}
                      accept=".jpg,.jpeg,.png"
                      maxFiles={1}
                      maxSizeMB={10}
                      currentCount={0}
                      icon="🖼️"
                      label="Drop logo or image"
                      subLabel="PNG or JPG, max 10 MB"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={imageThumb} alt="Image watermark" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px', wordBreak: 'break-all' }}>{imageFile?.name}</div>
                        <button
                          onClick={clearImageFile}
                          style={{
                            padding: '4px 12px', borderRadius: '100px',
                            border: '1px solid var(--border)', background: 'transparent',
                            cursor: 'pointer', fontSize: '12px', color: 'var(--muted)',
                            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                        >✕ Remove</button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Scale: {Math.round(scale * 100)}%
                    </label>
                    <input
                      type="range" min={0.1} max={1.0} step={0.05} value={scale}
                      onChange={e => setScale(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--amber)' }}
                    />
                  </div>
                </div>
              )}

              {/* Opacity */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                  color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px',
                }}>// Opacity: {Math.round(opacity * 100)}%</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>Subtle</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>Bold</span>
                </div>
                <input
                  type="range" min={0.05} max={0.95} step={0.05} value={opacity}
                  onChange={e => setOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--amber)' }}
                />
              </div>

              {/* Rotation */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                  color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px',
                }}>// Rotation: {rotation}°</div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {[0, 45, 90, 315].map(r => (
                    <button
                      key={r}
                      onClick={() => setRotation(r)}
                      style={{
                        padding: '5px 12px', borderRadius: '100px',
                        border: `1px solid ${rotation === r ? 'var(--amber)' : 'var(--border)'}`,
                        background: rotation === r ? 'var(--amber)' : 'transparent',
                        color: rotation === r ? 'white' : 'var(--ink)',
                        cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                        fontSize: '11px', fontWeight: 500,
                      }}
                      onMouseEnter={e => {
                        if (rotation !== r) {
                          e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                          e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (rotation !== r) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >{r}°</button>
                  ))}
                </div>
                <input
                  type="range" min={0} max={360} step={1} value={rotation}
                  onChange={e => setRotation(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--amber)' }}
                />
              </div>

              {/* Position grid */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                  color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px',
                }}>// Position</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', maxWidth: '180px' }}>
                  {POSITION_GRID.map((row, ri) =>
                    row.map((cell, ci) => (
                      <div key={`${ri}-${ci}`}>
                        {cell.pos ? (
                          <button
                            onClick={() => setPosition(cell.pos!)}
                            style={{
                              width: '52px', height: '44px', borderRadius: '8px',
                              border: `1px solid ${position === cell.pos ? 'var(--amber)' : 'var(--border)'}`,
                              background: position === cell.pos ? 'var(--amber)' : 'transparent',
                              color: position === cell.pos ? 'white' : 'var(--ink)',
                              cursor: 'pointer', transition: 'all 0.15s',
                              fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={e => {
                              if (position !== cell.pos) {
                                e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                                e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                              }
                            }}
                            onMouseLeave={e => {
                              if (position !== cell.pos) {
                                e.currentTarget.style.borderColor = 'var(--border)'
                                e.currentTarget.style.background = 'transparent'
                              }
                            }}
                          >{cell.glyph}</button>
                        ) : (
                          <div style={{ width: '52px', height: '44px' }} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Apply button */}
              <button
                onClick={handleApply}
                disabled={isApplyDisabled}
                style={{
                  width: '100%', background: 'var(--ink)', color: 'white', padding: '15px 24px',
                  borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                  fontWeight: 700, fontSize: '16px', border: 'none',
                  cursor: isApplyDisabled ? 'not-allowed' : 'pointer',
                  opacity: isApplyDisabled ? 0.4 : 1,
                  transition: 'transform 0.15s, opacity 0.15s',
                }}
                onMouseEnter={e => { if (!isApplyDisabled) e.currentTarget.style.transform = 'scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                🖊️ Add Watermark to All Pages
              </button>
            </div>
          </div>

          {/* Right column: preview */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
              }}>// Live Preview (page 1)</div>

              {previewUrl && (
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <img
                    ref={previewImgRef}
                    src={previewUrl}
                    alt="PDF page 1 preview"
                    style={{ width: '100%', display: 'block' }}
                  />

                  {/* Watermark overlay */}
                  <div style={{
                    position: 'absolute',
                    ...overlayCss,
                    opacity,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}>
                    {watermarkType === 'text' && text && (
                      <div style={{
                        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                        fontSize: `${previewFontSizePx}px`,
                        fontWeight: 700,
                        color,
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.05em',
                      }}>
                        {text}
                      </div>
                    )}
                    {watermarkType === 'image' && imageThumb && (
                      <img
                        src={imageThumb}
                        alt="Watermark preview"
                        style={{
                          width: `${previewImgWidthPx}px`,
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              <div style={{
                marginTop: '10px',
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--muted)', textAlign: 'center',
              }}>
                Live preview — matches PDF output
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing state */}
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
          }}>Adding watermark…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>
            {progress.total > 0 ? `Page ${progress.n} of ${progress.total}` : 'Preparing…'}
          </div>
        </div>
      )}

      {/* Done state */}
      {toolState === 'done' && file && (
        <DownloadCard
          filename={file.name.replace(/\.pdf$/i, '-watermarked.pdf')}
          description={`${watermarkType} watermark · ${pageCount} page${pageCount !== 1 ? 's' : ''}`}
          onDownload={handleDownload}
          onReset={handleReset}
          title="Watermark added!"
          resetLabel="Watermark another →"
          nextSteps={[
            { slug: 'encrypt-pdf',  name: 'Encrypt PDF',   icon: '🔒' },
            { slug: 'compress-pdf', name: 'Compress PDF',  icon: '🗜️' },
            { slug: 'merge-pdf',    name: 'Merge PDFs',    icon: '🔗' },
          ]}
        />
      )}

      {/* Error state */}
      {toolState === 'error' && <ErrorCard message={errorMessage || 'The PDF could not be processed.'} onReset={handleReset} />}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Add a Watermark to PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Watermarking your PDF takes seconds with Doclair. No software, no account, and your PDF never leaves your browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Upload your PDF by clicking <strong>Drop your PDF here</strong> or dragging it into the upload area.',
            'Choose <strong>Text watermark</strong> or <strong>Image watermark</strong>. Configure the text, color, font size — or upload a PNG/JPG logo.',
            'Adjust <strong>opacity</strong>, <strong>rotation</strong> and <strong>position</strong> using the controls. Watch the live CSS preview update in real time.',
            'Click <strong>Add Watermark to All Pages</strong>. Download your watermarked PDF instantly.',
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
          Text watermarks vs image watermarks — when to use each
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Text watermarks like DRAFT or CONFIDENTIAL are ideal when you need to communicate a document status at a glance. They render crisply at any size and are easy to configure. Image watermarks are best for branding — upload your company logo as a PNG (with transparency) and it will be composited over every page at your chosen opacity and scale.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Add CONFIDENTIAL or DRAFT watermark to PDF
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Click the <strong>CONFIDENTIAL</strong> or <strong>DRAFT</strong> preset button to fill in the text instantly. Then set the opacity to around 25–30% for the classic semi-transparent look used in legal and corporate documents. Rotate to 45° for the standard diagonal stamp style.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Add company logo as watermark to PDF
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Switch to <strong>Image watermark</strong> mode, upload your logo as a PNG file (transparency is preserved), and adjust the Scale slider to size it proportionally. Use the position grid to place it in the center, a corner, or along any edge. Set opacity to 15–25% for a subtle background brand mark.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
