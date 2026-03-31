'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'Can I insert only specific pages from the source PDF?', a: 'Yes. Use the "Pages to insert" field with a range like "1-3, 5, 7" to choose exactly which pages from the source PDF to insert.' },
  { q: 'Where will the pages be inserted?', a: 'After the page number you specify in "Insert after page". Set it to 0 to insert at the beginning, or to the last page number to append at the end.' },
  { q: 'Are my files uploaded to a server?', a: 'Never. Both PDFs are processed using pdf-lib running directly in your browser. No data is sent anywhere.' },
  { q: 'Is there a page or file size limit?', a: 'No limit. Processing happens entirely in your browser.' },
  { q: 'Can I insert pages from multiple PDFs?', a: 'One source PDF per operation. Run the tool again on the result to insert from a second source.' },
  { q: 'Can I reorder the inserted pages?', a: 'The pages are inserted in the order they appear in the source PDF (or the range you specified). Use the Organize Pages tool to reorder afterwards.' },
]

const TOOL_SEO_NAME = 'Add Pages to PDF'
const TOOL_SLUG = 'add-pages-to-pdf'
const TOOL_DESCRIPTION = 'Insert pages from another PDF into your document at any position. Pick a page range, choose where to insert. 100% free, no upload, no watermark.'

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: `${TOOL_SEO_NAME} — Doclair`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: `https://doclair.in/${TOOL_SLUG}`,
      description: TOOL_DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Insert pages from a second PDF at any position',
        'Page range selection (e.g. 1-3, 5)',
        'Browser-only processing',
        'No watermark',
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: TOOL_SEO_NAME, item: `https://doclair.in/${TOOL_SLUG}` },
  ],
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

function parsePageRange(input: string, total: number): number[] | null {
  const indices: number[] = []
  const parts = input.split(',').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(s => parseInt(s.trim()))
      if (isNaN(a) || isNaN(b) || a < 1 || b > total || a > b) return null
      for (let i = a; i <= b; i++) indices.push(i - 1) // 0-based
    } else {
      const n = parseInt(part)
      if (isNaN(n) || n < 1 || n > total) return null
      indices.push(n - 1)
    }
  }
  return indices.length > 0 ? indices : null
}

export default function AddPagesToPDFPage() {
  const [baseFile, setBaseFile]       = useState<File | null>(null)
  const [basePages, setBasePages]     = useState(0)
  const [sourceFile, setSourceFile]   = useState<File | null>(null)
  const [sourcePages, setSourcePages] = useState(0)
  const [insertAfter, setInsertAfter] = useState(0)
  const [pageRange, setPageRange]     = useState('')
  const [rangeError, setRangeError]   = useState('')
  const [toolState, setToolState]     = useState<ToolState>('idle')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [resultPageCount, setResultPageCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const addBase = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return
    setResultBytes(null); setToolState('idle')
    const { PDFDocument } = await import('@cantoo/pdf-lib')
    const doc = await PDFDocument.load(await f.arrayBuffer())
    setBaseFile(f); setBasePages(doc.getPageCount()); setInsertAfter(doc.getPageCount())
  }, [])

  const addSource = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return
    const { PDFDocument } = await import('@cantoo/pdf-lib')
    const doc = await PDFDocument.load(await f.arrayBuffer())
    setSourceFile(f); setSourcePages(doc.getPageCount()); setPageRange(''); setRangeError('')
  }, [])

  function validateRange(val: string): boolean {
    if (!val.trim()) { setRangeError(''); return true }
    const indices = parsePageRange(val, sourcePages)
    if (!indices) { setRangeError(`Invalid range — use numbers 1–${sourcePages}, e.g. "1-3, 5"`); return false }
    setRangeError(''); return true
  }

  async function handleInsert() {
    if (!baseFile || !sourceFile) return
    let sourceIndices: number[]
    if (pageRange.trim()) {
      const parsed = parsePageRange(pageRange, sourcePages)
      if (!parsed) { setRangeError(`Invalid range — use numbers 1–${sourcePages}`); return }
      sourceIndices = parsed
    } else {
      sourceIndices = Array.from({ length: sourcePages }, (_, i) => i)
    }

    setToolState('merging')
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const [baseDoc, srcDoc] = await Promise.all([
        PDFDocument.load(await baseFile.arrayBuffer()),
        PDFDocument.load(await sourceFile.arrayBuffer()),
      ])

      const copiedPages = await baseDoc.copyPages(srcDoc, sourceIndices)
      const insertAt = Math.min(Math.max(insertAfter, 0), baseDoc.getPageCount())

      copiedPages.forEach((page, idx) => {
        baseDoc.insertPage(insertAt + idx, page)
      })

      const saved = await baseDoc.save()
      setResultBytes(saved)
      setResultPageCount(baseDoc.getPageCount())
      setToolState('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message); setToolState('error')
    }
  }

  function handleDownload() {
    if (!resultBytes) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([resultBytes as BlobPart], { type: 'application/pdf' }))
    a.download = `${baseFile?.name.replace(/\.pdf$/i, '') ?? 'document'}_pages-added.pdf`; a.click()
  }

  function handleReset() {
    setBaseFile(null); setBasePages(0); setSourceFile(null); setSourcePages(0)
    setInsertAfter(0); setPageRange(''); setRangeError('')
    setResultBytes(null); setToolState('idle'); setErrorMessage('')
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Merge PDF',      slug: 'merge-pdf',             icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine full PDFs end-to-end' },
        { name: 'Organize Pages', slug: 'organize-pages',        icon: '📋', colorBg: '#DBEAFE', desc: 'Reorder pages visually' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',          slug: 'merge-pdf',              icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Remove Pages',       slug: 'remove-pages-from-pdf',  icon: '🗑️', colorBg: '#FEE2E2', desc: 'Delete unwanted pages' },
        { name: 'Add Blank Page',     slug: 'add-blank-page',         icon: '📄', colorBg: '#DCFCE7', desc: 'Insert blank pages' },
        { name: 'Split PDF',          slug: 'split-pdf',              icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract pages as files' },
        { name: 'Rotate PDF',         slug: 'rotate-pdf',             icon: '🔄', colorBg: '#FFF0DC', desc: 'Fix page orientation' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Add Pages to PDF" sidebar={sidebar}>
{/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Add Pages </span>
          <span style={{ color: 'var(--amber)' }}>to PDF</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Insert pages from a second PDF into any position. Choose which pages and where. No upload, no watermark.
        </p>
      </div>

      {toolState === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Step 1: Base PDF */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>// Step 1 — Base PDF (pages will be inserted into this)</div>
            {!baseFile ? (
              <DropZone onFilesAdded={addBase} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={0}
                icon="📋" label="Drop base PDF here" subLabel="Pages will be inserted into this document" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ width: '36px', height: '36px', background: '#DBEAFE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{baseFile.name}</div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{formatBytes(baseFile.size)} · {basePages} pages</div>
                </div>
                <button onClick={() => { setBaseFile(null); setBasePages(0) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--muted)' }}>✕</button>
              </div>
            )}
          </div>

          {/* Step 2: Source PDF */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>// Step 2 — Source PDF (pages to insert from)</div>
            {!sourceFile ? (
              <DropZone onFilesAdded={addSource} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={0}
                icon="➕" label="Drop source PDF here" subLabel="Pages from this document will be inserted" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ width: '36px', height: '36px', background: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>➕</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sourceFile.name}</div>
                    <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{formatBytes(sourceFile.size)} · {sourcePages} pages</div>
                  </div>
                  <button onClick={() => { setSourceFile(null); setSourcePages(0); setPageRange(''); setRangeError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--muted)' }}>✕</button>
                </div>

                {/* Page range selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Pages to insert <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(leave blank to insert all {sourcePages} pages)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. 1-3, 5, 7 (1–${sourcePages})`}
                    value={pageRange}
                    onChange={e => { setPageRange(e.target.value); validateRange(e.target.value) }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${rangeError ? '#DC2626' : 'var(--border)'}`, fontSize: '13px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', color: 'var(--ink)', background: 'white', boxSizing: 'border-box' }}
                  />
                  {rangeError && <div style={{ marginTop: '4px', fontSize: '11px', color: '#DC2626', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>{rangeError}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Position */}
          {baseFile && sourceFile && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>// Step 3 — Insertion Position</div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>Insert after page</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="number" min={0} max={basePages} value={insertAfter}
                  onChange={e => setInsertAfter(Math.min(Math.max(0, parseInt(e.target.value) || 0), basePages))}
                  style={{ width: '80px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontWeight: 600, color: 'var(--ink)', background: 'white', textAlign: 'center' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {insertAfter === 0 ? '— pages will be inserted at the beginning' : insertAfter === basePages ? `— pages will be appended at the end` : `— pages inserted between page ${insertAfter} and ${insertAfter + 1}`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setInsertAfter(0)} style={{ padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border)', background: insertAfter === 0 ? 'var(--ink)' : 'transparent', color: insertAfter === 0 ? 'white' : 'var(--ink)', cursor: 'pointer', fontSize: '12px', transition: 'all 0.12s' }}>At beginning</button>
                <button onClick={() => setInsertAfter(basePages)} style={{ padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border)', background: insertAfter === basePages ? 'var(--ink)' : 'transparent', color: insertAfter === basePages ? 'white' : 'var(--ink)', cursor: 'pointer', fontSize: '12px', transition: 'all 0.12s' }}>At end</button>
              </div>
            </div>
          )}

          {baseFile && sourceFile && (
            <button onClick={handleInsert} disabled={!!rangeError}
              style={{ width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', border: 'none', cursor: rangeError ? 'not-allowed' : 'pointer', opacity: rangeError ? 0.5 : 1, transition: 'transform 0.15s' }}
              onMouseEnter={e => { if (!rangeError) e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
              ➕ Insert Pages into PDF
            </button>
          )}
        </div>
      )}

      {toolState === 'merging' && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', color: 'white', marginBottom: '6px' }}>Inserting pages…</div>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Copying pages from source and rebuilding PDF</div>
        </div>
      )}

      {toolState === 'done' && (
        <DownloadCard
          filename={`${baseFile?.name.replace(/\.pdf$/i, '') ?? 'document'}_pages-added.pdf`}
          description={`Pages inserted · ${resultPageCount} pages total`}
          onDownload={handleDownload}
          onReset={handleReset}
          title="Pages inserted!"
          resetLabel="Insert into another →"
          nextSteps={[
            { slug: 'organize-pages', name: 'Organize Pages', icon: '📋' },
            { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
            { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
          ]}
        />
      )}

      {toolState === 'error' && <ErrorCard message={errorMessage} onReset={handleReset} />}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Add Pages to a PDF — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Need to insert pages from another PDF into an existing document? Doclair lets you add any number of pages from a second PDF into your main document at any position.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your base PDF.</strong> This is the document pages will be inserted into.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload the PDF containing the pages you want to insert.</strong> Optionally specify a page range.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose the insertion position.</strong> Set it to 0 for the beginning or the last page number to append at the end.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Add Pages and download</strong> the merged result.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Can I add pages from multiple PDFs?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Each operation adds pages from one source PDF. To add pages from multiple sources, use Add Pages repeatedly — or use Merge PDF to combine several files in one step.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Add Pages on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in Safari and Chrome on mobile. Upload both PDFs from the Files app, configure the merge, and download the updated document.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
