'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import { pdfToImages, imagesToZip, formatBytes, getPdfImageArchiveName } from '@/lib/image/pdfToImages'
import type { ImageDPI, ImageResult } from '@/lib/image/pdfToImages'
import type { ToolState } from '@/types'

const DPI_OPTIONS = [
  { value: 72  as ImageDPI, label: '72 DPI',  desc: 'Screen & web' },
  { value: 150 as ImageDPI, label: '150 DPI', desc: 'Standard (recommended)' },
  { value: 300 as ImageDPI, label: '300 DPI', desc: 'Professional print' },
]

const FAQS = [
  { q: 'What is WebP and why use it for PDF pages?', a: 'WebP is a modern image format developed by Google that achieves 20-30% smaller file sizes than JPEG at equivalent visual quality. It is ideal for sharing PDF pages on the web, where fast loading matters.' },
  { q: 'Is converting PDF to WebP on Doclair free?', a: 'Yes, completely free with no limits. No sign-up, no watermarks, and no daily caps.' },
  { q: 'Will every page be converted to a separate WebP image?', a: 'Yes. Each page of the PDF becomes a separate .webp file, numbered page-1.webp, page-2.webp, etc. You can download all pages as a single ZIP file.' },
  { q: 'Why is 600 DPI not available for WebP?', a: 'At 600 DPI, WebP images of a standard A4 page are extremely large — typically 100-200 MB each — and can exhaust browser memory. 300 DPI provides excellent quality for professional output while keeping file sizes manageable.' },
  { q: 'Are my PDF files uploaded to a server?', a: 'Never. Doclair converts your PDF entirely in your browser using pdf.js compiled to WebAssembly. Your file never leaves your device.' },
  { q: 'Does WebP work in all browsers?', a: 'Yes. WebP is supported in all modern browsers including Chrome, Firefox, Safari (version 14+), and Edge. It is not supported in Internet Explorer.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to WebP — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-webp',
      description: 'Convert PDF pages to WebP images free. Smaller file size than JPEG. 72-300 DPI. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
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
        { '@type': 'ListItem', position: 1, name: 'Home',        item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools',       item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'PDF to WebP', item: 'https://doclair.in/pdf-to-webp' },
      ],
    },
  ],
}

export default function PdfToWebpPage() {
  const [file, setFile]               = useState<File | null>(null)
  const [totalPages, setTotalPages]   = useState(0)
  const [dpi, setDpi]                 = useState<ImageDPI>(150)
  const [toolState, setToolState]     = useState<ToolState>('idle')
  const [results, setResults]         = useState<ImageResult[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress]       = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    const { PDFDocument } = await import('@cantoo/pdf-lib')
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
    setToolState('merging'); setProgress(0); setCurrentPage(0)
    previewUrls.forEach(URL.revokeObjectURL); setPreviewUrls([])
    try {
      const imageResults = await pdfToImages(file, 'webp', dpi, (current, total) => {
        setCurrentPage(current); setProgress(Math.round((current / Math.max(total, 1)) * 100))
      })
      const urls = imageResults.map(r => URL.createObjectURL(r.blob))
      setPreviewUrls(urls); setResults(imageResults); setToolState('done'); setProgress(100)
    } catch (err) { const message = err instanceof Error ? err.message : 'Unknown error'; setErrorMessage(message); setToolState('error') }
  }

  function handleDownloadImage(result: ImageResult) {
    const url = URL.createObjectURL(result.blob); const a = document.createElement('a'); a.href = url; a.download = result.filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  async function handleDownloadZip() {
    const zipBlob = await imagesToZip(results)
    const url = URL.createObjectURL(zipBlob); const a = document.createElement('a'); a.href = url
    a.download = getPdfImageArchiveName(file?.name ?? 'images.pdf', 'webp', dpi); a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    previewUrls.forEach(URL.revokeObjectURL); setFile(null); setTotalPages(0); setResults([]); setPreviewUrls([])
    setToolState('idle'); setProgress(0); setCurrentPage(0); setErrorMessage('')
  }

  const totalSize = results.reduce((acc, r) => acc + r.sizeBytes, 0)

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'WebP to PDF', slug: 'webp-to-pdf', icon: '📄', colorBg: '#EDE9FE', desc: 'Convert WebP images to PDF' },
      ]}
      relatedTools={[
        { name: 'PDF to JPG',  slug: 'pdf-to-jpg',  icon: '🖼️', colorBg: '#DBEAFE', desc: 'Widely compatible format' },
        { name: 'PDF to PNG',  slug: 'pdf-to-png',  icon: '🖼️', colorBg: '#EDE9FE', desc: 'Lossless quality' },
        { name: 'Compress PDF',slug: 'compress-pdf',icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce PDF file size' },
        { name: 'Merge PDF',   slug: 'merge-pdf',   icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="PDF to WebP" sidebar={sidebar}>
<div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ Smaller than JPEG</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to WebP </span>
          <span style={{ color: 'var(--amber)' }}>Convert PDF Pages to WebP</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Convert PDF pages to WebP images. Smaller file size than JPEG. No upload, free.
        </p>
      </div>

      {toolState === 'idle' && !file && (
        <DropZone onFilesAdded={addFile} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={0} icon="🌐" label="Drop your PDF here" subLabel="or click to browse — max 200 MB" />
      )}

      {toolState === 'idle' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: '#FEE2E2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {formatBytes(file.size)}{totalPages > 0 ? ` · ${totalPages} page${totalPages !== 1 ? 's' : ''}` : ''}
              </div>
            </div>
            <button onClick={handleReset} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--muted)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = 'var(--red)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>✕</button>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>{'// Resolution'}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DPI_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDpi(opt.value)}
                  style={{ flex: 1, minWidth: '90px', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${dpi === opt.value ? 'var(--ink)' : 'var(--border)'}`, background: dpi === opt.value ? 'var(--ink)' : 'transparent', color: dpi === opt.value ? 'white' : 'var(--ink)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}
                  onMouseEnter={e => { if (dpi !== opt.value) { e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'; e.currentTarget.style.background = 'rgba(26,22,18,0.03)' } }}
                  onMouseLeave={e => { if (dpi !== opt.value) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' } }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', opacity: dpi === opt.value ? 0.65 : 0.45 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleConvert} style={{ flex: 1, background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>🌐 Convert to WebP</button>
            <button onClick={handleReset} title="Clear" style={{ width: '52px', height: '52px', borderRadius: '100px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.15s', color: 'var(--ink)', opacity: 0.5, flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.opacity = '0.5' }}>🗑</button>
          </div>
        </div>
      )}

      {toolState === 'merging' && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', color: 'white', marginBottom: '6px' }}>Converting your PDF…</div>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px' }}>
            {totalPages > 0 ? `Converting page ${currentPage} of ${totalPages}…` : 'Preparing…'}
          </div>
          <div style={{ maxWidth: '320px', margin: '0 auto', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--amber)', borderRadius: '2px', width: `${totalPages > 0 ? (currentPage / totalPages) * 100 : progress}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {toolState === 'error' && <ErrorCard message={errorMessage} onReset={handleReset} />}

      {toolState === 'done' && results.length === 1 && (
        <DownloadCard
          filename={results[0].filename}
          description={`${results[0].width}×${results[0].height}px · ${formatBytes(results[0].sizeBytes)}`}
          onDownload={() => handleDownloadImage(results[0])}
          onReset={handleReset}
          title="Converted to WebP!"
          resetLabel="Convert another →"
          nextSteps={[
            { slug: 'webp-to-pdf', name: 'WebP to PDF', icon: '📄' },
            { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
            { slug: 'pdf-to-jpg', name: 'PDF to JPG', icon: '🖼️' },
          ]}
        />
      )}

      {toolState === 'done' && results.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#166534' }}>{results.length} images ready · WebP · {dpi} DPI</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: '#166534', opacity: 0.7, marginTop: '2px' }}>Total: {formatBytes(totalSize)}</div>
            </div>
            <span style={{ fontSize: '24px' }}>✅</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {results.map((r, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
                <img src={previewUrls[i]} alt={`Page ${r.pageNum}`} style={{ width: '100%', height: '220px', display: 'block', objectFit: 'contain', background: '#F8FAFC' }} />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>Page {r.pageNum}</div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>{r.width}×{r.height}px</div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', marginBottom: '8px' }}>{formatBytes(r.sizeBytes)}</div>
                  <button onClick={() => handleDownloadImage(r)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--amber)', background: 'transparent', color: 'var(--amber)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.color = 'white' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--amber)' }}>⬇ Download</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleDownloadZip} style={{ width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>⬇ Download all as ZIP ({results.length} images)</button>
          <button onClick={handleReset} style={{ display: 'block', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'var(--muted)', margin: '0 auto', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'center', transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>Convert another PDF →</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>How to Convert PDF to WebP Online — Free</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          WebP is the modern choice for sharing PDF pages on the web — smaller than JPEG, with better quality at the same file size. All conversion happens in your browser with no upload required.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            'Click <strong>Drop your PDF here</strong> or drag your PDF file into the upload area.',
            'Select a resolution — <strong>150 DPI</strong> is recommended for most uses. Use 300 DPI for print output.',
            'Click <strong>Convert to WebP</strong> and wait while pdf.js renders each page in your browser.',
            'Download individual WebP images or all pages as a ZIP file.',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }} dangerouslySetInnerHTML={{ __html: step }} />
            </div>
          ))}
        </div>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
