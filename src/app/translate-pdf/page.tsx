'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'How does PDF translation work?', a: 'Text is extracted from your PDF in the browser using PDF.js, then sent to our AI API for translation. The original PDF file is never uploaded — only the extracted text is processed.' },
  { q: 'Which languages are supported?', a: 'Over 26 languages including Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi, and more.' },
  { q: 'Will images in the PDF be translated?', a: 'Only text content is translated. Images, charts, and graphics are not modified. For scanned PDFs, use OCR PDF first to make the text extractable.' },
  { q: 'Can I download the translated text?', a: 'Yes. After translation is complete, click "Download TXT" to save the translated content as a plain text file.' },
  { q: 'Is translate PDF free?', a: 'Yes. Translation is free with no watermark added. AI processing is handled server-side — only extracted text is sent, never the file itself.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Translate PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/translate-pdf',
      description: 'Translate PDF documents to any language online free using AI. Supports 26 languages. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Translate PDF', item: 'https://doclair.in/translate-pdf' },
  ],
}

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch',
  'Russian', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese',
  'Korean', 'Arabic', 'Hindi', 'Bengali', 'Turkish', 'Polish',
  'Ukrainian', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Hebrew', 'Thai', 'Vietnamese', 'Indonesian', 'Malay',
]

interface PageResult {
  pageNum: number
  original: string
  translated: string
}

export default function TranslatePDFPage() {
  const [targetLang, setTargetLang] = useState('Spanish')
  const [pages, setPages] = useState<PageResult[]>([])
  const [progress, setProgress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'translated' | 'side-by-side'>('translated')
  const [pdfName, setPdfName] = useState('')

  const process = useCallback(async (file: File) => {
    setLoading(true); setError(null); setPages([]); setPdfName(file.name.replace(/\.pdf$/i, ''))
    const results: PageResult[] = []
    try {
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise

      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(`Translating page ${i} of ${doc.numPages}…`)
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const original = content.items.map((item: any) => item.str || '').join(' ').trim()
        if (!original) { results.push({ pageNum: i, original: '', translated: '' }); continue }

        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: original, targetLanguage: targetLang, pageNum: i }),
        })
        if (!res.ok) {
          const e = await res.json()
          throw new Error(e.error || `HTTP ${res.status}`)
        }
        const { translated } = await res.json()
        results.push({ pageNum: i, original, translated })
        setPages([...results])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false); setProgress('')
    }
  }, [targetLang])

  const downloadTxt = () => {
    const content = pages.map(p => `=== Page ${p.pageNum} ===\n${p.translated}`).join('\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${pdfName}-${targetLang.toLowerCase()}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const hasResults = pages.length > 0

  const sidebar = (
    <ToolSidebar
      relatedTools={[
        { name: 'OCR PDF', slug: 'ocr-pdf', icon: '👁️', colorBg: '#EDE9FE', desc: 'Make scanned text searchable' },
        { name: 'Chat with PDF', slug: 'chat-with-pdf', icon: '💬', colorBg: '#EDE9FE', desc: 'Ask questions about your doc' },
        { name: 'AI Summarizer', slug: 'ai-summarizer', icon: '🤖', colorBg: '#EDE9FE', desc: 'Get key points instantly' },
        { name: 'PDF to Text', slug: 'pdf-to-text', icon: '📝', colorBg: '#D1FAE5', desc: 'Extract all text from PDF' },
      ]}
      blogPost={{ slug: 'how-to-translate-pdf', title: 'How to Translate a PDF Free — AI-Powered, 30+ Languages' }}
    />
  )

  return (
    <ToolPageLayout toolName="Translate PDF" sidebar={sidebar}>

{/* Tool Header Card */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Text Only Sent</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🌐 26 Languages</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Translate PDF </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Translate any PDF to 26+ languages using AI. Text is extracted in your browser — only the content, never the file, is sent for translation.
        </p>
      </div>

          {/* Config */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 28 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Translate to</label>
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, minWidth: 200 }}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            {hasResults && (
              <div style={{ display: 'flex', gap: 8 }}>
                {(['translated', 'side-by-side'] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: '10px 16px', borderRadius: 10, border: '1.5px solid',
                    borderColor: viewMode === m ? '#F59E0B' : '#e5e7eb',
                    background: viewMode === m ? '#FFF8EC' : '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  }}>{m.replace('-', ' ')}</button>
                ))}
                <button onClick={downloadTxt} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Download TXT
                </button>
              </div>
            )}
          </div>

          {/* Upload */}
          {!loading && !hasResults && (
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') process(f) }}
              onDragOver={e => e.preventDefault()}
              style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 80, textAlign: 'center', background: '#fafafa', cursor: 'pointer' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
              <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</p>
              <p style={{ color: '#9ca3af', marginBottom: 24 }}>Will be translated to {targetLang}</p>
              <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Choose PDF
                <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
              </label>
              {error && <p style={{ color: '#ef4444', marginTop: 20, fontSize: 14 }}>{error}</p>}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#374151', marginBottom: 8 }}>Translating…</p>
              <p style={{ color: '#6b7280', fontSize: 14 }}>{progress}</p>
              {pages.length > 0 && <p style={{ color: '#10b981', fontSize: 13, marginTop: 8 }}>✓ {pages.length} pages done so far</p>}
            </div>
          )}

          {/* Results */}
          {hasResults && !loading && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>{pages.length} pages translated to {targetLang}</h2>
                <label style={{ padding: '8px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  New PDF
                  <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
                </label>
              </div>
              {error && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>⚠️ {error}</p>}
              {pages.map(p => (
                <div key={p.pageNum} style={{ marginBottom: 24, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: '#f9fafb', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    Page {p.pageNum}
                  </div>
                  {viewMode === 'side-by-side' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      <div style={{ padding: 16, borderRight: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Original</p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{p.original || '(No text)'}</p>
                      </div>
                      <div style={{ padding: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{targetLang}</p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{p.translated || '(No text)'}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 16 }}>
                      <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{p.translated || '(No text on this page)'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>How to Translate a PDF Online — Free</h2>
        <ol style={{ paddingLeft: '20px', color: 'var(--ink)', fontSize: '15px', lineHeight: 1.8 }}>
          <li>Select your target language from the dropdown.</li>
          <li>Drop your PDF or click to upload.</li>
          <li>Wait while each page is extracted and translated.</li>
          <li>Read the translation inline or click Download TXT.</li>
        </ol>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--ink)', marginTop: '28px', marginBottom: '8px' }}>Is my PDF safe to translate?</h3>
        <p style={{ fontSize: '15px', color: 'var(--ink)', opacity: 0.75, lineHeight: 1.7 }}>
          Your PDF never leaves your device. PDF.js extracts the text locally in your browser, and only that text is sent to the translation API. The file itself stays on your device throughout.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--ink)', marginTop: '28px', marginBottom: '8px' }}>What happens with scanned PDFs?</h3>
        <p style={{ fontSize: '15px', color: 'var(--ink)', opacity: 0.75, lineHeight: 1.7 }}>
          Scanned PDFs contain images, not text. Run OCR PDF first to extract the text layer, then use Translate PDF.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
