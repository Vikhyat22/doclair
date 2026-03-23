'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DownloadCard from '@/components/ui/DownloadCard'
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
      setError(err instanceof Error ? err.message : 'Failed to convert text')
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
    setResult(null); setError(''); setToolState('idle')
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

        {toolState === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try again</button>
          </div>
        )}

        {toolState === 'done' && result && (
          <DownloadCard filename="doclair-text.pdf" description={`${text.split('\n').length} lines converted`} onDownload={handleDownload} onReset={handleReset} />
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
