'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { parseExcelFile, type SheetData } from '@/lib/pdf/excelToPdf'

const FAQS = [
  {
    q: 'Which Excel formats are supported?',
    a: '.xlsx, .xls, and .xlsm files are supported. The spreadsheet is parsed using SheetJS and rendered as an HTML table for print.',
  },
  {
    q: 'What happens with multiple sheets?',
    a: 'Each sheet is shown as a separate tab. You can preview each sheet and print any single sheet as PDF.',
  },
  {
    q: 'How does the PDF export work?',
    a: 'Clicking "Save as PDF" opens your browser\'s print dialog. Select "Save as PDF" as the destination. The table is formatted for A4/Letter landscape.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. Excel parsing runs entirely in your browser using SheetJS. Your spreadsheet never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Excel to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/excel-to-pdf',
      description: 'Convert .xlsx and .xls spreadsheets to PDF. Each sheet becomes a section. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'Excel to PDF', item: 'https://doclair.in/excel-to-pdf' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'CSV to PDF',    slug: 'csv-to-pdf',    icon: '📊', colorBg: '#DCFCE7', desc: 'Convert CSV to PDF' },
  { name: 'Word to PDF',   slug: 'word-to-pdf',   icon: '📝', colorBg: '#EDE9FE', desc: 'Convert .docx to PDF' },
  { name: 'PDF to JSON',   slug: 'pdf-to-json',   icon: '{}', colorBg: '#DBEAFE', desc: 'Extract PDF data' },
]

const PRINT_STYLES = `
  @page { size: A4 landscape; margin: 0.5in; }
  body { font-family: Arial, sans-serif; font-size: 9pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ccc; padding: 3pt 5pt; text-align: left; }
  tr:first-child td, tr:first-child th { background: #1a1612; color: white; font-weight: bold; }
  tr:nth-child(even) { background: #f9f6f2; }
`

export default function ExcelToPDFPage() {
  const [sheets, setSheets]           = useState<SheetData[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [fileName, setFileName]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [parseError, setParseError]   = useState('')

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFileName(f.name)
    setLoading(true)
    setParseError('')
    try {
      const buf  = await f.arrayBuffer()
      const data = parseExcelFile(buf)
      setSheets(data)
      setActiveSheet(0)
    } catch (err) {
      console.error(err)
      setParseError(err instanceof Error ? err.message : 'Failed to parse spreadsheet — make sure it is a valid .xlsx or .xls file')
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePrint = useCallback(() => {
    const sheet = sheets[activeSheet]
    if (!sheet) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${sheet.name}</title>
<style>${PRINT_STYLES}</style>
</head><body>${sheet.html}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
  }, [sheets, activeSheet])

  const handleReset = useCallback(() => {
    setSheets([]); setFileName(''); setActiveSheet(0)
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Excel to PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Excel to PDF </span>
            <span style={{ color: 'var(--amber)' }}>Convert Spreadsheets to PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Convert .xlsx and .xls spreadsheets to PDF. Each sheet becomes a section. Free, no upload.
          </p>
        </div>

        {sheets.length === 0 && !loading && (
          <DropZone onFilesAdded={handleFiles} accept=".xlsx,.xls,.xlsm" maxFiles={1} maxSizeMB={50} icon="📊" label="Drop your Excel file here" subLabel="or click to browse — .xlsx, .xls, .xlsm" currentCount={0} />
        )}

        {parseError && (
          <div style={{ color: '#DC2626', fontSize: '13px', padding: '14px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px' }}>{parseError}</div>
        )}

        {loading && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)' }}>Parsing spreadsheet…</div>
          </div>
        )}

        {sheets.length > 0 && (
          <>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              {/* File name + action */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '14px' }}>📊 {fileName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handlePrint} style={{ background: 'var(--ink)', color: 'white', padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                    Save as PDF →
                  </button>
                  <button onClick={handleReset} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 16px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer' }}>
                    Change file
                  </button>
                </div>
              </div>

              {/* Sheet tabs */}
              {sheets.length > 1 && (
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
                  {sheets.map((s, i) => (
                    <button key={i} onClick={() => setActiveSheet(i)} style={{
                      padding: '10px 20px', fontSize: '13px', border: 'none', borderBottom: i === activeSheet ? '2px solid var(--amber)' : '2px solid transparent',
                      background: i === activeSheet ? '#FFF8F0' : 'white', color: i === activeSheet ? 'var(--amber)' : 'var(--muted)', cursor: 'pointer', fontWeight: i === activeSheet ? 600 : 400, whiteSpace: 'nowrap',
                    }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Preview */}
              <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                <div
                  dangerouslySetInnerHTML={{ __html: sheets[activeSheet]?.html ?? '' }}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#92400E' }}>
              <strong>📄 How to save as PDF:</strong> Click &quot;Save as PDF&quot; → browser print dialog opens → select &quot;Save as PDF&quot; as the destination.
            </div>
          </>
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>

      <style>{`
        #sheet { width: 100%; border-collapse: collapse; }
        #sheet td, #sheet th { border: 1px solid #E5E7EB; padding: 6px 10px; font-size: 12px; }
        #sheet tr:first-child td, #sheet tr:first-child th { background: #1a1612; color: white; font-weight: 600; }
        #sheet tr:nth-child(even) { background: #F9FAFB; }
      `}</style>
    </>
  )
}
