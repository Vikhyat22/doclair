'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { detectBlankPages, removeBlankPagesFromPDF } from '@/lib/pdf/removeBlankPages'

type ToolState = 'idle' | 'detecting' | 'preview' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'How does the blank page detector work?',
    a: 'Each page is rendered at a low resolution (20% scale) and its pixels are sampled. A page is considered blank if fewer than 5 sampled pixels contain non-white colour. This catches truly blank pages as well as pages with very light artefacts.',
  },
  {
    q: 'Will it accidentally remove pages that have very light content?',
    a: 'The detector uses a strict threshold — only pages that are almost entirely white are flagged. You can review the list of detected blank pages before removing anything, and uncheck any page you want to keep.',
  },
  {
    q: 'Can I choose which blank pages to remove?',
    a: 'Yes. After scanning, you see a checklist of all detected blank pages with their page numbers. Each one is checked by default — uncheck any you want to keep before clicking Remove.',
  },
  {
    q: 'What happens if no blank pages are found?',
    a: 'You will see a confirmation card saying no blank pages were detected. No changes are made to the PDF.',
  },
  {
    q: 'Does this tool work on scanned PDFs?',
    a: 'Yes — scanned PDFs are images, so the pixel-sampling approach works well. However, a scanned page with faint background texture may not be detected as blank even if it appears nearly white.',
  },
  {
    q: 'Are my files sent to a server?',
    a: 'No. Everything runs in your browser — blank page detection uses pdfjs-dist (WebAssembly-powered) and page removal uses @cantoo/pdf-lib, both executed locally. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Remove Blank Pages from PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/remove-blank-pages',
      description: 'Automatically detect and remove blank and empty pages from any PDF. Preview before removing. Free, no upload.',
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
        { '@type': 'ListItem', position: 1, name: 'Home',                    item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools',                   item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Remove Blank Pages',      item: 'https://doclair.in/remove-blank-pages' },
      ],
    },
  ],
}

const SIDEBAR_REVERSE = [
  { name: 'Add Blank Page',   slug: 'add-blank-page',  icon: '➕', colorBg: '#DCFCE7', desc: 'Insert blank pages into PDF' },
  { name: 'Organize Pages',   slug: 'organize-pages',  icon: '📋', colorBg: '#EDE9FE', desc: 'Reorder and manage pages' },
]

const SIDEBAR_RELATED = [
  { name: 'Compress PDF',          slug: 'compress-pdf',            icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
  { name: 'Split PDF',             slug: 'split-pdf',               icon: '✂️', colorBg: '#FFF0DC', desc: 'Split into multiple files' },
  { name: 'Remove Pages',          slug: 'remove-pages-from-pdf',   icon: '🗑️', colorBg: '#FEE2E2', desc: 'Delete specific pages' },
  { name: 'Flatten PDF',           slug: 'flatten-pdf',             icon: '🔥', colorBg: '#FEE2E2', desc: 'Lock content permanently' },
]

export default function RemoveBlankPagesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [blankIndices, setBlankIndices] = useState<number[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [removed, setRemoved] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFile(f)
    setToolState('detecting')
    setErrorMessage('')
    setResult(null)
    try {
      const { blankPageIndices, totalPages: total } = await detectBlankPages(f)
      setBlankIndices(blankPageIndices)
      setTotalPages(total)
      setSelected(new Set(blankPageIndices))
      setToolState('preview')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'; setErrorMessage(message)
      setToolState('error')
    }
  }, [])

  const togglePage = useCallback((idx: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const handleRemove = useCallback(async () => {
    if (!file || selected.size === 0) return
    setToolState('processing')
    try {
      const indicesToRemove = Array.from(selected)
      const out = await removeBlankPagesFromPDF(file, indicesToRemove)
      setResult(out)
      setRemoved(indicesToRemove.length)
      setToolState('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'; setErrorMessage(message)
      setToolState('error')
    }
  }, [file, selected])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-cleaned.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null)
    setResult(null)
    setBlankIndices([])
    setSelected(new Set())
    setTotalPages(0)
    setRemoved(0)
    setErrorMessage('')
    setToolState('idle')
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Remove Blank Pages"
        sidebar={<ToolSidebar reverseActions={SIDEBAR_REVERSE} relatedTools={SIDEBAR_RELATED} />}
      >
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Remove Blank Pages from PDF </span>
            <span style={{ color: 'var(--amber)' }}>Clean Up Your Document</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Automatically detect and remove blank and empty pages. Preview before removing. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
          </div>
        </div>

        {/* Drop Zone */}
        {toolState === 'idle' && (
          <DropZone
            onFilesAdded={handleFiles}
            accept=".pdf"
            maxFiles={1}
            maxSizeMB={200}
            icon="🗑️"
            label="Drop your PDF here to scan for blank pages"
            subLabel="or click to browse — scanning starts automatically"
            currentCount={0}
          />
        )}

        {/* Detecting */}
        {toolState === 'detecting' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'rbpspin 1.5s linear infinite', display: 'inline-block' }}>🔍</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Scanning for blank pages…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Rendering each page and sampling pixels</div>
            <style>{`@keyframes rbpspin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Preview — blanks found */}
        {toolState === 'preview' && blankIndices.length > 0 && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>✅</span>
              <div>
                <div style={{ fontWeight: 600, color: '#166534', fontSize: '15px' }}>Found {blankIndices.length} blank page{blankIndices.length !== 1 ? 's' : ''}</div>
                <div style={{ fontSize: '12px', color: '#166534', opacity: 0.8 }}>{totalPages} total pages · uncheck any you want to keep</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {blankIndices.map(idx => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${selected.has(idx) ? '#BBF7D0' : 'var(--border)'}`, background: selected.has(idx) ? '#F0FDF4' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => togglePage(idx)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16A34A' }}
                  />
                  <div style={{ fontSize: '14px', color: 'var(--ink)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
                    Page {idx + 1}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: 'auto' }}>Blank</div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleRemove}
                disabled={selected.size === 0}
                style={{ background: selected.size === 0 ? '#D1D5DB' : 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: selected.size === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'transform 0.15s' }}
                onMouseEnter={e => selected.size > 0 && (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                Remove {selected.size} Blank Page{selected.size !== 1 ? 's' : ''} →
              </button>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕ Start over</button>
            </div>
          </div>
        )}

        {/* Preview — no blanks */}
        {toolState === 'preview' && blankIndices.length === 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✨</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#92400E', marginBottom: '8px' }}>No blank pages detected</div>
            <div style={{ fontSize: '14px', color: '#92400E', opacity: 0.8, marginBottom: '20px' }}>This PDF has no blank or empty pages.</div>
            <button
              onClick={handleReset}
              style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Done — no changes needed
            </button>
          </div>
        )}

        {/* Processing */}
        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'rbpspin 1.5s linear infinite', display: 'inline-block' }}>⚙️</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Removing blank pages…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Building cleaned PDF</div>
          </div>
        )}

        {/* Error */}
        {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        {/* Done */}
        {toolState === 'done' && result && file && (
          <DownloadCard
            filename={file.name.replace(/\.pdf$/i, '-cleaned.pdf')}
            description={`${removed} blank page${removed !== 1 ? 's' : ''} removed · ${totalPages - removed} page${totalPages - removed !== 1 ? 's' : ''} remaining`}
            onDownload={handleDownload}
            onReset={handleReset}
            title="Blank pages removed!"
            resetLabel="Clean another →"
            nextSteps={[
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'organize-pages', name: 'Organize Pages', icon: '📋' },
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Remove Blank Pages from a PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Blank pages often appear in scanned documents, printed forms, and exported reports. Doclair automatically detects and removes blank pages from your PDF in your browser with no upload required.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop your file into the scanner — detection starts automatically.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair scans each page for content.</strong> Each page is rendered and its pixels sampled to determine if it is blank.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Review the detected blank pages.</strong> Uncheck any page you want to keep before removing.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Remove Blank Pages and download the cleaned PDF.</strong> The original file is never modified.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>How does Doclair detect blank pages?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Doclair renders each page and checks pixel content — a page is considered blank if more than 98% of pixels are white or near-white. Lightly watermarked pages or pages with faint content may or may not be detected as blank depending on the threshold.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Remove Blank Pages on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF from Files and download the cleaned version directly to your device.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
