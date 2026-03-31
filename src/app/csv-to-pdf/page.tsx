'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { csvToPDF } from '@/lib/pdf/csvToPdf'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What CSV formats are supported?',
    a: 'Standard comma-separated values (.csv) files. The first row is automatically treated as a header row with dark background and white text.',
  },
  {
    q: 'What is the page orientation?',
    a: 'The PDF is generated in A4 landscape orientation for better horizontal space with many columns.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. CSV parsing and PDF generation run entirely in your browser. Your data never leaves your device.',
  },
  {
    q: 'What if my CSV has many columns?',
    a: 'Column width is distributed evenly across the page. Very long cell values are truncated at 30 characters to fit the layout.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'CSV to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/csv-to-pdf',
      description: 'Convert CSV files to a formatted PDF table with highlighted headers. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'CSV to PDF', item: 'https://doclair.in/csv-to-pdf' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Excel to PDF', slug: 'excel-to-pdf', icon: '📊', colorBg: '#DCFCE7', desc: 'Convert .xlsx to PDF' },
  { name: 'Text to PDF',  slug: 'text-to-pdf',  icon: '📄', colorBg: '#F3F4F6', desc: 'Plain text to PDF' },
  { name: 'PDF to JSON',  slug: 'pdf-to-json',  icon: '{}', colorBg: '#DBEAFE', desc: 'Extract PDF data' },
]

export default function CSVToPDFPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [rowCount, setRowCount]   = useState(0)

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]); setToolState('idle'); setResult(null); setErrorMessage(''); setRowCount(0)
    }
  }, [])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setErrorMessage('')
    try {
      // Count rows for display
      const text = await file.text()
      const rows = text.split('\n').filter(r => r.trim()).length
      setRowCount(rows)

      const out = await csvToPDF(file)
      setResult(out)
      setToolState('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'; setErrorMessage(message)
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.csv$/i, '.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setErrorMessage(''); setToolState('idle'); setRowCount(0)
  }, [])

  return (
    <>
<ToolPageLayout
        toolName="CSV to PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>CSV to PDF </span>
            <span style={{ color: 'var(--amber)' }}>Convert Spreadsheet Data to PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Convert CSV files to a formatted PDF table. Headers highlighted, rows alternating. Free, no upload.
          </p>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".csv" maxFiles={1} maxSizeMB={20} icon="📊" label="Drop your CSV file here" subLabel="or click to browse — up to 20 MB" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📊</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <button onClick={handleConvert} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Convert to PDF →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Converting CSV…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Building PDF table layout</div>
          </div>
        )}

        {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        {toolState === 'done' && result && file && (
          <DownloadCard
            filename={file.name.replace(/\.csv$/i, '.pdf')}
            description={`${rowCount > 0 ? `${rowCount} rows` : 'Table'} converted to PDF`}
            onDownload={handleDownload}
            onReset={handleReset}
            title="CSV converted to PDF!"
            resetLabel="Convert another →"
            nextSteps={[
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
              { slug: 'add-watermark', name: 'Add Watermark', icon: '💧' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Convert CSV to PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Sharing a CSV as a PDF makes it easy to read and print without requiring a spreadsheet app. Doclair converts CSV files into a clean, formatted PDF table in your browser.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your CSV file or click to upload.</strong> Standard comma-separated files are supported.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair parses the file and shows a preview of the data.</strong> Headers are detected automatically.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Optionally adjust column widths or font size.</strong> Fine-tune the layout before exporting.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Save as PDF — your browser&apos;s print dialog opens.</strong> Select &apos;Save as PDF&apos; and download.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            Will my column headers be preserved?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Yes. The first row of the CSV is treated as headers and formatted in bold. All other rows are displayed as table rows with alternating background colours for readability.
          </p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            CSV to PDF on iPhone and Android
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
            Doclair works in mobile Safari and Chrome. Upload your CSV from the Files app. When you click Save as PDF, use your browser&apos;s share → Print → Save to Files flow to download the PDF.
          </p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
