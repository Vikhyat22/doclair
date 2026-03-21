'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { pdfToWord } from '@/lib/pdf/pdfToWord'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'Will the formatting be preserved?', a: 'Text, basic headings and paragraphs are extracted. Complex layouts, tables and images are not preserved — PDF lacks the semantic data needed for perfect conversion.' },
  { q: 'What if my PDF is scanned?', a: 'Scanned PDFs contain images, not text. Run the OCR PDF tool first to add a searchable text layer, then convert.' },
  { q: 'Are my files uploaded?', a: 'Never. pdfjs-dist and docx both run entirely in your browser. No data leaves your device.' },
  { q: 'What is the output file format?', a: 'A standard .docx file compatible with Microsoft Word, Google Docs, LibreOffice and Pages.' },
  { q: 'Is there a page limit?', a: 'No page limit. Conversion time scales with document length — a 100-page PDF takes a few seconds.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to Word — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.com/pdf-to-word',
      description: 'Convert PDF to editable Word (.docx) document. Text and headings extracted. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Text and heading extraction',
        'No file upload to server',
        'No watermark on output',
        'No sign-up required',
        'Works on mobile',
        'Outputs standard .docx format',
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.com' },
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
    { '@type': 'ListItem', position: 1, name: 'Home',        item: 'https://doclair.com' },
    { '@type': 'ListItem', position: 2, name: 'Tools',       item: 'https://doclair.com/tools' },
    { '@type': 'ListItem', position: 3, name: 'PDF to Word', item: 'https://doclair.com/pdf-to-word' },
  ],
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function PDFToWordPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [progress, setProgress]   = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [result, setResult]       = useState<{ blob: Blob; pageCount: number; wordCount: number; warnings: string[] } | null>(null)

  const addFile = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setToolState('idle')
    setProgress({ current: 0, total: 0 })
  }, [])

  async function handleConvert() {
    if (!file) return
    setToolState('merging')
    setProgress({ current: 0, total: 0 })
    try {
      const res = await pdfToWord(file, (cur: number, tot: number) => setProgress({ current: cur, total: tot }))
      setResult(res)
      setToolState('done')
    } catch (err) {
      setToolState('idle')
      alert('Conversion failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  function handleDownload() {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a   = document.createElement('a')
    a.href = url; a.download = 'doclair-converted.docx'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setToolState('idle')
    setProgress({ current: 0, total: 0 })
  }

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Word to PDF', slug: 'word-to-pdf', icon: '📝', colorBg: '#DCFCE7', desc: 'Convert Word documents to PDF' },
      ]}
      relatedTools={[
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Split PDF',    slug: 'split-pdf',    icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract page ranges' },
        { name: 'Merge PDF',    slug: 'merge-pdf',    icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'PDF to JPG',   slug: 'pdf-to-jpg',   icon: '🖼️', colorBg: '#FFF0DC', desc: 'Export pages as images' },
        { name: 'OCR PDF',      slug: 'ocr-pdf',      icon: '🔍', colorBg: '#DBEAFE', desc: 'Add text layer to scanned PDFs' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="PDF to Word" toolSlug="pdf-to-word" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

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
          <span style={{ color: 'var(--ink)' }}>PDF to Word </span>
          <span style={{ color: 'var(--amber)' }}>Extract Text Instantly</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Convert PDF to editable Word (.docx) document. Text and headings extracted. No upload, no watermark.
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

          {/* Convert button */}
          <button
            onClick={handleConvert}
            style={{
              width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px',
              borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700, fontSize: '17px', border: 'none',
              cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            📝 Convert to Word
          </button>
        </div>
      )}

      {/* State: merging / converting */}
      {toolState === 'merging' && (
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
          }}>Converting PDF to Word…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', marginBottom: '20px',
          }}>
            {progress.total > 0 ? `${progress.current} / ${progress.total} pages` : 'Preparing…'}
          </div>
          {/* Progress bar */}
          <div style={{
            width: '100%', maxWidth: '320px', margin: '0 auto',
            height: '4px', background: 'rgba(255,255,255,0.12)', borderRadius: '100px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--amber)', borderRadius: '100px',
              width: `${progressPct}%`, transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Stats row */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '20px 24px', display: 'flex', gap: '32px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Pages</div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)' }}>{result.pageCount}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Words</div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)' }}>{result.wordCount.toLocaleString()}</div>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div style={{
              background: '#FFFBEB', border: '1px solid var(--amber)', borderRadius: '12px',
              padding: '16px 20px',
            }}>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px',
              }}>// Warnings</div>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {result.warnings.map((w, i) => (
                  <li key={i} style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <DownloadCard
            filename="doclair-converted.docx"
            description={`${result.pageCount} page${result.pageCount !== 1 ? 's' : ''} · ${result.wordCount.toLocaleString()} words`}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Convert PDF to Word Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Converting a PDF to a Word document is instant and free with Doclair. No software to install, no account required, and your files never leave your browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Upload your PDF by clicking <strong>Drop your PDF here</strong> or dragging it into the upload area.',
            'Click <strong>Convert to Word</strong> — Doclair extracts text and headings page by page entirely in your browser.',
            'Download your <strong>.docx file</strong> and open it in Microsoft Word, Google Docs, LibreOffice or Pages.',
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
          How accurate is PDF to Word conversion?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Accuracy depends on the PDF source. Text-based PDFs converted from Word or exported from design tools convert well — text and paragraph structure are preserved faithfully. PDFs with complex multi-column layouts, embedded tables or heavy use of images will lose some formatting, since PDF does not store semantic layout information the way Word does.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          What if my converted document looks wrong?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          If the output is missing text, the PDF may be scanned (image-only). Use the <strong>OCR PDF</strong> tool first to add a searchable text layer, then convert. If the layout looks jumbled, the original PDF used absolute positioning — try copying and reformatting the text manually in Word after conversion.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
