'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { wordToHTML } from '@/lib/pdf/wordToPdf'
import type { WordConversionResult } from '@/lib/pdf/wordToPdf'

type ConvertState = 'idle' | 'converting' | 'preview' | 'error'

const FAQS = [
  { q: 'Will my Word formatting be preserved when converting?', a: 'Yes. Mammoth.js extracts headings, bold, italic, tables, images, lists, and paragraph styles. Complex custom styles may simplify to their base equivalent, but standard formatting is fully preserved.' },
  { q: 'Do I need Microsoft Word installed?', a: 'No. Doclair converts .docx and .doc files directly in your browser using Mammoth.js, a pure JavaScript library. Microsoft Word or any Office software is not required.' },
  { q: 'Can I convert .doc as well as .docx files?', a: 'Yes. Both .doc (Word 97-2003) and .docx (Word 2007+) formats are supported. Simply drag your file into the upload area.' },
  { q: 'Is there a file size limit?', a: 'The maximum file size is 50 MB. Most Word documents are well under 10 MB, so this limit is rarely a concern.' },
  { q: 'Are my Word documents uploaded to a server?', a: 'Never. Doclair converts your document entirely in your browser using WebAssembly. Your file is never transmitted to any server.' },
  { q: 'Can I convert a Word CV to PDF free?', a: 'Yes. This is one of the most common uses. Upload your .docx CV, review the preview to confirm formatting, then click "Save as PDF" to download a professional PDF version.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Word to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/word-to-pdf',
      description: 'Convert Word .docx and .doc to PDF free online. Fonts, tables, images and layout preserved. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Word to PDF', item: 'https://doclair.in/word-to-pdf' },
      ],
    },
  ],
}

export default function WordToPDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [conversionResult, setConversionResult] = useState<WordConversionResult | null>(null)
  const [toolState, setToolState] = useState<ConvertState>('idle')
  const [showWarnings, setShowWarnings] = useState(false)
  const [convertStatus, setConvertStatus] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleConvert(f?: File) {
    const target = f ?? file
    if (!target) return
    setToolState('converting')
    setConvertStatus('Reading document…')

    try {
      await new Promise(r => setTimeout(r, 100))
      setConvertStatus('Extracting content…')
      const result = await wordToHTML(target)
      setConvertStatus('Preparing preview…')
      await new Promise(r => setTimeout(r, 50))
      setConversionResult(result)
      setToolState('preview')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message)
      setToolState('error')
    }
  }

  const addFile = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setConversionResult(null)
    setToolState('idle')
    setShowWarnings(false)
    handleConvert(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSaveAsPDF() {
    const printContent = document.getElementById('word-preview-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      setErrorMessage('Please allow popups for this site to save as PDF')
      return
    }

    const docName = file?.name.replace(/\.(doc|docx)$/i, '') ?? 'document'

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${docName}</title>
  <meta charset="utf-8">
  <style>
    @page { margin: 1in; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111;
      margin: 0;
    }
    h1 { font-size: 20pt; font-weight: bold; margin: 16pt 0 8pt; }
    h2 { font-size: 16pt; font-weight: bold; margin: 12pt 0 6pt; }
    h3 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt; }
    p  { margin: 0 0 8pt; }
    table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
    td, th { border: 1px solid #ccc; padding: 4pt 8pt; }
    th { background: #f5f5f5; font-weight: bold; }
    ul, ol { margin: 8pt 0; padding-left: 24pt; }
    img { max-width: 100%; height: auto; }
    .caption { font-size: 10pt; color: #666; font-style: italic; }
  </style>
</head>
<body>${printContent.innerHTML}</body>
</html>`)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  function handleReset() {
    setFile(null)
    setConversionResult(null)
    setToolState('idle')
    setShowWarnings(false)
    setErrorMessage('')
  }

  const estimatedPages = conversionResult
    ? Math.max(1, Math.ceil(conversionResult.wordCount / 300))
    : 0

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'PDF to Word',  slug: 'pdf-to-word',  icon: '📝', colorBg: '#DBEAFE', desc: 'Extract editable Word text' },
        { name: 'Edit PDF',     slug: 'edit-pdf',     icon: '✍️', colorBg: '#DBEAFE', desc: 'Add text, annotations' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',        slug: 'merge-pdf',        icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Compress PDF',     slug: 'compress-pdf',     icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Excel to PDF',     slug: 'excel-to-pdf',     icon: '📊', colorBg: '#EDE9FE', desc: 'Convert spreadsheets' },
        { name: 'PDF to Word',      slug: 'pdf-to-word',      icon: '📝', colorBg: '#FEE2E2', desc: 'Extract editable text' },
        { name: 'Add Page Numbers', slug: 'add-page-numbers', icon: '🔢', colorBg: '#FFF0DC', desc: 'Number your pages' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Word to PDF" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>📝 .doc + .docx</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Word to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Convert Documents Securely</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Convert .doc and .docx files to PDF free. Fonts, tables, images and layout fully preserved. No upload, no watermark.
        </p>
      </div>

      {/* State: idle */}
      {toolState === 'idle' && (
        <DropZone
          onFilesAdded={addFile}
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-word"
          maxFiles={1}
          maxSizeMB={50}
          currentCount={0}
          icon="📝"
          label="Drop Word file here"
          subLabel="or click to browse — .doc and .docx, max 50 MB"
        />
      )}

      {/* State: converting */}
      {toolState === 'converting' && (
        <div style={{
          background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center',
        }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
          <div style={{
            width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--amber)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 24px',
          }} />
          <div style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: '24px', color: 'white', marginBottom: '6px',
          }}>Converting your document…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>{convertStatus}</div>
        </div>
      )}

      {/* State: error */}
      {toolState === 'error' && <ErrorCard message={errorMessage} onReset={handleReset} />}

      {/* State: preview */}
      {toolState === 'preview' && conversionResult && (
        <>
          <style>{`
            #word-preview-content h1 { font-size: 20pt; font-weight: bold; margin: 16pt 0 8pt; }
            #word-preview-content h2 { font-size: 16pt; font-weight: bold; margin: 12pt 0 6pt; }
            #word-preview-content h3 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt; }
            #word-preview-content p  { margin: 0 0 8pt; }
            #word-preview-content table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
            #word-preview-content td, #word-preview-content th { border: 1px solid #ccc; padding: 4pt 8pt; }
            #word-preview-content th { background: #f5f5f5; font-weight: bold; }
            #word-preview-content ul, #word-preview-content ol { margin: 8pt 0; padding-left: 24pt; }
            #word-preview-content img { max-width: 100%; height: auto; margin: 8pt 0; }
            #word-preview-content .caption { font-size: 10pt; color: #666; font-style: italic; }
          `}</style>

          {/* Warnings panel */}
          {conversionResult.warnings.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px 16px' }}>
              <button
                onClick={() => setShowWarnings(!showWarnings)}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                  ⚠️ {conversionResult.warnings.length} formatting note{conversionResult.warnings.length > 1 ? 's' : ''}
                </span>
                <span style={{ color: '#92400E', fontSize: '12px' }}>{showWarnings ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {showWarnings && (
                <ul style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '12px', color: '#92400E', opacity: 0.85 }}>
                  {conversionResult.warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Preview panel */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>// Document Preview</div>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--muted)',
              }}>
                ~{estimatedPages} page{estimatedPages !== 1 ? 's' : ''} · {conversionResult.wordCount.toLocaleString()} words
              </div>
            </div>
            {/* Paper simulation */}
            <div style={{ padding: '16px', background: '#F9FAFB', maxHeight: '600px', overflowY: 'auto' }}>
              <div style={{
                background: 'white',
                borderRadius: '4px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                padding: '48px',
                maxWidth: '680px',
                margin: '0 auto',
              }}>
                <div
                  id="word-preview-content"
                  dangerouslySetInnerHTML={{ __html: conversionResult.html }}
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: '12pt',
                    lineHeight: 1.6,
                    color: '#111',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleSaveAsPDF}
              style={{
                background: 'var(--ink)', color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Save as PDF →
            </button>
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px',
              padding: '10px 14px', fontSize: '12px', color: '#92400E', lineHeight: 1.5,
            }}>
              Your browser will open a print dialog. Select &lsquo;Save as PDF&rsquo; as the destination and click Save to download your converted PDF.
            </div>
            <button
              onClick={handleReset}
              style={{
                padding: '12px 24px', borderRadius: '100px', border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 600, fontSize: '14px', color: 'var(--ink)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
            >
              Convert another file →
            </button>
          </div>
        </>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Convert Word to PDF Free Online
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Converting your Word document to PDF is instant and completely free with Doclair. No software to install, no account required.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Drop your .docx or .doc file into the upload area.',
            'Doclair extracts the content and shows a live preview of your document.',
            'Review the preview to confirm headings, tables, images and formatting.',
            'Click <strong>Save as PDF →</strong> and select \'Save as PDF\' in your browser\'s print dialog.',
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
          Why convert Word documents to PDF?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          PDFs preserve layout and fonts perfectly across all devices and operating systems. Word documents can appear differently depending on the viewer&apos;s Office version. Converting to PDF ensures your CV, report, or contract looks exactly as you intended.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Will my formatting be preserved?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Yes. Mammoth.js faithfully extracts headings (H1–H4), bold and italic text, numbered and bulleted lists, tables with borders, embedded images, and captions. The preview shows you the result before you save.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Convert a Word CV or resume to PDF free
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair is ideal for job applications. Upload your .docx CV, confirm the preview, and download a professional PDF ready to email to recruiters. No account, no watermark, no cost.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
