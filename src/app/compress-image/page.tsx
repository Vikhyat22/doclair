'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { compressImage } from '@/lib/image/compress'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What image formats are supported?',
    a: 'JPG, JPEG, PNG, and WebP. The output format matches the input format.',
  },
  {
    q: 'How much will the file size be reduced?',
    a: 'Reduction depends on the original compression and content. Photos typically compress 50-80%. Already-compressed images may see less reduction.',
  },
  {
    q: 'Will I notice quality loss?',
    a: 'At 80% quality (default), quality loss is imperceptible to most viewers. Lower quality settings may introduce visible artifacts on photos.',
  },
  {
    q: 'Is my image uploaded to a server?',
    a: 'No. Compression runs in your browser using browser-image-compression. Your image never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Compress Image — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/compress-image',
      description: 'Compress JPG, PNG and WebP images without visible quality loss. Free, no upload, instant results.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Compress Image', item: 'https://doclair.in/compress-image' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Compress PDF',        slug: 'compress-pdf',        icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce PDF size' },
  { name: 'Remove Background',   slug: 'remove-background',   icon: '🪄', colorBg: '#EDE9FE', desc: 'Remove image background' },
  { name: 'Image to PDF',        slug: 'image-to-pdf',        icon: '🖼', colorBg: '#DBEAFE', desc: 'Convert image to PDF' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const SIZE_PRESETS = [
  { label: '< 100 KB', maxSizeMB: 0.1 },
  { label: '< 500 KB', maxSizeMB: 0.5 },
  { label: '< 1 MB',   maxSizeMB: 1   },
  { label: 'Custom',   maxSizeMB: -1  },
]

export default function CompressImagePage() {
  const [file, setFile]             = useState<File | null>(null)
  const [toolState, setToolState]   = useState<ToolState>('idle')
  const [result, setResult]         = useState<{ blob: Blob; filename: string } | null>(null)
  const [error, setError]           = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [progress, setProgress]     = useState(0)

  const [preset, setPreset]         = useState(1) // < 500 KB default
  const [customMB, setCustomMB]     = useState(0.5)
  const [quality, setQuality]       = useState(0.8)

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]); setToolState('idle'); setResult(null); setError(''); setProgress(0)
    }
  }, [])

  const handleCompress = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    setProgress(0)
    try {
      const maxSizeMB = SIZE_PRESETS[preset].maxSizeMB === -1 ? customMB : SIZE_PRESETS[preset].maxSizeMB
      const r = await compressImage(file, { maxSizeMB, quality }, pct => setProgress(pct ?? 0))
      setResult(r)
      setToolState('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to compress image'
      setError(msg)
      setErrorMessage(msg)
      setToolState('error')
    }
  }, [file, preset, customMB, quality])

  const handleDownload = useCallback(() => {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setError(''); setErrorMessage(''); setToolState('idle'); setProgress(0)
  }, [])

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 500,
    border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
    background: active ? '#FFF8F0' : 'white',
    color: active ? '#92400E' : 'var(--muted)',
    cursor: 'pointer', transition: 'all 0.2s',
  })

  const reduction = result && file ? Math.round((1 - result.blob.size / file.size) * 100) : 0

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Compress Image"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} blogPost={{ slug: 'how-to-compress-image-free', title: 'How to Compress an Image Free — Reduce File Size Without Losing Quality' }} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Compress Image </span>
            <span style={{ color: 'var(--amber)' }}>Reduce Image File Size</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Compress JPG, PNG and WebP images without visible quality loss. Free, no upload, instant.
          </p>
        </div>

        {/* Options */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// Compression Options</div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '10px' }}>Target size</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {SIZE_PRESETS.map((p, i) => (
                <button key={i} style={pillStyle(preset === i)} onClick={() => setPreset(i)}>{p.label}</button>
              ))}
            </div>
            {preset === 3 && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" min={0.01} max={50} step={0.1} value={customMB} onChange={e => setCustomMB(Number(e.target.value))}
                  style={{ width: '80px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>MB maximum</span>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '10px' }}>Quality: {Math.round(quality * 100)}%</div>
            <input type="range" min={40} max={100} value={Math.round(quality * 100)} onChange={e => setQuality(Number(e.target.value) / 100)}
              style={{ width: '100%', maxWidth: '320px', accentColor: 'var(--amber)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '320px', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              <span>Smaller file</span><span>Higher quality</span>
            </div>
          </div>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".jpg,.jpeg,.png,.webp" maxFiles={1} maxSizeMB={50} icon="🖼" label="Drop your image here" subLabel="JPG, PNG, WebP — up to 50 MB" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>🖼</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Original: {formatBytes(file.size)}</div>
            </div>
            <button onClick={handleCompress} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Compress →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🗜️</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '16px' }}>Compressing…</div>
            <div style={{ background: '#F3F4F6', borderRadius: '100px', height: '8px', overflow: 'hidden', maxWidth: '300px', margin: '0 auto' }}>
              <div style={{ background: 'var(--amber)', height: '100%', width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>{progress}%</div>
          </div>
        )}

        {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong.'} onReset={handleReset} />}

        {toolState === 'done' && result && file && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: '#166534', marginBottom: '8px' }}>Compressed!</div>
            <div style={{ fontSize: '14px', color: '#15803D', marginBottom: '8px' }}>
              {formatBytes(file.size)} → {formatBytes(result.blob.size)}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#166534', color: 'white', borderRadius: '100px', padding: '5px 14px', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
              ↓ {reduction}% smaller
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleDownload} style={{ background: '#166534', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                ⬇ Download {result.filename}
              </button>
              <button onClick={handleReset} style={{ background: 'none', border: '1px solid #BBF7D0', color: '#15803D', padding: '12px 20px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer' }}>
                Compress another
              </button>
            </div>
          </div>
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Compress an Image — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Large image files slow down websites, take up storage, and are difficult to share by email. Doclair compresses JPG, PNG, and WebP images in your browser — no upload, no privacy risk.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your image or click to upload.</strong> JPG, PNG, WebP supported.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Adjust the quality slider.</strong> Lower quality = smaller file.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Compare the before/after preview.</strong> See the file size reduction in real time.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Download to save the compressed image.</strong> No account required.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            How much can I reduce image file size?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            At quality 80 (the default), most images lose very little visible quality while shrinking by 50–70%. Photographs typically compress more than illustrations or diagrams. For web use, quality 70–80 is a good balance. For print, use quality 85–95.
          </p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            Compress Image on iPhone and Android
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
            Doclair works in mobile Safari and Chrome. Upload from your camera roll, adjust quality, and download the compressed image directly to your Photos library.
          </p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
