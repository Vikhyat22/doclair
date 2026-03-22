'use client'

import { useState, useCallback, useRef } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  {
    q: 'How does the PDF conversion work?',
    a: 'The tool loads your HTML in an iframe preview, then opens a print dialog when you click "Save as PDF". Select "Save as PDF" as the printer destination.',
  },
  {
    q: 'Can I use a website URL?',
    a: 'Yes — paste any public URL. The page will load in the preview iframe. Note that some websites block iframe embedding due to their security headers.',
  },
  {
    q: 'Can I paste raw HTML code?',
    a: 'Yes — switch to the "HTML Code" tab, paste your markup, and use "Print HTML" to convert.',
  },
  {
    q: 'Are there any limitations?',
    a: 'Websites using X-Frame-Options or CSP may not load in the iframe. For those, open the URL directly in your browser and use Ctrl+P / Cmd+P to print as PDF.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'HTML to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/html-to-pdf',
      description: 'Convert any webpage or HTML code to a PDF. Paste a URL or HTML and save as PDF. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Markdown to PDF', slug: 'markdown-to-pdf', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'Markdown to PDF' },
  { name: 'Word to PDF',     slug: 'word-to-pdf',     icon: '📝', colorBg: '#EDE9FE', desc: 'Convert .docx to PDF' },
  { name: 'Create PDF',      slug: 'create-pdf',      icon: '➕', colorBg: '#FFF0DC', desc: 'Start from blank' },
]

const PRINT_STYLES = `
  @page { margin: 1in; size: A4; }
  body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #111; }
  img { max-width: 100%; }
  a { color: inherit; text-decoration: none; }
  @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`

export default function HTMLToPDFPage() {
  const [tab, setTab]       = useState<'url' | 'html'>('url')
  const [url, setUrl]       = useState('')
  const [html, setHtml]     = useState('')
  const [iframeSrc, setIframeSrc] = useState('')
  const iframeRef           = useRef<HTMLIFrameElement>(null)

  const handleLoadURL = useCallback(() => {
    let finalUrl = url.trim()
    if (!finalUrl) return
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`
    setIframeSrc(finalUrl)
  }, [url])

  const handlePrintURL = useCallback(() => {
    const win = window.open(iframeSrc, '_blank')
    if (!win) return
    setTimeout(() => { win.focus(); win.print() }, 1500)
  }, [iframeSrc])

  const handlePrintHTML = useCallback(() => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>HTML to PDF</title>
<style>${PRINT_STYLES}</style>
</head><body>${html}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
  }, [html])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 24px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: active ? 600 : 400,
    color: active ? 'var(--ink)' : 'var(--muted)',
    borderBottom: active ? '2px solid var(--amber)' : '2px solid transparent',
    background: 'transparent', transition: 'all 0.15s',
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="HTML to PDF"
        toolSlug="html-to-pdf"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>HTML to PDF </span>
            <span style={{ color: 'var(--amber)' }}>Save Any Webpage as PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Paste a URL or HTML code and save as a PDF using your browser&apos;s print dialog. Free, no upload.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button style={tabStyle(tab === 'url')} onClick={() => setTab('url')}>🌐 URL</button>
            <button style={tabStyle(tab === 'html')} onClick={() => setTab('html')}>{'</>'} HTML Code</button>
          </div>

          <div style={{ padding: '20px' }}>
            {tab === 'url' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLoadURL()}
                    placeholder="https://example.com"
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--ink)' }}
                  />
                  <button onClick={handleLoadURL} style={{ background: 'var(--ink)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Load Page
                  </button>
                </div>
                {iframeSrc && (
                  <>
                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '400px' }}>
                      <iframe ref={iframeRef} src={iframeSrc} style={{ width: '100%', height: '100%', border: 'none' }} title="Page preview" />
                    </div>
                    <button onClick={handlePrintURL} style={{ background: 'var(--amber)', color: 'white', padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      Save as PDF →
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  value={html}
                  onChange={e => setHtml(e.target.value)}
                  placeholder={`<h1>My Document</h1>\n<p>Paste your HTML here…</p>`}
                  rows={14}
                  style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }}
                />
                {html.trim() && (
                  <button onClick={handlePrintHTML} style={{ background: 'var(--amber)', color: 'white', padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
                    Print HTML as PDF →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
          <strong>📄 How to save as PDF:</strong> After clicking the button above, your browser&apos;s print dialog will open. Set the destination to <strong>&quot;Save as PDF&quot;</strong>.
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
