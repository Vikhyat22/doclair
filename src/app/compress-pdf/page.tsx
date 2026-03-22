'use client'

import { useState, useCallback, useEffect } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { compressPDF } from '@/lib/pdf/compress'
import type { ToolState } from '@/types'

type Quality = 'light' | 'medium' | 'heavy'

const QUALITY_OPTIONS: { value: Quality; label: string; desc: string }[] = [
  { value: 'light',  label: 'Standard', desc: 'Preserves full print quality' },
  { value: 'medium', label: 'Balanced', desc: 'Optimised for sharing and email' },
  { value: 'heavy',  label: 'Maximum',  desc: 'Smallest possible file size' },
]

const FAQS = [
  {
    q: 'Is compressing PDFs on Doclair really free?',
    a: 'Yes, completely free with no limits. There are no daily caps, no subscription fees, and no watermarks added to any output file — ever.',
  },
  {
    q: 'Will compression reduce the quality of my PDF?',
    a: 'Text, fonts, and vector graphics are fully preserved at every compression level — only raster images are re-encoded. For text-heavy PDFs compression is essentially lossless. For image-heavy PDFs, Balanced compression preserves visual quality in almost all cases.',
  },
  {
    q: 'How much can I reduce a PDF file size?',
    a: 'Results vary by content. Image-heavy PDFs (scans, presentations) typically compress 40–70%. Text-only PDFs compress 10–30% since font subsetting and object stream packing are the main levers — text is stored as vectors, not pixels.',
  },
  {
    q: 'Are my files uploaded to a server during compression?',
    a: 'No. Your file never leaves your browser. Doclair runs Ghostscript compiled to WebAssembly entirely in your browser tab. Nothing is transmitted to any server — not even ours.',
  },
  {
    q: 'What is the difference between Standard, Balanced and Maximum?',
    a: 'Standard targets 300 DPI — ideal for documents that will be printed. Balanced targets 150 DPI — the sweet spot for email attachments and on-screen reading. Maximum targets 72 DPI — smallest possible file, best for web publishing or archiving.',
  },
  {
    q: 'Can I compress a password-protected PDF?',
    a: 'Password-protected PDFs need to be decrypted first. Use the Remove Password tool on Doclair to unlock the PDF, then compress it. Both tools work entirely in your browser.',
  },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Compress PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/compress-pdf',
      description: 'Reduce PDF file size online for free. Choose Standard, Balanced or Maximum compression. Powered by Ghostscript WebAssembly — files never leave your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Ghostscript WASM — professional-grade compression',
        'Three compression presets', 'No file upload to server',
        'No watermark on output', 'No sign-up required',
        'Text and fonts fully preserved', 'Works on mobile',
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
    { '@type': 'ListItem', position: 1, name: 'Home',         item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',        item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Compress PDF', item: 'https://doclair.in/compress-pdf' },
  ],
}

function getStatus(pct: number) {
  if (pct < 5)   return 'Preparing…'
  if (pct < 20)  return 'Loading compression engine…'
  if (pct < 40)  return 'Reading PDF…'
  if (pct < 50)  return 'Analysing document…'
  if (pct < 85)  return 'Compressing with Ghostscript…'
  return 'Finalising…'
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function CompressPDFPage() {
  const [file, setFile]                       = useState<File | null>(null)
  const [quality, setQuality]                 = useState<Quality>('medium')
  const [toolState, setToolState]             = useState<ToolState>('idle')
  const [progress, setProgress]               = useState(0)
  const [compressedBytes, setCompressedBytes] = useState<Uint8Array | null>(null)
  const [originalSize, setOriginalSize]       = useState(0)
  const [compressedSize, setCompressedSize]   = useState(0)
  const [isFirstLoad, setIsFirstLoad]         = useState(false)

  useEffect(() => {
    try {
      setIsFirstLoad(!localStorage.getItem('doclair_gs_loaded'))
    } catch { /* localStorage unavailable */ }
  }, [])

  const addFile = useCallback((files: File[]) => {
    if (files[0]) {
      setFile(files[0])
      setOriginalSize(files[0].size)
      setCompressedBytes(null)
      setToolState('idle')
    }
  }, [])

  async function handleCompress() {
    if (!file) return
    setToolState('merging')
    setProgress(0)
    try {
      const bytes = await compressPDF(file, quality, (pct) => setProgress(pct))
      setCompressedBytes(bytes)
      setCompressedSize(bytes.byteLength)
      setToolState('done')
      try { localStorage.setItem('doclair_gs_loaded', '1') } catch { /* ignore */ }
      setIsFirstLoad(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Compression failed: ' + message)
      setToolState('idle')
    }
  }

  function handleDownload() {
    if (!compressedBytes) return
    const blob = new Blob([compressedBytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'doclair-compressed.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    setFile(null)
    setCompressedBytes(null)
    setProgress(0)
    setOriginalSize(0)
    setCompressedSize(0)
    setToolState('idle')
  }

  const reduction = originalSize > 0 && compressedSize > 0
    ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
    : 0

  // Result display logic
  const resultKind: 'good' | 'minimal' | 'none' | 'increased' =
    reduction >= 3  ? 'good'      :
    reduction >= -5 ? 'minimal'   :
    reduction > -Infinity ? 'increased' : 'none'

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', colorBg: '#DBEAFE', desc: 'Combine multiple PDFs into one' },
        { name: 'Split PDF', slug: 'split-pdf', icon: '✂️', colorBg: '#DBEAFE', desc: 'Extract pages or split by range' },
      ]}
      relatedTools={[
        { name: 'PDF → JPG',       slug: 'pdf-to-jpg',      icon: '🖼️', colorBg: '#DCFCE7', desc: 'Extract pages as images' },
        { name: 'Edit PDF',        slug: 'edit-pdf',        icon: '✍️', colorBg: '#EDE9FE', desc: 'Add text and signatures' },
        { name: 'Encrypt PDF',     slug: 'encrypt-pdf',     icon: '🔐', colorBg: '#FEE2E2', desc: 'Add password protection' },
        { name: 'Word → PDF',      slug: 'word-to-pdf',     icon: '📄', colorBg: '#DBEAFE', desc: 'Secure document conversion' },
        { name: 'Remove Password', slug: 'remove-password', icon: '🔓', colorBg: '#DCFCE7', desc: 'Unlock protected PDFs' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Compress PDF" toolSlug="compress-pdf" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>⚙ Ghostscript Engine</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Compress PDF </span>
          <span style={{ color: 'var(--amber)' }}>Reduce File Size</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Professional-grade PDF compression powered by Ghostscript. Text, fonts and vectors preserved at every level.
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
          icon="📦"
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
              width: '40px', height: '40px', background: '#FEE2E2', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{formatBytes(file.size)}</div>
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

          {/* Quality selector */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Compression Level</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {QUALITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  style={{
                    flex: 1, minWidth: '100px', padding: '12px 16px', borderRadius: '10px',
                    border: `1px solid ${quality === opt.value ? 'var(--ink)' : 'var(--border)'}`,
                    background: quality === opt.value ? 'var(--ink)' : 'transparent',
                    color: quality === opt.value ? 'white' : 'var(--ink)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  }}
                  onMouseEnter={e => {
                    if (quality !== opt.value) {
                      e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                      e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (quality !== opt.value) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', opacity: quality === opt.value ? 0.65 : 0.45 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
            <p style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '11px', color: 'var(--muted)', marginTop: '10px', lineHeight: 1.5,
            }}>
              Text, fonts and vector graphics are fully preserved at every level. Only raster images are optimised.
            </p>
            {isFirstLoad && (
              <p style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontSize: '10px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.5,
                padding: '8px 10px', background: 'var(--cream)', borderRadius: '6px',
              }}>
                First compression loads the Ghostscript engine (~15 MB). Subsequent compressions are instant — engine is cached in memory.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCompress}
              style={{
                flex: 1, background: 'var(--ink)', color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >📦 Compress PDF</button>
            <button
              onClick={handleReset}
              title="Clear"
              style={{
                width: '52px', height: '52px', borderRadius: '100px', border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', transition: 'all 0.15s',
                color: 'var(--ink)', opacity: 0.5, flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FEE2E2'
                e.currentTarget.style.borderColor = '#FCA5A5'
                e.currentTarget.style.color = 'var(--red)'
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.opacity = '0.5'
              }}
            >🗑</button>
          </div>
        </div>
      )}

      {/* State: compressing */}
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
          }}>Compressing your PDF…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', marginBottom: '24px',
          }}>{getStatus(progress)}</div>
          <div style={{
            maxWidth: '320px', margin: '0 auto', height: '4px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--amber)', borderRadius: '2px',
              width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && resultKind === 'increased' && (
        // Compression would increase file size — don't offer download
        <div style={{
          background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: '18px', color: 'var(--ink)', marginBottom: '8px',
          }}>Your original is already optimal</div>
          <p style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.6, lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 20px' }}>
            Compression would increase the file size. This PDF is already highly optimised — keep your original.
          </p>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
            color: 'var(--muted)', marginBottom: '20px',
          }}>{formatBytes(originalSize)} → would be {formatBytes(compressedSize)}</div>
          <button
            onClick={handleReset}
            style={{
              padding: '12px 28px', borderRadius: '100px', border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 600, fontSize: '14px', color: 'var(--ink)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
          >← Keep Original</button>
        </div>
      )}

      {toolState === 'done' && resultKind !== 'increased' && (
        <>
          {/* Amber notice for already-optimised PDFs */}
          {resultKind === 'minimal' && (
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px',
              padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                  This PDF is already well optimised
                </div>
                <div style={{ fontSize: '12px', color: '#92400E', opacity: 0.8, lineHeight: 1.5 }}>
                  Text-only PDFs compress 5–15% maximum — text is stored as vectors, not pixels.
                  Ghostscript may still have improved cross-viewer compatibility.
                </div>
              </div>
            </div>
          )}
          <DownloadCard
            filename="doclair-compressed.pdf"
            description={
              resultKind === 'minimal'
                ? `${formatBytes(originalSize)} → ${formatBytes(compressedSize)}${reduction > 0 ? ` · ${reduction}% smaller` : ' · minimal change'}`
                : `${formatBytes(originalSize)} → ${formatBytes(compressedSize)} · ${reduction}% smaller`
            }
            onDownload={handleDownload}
            onReset={handleReset}
          />
        </>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Compress PDF Files Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Reducing PDF file size is instant and completely free with Doclair. No software to install, no account required.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Click <strong>Drop your PDF here</strong> or drag your PDF file into the upload area.',
            'Choose a compression level — <strong>Standard</strong> for full print quality, <strong>Balanced</strong> for sharing, or <strong>Maximum</strong> for the smallest possible file.',
            'Click <strong>Compress PDF</strong> and wait while Ghostscript processes your file entirely in your browser.',
            'Click <strong>Download</strong> to save your compressed PDF. The original vs compressed size is shown.',
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
          Why Ghostscript gives better results than other online tools
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Most browser-based PDF compressors use simple object stream packing. Doclair uses Ghostscript — the same engine
          behind Adobe Distiller and professional print workflows — compiled to WebAssembly so it runs entirely in your browser.
          Ghostscript subsetsfonts to used characters only, downsamples images with bicubic interpolation, and removes
          hidden layers of PDF bloat that other tools miss.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Is it safe to compress confidential PDFs online?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Absolutely. Doclair processes your PDF entirely inside your browser using WebAssembly. Your file is never
          transmitted to any server — not even Doclair&apos;s. Confidential contracts, medical records, and financial
          statements can be compressed with complete privacy.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Compress PDF on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile browsers — Safari on iPhone and iPad, Chrome on Android — with no app download required.
          Tap the upload area to open the Files app picker, select your PDF, choose a compression level, and download the result.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
