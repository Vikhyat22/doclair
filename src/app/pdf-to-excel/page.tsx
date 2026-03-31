'use client'

import { useCallback, useState } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { pdfToExcel, type PDFToExcelResult } from '@/lib/pdf/pdfToExcel'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'How accurate is the Excel conversion?',
    a: 'It works best on digital PDFs that already contain a readable text layer. Doclair uses text position heuristics to split lines into cells, so straightforward tables convert well, while complex layouts may still need cleanup in Excel.',
  },
  {
    q: 'Does it work on scanned PDFs?',
    a: 'Scanned PDFs need OCR first. Run OCR PDF to add a text layer, then use PDF to Excel for better results.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. Extraction runs entirely in your browser using PDF.js and SheetJS. Your PDF never leaves your device.',
  },
  {
    q: 'What happens if my PDF has multiple tables or pages?',
    a: 'Each PDF page is exported as its own worksheet in the XLSX file so you can review and clean up the extracted rows page by page.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF to Excel — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-to-excel',
      description: 'Extract PDF tables and row-based text into an editable Excel XLSX file. Free, browser-based, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'PDF to Excel', item: 'https://doclair.in/pdf-to-excel' },
      ],
    },
  ],
}

const SIDEBAR_REVERSE = [
  { name: 'Excel to PDF', slug: 'excel-to-pdf', icon: '📊', colorBg: '#D1FAE5', desc: 'Turn sheets back into PDF' },
]

const SIDEBAR_RELATED = [
  { name: 'PDF to HTML', slug: 'pdf-to-html', icon: '🌐', colorBg: '#D1FAE5', desc: 'Convert extracted text to HTML' },
  { name: 'PDF to JSON', slug: 'pdf-to-json', icon: '{}', colorBg: '#D1FAE5', desc: 'Get structured page data' },
  { name: 'PDF to Text', slug: 'pdf-to-text', icon: '📝', colorBg: '#D1FAE5', desc: 'Extract plain text only' },
  { name: 'OCR PDF', slug: 'ocr-pdf', icon: '🔍', colorBg: '#EDE9FE', desc: 'Make scanned PDFs searchable' },
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

export default function PDFToExcelPage() {
  const [file, setFile] = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult] = useState<PDFToExcelResult | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [activeSheet, setActiveSheet] = useState(0)

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setFile(files[0])
    setToolState('idle')
    setResult(null)
    setError('')
    setProgress({ current: 0, total: 0 })
    setActiveSheet(0)
  }, [])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    setResult(null)
    setActiveSheet(0)
    try {
      const converted = await pdfToExcel(file, (current, total) => setProgress({ current, total }))
      setResult(converted)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to Excel')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.pdf$/i, '.xlsx')
    a.click()
    URL.revokeObjectURL(url)
  }, [file, result])

  const handleReset = useCallback(() => {
    setFile(null)
    setToolState('idle')
    setResult(null)
    setError('')
    setProgress({ current: 0, total: 0 })
    setActiveSheet(0)
  }, [])

  const visibleProgress = progress.total > 0 ? Math.min(progress.total, Math.max(progress.current, 1)) : 0
  const activePreview = result?.sheets[activeSheet]

  return (
    <>
<ToolPageLayout
        toolName="PDF to Excel"
        sidebar={
          <ToolSidebar
            reverseActions={SIDEBAR_REVERSE}
            relatedTools={SIDEBAR_RELATED}
            blogPost={{ slug: 'how-to-convert-pdf-to-excel', title: 'How to Convert PDF to Excel Free' }}
          />
        }
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>PDF to Excel </span>
            <span style={{ color: 'var(--amber)' }}>Extract Tables to XLSX</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '680px', marginBottom: '16px' }}>
            Convert PDF pages into editable Excel worksheets. Best for reports, statements, and row-based tables. Free, browser-based, no upload.
          </p>
        </div>

        {!file && (
          <DropZone
            onFilesAdded={handleFiles}
            accept=".pdf"
            maxFiles={1}
            maxSizeMB={200}
            icon="📊"
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
              Extract to Excel →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Extracting rows and columns…</div>
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
                statCard('Sheets', result.sheets.length),
                statCard('Rows', result.rowCount.toLocaleString()),
              ]}
            </div>

            {result.warnings.length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#92400E', lineHeight: 1.65 }}>
                <strong>Review before sharing:</strong>
                <div style={{ marginTop: '6px' }}>{result.warnings.join(' ')}</div>
              </div>
            )}

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '14px' }}>📊 {file.name.replace(/\.pdf$/i, '.xlsx')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{result.sheets.length} worksheet{result.sheets.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={handleDownload} style={{ background: 'var(--ink)', color: 'white', padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                    Download .xlsx
                  </button>
                  <button onClick={handleReset} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 16px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer' }}>
                    Convert another PDF
                  </button>
                </div>
              </div>

              {result.sheets.length > 1 && (
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
                  {result.sheets.map((sheet, index) => (
                    <button
                      key={sheet.name}
                      onClick={() => setActiveSheet(index)}
                      style={{
                        padding: '10px 20px',
                        fontSize: '13px',
                        border: 'none',
                        borderBottom: index === activeSheet ? '2px solid var(--amber)' : '2px solid transparent',
                        background: index === activeSheet ? '#FFF8F0' : 'white',
                        color: index === activeSheet ? 'var(--amber)' : 'var(--muted)',
                        cursor: 'pointer',
                        fontWeight: index === activeSheet ? 600 : 400,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#FAFAFA', fontSize: '12px', color: 'var(--muted)' }}>
                Previewing {activePreview?.rows.length ?? 0} extracted row{activePreview && activePreview.rows.length !== 1 ? 's' : ''} from {activePreview?.name ?? 'worksheet'}
              </div>

              <div className="pdf-to-excel-preview" style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: activePreview?.html ?? '' }} />
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
              <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
                How PDF to Excel Works
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
                Doclair extracts each page&apos;s text layer, groups nearby words into rows, then splits wide gaps into separate cells. Each PDF page is exported as a worksheet so you can quickly fix edge cases in Excel without losing the original page order.
              </p>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> The file stays in your browser tab.</li>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair reads the text positions page by page.</strong> Progress updates show which page is being processed.</li>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Review the worksheet preview.</strong> Each page becomes a separate sheet in the output file.</li>
                <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the XLSX file and clean up anything complex in Excel.</strong></li>
              </ol>
              <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Best PDFs for this converter</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
                Financial statements, invoices, schedules, government tables, and reports with selectable text usually convert well. Scans, merged cells, and highly designed layouts may need OCR or manual cleanup afterward.
              </p>
              <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>PDF to Excel on mobile</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
                Doclair works in Safari and Chrome on phones too, but large spreadsheets are easier to review on desktop once the XLSX file has been downloaded.
              </p>
            </div>
          </>
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>

      <style>{`
        .pdf-to-excel-preview table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
          background: white;
        }
        .pdf-to-excel-preview td,
        .pdf-to-excel-preview th {
          border: 1px solid #E5E7EB;
          padding: 8px 10px;
          font-size: 12px;
          color: var(--ink);
          text-align: left;
          vertical-align: top;
        }
        .pdf-to-excel-preview tr:first-child td,
        .pdf-to-excel-preview tr:first-child th {
          background: #1a1612;
          color: white;
          font-weight: 600;
        }
        .pdf-to-excel-preview tr:nth-child(even) td {
          background: #F9FAFB;
        }
      `}</style>
    </>
  )
}
