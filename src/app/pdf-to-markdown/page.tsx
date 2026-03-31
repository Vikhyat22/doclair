'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import ErrorCard from '@/components/ui/ErrorCard'
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
        { '@type': 'ListItem', position: 3, name: 'PDF to Markdown', item: 'https://doclair.in/pdf-to-markdown' },
      ],
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
<ToolPageLayout
        toolName="PDF to Markdown"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
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

        {toolState === 'error' && <ErrorCard message={error || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

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

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Convert PDF to Markdown — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            PDF to Markdown extracts text from a PDF and converts it to Markdown format — useful for ingesting document content into note-taking apps, knowledge bases, or AI tools that work with Markdown.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop the file or click to browse.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair extracts the text and applies Markdown formatting.</strong> A progress bar shows page-by-page status.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Preview the Markdown output.</strong> The first 500 characters are shown inline.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Copy to clipboard or download as a .md file.</strong> Use it directly in your editor or knowledge base.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>What Markdown formatting is applied?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Headings are inferred from font size and bold formatting. Paragraphs are separated by blank lines. Lists are preserved where detected. Images and complex graphics are not included — this tool is for text extraction.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>PDF to Markdown on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF and download the .md file directly to your device for use in Obsidian, Notion, or any Markdown editor.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
