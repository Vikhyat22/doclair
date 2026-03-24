'use client'

import { useState, useCallback, useRef } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { addHeaderFooter, type HeaderFooterOptions } from '@/lib/pdf/headerFooter'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What tokens can I use in headers and footers?',
    a: '{page} inserts the current page number, {total} inserts the total page count, and {date} inserts today\'s date in DD Mon YYYY format.',
  },
  {
    q: 'Will the header/footer overlap existing content?',
    a: 'The text is placed at the margin distance from the page edge. Increase the margin value if your page has content close to the edges.',
  },
  {
    q: 'Can I skip the header on the first page?',
    a: 'Yes. Enable the "Skip first page" toggle to leave the first page without header/footer — useful for title pages.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. Everything runs in your browser using @cantoo/pdf-lib. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Add Header & Footer to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/add-header-footer',
      description: 'Insert custom text, page numbers, or dates in the header and footer of every PDF page. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'Add Header and Footer to PDF', item: 'https://doclair.in/add-header-footer' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Add Page Numbers', slug: 'add-page-numbers', icon: '🔢', colorBg: '#DBEAFE', desc: 'Auto number pages' },
  { name: 'Add Watermark',    slug: 'add-watermark',    icon: '💧', colorBg: '#EDE9FE', desc: 'Add background text' },
  { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata', icon: '✏️', colorBg: '#FFF0DC', desc: 'Edit document info' },
  { name: 'Flatten PDF',      slug: 'flatten-pdf',      icon: '🔥', colorBg: '#FEE2E2', desc: 'Lock content permanently' },
]

interface SectionInputsProps {
  label: string
  left: string; center: string; right: string
  onLeft: (v: string) => void; onCenter: (v: string) => void; onRight: (v: string) => void
  focusRef: React.MutableRefObject<HTMLInputElement | null>
  onFocus: (ref: HTMLInputElement) => void
}

function SectionInputs({ label, left, center, right, onLeft, onCenter, onRight, onFocus }: SectionInputsProps) {
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
    color: 'var(--ink)', background: 'white', minWidth: 0,
  }
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[['Left', left, onLeft], ['Center', center, onCenter], ['Right', right, onRight]].map(([ph, val, setter]) => (
          <input
            key={ph as string}
            type="text"
            placeholder={ph as string}
            value={val as string}
            onChange={e => (setter as (v: string) => void)(e.target.value)}
            onFocus={e => onFocus(e.target)}
            style={inputStyle}
          />
        ))}
      </div>
    </div>
  )
}

export default function AddHeaderFooterPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')

  const [headerLeft,   setHeaderLeft]   = useState('')
  const [headerCenter, setHeaderCenter] = useState('')
  const [headerRight,  setHeaderRight]  = useState('{page} / {total}')
  const [footerLeft,   setFooterLeft]   = useState('{date}')
  const [footerCenter, setFooterCenter] = useState('')
  const [footerRight,  setFooterRight]  = useState('')
  const [fontSize,     setFontSize]     = useState(10)
  const [color,        setColor]        = useState('#000000')
  const [margin,       setMargin]       = useState(20)
  const [skipFirst,    setSkipFirst]    = useState(false)

  const focusedInput = useRef<HTMLInputElement | null>(null)

  const insertToken = useCallback((token: string) => {
    const input = focusedInput.current
    if (!input) return
    const start = input.selectionStart ?? input.value.length
    const end   = input.selectionEnd ?? input.value.length
    const newVal = input.value.slice(0, start) + token + input.value.slice(end)
    const event  = new Event('input', { bubbles: true })
    Object.defineProperty(event, 'target', { writable: false, value: { ...input, value: newVal } })
    input.value = newVal
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, [])

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]); setToolState('idle'); setResult(null); setError('')
    }
  }, [])

  const handleApply = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const opts: HeaderFooterOptions = {
        header: { left: headerLeft, center: headerCenter, right: headerRight },
        footer: { left: footerLeft, center: footerCenter, right: footerRight },
        fontSize, color, margin, skipFirst,
      }
      const out = await addHeaderFooter(file, opts)
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add header/footer')
      setToolState('error')
    }
  }, [file, headerLeft, headerCenter, headerRight, footerLeft, footerCenter, footerRight, fontSize, color, margin, skipFirst])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-headed.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setError(''); setToolState('idle')
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Add Header & Footer to PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Add Header & Footer </span>
            <span style={{ color: 'var(--amber)' }}>to PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Insert custom text, page numbers, or dates in the header and footer of every page. Free, no upload.
          </p>
        </div>

        {/* Content config */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// Header & Footer Content</div>

          <SectionInputs
            label="Header"
            left={headerLeft} center={headerCenter} right={headerRight}
            onLeft={setHeaderLeft} onCenter={setHeaderCenter} onRight={setHeaderRight}
            focusRef={focusedInput} onFocus={r => (focusedInput.current = r)}
          />
          <SectionInputs
            label="Footer"
            left={footerLeft} center={footerCenter} right={footerRight}
            onLeft={setFooterLeft} onCenter={setFooterCenter} onRight={setFooterRight}
            focusRef={focusedInput} onFocus={r => (focusedInput.current = r)}
          />

          {/* Token helpers */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>Click to insert dynamic value into focused field:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['{page}', '{total}', '{date}'].map(t => (
                <button
                  key={t}
                  onClick={() => insertToken(t)}
                  style={{ padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border)', background: '#F9FAFB', fontSize: '12px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', cursor: 'pointer', color: 'var(--ink)' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Options */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>// Options</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Font size (pt)</span>
              <input type="number" min={6} max={24} value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Color</span>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{ padding: '4px', border: '1px solid var(--border)', borderRadius: '8px', height: '38px', width: '100%' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Margin (pt)</span>
              <input type="number" min={0} max={80} value={margin} onChange={e => setMargin(Number(e.target.value))}
                style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
            </label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', cursor: 'pointer' }}>
            <input type="checkbox" checked={skipFirst} onChange={e => setSkipFirst(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--amber)' }} />
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>Skip first page (title pages)</span>
          </label>
        </div>

        {/* File upload */}
        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="📝" label="Drop your PDF here" subLabel="or click to browse — up to 200 MB" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleApply} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Apply to PDF →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Adding Header & Footer…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Applying to all pages</div>
          </div>
        )}

        {toolState === 'error' && <ErrorCard message={error || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        {toolState === 'done' && result && file && (
          <DownloadCard
            filename={file.name.replace(/\.pdf$/i, '-headed.pdf')}
            description="Header & footer applied to all pages"
            onDownload={handleDownload}
            onReset={handleReset}
            title="Header & footer added!"
            resetLabel="Add to another →"
            nextSteps={[
              { slug: 'add-page-numbers', name: 'Add Page Numbers', icon: '🔢' },
              { slug: 'add-watermark', name: 'Add Watermark', icon: '💧' },
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Add a Header and Footer to a PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Headers and footers add consistent branding, document titles, dates, or page numbers to every page of a PDF. Doclair stamps your custom text at the top and bottom of each page in seconds.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop the file into Doclair or click to browse.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Enter your header text.</strong> It appears at the top of each page.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Enter your footer text.</strong> It appears at the bottom of each page.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose font size and position, then click Apply and download.</strong> Your stamped PDF is ready instantly.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            What can I put in a header or footer?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Common uses include the document title in the header, &apos;Confidential&apos; or company name in the footer, meeting dates, version numbers, or copyright notices. You can set header and footer independently.
          </p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            Add Header/Footer on iPhone and Android
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
            Doclair works in mobile Safari and Chrome. Upload your PDF from the Files app, configure the header and footer text, and download the stamped PDF directly to your device.
          </p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
