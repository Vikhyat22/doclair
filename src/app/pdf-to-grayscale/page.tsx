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
    q: 'Does converting to grayscale reduce file size?',
    a: 'The output PDF uses rasterised images so the size may be comparable or slightly larger than the original. For size reduction, use Compress PDF after conversion.',
  },
  {
    q: 'Will the grayscale PDF look the same as the original?',
    a: 'The layout and text will be preserved visually. Colors are converted using standard luminance formula (NTSC weights), giving natural-looking grays.',
  },
  {
    q: 'Can I convert scanned PDFs to grayscale?',
    a: 'Yes. The tool renders each page to a canvas and applies grayscale transformation pixel-by-pixel, regardless of whether the original was vector or scanned.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. Everything runs in your browser. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to Grayscale — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-grayscale',
      description: 'Convert a color PDF to black and white. Reduces printing costs. Free, no upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Invert PDF',   slug: 'invert-pdf',   icon: '🌙', colorBg: '#1F2937', desc: 'Dark mode PDF' },
  { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size' },
  { name: 'Flatten PDF',  slug: 'flatten-pdf',  icon: '🔥', colorBg: '#FEE2E2', desc: 'Lock content permanently' },
]

async function processToGrayscale(
  file: File,
  onProgress: (c: number, t: number) => void,
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
    const viewport = page.getViewport({ scale: 150 / 72 })

    const canvas    = document.createElement('canvas')
    canvas.width    = viewport.width
    canvas.height   = viewport.height
    const ctx       = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data      = imageData.data
    for (let p = 0; p < data.length; p += 4) {
      const gray  = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
      data[p]     = gray
      data[p + 1] = gray
      data[p + 2] = gray
    }
    ctx.putImageData(imageData, 0, 0)

    const pngBytes = await new Promise<Uint8Array>(resolve => {
      canvas.toBlob(blob => {
        blob!.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
      }, 'image/png')
    })

    const img = await outDoc.embedPng(pngBytes)
    const pg  = outDoc.addPage([viewport.width, viewport.height])
    pg.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height })
    onProgress(i, total)
  }

  return outDoc.save()
}

export default function PDFToGrayscalePage() {
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
      const out = await processToGrayscale(file, (c, t) => setProgress({ current: c, total: t }))
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert to grayscale')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-grayscale.pdf')
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
        toolName="PDF to Grayscale"
        toolSlug="pdf-to-grayscale"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>PDF to Grayscale </span>
            <span style={{ color: 'var(--amber)' }}>Remove All Colors</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Convert a color PDF to black and white. Reduces file size and printing costs. Free, no upload.
          </p>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={100} icon="🔲" label="Drop your PDF here" subLabel="or click to browse — up to 100 MB" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleProcess} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Convert to Grayscale →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔲</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Converting to Grayscale…</div>
            {progress.total > 0 && (
              <>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Page {progress.current} of {progress.total}
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: '100px', height: '6px', overflow: 'hidden', maxWidth: '300px', margin: '0 auto' }}>
                  <div style={{ background: 'var(--ink)', height: '100%', width: `${(progress.current / progress.total) * 100}%`, transition: 'width 0.3s' }} />
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
            filename={file.name.replace(/\.pdf$/i, '-grayscale.pdf')}
            description="Colors removed — black &amp; white PDF"
            onDownload={handleDownload}
            onReset={handleReset}
          />
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
