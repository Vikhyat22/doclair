'use client'

import { useState, useCallback, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { splitPDF, bundleAsZip, parseRangePreview } from '@/lib/pdf/split'
import type { SplitResult } from '@/lib/pdf/split'
import type { ToolState } from '@/types'

type SplitMode = 'individual' | 'ranges' | 'interval'

const FAQS = [
  { q: 'Can I extract only specific pages from a PDF?', a: 'Yes. Choose "Custom ranges" mode and type your ranges — e.g. "1-3, 5, 7-10". Each range becomes a separate PDF file.' },
  { q: 'Is there a page limit?', a: 'No page limit. Doclair processes the PDF entirely in your browser so there are no server-side restrictions.' },
  { q: 'Are my files uploaded to a server?', a: 'Never. Your PDF is processed using pdf-lib running as WebAssembly directly in your browser tab. No data is sent anywhere.' },
  { q: 'Can I split into equal sections by page count?', a: 'Yes. Use "Every N pages" mode. Enter the number of pages per section — e.g. 3 — and Doclair splits the PDF into equal chunks of 3 pages each.' },
  { q: 'Can I split a PDF on iPhone or Android?', a: 'Yes. Doclair works in Safari on iPhone and iPad, and Chrome on Android. Tap the upload area and select your PDF from Files or Downloads.' },
  { q: 'How do I extract just one page from a PDF?', a: 'Use "Custom ranges" mode and type the page number — e.g. "5" — to extract page 5 as a standalone PDF.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Split PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/split-pdf',
      description: 'Split PDF into individual pages or extract custom ranges. Visual page thumbnails. 100% free, browser-based.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Split PDF', item: 'https://doclair.in/split-pdf' },
      ],
    },
  ],
}

function fmtBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function SplitPDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [thumbsLoading, setThumbsLoading] = useState(false)
  const [mode, setMode] = useState<SplitMode>('ranges')
  const [rangeInput, setRangeInput] = useState('')
  const [intervalValue, setIntervalValue] = useState(2)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [results, setResults] = useState<SplitResult[]>([])
  const [progress, setProgress] = useState(0)
  const thumbUrlsRef = useRef<string[]>([])

  async function generateThumbnails(fileBytes: ArrayBuffer, pageCount: number) {
    setThumbsLoading(true)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(fileBytes),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise

      const urls: string[] = []
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 72 / 72 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('fail')), 'image/jpeg', 0.7)
        )
        const url = URL.createObjectURL(blob)
        urls.push(url)
        canvas.width = 0; canvas.height = 0
        setThumbnails([...urls])
      }
      thumbUrlsRef.current = urls
    } catch (e) {
      console.warn('Thumbnail generation failed:', e)
    } finally {
      setThumbsLoading(false)
    }
  }

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    thumbUrlsRef.current.forEach(URL.revokeObjectURL)
    thumbUrlsRef.current = []
    setThumbnails([])
    setResults([])
    setToolState('idle')
    setRangeInput('')

    const bytes = await f.arrayBuffer()
    const doc = await PDFDocument.load(bytes)
    const count = doc.getPageCount()
    setFile(f)
    setTotalPages(count)

    generateThumbnails(bytes, count)
  }, [])

  async function handleSplit() {
    if (!file) return
    if (mode === 'ranges' && !parseRangePreview(rangeInput, totalPages).valid) return

    setToolState('merging')
    setProgress(0)

    try {
      setProgress(20)
      const splitResults = await splitPDF(file, mode, {
        ranges: rangeInput,
        interval: intervalValue,
      })
      setProgress(90)
      setResults(splitResults)
      setToolState('done')
      setProgress(100)
    } catch (err) {
      console.error(err)
      setToolState('idle')
      alert('Split failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function handleDownloadZip() {
    const zipBlob = await bundleAsZip(results)
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file?.name.replace('.pdf', '') ?? 'split'}-pages.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleDownloadOne(result: SplitResult) {
    const blob = new Blob([result.bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    thumbUrlsRef.current.forEach(URL.revokeObjectURL)
    thumbUrlsRef.current = []
    setFile(null)
    setTotalPages(0)
    setThumbnails([])
    setResults([])
    setToolState('idle')
    setProgress(0)
    setRangeInput('')
    setIntervalValue(2)
  }

  const rangePreview = parseRangePreview(rangeInput, totalPages)
  const intervalFileCount = totalPages > 0 ? Math.ceil(totalPages / Math.max(1, intervalValue)) : 0
  const isSplitDisabled =
    !file ||
    (mode === 'ranges' && !rangePreview.valid)

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', colorBg: '#DBEAFE', desc: 'Combine multiple PDFs into one' },
        { name: 'Organize Pages', slug: 'organize-pages', icon: '📋', colorBg: '#DBEAFE', desc: 'Reorder and delete pages' },
      ]}
      relatedTools={[
        { name: 'Compress PDF',   slug: 'compress-pdf',          icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'PDF → JPG',      slug: 'pdf-to-jpg',            icon: '🖼️', colorBg: '#DCFCE7', desc: 'Extract pages as images' },
        { name: 'Remove Pages',   slug: 'remove-pages-from-pdf', icon: '✂️', colorBg: '#FEE2E2', desc: 'Delete unwanted pages' },
        { name: 'PDF Viewer',     slug: 'pdf-viewer',            icon: '👁️', colorBg: '#EDE9FE', desc: 'View PDFs in browser' },
        { name: 'Add Bookmarks',  slug: 'add-bookmarks',         icon: '🔖', colorBg: '#FFF0DC', desc: 'Add navigation bookmarks' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Split PDF" toolSlug="split-pdf" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

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
          <span style={{ color: 'var(--ink)' }}>Split PDF </span>
          <span style={{ color: 'var(--amber)' }}>Extract Pages</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Split into individual pages, custom ranges, or equal sections. Visual page preview included.
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
          icon="✂️"
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
              width: '40px', height: '40px', background: '#FEE2E2', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{fmtBytes(file.size)} · {totalPages} pages</div>
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

          {/* Thumbnail section */}
          {totalPages > 0 && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
              }}>// Page Preview</div>

              {thumbsLoading && thumbnails.length === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                  {Array.from({ length: Math.min(totalPages, 12) }).map((_, i) => (
                    <div key={`sk-init-${i}`} style={{
                      border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden',
                      background: '#F3F4F6', height: '100px', animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                  {thumbnails.map((url, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: 'white' }}>
                      <img src={url} alt={`Page ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                      <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>
                        Page {i + 1}
                      </div>
                    </div>
                  ))}
                  {thumbsLoading && Array.from({ length: totalPages - thumbnails.length }).map((_, i) => (
                    <div key={`sk-${i}`} style={{
                      border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden',
                      background: '#F3F4F6', height: '100px', animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode tabs */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Split Mode</div>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '0' }}>
              {([
                { value: 'individual' as SplitMode, label: 'Split every page' },
                { value: 'ranges' as SplitMode, label: 'Custom ranges' },
                { value: 'interval' as SplitMode, label: 'Every N pages' },
              ]).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setMode(tab.value)}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderBottom: mode === tab.value ? '2px solid var(--amber)' : '2px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: mode === tab.value ? 600 : 400,
                    color: mode === tab.value ? 'var(--ink)' : 'var(--muted)',
                    marginBottom: '-1px',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {/* Tab content */}
            {mode === 'individual' && (
              <p style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6,
              }}>
                Will create {totalPages} individual PDF file{totalPages !== 1 ? 's' : ''} — one per page.
              </p>
            )}

            {mode === 'ranges' && (
              <div>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 7-10"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                    fontSize: '13px',
                    color: 'var(--ink)',
                    background: 'white',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
                <div style={{ marginTop: '10px' }}>
                  {!rangeInput.trim() ? (
                    <p style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)' }}>
                      Enter page ranges separated by commas
                    </p>
                  ) : rangePreview.valid ? (
                    <div style={{
                      padding: '10px 14px', borderRadius: '8px', background: '#DCFCE7',
                      border: '1px solid #86EFAC',
                    }}>
                      <p style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: '#166534', margin: 0 }}>
                        Will create {rangePreview.fileCount} file{rangePreview.fileCount !== 1 ? 's' : ''}: {rangePreview.parts.join(' · ')}
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      padding: '10px 14px', borderRadius: '8px', background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                    }}>
                      <p style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: '#92400E', margin: 0 }}>
                        Invalid range — check page numbers (PDF has {totalPages} pages)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === 'interval' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', color: 'var(--ink)' }}>Split every</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={intervalValue}
                    onChange={e => setIntervalValue(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                    style={{
                      width: '72px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                      fontSize: '14px',
                      color: 'var(--ink)',
                      background: 'white',
                      outline: 'none',
                      textAlign: 'center',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                  <span style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', color: 'var(--ink)' }}>pages</span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                  fontSize: '11px', color: 'var(--muted)', marginTop: '12px', lineHeight: 1.6,
                }}>
                  A {totalPages}-page PDF split every {intervalValue} pages creates {intervalFileCount} file{intervalFileCount !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSplit}
              disabled={isSplitDisabled}
              style={{
                flex: 1, background: 'var(--ink)', color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none',
                cursor: isSplitDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s',
                opacity: isSplitDisabled ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!isSplitDisabled) e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >✂️ Split PDF</button>
            <button
              onClick={handleReset}
              title="Clear"
              style={{
                width: '52px', height: '52px', borderRadius: '100px', border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', transition: 'all 0.15s',
                color: 'var(--ink)', opacity: 0.5, flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FEE2E2'
                e.currentTarget.style.borderColor = '#FCA5A5'
                e.currentTarget.style.color = 'var(--red)'
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.opacity = '0.5'
              }}
            >🗑</button>
          </div>
        </div>
      )}

      {/* State: splitting */}
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
          }}>Splitting your PDF…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', marginBottom: '24px',
          }}>{progress < 50 ? 'Reading PDF…' : 'Creating files…'}</div>
          <div style={{
            maxWidth: '320px', margin: '0 auto', height: '4px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--amber)', borderRadius: '2px',
              width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && results.length === 1 && (
        <DownloadCard
          filename={results[0].filename}
          description={results[0].pageRange + ' · ' + fmtBytes(results[0].bytes.byteLength)}
          onDownload={() => handleDownloadOne(results[0])}
          onReset={handleReset}
        />
      )}

      {toolState === 'done' && results.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Success header */}
          <div style={{
            background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#166534' }}>
                {results.length} PDF files ready
              </div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: '#166534', opacity: 0.75, marginTop: '2px' }}>
                Download individually or as a ZIP
              </div>
            </div>
          </div>

          {/* Results list */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {results.map((result, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 20px',
                  borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {result.filename}
                  </div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                    {result.pageRange} · {fmtBytes(result.bytes.byteLength)}
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadOne(result)}
                  style={{
                    padding: '7px 14px', borderRadius: '8px',
                    border: '1px solid var(--amber)',
                    background: 'transparent', cursor: 'pointer',
                    fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                    fontSize: '11px', fontWeight: 500, color: 'var(--amber)',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--amber)' }}
                >⬇ Download</button>
              </div>
            ))}
          </div>

          {/* Download all ZIP */}
          <button
            onClick={handleDownloadZip}
            style={{
              width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px',
              borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700, fontSize: '16px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >⬇ Download all as ZIP</button>

          {/* Reset */}
          <button
            onClick={handleReset}
            style={{
              width: '100%', padding: '13px 24px', borderRadius: '100px',
              border: '1px solid var(--border)', background: 'transparent',
              cursor: 'pointer', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 600, fontSize: '15px', color: 'var(--ink)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
          >Split another PDF →</button>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Split PDF Files Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Splitting a PDF into separate files is instant and completely free with Doclair. No software to install, no account required, and your files never leave your browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Click <strong>Drop your PDF here</strong> or drag your PDF into the upload area.',
            'Choose a split mode — <strong>Split every page</strong> for individual pages, <strong>Custom ranges</strong> to specify exact pages (e.g. "1-3, 5, 7-10"), or <strong>Every N pages</strong> to divide into equal sections.',
            'Click <strong>Split PDF</strong> and wait while pdf-lib processes your file entirely in your browser.',
            'Download each file individually, or click <strong>Download all as ZIP</strong> to get all split files at once.',
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
          Why split PDFs in the browser instead of uploading?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Most PDF splitters upload your file to a remote server, which means your document is transmitted over the internet
          and stored on someone else&apos;s infrastructure. Doclair uses pdf-lib compiled to WebAssembly, meaning the entire
          split operation runs locally in your browser tab. Your PDF never leaves your device — ideal for confidential documents,
          legal files, medical records, and financial statements.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Extracting specific pages from a large PDF
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Use Custom ranges mode to extract exactly the pages you need. Enter ranges like "1-5, 10, 15-20" and Doclair
          will produce one PDF per range. This is perfect for extracting chapters from ebooks, pulling specific invoices
          from a batch statement, or separating sections of a report.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Split PDF on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile browsers — Safari on iPhone and iPad, Chrome on Android — with no app download required.
          Tap the upload area to open the Files app picker, select your PDF, choose a split mode, and download the result
          directly to your device.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
