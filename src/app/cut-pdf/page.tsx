'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { cutPDF, type CutDirection } from '@/lib/pdf/cut'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What is the difference between horizontal and vertical cut?',
    a: 'Horizontal splits each page into a top half and bottom half. Vertical splits each page into a left half and a right half. The resulting PDF will have twice as many pages.',
  },
  {
    q: 'When would I use this tool?',
    a: 'This is useful for scanned booklets or magazines scanned as double-page spreads — split vertically to separate each page. Also useful for presentations where each slide spans across the full page.',
  },
  {
    q: 'Does the content get cut at exactly 50%?',
    a: 'Yes. The split is at exactly the midpoint of each page. If content spans the cut line, it will be divided at that point.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. Everything runs in your browser using @cantoo/pdf-lib. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Cut PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/cut-pdf',
      description: 'Split each PDF page into two halves — top/bottom or left/right. Useful for booklets and double-page scans. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'Cut PDF Pages in Half', item: 'https://doclair.in/cut-pdf' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Crop PDF',   slug: 'crop-pdf',   icon: '✂️', colorBg: '#DBEAFE', desc: 'Remove page margins' },
  { name: 'Split PDF',  slug: 'split-pdf',  icon: '✂️', colorBg: '#FFF0DC', desc: 'Split into separate files' },
  { name: 'Rotate PDF', slug: 'rotate-pdf', icon: '🔄', colorBg: '#EDE9FE', desc: 'Rotate pages' },
]

export default function CutPDFPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [direction, setDirection] = useState<CutDirection>('vertical')
  const [pageCount, setPageCount] = useState(0)

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFile(f)
    setToolState('idle')
    setResult(null)
    setError('')
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const bytes = await f.arrayBuffer()
      const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
      setPageCount(doc.getPageCount())
    } catch { /* skip */ }
  }, [])

  const handleCut = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const out = await cutPDF(file, direction)
      setResult(out)
      setToolState('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setErrorMessage(message)
      setToolState('error')
    }
  }, [file, direction])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-cut.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setError(''); setErrorMessage(''); setToolState('idle'); setPageCount(0)
  }, [])

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
    border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
    background: active ? '#FFF8F0' : 'white',
    color: active ? '#92400E' : 'var(--muted)',
    cursor: 'pointer', transition: 'all 0.2s',
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Cut PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Cut PDF </span>
            <span style={{ color: 'var(--amber)' }}>Split Pages in Half</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Split each PDF page into two halves — top/bottom or left/right. Useful for booklets and double-page scans. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>// Cut Direction</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button style={pillStyle(direction === 'vertical')} onClick={() => setDirection('vertical')}>↕ Split Vertically (left / right)</button>
            <button style={pillStyle(direction === 'horizontal')} onClick={() => setDirection('horizontal')}>↔ Split Horizontally (top / bottom)</button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
            {direction === 'vertical' ? 'Each page is split into left and right halves — ideal for double-page scans.' : 'Each page is split into top and bottom halves.'}
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
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                {pageCount > 0 ? `${pageCount} pages → ${pageCount * 2} half-pages` : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
              </div>
            </div>
            <button onClick={handleCut} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Cut PDF →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✂️</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Cutting PDF…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Splitting pages {direction === 'vertical' ? 'left and right' : 'top and bottom'}</div>
          </div>
        )}

        {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        {toolState === 'done' && result && file && (
          <DownloadCard
            filename={file.name.replace(/\.pdf$/i, '-cut.pdf')}
            description={pageCount > 0 ? `${pageCount} pages → ${pageCount * 2} half-pages` : 'Pages split in half'}
            onDownload={handleDownload}
            onReset={handleReset}
            title="PDF cut!"
            resetLabel="Cut another →"
            nextSteps={[
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'organize-pages', name: 'Organize Pages', icon: '📋' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Cut PDF Pages in Half — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Cutting each page in half is useful for splitting A3 pages to A4, turning landscape slides into portrait cards, or preparing booklet pages for individual printing.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop the file or click to browse.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose the cut direction — horizontal (top/bottom halves) or vertical (left/right halves).</strong> Select the split that matches your document layout.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Preview the cut result.</strong> Doclair shows the resulting page count before you download.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the PDF with doubled page count.</strong> Each original page becomes two half-pages in the output.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Why cut PDF pages?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Common uses include splitting A3 scans to A4 for standard printers, extracting the left and right pages of a spread layout, converting landscape presentation slides to portrait format, and printing double-page spreads as individual cards.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Cut PDF on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF from the Files app and download the cut PDF directly to your device.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
