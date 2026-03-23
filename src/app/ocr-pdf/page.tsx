'use client'

import { useState, useCallback, useRef } from 'react'
import { ocrPDF, OCR_LANGUAGES, OcrOutputMode, OcrResult } from '@/lib/ocr/tesseract'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  {
    q: 'How accurate is the text recognition?',
    a: 'Accuracy depends on scan quality. For clean, high-resolution scans of printed text, Tesseract typically achieves 95%+ accuracy. Handwriting, low-resolution scans, or unusual fonts reduce accuracy.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'Never. Tesseract.js runs entirely in your browser using WebAssembly. Your PDF never leaves your device.',
  },
  {
    q: 'What languages does OCR support?',
    a: 'Doclair supports 27+ languages including all major Indian languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi and Urdu — plus English, Chinese, Arabic, French, German, Japanese and more.',
  },
  {
    q: 'Will OCR change the visual appearance of the PDF?',
    a: 'No. In searchable PDF mode, the original page images are preserved exactly. The recognised text is added as an invisible layer underneath — invisible to the eye but selectable and searchable.',
  },
  {
    q: 'What DPI gives best OCR results?',
    a: '300 DPI is the sweet spot for OCR. Doclair renders pages at 2× scale (approximately 144 DPI equivalent) which balances speed and accuracy. For very small text, try scanning at 400+ DPI before converting to PDF.',
  },
  {
    q: 'Can OCR read handwritten text?',
    a: 'Tesseract has limited handwriting support. Printed text is recognised well. For handwriting, accuracy varies significantly — clear, neat handwriting works better than cursive.',
  },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'OCR PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/ocr-pdf',
      description: 'Extract text from scanned PDFs and image-based documents. Download as searchable PDF or plain text. Powered by Tesseract.js — runs in your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Searchable PDF output',
        'Plain text extraction',
        '27+ languages including all major Indian languages',
        'No file upload to server',
        'No watermark on output',
        'No sign-up required',
        'Powered by Tesseract.js WebAssembly',
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
    { '@type': 'ListItem', position: 1, name: 'Home',   item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',  item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'OCR PDF', item: 'https://doclair.in/ocr-pdf' },
  ],
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

const INDIAN_LANGUAGES = OCR_LANGUAGES.slice(0, 10)
const OTHER_LANGUAGES  = OCR_LANGUAGES.slice(10)

export default function OcrPDFPage() {
  const [file, setFile]               = useState<File | null>(null)
  const [language, setLanguage]       = useState<string>('eng')
  const [outputMode, setOutputMode]   = useState<OcrOutputMode>('searchable-pdf')
  const [toolState, setToolState]     = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [result, setResult]           = useState<OcrResult | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [totalPages, setTotalPages]   = useState<number>(0)
  const [statusLabel, setStatusLabel] = useState<string>('')
  const [errorMsg, setErrorMsg]       = useState<string>('')
  const downloadUrlRef                = useRef<string | null>(null)

  const addFile = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setToolState('idle')
    setErrorMsg('')
  }, [])

  async function handleStartOcr() {
    if (!file) return
    setToolState('processing')
    setCurrentPage(0)
    setTotalPages(0)
    setStatusLabel('Starting…')
    try {
      const res = await ocrPDF(file, language, outputMode, (page, total, status) => {
        setCurrentPage(page)
        setTotalPages(total)
        setStatusLabel(status)
      })
      setResult(res)
      setToolState('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'OCR failed. Please try again.')
      setToolState('error')
    }
  }

  function handleDownload() {
    if (!result) return
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
    const url = URL.createObjectURL(result.blob)
    downloadUrlRef.current = url
    const a = document.createElement('a')
    a.href = url
    a.download = outputMode === 'searchable-pdf'
      ? file!.name
      : file!.name.replace(/\.pdf$/i, '.txt')
    a.click()
    setTimeout(() => {
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
      downloadUrlRef.current = null
    }, 5000)
  }

  function handleReset() {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current)
      downloadUrlRef.current = null
    }
    setFile(null)
    setLanguage('eng')
    setOutputMode('searchable-pdf')
    setToolState('idle')
    setResult(null)
    setCurrentPage(0)
    setTotalPages(0)
    setStatusLabel('')
    setErrorMsg('')
  }

  const progressPct = totalPages > 0 ? (currentPage / totalPages) * 100 : 0
  const downloadFilename = result
    ? (outputMode === 'searchable-pdf' ? file!.name : file!.name.replace(/\.pdf$/i, '.txt'))
    : ''
  const downloadDescription = result
    ? (outputMode === 'searchable-pdf'
        ? `${result.pageCount} pages · searchable text`
        : `${result.pageCount} pages · ${result.textLength.toLocaleString()} characters`)
    : ''

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'PDF to Word', slug: 'pdf-to-word', icon: '📝', colorBg: '#DCFCE7', desc: 'Convert PDF to editable Word' },
        { name: 'Extract Text', slug: 'pdf-to-text', icon: '📄', colorBg: '#DCFCE7', desc: 'Extract plain text from PDF' },
      ]}
      relatedTools={[
        { name: 'Compress PDF',  slug: 'compress-pdf',  icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Split PDF',     slug: 'split-pdf',     icon: '✂️', colorBg: '#DCFCE7', desc: 'Extract page ranges' },
        { name: 'Chat with PDF', slug: 'chat-with-pdf', icon: '💬', colorBg: '#DBEAFE', desc: 'Ask questions about your PDF' },
        { name: 'AI Summarizer', slug: 'ai-summarizer', icon: '🤖', colorBg: '#EDE9FE', desc: 'Summarise any document' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="OCR PDF" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🤖 AI-Powered</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>OCR PDF </span>
          <span style={{ color: 'var(--amber)' }}>Make Scanned PDFs Searchable</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Extract text from scanned PDFs and image-based documents. Download as searchable PDF or plain text. Powered by Tesseract.js — runs in your browser.
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
          {/* File row */}
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

          {/* Language selector */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px',
            }}>// Language</div>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                width: '100%', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '10px 12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontSize: '14px', color: 'var(--ink)', background: 'white',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <optgroup label="Indian Languages">
                {INDIAN_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </optgroup>
              <optgroup label="Other Languages">
                {OTHER_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Output mode */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px',
            }}>// Output Format</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {([
                { value: 'searchable-pdf' as OcrOutputMode, label: 'Searchable PDF', desc: 'Original PDF with selectable, copyable text' },
                { value: 'text-file' as OcrOutputMode, label: 'Extract as Text', desc: 'Plain .txt file with all recognised text' },
              ]).map(opt => {
                const selected = outputMode === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setOutputMode(opt.value)}
                    style={{
                      flex: 1, minWidth: '180px', padding: '14px 16px', borderRadius: '100px',
                      border: `1px solid ${selected ? 'var(--amber)' : 'var(--border)'}`,
                      background: selected ? 'var(--amber)' : 'transparent',
                      color: selected ? 'white' : 'var(--ink)',
                      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (!selected) {
                        e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                        e.currentTarget.style.background = 'rgba(26,22,18,0.03)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!selected) {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px', fontWeight: 400 }}>{opt.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info box */}
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px',
            padding: '14px 16px',
          }}>
            <p style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.65, margin: 0 }}>
              OCR processing time depends on document length. A 10-page scanned PDF typically takes 30–60 seconds. Keep this tab open until complete.
            </p>
          </div>

          {/* Start OCR button */}
          <button
            onClick={handleStartOcr}
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
            🔍 Start OCR
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
            fontSize: '24px', color: 'white', marginBottom: '6px',
          }}>
            {statusLabel || 'Processing…'}
          </div>
          {/* Progress bar */}
          <div style={{
            width: '100%', maxWidth: '360px', margin: '20px auto 12px',
            height: '6px', borderRadius: '100px',
            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '100px',
              background: 'var(--amber)',
              width: `${progressPct}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>
            {totalPages > 0
              ? `Processing page ${currentPage} of ${totalPages}`
              : 'Loading OCR engine…'}
          </div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DownloadCard
            filename={downloadFilename}
            description={downloadDescription}
            onDownload={handleDownload}
            onReset={handleReset}
          />

          {/* Next steps */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {outputMode === 'searchable-pdf' && (
              <a
                href="/pdf-to-word"
                style={{
                  flex: 1, minWidth: '180px', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  textDecoration: 'none', color: 'var(--ink)', background: 'white',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
              >
                <span style={{ fontSize: '22px' }}>📝</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Convert to Word</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Export as editable .docx</div>
                </div>
              </a>
            )}
            <a
              href="/compress-pdf"
              style={{
                flex: 1, minWidth: '180px', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                textDecoration: 'none', color: 'var(--ink)', background: 'white',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
            >
              <span style={{ fontSize: '22px' }}>📦</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Compress PDF</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>OCR adds file size</div>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* State: error */}
      {toolState === 'error' && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: '6px', fontSize: '15px' }}>OCR Failed</div>
          <div style={{ fontSize: '13px', color: 'var(--red)', opacity: 0.8 }}>{errorMsg}</div>
          <button
            onClick={handleReset}
            style={{
              marginTop: '16px', background: 'none', border: '1px solid var(--red)',
              borderRadius: '100px', padding: '8px 20px', cursor: 'pointer',
              color: 'var(--red)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to OCR a PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Make any scanned PDF searchable in three easy steps — no software, no account, no upload.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Upload your scanned PDF by clicking <strong>Drop your PDF here</strong> or dragging it into the upload area.',
            'Choose your <strong>document language</strong> and the <strong>output format</strong> — Searchable PDF or plain text file.',
            'Click <strong>Start OCR</strong> and wait while Tesseract.js processes each page. Download your file when complete.',
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
          What is OCR and when do you need it?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          OCR (Optical Character Recognition) converts images of text into machine-readable text. Scanned PDFs, photographed documents, and image-based PDFs contain no selectable text — they are essentially pictures of pages. OCR analyses the visual patterns in these images and reconstructs the underlying text layer, making documents searchable, copyable, and accessible to screen readers and AI tools.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Tips for best OCR accuracy
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Scan at a minimum of 300 DPI — this is the industry standard for reliable text recognition. Use good, even lighting when photographing documents; shadows and uneven exposure significantly reduce accuracy. Select the correct language for your document — OCR engines use language-specific dictionaries to improve recognition. Avoid highly compressed JPEGs, which introduce artefacts around text edges.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          OCR PDF in Indian languages
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair&apos;s OCR tool fully supports all major Indian languages. Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, and Urdu are all available from the language selector. Simply choose your language before starting OCR for best results with Devanagari, Tamil, Telugu, and other Indian scripts.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
