'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import DownloadCard from '@/components/ui/DownloadCard'
import { pdfToImages, imagesToZip, formatBytes } from '@/lib/image/pdfToImages'
import type { ImageFormat, ImageDPI, ImageResult } from '@/lib/image/pdfToImages'
import type { ToolState } from '@/types'

const FORMAT_OPTIONS = [
  { value: 'jpg' as ImageFormat,  label: 'JPG',  desc: 'Smaller files · ideal for photos and scans' },
  { value: 'png' as ImageFormat,  label: 'PNG',  desc: 'Lossless · best for text and diagrams' },
  { value: 'webp' as ImageFormat, label: 'WebP', desc: 'Modern format · best size/quality ratio' },
]

const DPI_OPTIONS = [
  { value: 72  as ImageDPI, label: '72 DPI',  desc: 'Screen & web' },
  { value: 150 as ImageDPI, label: '150 DPI', desc: 'Standard (recommended)' },
  { value: 300 as ImageDPI, label: '300 DPI', desc: 'Professional print' },
  { value: 600 as ImageDPI, label: '600 DPI', desc: 'Archival quality' },
]

const FAQS = [
  { q: 'Is converting PDF to JPG on Doclair free?', a: 'Yes, completely free with no limits. No sign-up, no watermarks, and no daily caps.' },
  { q: 'Will every page be converted to a separate image?', a: 'Yes. Each page of the PDF becomes a separate image file, numbered page-1.jpg, page-2.jpg, etc. You can download all pages as a single ZIP file.' },
  { q: 'What DPI gives the best quality?', a: '150 DPI is recommended for most uses and balances quality against file size. Use 300 DPI for professional print output and 600 DPI for archival purposes. 72 DPI is suitable for web thumbnails only.' },
  { q: 'Are my PDF files uploaded to a server?', a: 'Never. Doclair converts your PDF entirely in your browser using pdf.js compiled to WebAssembly. Your file never leaves your device.' },
  { q: 'Should I use JPG or PNG?', a: 'Use JPG for photos, scanned documents and colourful pages — it gives the smallest files. Use PNG for pages with text, charts or diagrams where crisp edges matter. WebP gives the best compression-to-quality ratio on modern browsers.' },
  { q: 'How do I convert PDF to JPG on my phone?', a: 'Open Doclair in Safari (iPhone) or Chrome (Android). Tap the upload area and select your PDF. Choose your format and DPI, tap Convert, and download the images to your camera roll.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to JPG — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-jpg',
      description: 'Convert PDF pages to JPG, PNG or WebP images free. Up to 600 DPI. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',       item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools',      item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'PDF to JPG', item: 'https://doclair.in/pdf-to-jpg' },
      ],
    },
  ],
}

export default function PdfToJpgPage() {
  const [file, setFile]               = useState<File | null>(null)
  const [totalPages, setTotalPages]   = useState(0)
  const [format, setFormat]           = useState<ImageFormat>('jpg')
  const [dpi, setDpi]                 = useState<ImageDPI>(150)
  const [toolState, setToolState]     = useState<ToolState>('idle')
  const [results, setResults]         = useState<ImageResult[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress]       = useState(0)

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    const { PDFDocument } = await import('pdf-lib')
    const bytes = await f.arrayBuffer()
    const doc = await PDFDocument.load(bytes)
    setFile(f)
    setTotalPages(doc.getPageCount())
    setResults([])
    setPreviewUrls([])
    setToolState('idle')
  }, [])

  async function handleConvert() {
    if (!file) return
    setToolState('merging')
    setProgress(0)
    setCurrentPage(0)
    previewUrls.forEach(URL.revokeObjectURL)
    setPreviewUrls([])

    try {
      const imageResults = await pdfToImages(file, format, dpi, (current, total) => {
        setCurrentPage(current)
        setProgress(Math.round((current / Math.max(total, 1)) * 100))
      })

      const urls = imageResults.map(r => URL.createObjectURL(r.blob))
      setPreviewUrls(urls)
      setResults(imageResults)
      setToolState('done')
      setProgress(100)
    } catch (err) {
      setToolState('idle')
      alert('Conversion failed: ' + (err instanceof Error ? err.message : 'Unknown'))
    }
  }

  function handleDownloadImage(result: ImageResult) {
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  async function handleDownloadZip() {
    const zipBlob = await imagesToZip(results)
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    const baseName = file?.name.replace('.pdf', '') ?? 'images'
    a.download = `${baseName}-${format}-${dpi}dpi.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    previewUrls.forEach(URL.revokeObjectURL)
    setFile(null)
    setTotalPages(0)
    setResults([])
    setPreviewUrls([])
    setToolState('idle')
    setProgress(0)
    setCurrentPage(0)
  }

  function handleSingleDownload() {
    if (results[0]) handleDownloadImage(results[0])
  }

  const totalSize = results.reduce((acc, r) => acc + r.sizeBytes, 0)

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'JPG to PDF',   slug: 'jpg-to-pdf',   icon: '📄', colorBg: '#DBEAFE', desc: 'Convert images to PDF' },
        { name: 'Image to PDF', slug: 'image-to-pdf',  icon: '🖼️', colorBg: '#DBEAFE', desc: 'Combine images into PDF' },
      ]}
      relatedTools={[
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce PDF file size' },
        { name: 'Split PDF',    slug: 'split-pdf',    icon: '✂️', colorBg: '#DCFCE7', desc: 'Extract pages or ranges' },
        { name: 'PDF to PNG',   slug: 'pdf-to-png',   icon: '🖼️', colorBg: '#EDE9FE', desc: 'Lossless page images' },
        { name: 'PDF to WebP',  slug: 'pdf-to-webp',  icon: '🌐', colorBg: '#FFF0DC', desc: 'Modern image format' },
        { name: 'Merge PDF',    slug: 'merge-pdf',    icon: '🔀', colorBg: '#DBEAFE', desc: 'Combine multiple PDFs' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="PDF to JPG" toolSlug="pdf-to-jpg" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>PDF to JPG </span>
          <span style={{ color: 'var(--amber)' }}>Convert Pages to Images</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Convert PDF pages to JPG, PNG or WebP images. Up to 600 DPI. Free, no upload.
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
          icon="🖼️"
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
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {formatBytes(file.size)}{totalPages > 0 ? ` · ${totalPages} page${totalPages !== 1 ? 's' : ''}` : ''}
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

          {/* Format selector */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Image Format</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {FORMAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  style={{
                    flex: 1, minWidth: '100px', padding: '12px 16px', borderRadius: '10px',
                    border: `1px solid ${format === opt.value ? 'var(--ink)' : 'var(--border)'}`,
                    background: format === opt.value ? 'var(--ink)' : 'transparent',
                    color: format === opt.value ? 'white' : 'var(--ink)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  }}
                  onMouseEnter={e => {
                    if (format !== opt.value) {
                      e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                      e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (format !== opt.value) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', opacity: format === opt.value ? 0.65 : 0.45 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* DPI selector */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Resolution</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DPI_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDpi(opt.value)}
                  style={{
                    flex: 1, minWidth: '90px', padding: '12px 16px', borderRadius: '10px',
                    border: `1px solid ${dpi === opt.value ? 'var(--ink)' : 'var(--border)'}`,
                    background: dpi === opt.value ? 'var(--ink)' : 'transparent',
                    color: dpi === opt.value ? 'white' : 'var(--ink)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  }}
                  onMouseEnter={e => {
                    if (dpi !== opt.value) {
                      e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                      e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (dpi !== opt.value) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', opacity: dpi === opt.value ? 0.65 : 0.45 }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* 600 DPI warning */}
            {dpi === 600 && (
              <div style={{
                marginTop: '14px', padding: '12px 14px', borderRadius: '8px',
                background: '#FFFBEB', border: '1px solid #FDE68A',
                display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.55 }}>
                  <strong>High memory usage:</strong> a 10-page PDF at 600 DPI generates approximately 200 MB of image data.
                  Use for archival purposes only. Close other tabs before converting.
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleConvert}
              style={{
                flex: 1, background: 'var(--ink)', color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >🖼️ Convert to Images</button>
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

      {/* State: converting */}
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
          }}>Converting your PDF…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', marginBottom: '24px',
          }}>
            {totalPages > 0
              ? `Converting page ${currentPage} of ${totalPages}…`
              : 'Preparing…'}
          </div>
          <div style={{
            maxWidth: '320px', margin: '0 auto', height: '4px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--amber)', borderRadius: '2px',
              width: `${totalPages > 0 ? (currentPage / totalPages) * 100 : progress}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && results.length === 1 && (
        <DownloadCard
          filename={results[0].filename}
          description={`${results[0].width}×${results[0].height}px · ${formatBytes(results[0].sizeBytes)}`}
          onDownload={handleSingleDownload}
          onReset={handleReset}
        />
      )}

      {toolState === 'done' && results.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Results header */}
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
                fontSize: '16px', color: '#166534',
              }}>
                {results.length} images ready · {format.toUpperCase()} · {dpi} DPI
              </div>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
                color: '#166534', opacity: 0.7, marginTop: '2px',
              }}>Total: {formatBytes(totalSize)}</div>
            </div>
            <span style={{ fontSize: '24px' }}>✅</span>
          </div>

          {/* Thumbnail grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {results.map((r, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
                <img
                  src={previewUrls[i]}
                  alt={`Page ${r.pageNum}`}
                  style={{ width: '100%', display: 'block', maxHeight: '200px', objectFit: 'cover' }}
                />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>Page {r.pageNum}</div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', marginBottom: '8px' }}>{formatBytes(r.sizeBytes)}</div>
                  <button
                    onClick={() => handleDownloadImage(r)}
                    style={{
                      width: '100%', padding: '6px', borderRadius: '6px',
                      border: '1px solid var(--amber)', background: 'transparent',
                      color: 'var(--amber)', cursor: 'pointer', fontSize: '12px',
                      fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--amber)' }}
                  >⬇ Download</button>
                </div>
              </div>
            ))}
          </div>

          {/* Download ZIP button */}
          <button
            onClick={handleDownloadZip}
            style={{
              width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px',
              borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >⬇ Download all as ZIP ({results.length} images)</button>

          {/* Convert another */}
          <button
            onClick={handleReset}
            style={{
              display: 'block', fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '12px', color: 'var(--muted)', margin: '0 auto',
              cursor: 'pointer', background: 'none', border: 'none', textAlign: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >Convert another PDF →</button>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Convert PDF to JPG Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Converting a PDF to images is instant and completely free with Doclair. No software to install, no account required — it all runs in your browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Click <strong>Drop your PDF here</strong> or drag your PDF file into the upload area.',
            'Choose your image format — <strong>JPG</strong> for photos and scans, <strong>PNG</strong> for text and diagrams, or <strong>WebP</strong> for the best compression ratio.',
            'Select a resolution — <strong>150 DPI</strong> is recommended for most uses. Use 300 DPI for print, 72 DPI for web thumbnails.',
            'Click <strong>Convert to Images</strong> and wait while pdf.js renders each page in your browser. Download individual images or all pages as a ZIP file.',
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
          Which DPI should I choose?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          72 DPI is suitable for web thumbnails and previews only. 150 DPI is the recommended default — it gives sharp-looking images for on-screen reading and email while keeping file sizes manageable. 300 DPI is standard for professional print output. 600 DPI is intended for archival scanning and produces very large files; close other browser tabs before using it to avoid memory issues.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          JPG vs PNG vs WebP — which format is right?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          JPG is the best choice for scanned documents, photos, and colourful pages — it gives the smallest files with excellent visual quality. PNG is a lossless format ideal for pages with text, charts, or diagrams where crisp edges matter and file size is secondary. WebP is a modern format supported by all major browsers that achieves the best balance of size and quality, often 20–30% smaller than JPG at the same perceived quality.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Convert PDF to JPG on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile browsers — Safari on iPhone and iPad, Chrome on Android — with no app download required. Open Doclair in your browser, tap the upload area to open the Files picker, select your PDF, choose your format and DPI, tap Convert, and download the images directly to your device.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
