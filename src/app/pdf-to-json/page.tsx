'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { pdfToJSON } from '@/lib/pdf/pdfToJson'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What data is included in the JSON output?',
    a: 'The JSON contains filename, page count, total word count, document metadata, and per-page text with line objects, detected cells, and table blocks when the PDF layout is structured enough to infer them.',
  },
  {
    q: 'Is the JSON suitable for developer use?',
    a: 'Yes — the structure is clean and consistent, suitable for importing into databases, AI pipelines, or content processing workflows.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. Text extraction runs in your browser. Nothing is sent anywhere.',
  },
  {
    q: 'Does it work on scanned PDFs?',
    a: 'Only if the scan contains selectable text. Use OCR PDF first for image-only scans.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to JSON — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-json',
      description: 'Extract all text from a PDF and export as structured JSON with page data and metadata. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'PDF to JSON', item: 'https://doclair.in/pdf-to-json' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'PDF to Markdown', slug: 'pdf-to-markdown', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'Convert to .md' },
  { name: 'PDF to Text',     slug: 'pdf-to-text',     icon: '📝', colorBg: '#FFF0DC', desc: 'Plain text extraction' },
  { name: 'CSV to PDF',      slug: 'csv-to-pdf',      icon: '📊', colorBg: '#DCFCE7', desc: 'CSV data to PDF' },
]

export default function PDFToJSONPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jsonData, setJsonData]   = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [progress, setProgress]   = useState({ current: 0, total: 0 })
  const [copied, setCopied]       = useState(false)

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]); setToolState('idle'); setJsonData(null); setErrorMessage('')
    }
  }, [])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setErrorMessage('')
    try {
      const data = await pdfToJSON(file, (c, t) => setProgress({ current: c, total: t }))
      setJsonData(data)
      setToolState('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'; setErrorMessage(message)
      setToolState('error')
    }
  }, [file])

  const jsonString = jsonData ? JSON.stringify(jsonData, null, 2) : ''

  const handleDownload = useCallback(() => {
    if (!jsonString || !file) return
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '.json')
    a.click()
    URL.revokeObjectURL(url)
  }, [jsonString, file])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [jsonString])

  const handleReset = useCallback(() => {
    setFile(null); setJsonData(null); setErrorMessage(''); setToolState('idle')
    setProgress({ current: 0, total: 0 })
  }, [])

  const preview = jsonString.split('\n').slice(0, 30).join('\n')

  return (
    <>
<ToolPageLayout
        toolName="PDF to JSON"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>PDF to JSON</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Extract PDF content as structured JSON with page data, word counts, line objects, cells, detected tables, and document metadata. Free, no upload.
          </p>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="{}" label="Drop your PDF here" subLabel="or click to browse" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleConvert} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Extract to JSON →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
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

        {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        {toolState === 'done' && jsonData && file && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {[
                ['Pages', jsonData.pageCount],
                ['Words', jsonData.totalWords.toLocaleString()],
                ['Characters', jsonString.length.toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} style={{ background: '#F9FAFB', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)' }}>{val}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>JSON preview (first 30 lines)</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopy} style={{ fontSize: '12px', color: 'var(--amber)', background: 'none', border: '1px solid var(--amber)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
                    {copied ? '✓ Copied!' : 'Copy all'}
                  </button>
                  <button onClick={handleDownload} style={{ fontSize: '12px', color: 'white', background: 'var(--ink)', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
                    ⬇ Download .json
                  </button>
                </div>
              </div>
              <pre style={{ padding: '16px', fontSize: '11px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', lineHeight: 1.7, color: '#E2E8F0', overflowX: 'auto', margin: 0, background: '#1E293B', maxHeight: '400px', overflowY: 'auto' }}>
                {preview}
                {jsonString.split('\n').length > 30 ? '\n…' : ''}
              </pre>
            </div>

            <button onClick={handleReset} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 20px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-start' }}>
              Convert another PDF
            </button>
          </>
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Extract PDF Data as JSON — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            PDF to JSON extracts the structured text content from a PDF and outputs it as a machine-readable JSON file. This is useful for developers building data pipelines, feeding PDF content into APIs, or automating document processing.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop the file or click to browse.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair extracts text, metadata, and page structure.</strong> Processing happens in your browser with no server upload.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Preview the JSON output.</strong> The first 30 lines are shown inline.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Download JSON to save the file.</strong> Or copy the full JSON to clipboard.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>What data is included in the JSON output?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>The JSON includes document metadata, total page count, and for each page: extracted text, line objects with `cells`, and detected `tables` when the page has clear column structure. Images and vector graphics are not included.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>PDF to JSON on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF and download the JSON file directly to your device for further processing.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
