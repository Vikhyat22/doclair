'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What does inverting a PDF do?',
    a: 'Inverting flips all colors — white becomes black, black becomes white, and all other colors are complemented. The result looks like a "dark mode" version of the document.',
  },
  {
    q: 'Does this work on scanned PDFs?',
    a: 'Yes. Each page is rendered as an image at 150 DPI, then inverted pixel-by-pixel, and re-embedded into a new PDF.',
  },
  {
    q: 'Will the file size change?',
    a: 'Yes — the output will be larger than the original because all pages are rasterised as PNG images. This trades vector sharpness for universal color inversion.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. Everything runs in your browser using pdf.js and @cantoo/pdf-lib. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Invert PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/invert-pdf',
      description: 'Invert all colors in a PDF — white becomes black, black becomes white. Easier reading in dark environments. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'PDF to Grayscale', slug: 'pdf-to-grayscale', icon: '🔲', colorBg: '#F3F4F6', desc: 'Remove all colors' },
  { name: 'Compress PDF',     slug: 'compress-pdf',     icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size' },
  { name: 'Flatten PDF',      slug: 'flatten-pdf',      icon: '🔥', colorBg: '#FEE2E2', desc: 'Lock content permanently' },
]

async function processPages(
  file: File,
  mode: 'invert' | 'grayscale',
  onProgress: (p: number, t: number) => void,
): Promise<Uint8Array> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const { PDFDocument } = await import('@cantoo/pdf-lib')

  const bytes   = await file.arrayBuffer()
  const pdfDoc  = await pdfjsLib.getDocument({ data: bytes }).promise
  const total   = pdfDoc.numPages
  const outDoc  = await PDFDocument.create()

  for (let i = 1; i <= total; i++) {
    onProgress(i - 1, total)

    const page     = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: 150 / 72 })  // 150 DPI

    const canvas    = document.createElement('canvas')
    canvas.width    = viewport.width
    canvas.height   = viewport.height
    const ctx       = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    // Pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data      = imageData.data

    for (let p = 0; p < data.length; p += 4) {
      if (mode === 'invert') {
        data[p]     = 255 - data[p]
        data[p + 1] = 255 - data[p + 1]
        data[p + 2] = 255 - data[p + 2]
      } else {
        const gray  = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
        data[p]     = gray
        data[p + 1] = gray
        data[p + 2] = gray
      }
    }
    ctx.putImageData(imageData, 0, 0)

    // Get PNG blob
    const pngBytes = await new Promise<Uint8Array>(resolve => {
      canvas.toBlob(blob => {
        blob!.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
      }, 'image/png')
    })

    const img  = await outDoc.embedPng(pngBytes)
    const pg   = outDoc.addPage([viewport.width, viewport.height])
    pg.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height })
    onProgress(i, total)
  }

  return outDoc.save()
}

export default function InvertPDFPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')
  const [progress, setProgress]   = useState({ current: 0, total: 0 })

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]); setToolState('idle'); setResult(null); setError('')
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const out = await processPages(file, 'invert', (c, t) => setProgress({ current: c, total: t }))
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invert PDF')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-inverted.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setError(''); setToolState('idle')
    setProgress({ current: 0, total: 0 })
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Invert PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Invert PDF </span>
            <span style={{ color: 'var(--amber)' }}>Dark Mode for Any PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Invert all colors in a PDF — white becomes black, black becomes white. Easier reading in dark environments. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#1F2937', color: '#F9FAFB', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🌙 Dark Mode PDF</span>
          </div>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={100} icon="🌙" label="Drop your PDF here" subLabel="or click to browse — up to 100 MB (rasterised)" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleProcess} style={{ background: '#1F2937', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              🌙 Invert Colors →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🌙</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Inverting Colors…</div>
            {progress.total > 0 && (
              <>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Page {progress.current} of {progress.total}
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: '100px', height: '6px', overflow: 'hidden', maxWidth: '300px', margin: '0 auto' }}>
                  <div style={{ background: '#1F2937', height: '100%', width: `${(progress.current / progress.total) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </>
            )}
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
          <DownloadCard
            filename={file.name.replace(/\.pdf$/i, '-inverted.pdf')}
            description="Colors inverted — dark mode PDF"
            onDownload={handleDownload}
            onReset={handleReset}
          />
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
