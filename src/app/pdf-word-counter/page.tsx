'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { countWords, type WordCountResult } from '@/lib/pdf/wordCount'

type ToolState = 'idle' | 'counting' | 'done' | 'error'

const FAQS = [
  {
    q: 'How does the word counter extract text from PDFs?',
    a: 'The tool uses pdfjs-dist to extract the text content layer from each page. PDFs that contain selectable text will work well. Scanned PDFs (image-only PDFs) have no text layer, so you will need to run OCR first.',
  },
  {
    q: 'What counts as a "word"?',
    a: 'A word is any sequence of word characters (letters, digits, apostrophes, hyphens) that is at least one character long. Punctuation, spaces, and special symbols are not counted. You can optionally exclude standalone numbers.',
  },
  {
    q: 'What does "Exclude numbers" do?',
    a: 'When enabled, standalone numeric tokens (e.g. "2024", "3.14", "1,000") are removed from the text before counting. This is useful for documents with heavy use of page numbers, dates, or numerical tables.',
  },
  {
    q: 'Can I ignore common words like "the" or "and"?',
    a: 'Yes. Enter comma-separated words in the "Words to ignore" field before clicking Count Words. They are excluded from the word count on every page.',
  },
  {
    q: 'Why does my scanned PDF show zero words?',
    a: 'Scanned PDFs are stored as images with no embedded text. Use the OCR PDF tool on Doclair to make the document searchable and extract its text first, then run the word counter on the OCR result.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. The word counter uses pdfjs-dist running locally in your browser. Your PDF never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF Word Counter — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdf-word-counter',
      description: 'Count words, characters and paragraphs in any PDF. Per-page breakdown. Exclude numbers. Free, no upload.',
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
        { '@type': 'ListItem', position: 1, name: 'Home',            item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools',           item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'PDF Word Counter', item: 'https://doclair.in/pdf-word-counter' },
      ],
    },
  ],
}

const SIDEBAR_REVERSE = [
  { name: 'PDF to Text', slug: 'pdf-to-text', icon: '📄', colorBg: '#DCFCE7', desc: 'Extract all text' },
  { name: 'OCR PDF',     slug: 'ocr-pdf',     icon: '🔍', colorBg: '#EDE9FE', desc: 'Make scanned PDFs searchable' },
]

const SIDEBAR_RELATED = [
  { name: 'OCR PDF',     slug: 'ocr-pdf',     icon: '🔍', colorBg: '#EDE9FE', desc: 'Make scanned PDFs searchable' },
  { name: 'PDF to Word', slug: 'pdf-to-word', icon: '📝', colorBg: '#DBEAFE', desc: 'Convert to editable Word doc' },
  { name: 'Split PDF',   slug: 'split-pdf',   icon: '✂️', colorBg: '#FFF0DC', desc: 'Split into multiple files' },
  { name: 'Compress PDF',slug: 'compress-pdf',icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
]

function StatCard({ value, label, highlight }: { value: number | string; label: string; highlight?: boolean }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 18px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-syne), Syne, sans-serif',
        fontWeight: 700,
        fontSize: '32px',
        color: highlight ? 'var(--amber)' : 'var(--ink)',
        lineHeight: 1,
        marginBottom: '6px',
      }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div style={{
        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
        fontSize: '11px',
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>{label}</div>
    </div>
  )
}

export default function PDFWordCounterPage() {
  const [file, setFile] = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult] = useState<WordCountResult | null>(null)
  const [error, setError] = useState('')
  const [excludeNumbers, setExcludeNumbers] = useState(false)
  const [ignoreWordsInput, setIgnoreWordsInput] = useState('')

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setFile(files[0])
    setResult(null)
    setError('')
    setToolState('idle')
  }, [])

  const handleCount = useCallback(async () => {
    if (!file) return
    setToolState('counting')
    setError('')
    try {
      const ignoreWords = ignoreWordsInput.split(',').map(w => w.trim()).filter(Boolean)
      const res = await countWords(file, excludeNumbers, ignoreWords)
      setResult(res)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to count words')
      setToolState('error')
    }
  }, [file, excludeNumbers, ignoreWordsInput])

  const handleReset = useCallback(() => {
    setFile(null)
    setResult(null)
    setError('')
    setToolState('idle')
  }, [])

  const maxWordsPage = result
    ? result.pageBreakdown.reduce((best, p) => p.words > best.words ? p : best, result.pageBreakdown[0])
    : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="PDF Word Counter"
        sidebar={<ToolSidebar reverseActions={SIDEBAR_REVERSE} relatedTools={SIDEBAR_RELATED} />}
      >
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>PDF Word Counter </span>
            <span style={{ color: 'var(--amber)' }}>Count Words in Any PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Count words, characters and paragraphs in any PDF. Per-page breakdown. Exclude numbers. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
          </div>
        </div>

        {/* Drop Zone */}
        {toolState === 'idle' && !file && (
          <DropZone
            onFilesAdded={handleFiles}
            accept=".pdf"
            maxFiles={1}
            maxSizeMB={200}
            icon="🔢"
            label="Drop your PDF here to count words"
            subLabel="or click to browse — choose options then click Count Words"
            currentCount={0}
          />
        )}

        {/* Options — shown when file is loaded but not yet counted */}
        {toolState === 'idle' && file && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>// Count Options</div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', padding: '14px 16px', borderRadius: '10px', background: excludeNumbers ? '#FFF8F0' : '#FAFAFA', border: `1px solid ${excludeNumbers ? 'var(--amber)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setExcludeNumbers(v => !v)}
            >
              <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
                <input type="checkbox" checked={excludeNumbers} onChange={() => {}} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: excludeNumbers ? 'var(--amber)' : '#D1D5DB', transition: 'background 0.2s', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '3px', left: excludeNumbers ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>Exclude numbers</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Standalone numeric tokens (e.g. "2024", "3.14") are not counted</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
                Words to ignore <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— comma-separated</span>
              </label>
              <input
                type="text"
                value={ignoreWordsInput}
                onChange={e => setIgnoreWordsInput(e.target.value)}
                placeholder="e.g. the, a, and, is"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)', background: 'white', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {file.name}</div>
              <button
                onClick={handleCount}
                style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'transform 0.15s', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                Count Words →
              </button>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕ Remove</button>
            </div>
          </div>
        )}

        {/* Counting */}
        {toolState === 'counting' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'wcspin 1.5s linear infinite', display: 'inline-block' }}>🔢</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Counting words…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Extracting text from each page</div>
            <style>{`@keyframes wcspin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Error */}
        {toolState === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try again</button>
          </div>
        )}

        {/* Results */}
        {toolState === 'done' && result && (
          <>
            {/* No text warning */}
            {!result.hasText && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>No text found — this may be a scanned document.</div>
                  <div style={{ fontSize: '13px', color: '#92400E', opacity: 0.85 }}>
                    Run <Link href="/ocr-pdf" style={{ color: 'var(--amber)', fontWeight: 500 }}>OCR PDF</Link> first to make the document searchable, then count words.
                  </div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              <StatCard value={result.totalWords} label="Words" highlight />
              <StatCard value={result.totalChars} label="Characters" />
              <StatCard value={result.totalCharsNoSp} label="No Spaces" />
              <StatCard value={result.totalPages} label="Pages" />
            </div>

            {/* Max words note */}
            {maxWordsPage && result.hasText && (
              <div style={{ background: '#FFF8F0', border: '1px solid var(--amber)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--ink)' }}>
                Page {maxWordsPage.page} has the most content — <strong>{maxWordsPage.words.toLocaleString()} words</strong>
              </div>
            )}

            {/* Per-page breakdown */}
            {result.pageBreakdown.length > 0 && (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// Per-Page Breakdown</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{result.totalPages} pages</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Page</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Words</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Characters</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Chars (no spaces)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.pageBreakdown.map((p, i) => {
                        const isMax = maxWordsPage && p.page === maxWordsPage.page && result.hasText
                        return (
                          <tr
                            key={p.page}
                            style={{ background: isMax ? '#FFF8F0' : i % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: i < result.pageBreakdown.length - 1 ? '1px solid var(--border)' : 'none' }}
                          >
                            <td style={{ padding: '10px 16px', color: 'var(--ink)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontWeight: isMax ? 600 : 400 }}>
                              {isMax ? '★ ' : ''}Page {p.page}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: isMax ? 'var(--amber)' : 'var(--ink)', fontWeight: isMax ? 600 : 400 }}>{p.words.toLocaleString()}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--ink)' }}>{p.chars.toLocaleString()}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--ink)' }}>{p.charsNoSp.toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reset */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handleReset}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '100px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', color: 'var(--ink)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)' }}
              >
                Count another PDF →
              </button>
            </div>
          </>
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Count Words in a PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Counting words in a PDF is useful for academic submissions, freelance writing billing, translation estimates, and content audits. Doclair extracts all text from your PDF and counts words, characters, and sentences instantly.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop your file into the upload area — it stays on your device throughout.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair extracts all text and counts words per page.</strong> You can optionally exclude numbers or set words to ignore.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>View the total word count, character count, and per-page breakdown.</strong> The page with the most content is highlighted.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Copy the results or download a summary.</strong> All results are displayed instantly in your browser.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Will word count be accurate for scanned PDFs?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Scanned PDFs contain images of text rather than selectable text, so word counting won&apos;t work directly. Use OCR PDF first to extract the text layer, then run Word Counter on the OCR output.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Word Counter on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF and get an instant word count breakdown right in your browser.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
