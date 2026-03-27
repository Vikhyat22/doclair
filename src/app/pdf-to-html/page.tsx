'use client'

import { useCallback, useState } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { pdfToHTML, type PDFToHTMLResult } from '@/lib/pdf/pdfToHtml'

type ToolState = 'idle' | 'processing' | 'done' | 'error'
type PreviewTab = 'rendered' | 'source'

const FAQS = [
  {
    q: 'What does the HTML output preserve?',
    a: 'Doclair preserves extracted text, headings, list-like lines, and page grouping. It does not recreate the full original PDF layout pixel for pixel, so highly designed documents may need hand-tuning after export.',
  },
  {
    q: 'Does it work on scanned PDFs?',
    a: 'Only after OCR. If the PDF is image-only, run OCR PDF first so there is readable text to convert.',
  },
  {
    q: 'Is my PDF uploaded anywhere?',
    a: 'No. Conversion runs locally in your browser using PDF.js. The generated HTML file is created entirely on your device.',
  },
  {
    q: 'What can I do with the .html file afterward?',
    a: 'Open it in any browser, upload it to a website, edit it in a code editor, or use it as a starting point for publishing a PDF document on the web.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to HTML — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-html',
      description: 'Convert PDF text into a clean HTML file you can open, edit, or publish. Free, no upload, no watermark.',
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
        { '@type': 'ListItem', position: 3, name: 'PDF to HTML', item: 'https://doclair.in/pdf-to-html' },
      ],
    },
  ],
}

const SIDEBAR_REVERSE = [
  { name: 'HTML to PDF', slug: 'html-to-pdf', icon: '🌐', colorBg: '#D1FAE5', desc: 'Turn markup back into PDF' },
]

const SIDEBAR_RELATED = [
  { name: 'PDF to Markdown', slug: 'pdf-to-markdown', icon: '#️⃣', colorBg: '#D1FAE5', desc: 'Markdown-friendly extraction' },
  { name: 'PDF to Text', slug: 'pdf-to-text', icon: '📝', colorBg: '#D1FAE5', desc: 'Extract plain text only' },
  { name: 'PDF to JSON', slug: 'pdf-to-json', icon: '{}', colorBg: '#D1FAE5', desc: 'Structured page-by-page output' },
  { name: 'OCR PDF', slug: 'ocr-pdf', icon: '🔍', colorBg: '#EDE9FE', desc: 'Make scanned PDFs readable' },
]

function statCard(label: string, value: string | number) {
  return (
    <div
      key={label}
      style={{
        background: '#F9FAFB',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '14px 16px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

export default function PDFToHTMLPage() {
  const [file, setFile] = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult] = useState<PDFToHTMLResult | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [copied, setCopied] = useState(false)
  const [previewTab, setPreviewTab] = useState<PreviewTab>('rendered')

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setFile(files[0])
    setToolState('idle')
    setResult(null)
    setError('')
    setProgress({ current: 0, total: 0 })
    setCopied(false)
    setPreviewTab('rendered')
  }, [])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    setResult(null)
    setCopied(false)
    setPreviewTab('rendered')
    try {
      const converted = await pdfToHTML(file, (current, total) => setProgress({ current, total }))
      setResult(converted)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to HTML')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.pdf$/i, '.html')
    a.click()
    URL.revokeObjectURL(url)
  }, [file, result])

  const handleCopy = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const handleReset = useCallback(() => {
    setFile(null)
    setToolState('idle')
    setResult(null)
    setError('')
    setProgress({ current: 0, total: 0 })
    setCopied(false)
    setPreviewTab('rendered')
  }, [])

  const visibleProgress = progress.total > 0 ? Math.min(progress.total, Math.max(progress.current, 1)) : 0
  const htmlSize = result ? `${(new Blob([result.html]).size / 1024).toFixed(1)} KB` : '0 KB'

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="PDF to HTML"
        sidebar={<ToolSidebar reverseActions={SIDEBAR_REVERSE} relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>PDF to HTML </span>
            <span style={{ color: 'var(--amber)' }}>Turn Documents into Web Pages</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '700px', marginBottom: '16px' }}>
            Extract readable text from a PDF and wrap it in clean HTML you can preview, edit, or publish. Free, browser-based, no upload.
          </p>
        </div>

        {!file && (
          <DropZone
            onFilesAdded={handleFiles}
            accept=".pdf"
            maxFiles={1}
            maxSizeMB={200}
            icon="🌐"
            label="Drop your PDF here"
            subLabel="or click to browse — up to 200 MB"
            currentCount={0}
          />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleConvert} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Convert to HTML →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🌐</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Building HTML output…</div>
            {progress.total > 0 && (
              <>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Page {visibleProgress} of {progress.total}</div>
                <div style={{ background: '#F3F4F6', borderRadius: '100px', height: '6px', overflow: 'hidden', maxWidth: '300px', margin: '0 auto' }}>
                  <div style={{ background: 'var(--amber)', height: '100%', width: `${(visibleProgress / progress.total) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </>
            )}
          </div>
        )}

        {toolState === 'error' && <ErrorCard message={error || 'Something went wrong. Try a different PDF.'} onReset={handleReset} />}

        {toolState === 'done' && result && file && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {[
                statCard('Pages', result.pageCount),
                statCard('Words', result.wordCount.toLocaleString()),
                statCard('HTML Size', htmlSize),
              ]}
            </div>

            {result.warnings.length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#92400E', lineHeight: 1.65 }}>
                <strong>Review before publishing:</strong>
                <div style={{ marginTop: '6px' }}>{result.warnings.join(' ')}</div>
              </div>
            )}

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '14px' }}>🌐 {file.name.replace(/\.pdf$/i, '.html')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Clean HTML output ready to download</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={handleCopy} style={{ fontSize: '12px', color: 'var(--amber)', background: 'none', border: '1px solid var(--amber)', borderRadius: '100px', padding: '10px 16px', cursor: 'pointer' }}>
                    {copied ? '✓ Copied!' : 'Copy HTML'}
                  </button>
                  <button onClick={handleDownload} style={{ background: 'var(--ink)', color: 'white', padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                    Download .html
                  </button>
                  <button onClick={handleReset} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 16px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer' }}>
                    Convert another PDF
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => setPreviewTab('rendered')}
                  style={{
                    padding: '11px 18px',
                    border: 'none',
                    borderBottom: previewTab === 'rendered' ? '2px solid var(--amber)' : '2px solid transparent',
                    background: previewTab === 'rendered' ? '#FFF8F0' : 'white',
                    color: previewTab === 'rendered' ? 'var(--amber)' : 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: previewTab === 'rendered' ? 600 : 400,
                  }}
                >
                  Rendered preview
                </button>
                <button
                  onClick={() => setPreviewTab('source')}
                  style={{
                    padding: '11px 18px',
                    border: 'none',
                    borderBottom: previewTab === 'source' ? '2px solid var(--amber)' : '2px solid transparent',
                    background: previewTab === 'source' ? '#FFF8F0' : 'white',
                    color: previewTab === 'source' ? 'var(--amber)' : 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: previewTab === 'source' ? 600 : 400,
                  }}
                >
                  HTML source
                </button>
              </div>

              {previewTab === 'rendered' ? (
                <iframe
                  title="PDF to HTML preview"
                  srcDoc={result.html}
                  style={{ width: '100%', height: '560px', border: 'none', background: '#F5F0E8' }}
                  sandbox=""
                />
              ) : (
                <pre style={{ padding: '18px 20px', fontSize: '11px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', lineHeight: 1.7, color: '#E2E8F0', overflowX: 'auto', margin: 0, background: '#1E293B', maxHeight: '560px', overflowY: 'auto' }}>
                  {result.html}
                </pre>
              )}
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
              <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
                How PDF to HTML Works
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
                Doclair extracts text line by line, detects likely headings and bullet lists, then wraps the content in a clean HTML document with lightweight styling. The result is meant to be readable and editable, not a pixel-perfect clone of the original PDF page.
              </p>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Nothing is sent to any server.</li>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair extracts text and groups it into headings, paragraphs, and lists.</strong></li>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Preview the generated HTML.</strong> Switch between the rendered page and the raw source.</li>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download or copy the HTML.</strong> Edit it locally or publish it anywhere.</li>
              </ol>
              <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>When this converter works best</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
                Long-form reports, guides, whitepapers, and contracts with readable text layers are good candidates. PDFs built from dense visual layouts, charts, or brochures usually need some manual HTML cleanup afterward.
              </p>
              <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Publishing tip</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
                If you plan to post the output on a website, use the generated file as a starting point and then refine headings, links, and CSS inside your editor for the best accessibility and SEO.
              </p>
            </div>
          </>
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
