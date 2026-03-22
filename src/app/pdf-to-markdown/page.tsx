'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { pdfToMarkdown } from '@/lib/pdf/pdfToMarkdown'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'How accurate is the Markdown conversion?',
    a: 'Text extraction is generally very accurate for digital PDFs. ALL CAPS short lines are heuristically converted to headings. Formatting beyond headings (bold, italic, tables) is not inferred from PDF layout.',
  },
  {
    q: 'Does it work on scanned PDFs?',
    a: 'Scanned PDFs require OCR. For best results with scanned documents, use the OCR PDF tool first to make the document text-searchable.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. Text extraction runs in your browser using pdf.js. Nothing is sent to any server.',
  },
  {
    q: 'Can I edit the Markdown after extraction?',
    a: 'Yes — use the Markdown to PDF tool to paste and edit the Markdown, then export back to PDF.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to Markdown — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-markdown',
      description: 'Extract text from any PDF and convert to clean Markdown format. Free, no upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Markdown to PDF', slug: 'markdown-to-pdf', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'Convert .md to PDF' },
  { name: 'PDF to Text',     slug: 'pdf-to-text',     icon: '📝', colorBg: '#FFF0DC', desc: 'Extract plain text' },
  { name: 'PDF to JSON',     slug: 'pdf-to-json',     icon: '{}', colorBg: '#DBEAFE', desc: 'Structured JSON output' },
  { name: 'OCR PDF',         slug: 'ocr-pdf',         icon: '🔍', colorBg: '#EDE9FE', desc: 'OCR scanned PDFs' },
]

export default function PDFToMarkdownPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [markdown, setMarkdown]   = useState('')
  const [error, setError]         = useState('')
  const [progress, setProgress]   = useState({ current: 0, total: 0 })
  const [copied, setCopied]       = useState(false)

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]); setToolState('idle'); setMarkdown(''); setError('')
    }
  }, [])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const md = await pdfToMarkdown(file, (c, t) => setProgress({ current: c, total: t }))
      setMarkdown(md)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!markdown || !file) return
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '.md')
    a.click()
    URL.revokeObjectURL(url)
  }, [markdown, file])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [markdown])

  const handleReset = useCallback(() => {
    setFile(null); setMarkdown(''); setError(''); setToolState('idle')
    setProgress({ current: 0, total: 0 })
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="PDF to Markdown"
        toolSlug="pdf-to-markdown"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>PDF to Markdown</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Extract text from any PDF and convert to clean Markdown format. Download as .md or copy to clipboard. Free, no upload.
          </p>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="#️⃣" label="Drop your PDF here" subLabel="or click to browse — up to 200 MB" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleConvert} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Convert to Markdown →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>#️⃣</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Extracting text…</div>
            {progress.total > 0 && (
              <>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Page {progress.current} of {progress.total}</div>
                <div style={{ background: '#F3F4F6', borderRadius: '100px', height: '6px', overflow: 'hidden', maxWidth: '300px', margin: '0 auto' }}>
                  <div style={{ background: 'var(--amber)', height: '100%', width: `${(progress.current / progress.total) * 100}%`, transition: 'width 0.3s' }} />
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

        {toolState === 'done' && markdown && file && (
          <>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Markdown preview (first 500 chars)</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopy} style={{ fontSize: '12px', color: 'var(--amber)', background: 'none', border: '1px solid var(--amber)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
                    {copied ? '✓ Copied!' : 'Copy all'}
                  </button>
                  <button onClick={handleDownload} style={{ fontSize: '12px', color: 'white', background: 'var(--ink)', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
                    ⬇ Download .md
                  </button>
                </div>
              </div>
              <pre style={{ padding: '16px', fontSize: '12px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', lineHeight: 1.7, color: 'var(--ink)', overflowX: 'auto', margin: 0, background: 'white', maxHeight: '400px', overflowY: 'auto' }}>
                {markdown.slice(0, 500)}{markdown.length > 500 ? '\n…' : ''}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleReset} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 20px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer' }}>
                Convert another PDF
              </button>
            </div>
          </>
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
