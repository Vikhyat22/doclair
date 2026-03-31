'use client'

import { useState, useCallback } from 'react'
import { extractTextFromPDF } from '@/lib/pdf/extractText'
import type { ExtractTextResult } from '@/lib/pdf/extractText'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'Will all text be extracted accurately?', a: 'Text extraction is highly accurate for PDFs with a real text layer (created digitally from Word, InDesign, etc). For scanned PDFs, use OCR PDF first to add a text layer.' },
  { q: 'Can I extract text from a scanned PDF?', a: 'Scanned PDFs are images — they have no text layer to extract. Use the OCR PDF tool first to recognise the text, then you can copy or extract it.' },
  { q: 'Is my PDF uploaded to a server?', a: 'Never. pdfjs-dist runs entirely in your browser using WebAssembly. No data leaves your device.' },
  { q: 'What format is the extracted text?', a: "Plain UTF-8 text (.txt file). Page breaks are marked with '--- Page Break ---'. No formatting, fonts or layout is preserved — just the raw text content." },
  { q: 'Can I copy text directly instead of downloading?', a: "Yes. Click 'Copy all text' in the preview panel to copy the full extracted text to your clipboard instantly." },
  { q: 'Does text extraction preserve formatting?', a: 'No. PDF text extraction gives you the raw characters in reading order. Tables, columns, bold/italic formatting and whitespace layout are not preserved. For formatted output, use PDF to Word instead.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to Text — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-text',
      description: 'Extract all text from any PDF as a plain .txt file. Searchable, copyable, editable. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Extract full text layer from any PDF',
        'Plain UTF-8 .txt output',
        'Page break markers',
        'No file upload to server',
        'No watermark on output',
        'No sign-up required',
        'Works on mobile',
      ],
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
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',        item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',       item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'PDF to Text', item: 'https://doclair.in/pdf-to-text' },
  ],
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function PDFToTextPage() {
  const [file, setFile]             = useState<File | null>(null)
  const [toolState, setToolState]   = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [result, setResult]         = useState<ExtractTextResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages]   = useState(0)
  const [copied, setCopied]           = useState(false)

  const handleReset = useCallback(() => {
    setFile(null)
    setToolState('idle')
    setResult(null)
    setErrorMessage('')
    setCurrentPage(0)
    setTotalPages(0)
    setCopied(false)
  }, [])

  const addFile = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setToolState('idle')
    setResult(null)
    setCurrentPage(0)
    setTotalPages(0)
    setCopied(false)
  }, [])

  async function handleExtract() {
    if (!file) return
    setToolState('processing')
    setCurrentPage(0)
    setTotalPages(0)
    try {
      const res = await extractTextFromPDF(file, (page, total) => {
        setCurrentPage(page)
        setTotalPages(total)
      })
      setResult(res)
      setToolState('done')
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message)
      setToolState('error')
    }
  }

  function handleDownload() {
    if (!result || !file) return
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace('.pdf', '.txt')
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  async function handleCopy() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const progressPct = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Create PDF', slug: 'create-pdf', icon: '📝', colorBg: '#DCFCE7', desc: 'Create PDF from text' },
        { name: 'Word to PDF', slug: 'word-to-pdf', icon: '📄', colorBg: '#DBEAFE', desc: 'Convert Word to PDF' },
      ]}
      relatedTools={[
        { name: 'OCR PDF',          slug: 'ocr-pdf',          icon: '🤖', colorBg: '#EDE9FE' },
        { name: 'PDF to Word',      slug: 'pdf-to-word',      icon: '📝', colorBg: '#DCFCE7' },
        { name: 'PDF Word Counter', slug: 'pdf-word-counter',  icon: '🔢', colorBg: '#FFF0DC' },
        { name: 'PDF to Markdown',  slug: 'pdf-to-markdown',   icon: '#️⃣', colorBg: '#DBEAFE' },
        { name: 'Chat with PDF',    slug: 'chat-with-pdf',     icon: '💬', colorBg: '#F0FDF4' },
      ]}
      blogPost={{ slug: 'how-to-extract-text-from-pdf', title: 'How to Extract Text From PDF Free' }}
    />
  )

  return (
    <ToolPageLayout toolName="PDF to Text" sidebar={sidebar}>
{/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>PDF to Text </span>
          <span style={{ color: 'var(--amber)' }}>Extract All Text Instantly</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Extract all text from any PDF as a plain .txt file. Searchable, copyable, editable. Free, no upload.
        </p>
      </div>

      {/* State: idle, no file */}
      {toolState === 'idle' && !file && (
        <DropZone
          onFilesAdded={addFile}
          accept=".pdf"
          maxFiles={1}
          maxSizeMB={200}
          currentCount={0}
          icon="📄"
          label="Drop your PDF here"
          subLabel="or click to browse — max 200 MB"
        />
      )}

      {/* State: idle, file selected */}
      {toolState === 'idle' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Selected file row */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', background: '#FFF0DC', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {formatBytes(file.size)}
              </div>
            </div>
            <button
              onClick={handleReset}
              style={{
                width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                background: 'transparent', cursor: 'pointer', fontSize: '14px',
                color: 'var(--muted)', transition: 'all 0.15s', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
            >✕</button>
          </div>

          {/* Extract button */}
          <button
            onClick={handleExtract}
            style={{
              width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px',
              borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer',
              transition: 'transform 0.15s, opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            📄 Extract Text
          </button>
        </div>
      )}

      {/* State: processing */}
      {toolState === 'processing' && (
        <div style={{
          background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--amber)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 24px',
          }} />
          <div style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: '24px', color: 'white', marginBottom: '10px',
          }}>Extracting text…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.55)', marginBottom: '20px',
          }}>
            Page {currentPage} of {totalPages}
          </div>
          {/* Progress bar */}
          <div style={{
            width: '100%', maxWidth: '320px', height: '3px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '100px', margin: '0 auto',
          }}>
            <div style={{
              height: '100%', borderRadius: '100px', background: 'var(--amber)',
              width: `${progressPct}%`, transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
      )}

      {/* State: error */}
      {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

      {/* State: done */}
      {toolState === 'done' && result && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* No text warning */}
          {result.hasText === false && (
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: '10px', padding: '14px 16px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                ⚠ No text found — this appears to be a scanned PDF.
              </div>
              <div style={{ fontSize: '13px', color: '#92400E', opacity: 0.8, lineHeight: 1.6 }}>
                Run OCR PDF to extract text from scanned documents.{' '}
                <a
                  href="/ocr-pdf"
                  style={{ color: '#D97706', textDecoration: 'underline', fontWeight: 500 }}
                >
                  Open OCR PDF →
                </a>
              </div>
            </div>
          )}

          {/* Download card */}
          <DownloadCard
            filename={file.name.replace('.pdf', '.txt')}
            description={`${result.wordCount.toLocaleString()} words · ${result.charCount.toLocaleString()} characters`}
            onDownload={handleDownload}
            onReset={handleReset}
            title="Text extracted!"
            resetLabel="Extract from another →"
            nextSteps={[
              { slug: 'ocr-pdf', name: 'OCR PDF', icon: '🤖' },
              { slug: 'pdf-to-word', name: 'PDF to Word', icon: '📝' },
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
            ]}
          />

          {/* Text preview card */}
          <div style={{ background: 'var(--ink)', borderRadius: '12px', padding: '20px' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
                color: 'var(--amber)', letterSpacing: '0.08em',
              }}>// Preview</span>
              <button
                onClick={handleCopy}
                style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
                  color: copied ? '#4ADE80' : 'rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px', padding: '5px 12px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              >
                {copied ? '✓ Copied!' : 'Copy all text'}
              </button>
            </div>

            {/* Preview text */}
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
              color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
              overflowY: 'auto', maxHeight: '200px',
            }}>
              {result.text.slice(0, 500)}
            </div>

            {/* More characters notice */}
            {result.text.length > 500 && (
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
                color: 'rgba(255,255,255,0.3)', marginTop: '10px',
              }}>
                … and {(result.text.length - 500).toLocaleString()} more characters
              </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              `${result.pageCount} pages`,
              `${result.wordCount.toLocaleString()} words`,
              `${result.charCount.toLocaleString()} characters`,
            ].map(stat => (
              <span key={stat} style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
                color: 'var(--muted)', padding: '5px 12px',
                border: '1px solid var(--border)', borderRadius: '100px',
                background: 'white',
              }}>{stat}</span>
            ))}
          </div>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Extract Text from PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Extracting text from a PDF is instant and free with Doclair. No software to install, no account required, and your files never leave your browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Upload your PDF by clicking <strong>Drop your PDF here</strong> or dragging it into the upload area.',
            'Click <strong>Extract Text</strong> to process your PDF. A progress indicator shows the current page being processed.',
            'Download the extracted <strong>.txt file</strong> or click <strong>Copy all text</strong> to copy directly to your clipboard.',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white',
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
              }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }} dangerouslySetInnerHTML={{ __html: step }} />
            </div>
          ))}
        </div>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '28px' }}>
          Extract text from scanned PDFs
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Scanned PDFs contain images of pages, not actual text characters. To extract text from a scanned document, you first need to run optical character recognition (OCR) to add a text layer.{' '}
          <a href="/ocr-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Use the OCR PDF tool</a> first, then come back here to extract the recognised text as a plain .txt file.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Copy text from a PDF to Word or Excel
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Click <strong>Copy all text</strong> in the preview panel, then paste directly into Microsoft Word, Google Docs, Excel, or any other application. The clipboard contains the full plain-text content of your PDF — ready to use immediately.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          PDF to Text on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair runs entirely in your browser, so it works on any mobile device. Open the tool in Safari on iPhone or iPad, or Chrome on Android, select your PDF from Files or Google Drive, and download the extracted text file directly to your device.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
