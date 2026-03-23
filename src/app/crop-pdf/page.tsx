'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { cropPDF } from '@/lib/pdf/cropPdf'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What unit are the crop values in?',
    a: 'Values are in PDF points (pt). 1 point = 1/72 inch. A4 is 595×842 pt; Letter is 612×792 pt. A typical 1cm margin is about 28 pt.',
  },
  {
    q: 'Does cropping apply to all pages?',
    a: 'Yes. The same crop values are applied to every page in the PDF. If pages have different sizes, the crop values still apply proportionally.',
  },
  {
    q: 'Will this reduce the file size?',
    a: 'Cropping using CropBox does not remove the hidden content — it only sets a visible viewport. The file size remains similar. To truly remove content, use a print-to-PDF workflow.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. The crop runs entirely in your browser using @cantoo/pdf-lib. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Crop PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/crop-pdf',
      description: 'Crop all pages of a PDF to remove margins or unwanted areas. Set crop values for each side. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Cut PDF',          slug: 'cut-pdf',          icon: '✂️', colorBg: '#DBEAFE', desc: 'Split pages in half' },
  { name: 'Rotate PDF',       slug: 'rotate-pdf',       icon: '🔄', colorBg: '#FFF0DC', desc: 'Rotate pages' },
  { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata', icon: '✏️', colorBg: '#EDE9FE', desc: 'Edit document info' },
  { name: 'Flatten PDF',      slug: 'flatten-pdf',      icon: '🔥', colorBg: '#FEE2E2', desc: 'Lock content permanently' },
]

export default function CropPDFPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')
  const [pageSize, setPageSize]   = useState({ width: 0, height: 0 })

  const [top,    setTop]    = useState(0)
  const [right,  setRight]  = useState(0)
  const [bottom, setBottom] = useState(0)
  const [left,   setLeft]   = useState(0)

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFile(f)
    setToolState('idle')
    setResult(null)
    setError('')

    // Read page size via pdf-lib
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const bytes = await f.arrayBuffer()
      const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
      const pages = doc.getPages()
      if (pages.length > 0) {
        const { width, height } = pages[0].getSize()
        setPageSize({ width: Math.round(width), height: Math.round(height) })
      }
    } catch { /* skip */ }
  }, [])

  const handleCrop = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const out = await cropPDF(file, { top, right, bottom, left })
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop PDF')
      setToolState('error')
    }
  }, [file, top, right, bottom, left])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-cropped.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setError(''); setToolState('idle')
    setTop(0); setRight(0); setBottom(0); setLeft(0)
    setPageSize({ width: 0, height: 0 })
  }, [])

  const inputStyle: React.CSSProperties = {
    width: '80px', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
    color: 'var(--ink)', background: 'white', textAlign: 'right',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Crop PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Crop PDF </span>
            <span style={{ color: 'var(--amber)' }}>Remove Page Margins</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Crop all pages to remove margins or unwanted areas. Set crop values for each side. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
          </div>
        </div>

        {/* Crop options */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>// Crop Margins (points)</div>
          {pageSize.width > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
              Page size: {pageSize.width} × {pageSize.height} pt
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '320px' }}>
            {[['Top', top, setTop], ['Right', right, setRight], ['Bottom', bottom, setBottom], ['Left', left, setLeft]].map(([label, val, setter]) => (
              <label key={label as string} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>{label as string}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="0"
                    max="400"
                    value={val as number}
                    onChange={e => (setter as (v: number) => void)(Number(e.target.value))}
                    style={inputStyle}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>pt</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="✂️" label="Drop your PDF here" subLabel="or click to browse — up to 200 MB" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleCrop} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Crop PDF →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✂️</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Cropping PDF…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Setting crop boxes on all pages</div>
          </div>
        )}

        {toolState === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try again</button>
          </div>
        )}

        {toolState === 'done' && result && file && (
          <DownloadCard filename={file.name.replace(/\.pdf$/i, '-cropped.pdf')} description="Margins cropped from all pages" onDownload={handleDownload} onReset={handleReset} />
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
