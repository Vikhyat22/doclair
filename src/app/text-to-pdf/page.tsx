'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { textToPDF, type TextToPdfOptions } from '@/lib/pdf/textToPdf'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What fonts are available?',
    a: 'Three font families: Sans-serif (Helvetica), Serif (Times Roman), and Monospace (Courier). All are standard PDF fonts that display without embedding.',
  },
  {
    q: 'Does it support Unicode characters?',
    a: 'Standard Latin characters are fully supported. Extended Unicode (CJK, Arabic, etc.) may not render correctly as the standard fonts have limited character sets.',
  },
  {
    q: 'Will line breaks be preserved?',
    a: 'Yes. Each line break in your text creates a new line. Consecutive blank lines become paragraph spacing.',
  },
  {
    q: 'Is my text uploaded anywhere?',
    a: 'No. PDF generation runs entirely in your browser using @cantoo/pdf-lib. Nothing is sent to any server.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Text to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/text-to-pdf',
      description: 'Convert plain text to a formatted PDF document. Choose font, size and margins. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'Text to PDF', item: 'https://doclair.in/text-to-pdf' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Markdown to PDF', slug: 'markdown-to-pdf', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'Formatted Markdown' },
  { name: 'Create PDF',      slug: 'create-pdf',      icon: '➕', colorBg: '#FFF0DC', desc: 'Rich text editor' },
  { name: 'Word to PDF',     slug: 'word-to-pdf',     icon: '📝', colorBg: '#EDE9FE', desc: 'Convert .docx' },
]

export default function TextToPDFPage() {
  const [text, setText]           = useState('')
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [fontFamily, setFontFamily] = useState<TextToPdfOptions['fontFamily']>('sans')
  const [fontSize,   setFontSize]   = useState(12)
  const [pageSize,   setPageSize]   = useState<TextToPdfOptions['pageSize']>('a4')

  const handleConvert = useCallback(async () => {
    if (!text.trim()) return
    setToolState('processing')
    setError('')
    try {
      const out = await textToPDF(text, { fontSize, fontFamily, lineHeight: 1.5, margin: 50, pageSize })
      setResult(out)
      setToolState('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to convert text'
      setError(msg)
      setErrorMessage(msg)
      setToolState('error')
    }
  }, [text, fontSize, fontFamily, pageSize])

  const handleDownload = useCallback(() => {
    if (!result) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'doclair-text.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const handleReset = useCallback(() => {
    setResult(null); setError(''); setErrorMessage(''); setToolState('idle')
  }, [])

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px',
    fontSize: '13px', color: 'var(--ink)', background: 'white', cursor: 'pointer',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Text to PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Text to PDF </span>
            <span style={{ color: 'var(--amber)' }}>Convert Plain Text to PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Paste any plain text and convert to a formatted PDF document. Choose font, size and margins. Free, no upload.
          </p>
        </div>

        {/* Options */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: '4px' }}>Options:</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
            Font
            <select value={fontFamily} onChange={e => setFontFamily(e.target.value as TextToPdfOptions['fontFamily'])} style={selectStyle}>
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
            Size
            <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={selectStyle}>
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map(s => (
                <option key={s} value={s}>{s}pt</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
            Page
            <select value={pageSize} onChange={e => setPageSize(e.target.value as TextToPdfOptions['pageSize'])} style={selectStyle}>
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </label>
        </div>

        {/* Textarea */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Your text</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{text.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); if (toolState !== 'idle') setToolState('idle') }}
            placeholder="Paste or type your text here…"
            rows={14}
            style={{ width: '100%', padding: '16px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', lineHeight: 1.7, color: 'var(--ink)', fontFamily: fontFamily === 'monospace' ? 'var(--font-dm-mono), DM Mono, monospace' : 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {toolState === 'idle' && text.trim() && (
          <button onClick={handleConvert} style={{ background: 'var(--ink)', color: 'white', padding: '14px 32px', borderRadius: '100px', fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
            Convert to PDF →
          </button>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Generating PDF…</div>
          </div>
        )}

        {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong.'} onReset={handleReset} />}

        {toolState === 'done' && result && (
          <DownloadCard
            filename="doclair-text.pdf"
            description={`${text.split('\n').length} lines converted`}
            onDownload={handleDownload}
            onReset={handleReset}
            title="Text converted to PDF!"
            resetLabel="Convert another →"
            nextSteps={[
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
              { slug: 'add-page-numbers', name: 'Add Page Numbers', icon: '🔢' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Convert Text to PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Need to save plain text as a PDF for sharing, printing, or archiving? Doclair converts any .txt file or pasted text into a clean, readable PDF in seconds.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Paste your text into the editor or upload a .txt file.</strong> The text area accepts any plain text content.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose font size and page size.</strong> Select A4 or Letter and pick from Sans-serif, Serif, or Monospace fonts.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Create PDF.</strong> The PDF is generated instantly in your browser with no upload required.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the PDF file.</strong> Save it to your device and share or print as needed.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>When to use Text to PDF?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Text to PDF is useful for converting log files, code snippets, plain-text documents, or notes into shareable PDFs. It&apos;s also handy for creating simple form letters, instructions, or notices without a word processor.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Text to PDF on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Paste or upload your text, configure the layout, and download the PDF directly to your device.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
