'use client'

import { useState, useCallback } from 'react'
import { removeImageBackground } from '@/lib/image/removeBackground'
import type { RemoveBgResult } from '@/lib/image/removeBackground'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'

const FAQS = [
  { q: 'Is background removal free?', a: 'Yes, completely free with no limits. No account required, no watermark added, and no daily caps.' },
  { q: 'What image formats are supported?', a: 'JPG, JPEG, PNG, and WebP are fully supported. For HEIC/HEIF (iPhone photos), convert to JPG first using the HEIC to PDF tool.' },
  { q: 'Does the AI work on portrait photos?', a: 'Yes — the AI model is trained on a wide range of subjects including people, products, animals, and objects. Portrait photos with clear subjects work very well.' },
  { q: 'Is my image uploaded to a server?', a: 'No. Background removal runs entirely in your browser using ONNX Runtime (WebAssembly). Your image never leaves your device. The AI model is downloaded once and cached locally.' },
  { q: 'What file format is the output?', a: 'The output is always a PNG file with full transparency. PNG is the standard format for transparent images and works with Canva, Figma, Photoshop, PowerPoint, and all design tools.' },
  { q: 'Can I remove background from a logo or product photo?', a: 'Yes — logos and product photos on clean backgrounds work extremely well. For complex backgrounds (busy patterns, similar colors to subject), results may vary. The medium-quality model balances speed and accuracy.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'Remove Background — Doclair', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (browser-based)', url: 'https://doclair.in/remove-background', description: 'Remove image background free. AI-powered, runs in browser. Transparent PNG output.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' } },
    { '@type': 'FAQPage', mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
}

const BREADCRUMB = {
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',              item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',             item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Remove Background', item: 'https://doclair.in/remove-background' },
  ],
}

const BG_OPTIONS = [
  { label: 'White',   value: '#ffffff', display: 'white' },
  { label: 'Black',   value: '#1a1612', display: '#1a1612' },
  { label: 'Gray',    value: '#9CA3AF', display: '#9CA3AF' },
  { label: 'Checker', value: 'checker', display: 'checker' },
]

type ToolState = 'idle' | 'processing' | 'done' | 'error'

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

function getProgressLabel(pct: number) {
  if (pct < 10) return 'Initialising…'
  if (pct < 30) return 'Downloading AI model (~40 MB, first use only)…'
  if (pct < 60) return 'Analysing image…'
  if (pct < 85) return 'Removing background…'
  return 'Finalising…'
}

const CHECKER_CSS = `
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
`

export default function RemoveBackgroundPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl]   = useState<string | null>(null)
  const [result, setResult]         = useState<RemoveBgResult | null>(null)
  const [progress, setProgress]     = useState(0)
  const [toolState, setToolState]   = useState<ToolState>('idle')
  const [bgColor, setBgColor]       = useState('#ffffff')
  const [error, setError]           = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setFile(null); setPreviewUrl(null); setResultUrl(null)
    setResult(null); setProgress(0); setToolState('idle'); setError(null); setErrorMessage('')
  }, [previewUrl, resultUrl])

  const addFile = useCallback((files: File[]) => {
    const f = files[0]; if (!f) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setResultUrl(null); setResult(null); setToolState('idle'); setError(null); setProgress(0)
  }, [previewUrl])

  async function handleRemove() {
    if (!file) return
    setToolState('processing'); setProgress(0); setError(null)
    try {
      const res = await removeImageBackground(file, pct => setProgress(pct))
      const url = URL.createObjectURL(res.blob)
      setResultUrl(url); setResult(res); setToolState('done')
    } catch (err) {
      console.error(err)
      const msg = 'Background removal failed. Please try a different image.'
      setError(msg); setErrorMessage(msg)
      setToolState('error')
    }
  }

  function handleDownload() {
    if (!resultUrl || !result) return
    const a = document.createElement('a'); a.href = resultUrl; a.download = result.filename; a.click()
  }

  const bgStyle = bgColor === 'checker'
    ? CHECKER_CSS
    : `background-color: ${bgColor};`

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'JPG to PDF',   slug: 'jpg-to-pdf',   icon: '🖼️', colorBg: '#DCFCE7', desc: 'Convert photo to PDF' },
        { name: 'Image to PDF', slug: 'image-to-pdf',  icon: '📄', colorBg: '#FFF0DC', desc: 'Any format to PDF' },
      ]}
      relatedTools={[
        { name: 'PDF to JPG', slug: 'pdf-to-jpg', icon: '🖼️', colorBg: '#DBEAFE' },
        { name: 'OCR PDF',    slug: 'ocr-pdf',    icon: '🤖', colorBg: '#EDE9FE' },
        { name: 'Chat with PDF', slug: 'chat-with-pdf', icon: '💬', colorBg: '#F0FDF4' },
      ]}
      blogPost={{ slug: 'how-to-remove-background-from-image', title: 'How to Remove Background From Image Free (AI)' }}
    />
  )

  return (
    <ToolPageLayout toolName="Remove Background" sidebar={sidebar}>

{/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✦ AI-Powered</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(30px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Remove Background </span>
          <span style={{ color: 'var(--amber)' }}>Instantly Clean Cutouts</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Remove the background from any image in seconds. AI-powered, runs in your browser. Download as PNG with transparent background. Free, no upload.
        </p>
      </div>

      {/* Upload */}
      {!file && (
        <DropZone onFilesAdded={addFile} accept=".jpg,.jpeg,.png,.webp" maxFiles={1} maxSizeMB={20} currentCount={0} icon="🖼️" label="Drop image here" subLabel="JPG · PNG · WebP — up to 20 MB" />
      )}

      {/* File selected preview */}
      {file && previewUrl && toolState === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{file.name}</div>
                <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{formatBytes(file.size)}</div>
              </div>
              <button onClick={handleReset} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--muted)' }}>✕</button>
            </div>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', background: '#F8F7F5' }}>
              <img src={previewUrl} alt="Input" style={{ maxHeight: '260px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
            </div>
          </div>
          <button onClick={handleRemove} style={{ width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
            ✨ Remove Background
          </button>
        </div>
      )}

      {/* Processing */}
      {toolState === 'processing' && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '22px', color: 'white', marginBottom: '10px' }}>{getProgressLabel(progress)}</div>
          <div style={{ width: '100%', maxWidth: '300px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', margin: '0 auto 16px' }}>
            <div style={{ height: '100%', borderRadius: '100px', background: 'var(--amber)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            First run downloads the AI model (~40 MB).<br />Subsequent uses are instant — model is cached.
          </div>
        </div>
      )}

      {/* Error */}
      {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong.'} onReset={handleReset} />}

      {/* Result */}
      {toolState === 'done' && previewUrl && resultUrl && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Before / After */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Before */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ padding: '10px 14px', background: 'white', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em' }}>BEFORE</div>
              <div style={{ padding: '12px', background: '#F8F7F5', display: 'flex', justifyContent: 'center' }}>
                <img src={previewUrl} alt="Before" style={{ maxHeight: '240px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }} />
              </div>
            </div>

            {/* After */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ padding: '10px 14px', background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.06em' }}>AFTER</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {BG_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setBgColor(opt.value)} title={opt.label}
                      style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${bgColor === opt.value ? 'var(--amber)' : 'var(--border)'}`, cursor: 'pointer', padding: 0, overflow: 'hidden', flexShrink: 0, ...(opt.value === 'checker' ? { backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px', backgroundColor: '#ffffff' } : { background: opt.display }) }} />
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px', display: 'flex', justifyContent: 'center', ...Object.fromEntries(bgStyle.split(';').filter(Boolean).map(s => s.split(':').map(p => p.trim()) as [string, string]).map(([k, v]) => [k.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v])) }}>
                <img src={resultUrl} alt="After — background removed" style={{ maxHeight: '240px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }} />
              </div>
            </div>
          </div>

          {/* Dimension info */}
          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)' }}>
            {result.width} × {result.height}px · Transparent PNG
          </div>

          {/* Download */}
          <button onClick={handleDownload} style={{ width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
            ⬇ Download PNG
          </button>

          {/* Quality note */}
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '12px 16px', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: '#166534', lineHeight: 1.7 }}>
            Output is a PNG file with full transparency. Works with Canva, Figma, Photoshop, PowerPoint and any app that supports transparent PNGs.
          </div>

          <button onClick={handleReset} style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-dm-mono)', fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Remove another image →
          </button>
        </div>
      )}

      {/* SEO */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>How to Remove Image Background Online — Free</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Upload a JPG, PNG, or WebP image and the AI automatically detects and removes the background in seconds. The result is a transparent PNG — ready to use in Canva, Figma, or any design tool.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {['Drop your image into the upload area or click to browse from your device.', 'Click Remove Background. The AI model analyses your image locally in your browser.', 'Preview on white, black, or transparent background. Download your PNG with one click.'].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }}>{step}</p>
            </div>
          ))}
        </div>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '20px' }}>Remove background from product photos</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>E-commerce product photos with white backgrounds work perfectly. Upload a product image and get a clean transparent cutout instantly — ready for Amazon, Flipkart, Shopify, or any marketplace.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Remove background from ID and passport photos</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Portrait photos work well for ID and passport photo cutouts. After removing the background, you can place the subject on any solid color background required by the application.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Remove background on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>The tool runs entirely in your browser — no app to install. Open in Safari on iPhone or Chrome on Android, upload from your Photos library, and download the transparent PNG directly to your camera roll.</p>
      </div>

      <FAQ faqs={FAQS} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ToolPageLayout>
  )
}
