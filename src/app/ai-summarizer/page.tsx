'use client'

import { useState, useCallback } from 'react'
import { extractTextFromPDF } from '@/lib/pdf/extractText'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

type SummaryType = 'brief' | 'standard' | 'detailed'

const FAQS = [
  { q: 'How accurate is the AI summary?', a: 'Claude AI is highly accurate for factual summarization. It stays true to the document content without adding external information. For complex technical documents, key figures and dates are always included.' },
  { q: 'Is my PDF content sent to a server?', a: 'The PDF file itself never leaves your device — text is extracted locally. Only the extracted text is sent to Claude (via Doclair\'s servers) to generate the summary. The PDF binary is never transmitted.' },
  { q: 'What types of documents work best?', a: 'Contracts, research papers, financial reports, government documents, annual reports, and policy documents all work excellently. Narrative documents like novels work less well as there is less to "summarize".' },
  { q: 'Does it work on scanned PDFs?', a: 'Scanned PDFs have no text layer. If you upload a scanned PDF, Doclair will detect this and prompt you to use the OCR PDF tool first to add a text layer.' },
  { q: 'Can I get a summary in Hindi or regional languages?', a: 'Yes — the summary is generated in the same language as the document content. Hindi, Tamil, Telugu, Bengali, and all major Indian and world languages are supported.' },
  { q: 'How long does summarization take?', a: 'Most PDFs are summarized in 5–15 seconds. Longer documents with the Detailed option may take up to 30 seconds. Text extraction is instant for most PDFs.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'AI PDF Summarizer — Doclair', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (browser-based)', url: 'https://doclair.in/ai-summarizer', description: 'Get a structured AI summary of any PDF. Powered by Claude AI. Free, no upload.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' } },
    { '@type': 'FAQPage', mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
}

const BREADCRUMB = {
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',          item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',         item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'AI Summarizer', item: 'https://doclair.in/ai-summarizer' },
  ],
}

const SUMMARY_TYPES: { value: SummaryType; label: string; desc: string }[] = [
  { value: 'brief',    label: 'Brief',    desc: '3–4 bullet points only' },
  { value: 'standard', label: 'Standard', desc: 'Full structured summary' },
  { value: 'detailed', label: 'Detailed', desc: 'Comprehensive with all sections' },
]

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

function MarkdownSummary({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div style={{ fontFamily: 'var(--font-dm-sans)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', margin: '20px 0 8px', letterSpacing: '-0.3px' }}>{line.slice(3)}</h3>
        if (line.startsWith('### ')) return <h4 key={i} style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: '15px', color: 'var(--ink)', margin: '14px 0 6px' }}>{line.slice(4)}</h4>
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <div key={i} style={{ display: 'flex', gap: '10px', margin: '5px 0', fontSize: '15px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.82 }}>
            <span style={{ color: 'var(--amber)', flexShrink: 0, marginTop: '3px', fontSize: '10px' }}>●</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        )
        if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />
        return <p key={i} style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75, margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      })}
    </div>
  )
}

export default function AiSummarizerPage() {
  const [file, setFile]             = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractPage, setEP]        = useState(0)
  const [extractTotal, setET]       = useState(0)
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary]       = useState<string | null>(null)
  const [pageCount, setPageCount]   = useState(0)
  const [wordCount, setWordCount]   = useState(0)
  const [summaryType, setSummaryType] = useState<SummaryType>('standard')
  const [error, setError]           = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)

  const summaryWords = summary ? (summary.match(/\b\w+\b/g) ?? []).length : 0

  const handleReset = useCallback(() => {
    setFile(null); setExtracting(false); setEP(0); setET(0)
    setSummarizing(false); setSummary(null); setPageCount(0)
    setWordCount(0); setError(null); setCopied(false)
  }, [])

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    handleReset()
    setFile(f)
  }, [handleReset])

  async function handleSummarize() {
    if (!file) return
    setError(null); setSummary(null)
    setExtracting(true); setEP(0); setET(0)
    let extractedText = ''
    try {
      const res = await extractTextFromPDF(file, (page, total) => { setEP(page); setET(total) })
      extractedText = res.text; setPageCount(res.pageCount); setWordCount(res.wordCount)
    } catch {
      setError('Failed to extract text from this PDF.'); setExtracting(false); return
    } finally { setExtracting(false) }

    setSummarizing(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText, summaryType }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setSummary(data.summary)
    } catch {
      setError('Failed to generate summary. Please try again.')
    } finally { setSummarizing(false) }
  }

  async function handleCopy() {
    if (!summary) return
    try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  function handleDownload() {
    if (!summary || !file) return
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = file.name.replace('.pdf', '-summary.txt'); a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const isProcessing = extracting || summarizing

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Chat with PDF', slug: 'chat-with-pdf', icon: '💬', colorBg: '#EDE9FE', desc: 'Ask follow-up questions' },
        { name: 'PDF to Word',   slug: 'pdf-to-word',   icon: '📝', colorBg: '#DCFCE7', desc: 'Export as editable Word doc' },
      ]}
      relatedTools={[
        { name: 'OCR PDF',          slug: 'ocr-pdf',         icon: '🤖', colorBg: '#DBEAFE' },
        { name: 'Extract Text',     slug: 'pdf-to-text',     icon: '📄', colorBg: '#FFF0DC' },
        { name: 'PDF Word Counter', slug: 'pdf-word-counter', icon: '🔢', colorBg: '#FFF0DC' },
        { name: 'Chat with PDF',    slug: 'chat-with-pdf',   icon: '💬', colorBg: '#EDE9FE' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="AI PDF Summarizer" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }} />

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✦ Claude AI Built-In</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(30px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>AI PDF Summarizer </span>
          <span style={{ color: 'var(--amber)' }}>Get the Key Points Instantly</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Upload any PDF and get a structured AI summary in seconds. Key points, conclusions and important details. Powered by Claude. Free, no upload.
        </p>
      </div>

      {/* Upload */}
      {!file && (
        <DropZone onFilesAdded={addFile} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={0} icon="✨" label="Drop your PDF here" subLabel="or click to browse — max 200 MB" />
      )}

      {/* File selected — options */}
      {file && !isProcessing && !summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* File row */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: '#FFF0DC', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
            <button onClick={handleReset} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--muted)' }}>✕</button>
          </div>

          {/* Summary type pills */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', letterSpacing: '0.06em' }}>SUMMARY TYPE</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {SUMMARY_TYPES.map(st => (
                <button key={st.value} onClick={() => setSummaryType(st.value)} style={{ padding: '8px 16px', borderRadius: '100px', border: '1.5px solid', borderColor: summaryType === st.value ? 'var(--amber)' : 'var(--border)', background: summaryType === st.value ? '#FFF7ED' : 'white', color: summaryType === st.value ? 'var(--amber)' : 'var(--muted)', fontFamily: 'var(--font-dm-sans)', fontSize: '13px', fontWeight: summaryType === st.value ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {st.label}
                  <span style={{ display: 'block', fontFamily: 'var(--font-dm-mono)', fontSize: '10px', opacity: 0.7, marginTop: '1px' }}>{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSummarize} style={{ width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
            ✨ Summarize PDF
          </button>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '22px', color: 'white', marginBottom: '10px' }}>
            {extracting ? `Reading document… ${extractPage} of ${extractTotal} pages` : 'Generating summary with Claude AI…'}
          </div>
          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {extracting ? 'Extracting text locally in your browser' : 'This usually takes 5–15 seconds'}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isProcessing && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '14px', color: '#991B1B' }}>{error}</div>
        </div>
      )}

      {/* Summary result */}
      {summary && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Scanned PDF warning */}
          {wordCount < 100 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>⚠ Scanned PDF detected — limited text found</div>
              <div style={{ fontSize: '13px', color: '#92400E', opacity: 0.8, lineHeight: 1.6 }}>
                Run <a href="/ocr-pdf" style={{ color: '#D97706', textDecoration: 'underline' }}>OCR PDF</a> first to add a text layer, then summarize.
              </div>
            </div>
          )}

          {/* Summary card */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <MarkdownSummary text={summary} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '100px', border: '1.5px solid var(--border)', background: 'white', fontFamily: 'var(--font-dm-sans)', fontSize: '13px', fontWeight: 500, color: copied ? '#166534' : 'var(--ink)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {copied ? '✓ Copied!' : '📋 Copy summary'}
            </button>
            <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '100px', border: '1.5px solid var(--border)', background: 'white', fontFamily: 'var(--font-dm-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', cursor: 'pointer', transition: 'all 0.15s' }}>
              ⬇ Download .txt
            </button>
            <a href="/chat-with-pdf" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '100px', border: '1.5px solid var(--amber)', background: '#FFF7ED', fontFamily: 'var(--font-dm-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--amber)', cursor: 'pointer', textDecoration: 'none' }}>
              💬 Ask follow-up
            </a>
          </div>

          {/* Stats row */}
          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>Original: {pageCount} pages · ~{wordCount.toLocaleString()} words</span>
            <span>Summary: ~{summaryWords.toLocaleString()} words</span>
            {wordCount > 0 && <span>Reduced to {Math.round((summaryWords / wordCount) * 100)}%</span>}
          </div>

          <button onClick={handleReset} style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-dm-mono)', fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Summarize another PDF →
          </button>
        </div>
      )}

      {/* SEO */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>How to Summarize a PDF with AI — Free</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Upload any PDF, choose your summary length, and get a structured summary in seconds. Claude AI reads the document and returns an organized breakdown with overview, key points, and conclusions.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '20px' }}>What types of PDFs can be summarized?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Contracts, research papers, financial reports, government notices, annual reports, policy documents, legal filings, and technical manuals all summarize excellently. Claude adapts its output to the document type.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>AI summary vs manual reading — when to use each</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Use AI summarization when you need to quickly understand a long document, triage incoming documents, or share key points with a team. Read manually when you need to verify every clause of a contract or absorb methodology in full detail.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Summarize PDFs in Hindi and other languages</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Claude AI supports all major world languages. Upload a Hindi, Tamil, or Telugu PDF and the summary is generated in the same language. No language selection required — Claude detects automatically.</p>
      </div>

      <FAQ faqs={FAQS} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ToolPageLayout>
  )
}
