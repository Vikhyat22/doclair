'use client'

import { useState, useCallback, useRef } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  {
    q: 'How does the PDF export work?',
    a: 'Clicking "Generate PDF" opens a browser print dialog. Select "Save as PDF" as the destination to download a formatted PDF file.',
  },
  {
    q: 'What formatting is supported?',
    a: 'Headings (H1, H2), bold, italic, bulleted lists, and numbered lists. Click the toolbar buttons to apply formatting.',
  },
  {
    q: 'Can I paste content from another document?',
    a: 'Yes — paste text into the editor. Basic formatting from rich text sources may be preserved.',
  },
  {
    q: 'Is there a character or page limit?',
    a: 'There is no hard limit. The PDF will span as many pages as needed for your content.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Create PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/create-pdf',
      description: 'Create a new PDF from scratch using a rich text editor. Add headings, paragraphs and lists. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Markdown to PDF', slug: 'markdown-to-pdf', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'From Markdown' },
  { name: 'Text to PDF',     slug: 'text-to-pdf',     icon: '📄', colorBg: '#FFF0DC', desc: 'From plain text' },
  { name: 'HTML to PDF',     slug: 'html-to-pdf',     icon: '🌐', colorBg: '#DBEAFE', desc: 'From HTML / URL' },
  { name: 'Word to PDF',     slug: 'word-to-pdf',     icon: '📝', colorBg: '#EDE9FE', desc: 'Convert .docx' },
]

const PRINT_STYLES = `
  @page { margin: 1in; size: A4; }
  body { font-family: Georgia, serif; font-size: 12pt; color: #111; line-height: 1.7; }
  h1 { font-size: 24pt; font-weight: bold; margin-bottom: 12pt; margin-top: 0; }
  h2 { font-size: 18pt; font-weight: bold; margin-top: 20pt; margin-bottom: 8pt; }
  ul, ol { padding-left: 20pt; }
  li { margin-bottom: 4pt; }
  p { margin: 6pt 0; }
  b, strong { font-weight: bold; }
  i, em { font-style: italic; }
`

interface ToolbarButton {
  label: string
  title: string
  cmd:   string
  value?: string
}

const TOOLBAR: ToolbarButton[] = [
  { label: 'H1',  title: 'Heading 1',    cmd: 'formatBlock', value: 'H1'  },
  { label: 'H2',  title: 'Heading 2',    cmd: 'formatBlock', value: 'H2'  },
  { label: 'B',   title: 'Bold',         cmd: 'bold'                       },
  { label: 'I',   title: 'Italic',       cmd: 'italic'                     },
  { label: '• UL', title: 'Bullet list', cmd: 'insertUnorderedList'        },
  { label: '1. OL', title: 'Ordered list', cmd: 'insertOrderedList'        },
]

export default function CreatePDFPage() {
  const editorRef   = useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const execCmd = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }, [])

  const handleInput = useCallback(() => {
    const text = editorRef.current?.innerText?.trim()
    setIsEmpty(!text)
  }, [])

  const handleGenerate = useCallback(() => {
    const content = editorRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>My Document</title>
<style>${PRINT_STYLES}</style>
</head><body>${content}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
  }, [])

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px',
    background: active ? '#FFF8F0' : 'white', color: active ? 'var(--amber)' : 'var(--ink)',
    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
    fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
    transition: 'all 0.15s',
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Create PDF"
        toolSlug="create-pdf"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Create PDF </span>
            <span style={{ color: 'var(--amber)' }}>Start from Blank Document</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Create a new PDF from scratch using a rich text editor. Add headings, paragraphs, lists. Free, no upload.
          </p>
        </div>

        {/* Editor */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#FAFAFA', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {TOOLBAR.map(btn => (
              <button key={btn.cmd + btn.value} style={btnStyle()} title={btn.title} onClick={() => execCmd(btn.cmd, btn.value)}>
                {btn.label}
              </button>
            ))}
            <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
              Select text then click a format button
            </span>
          </div>

          {/* Content editable */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            suppressContentEditableWarning
            data-placeholder="Start typing your document here…"
            style={{
              minHeight: '400px',
              padding: '24px 28px',
              outline: 'none',
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--ink)',
              fontFamily: 'Georgia, serif',
            }}
          />
        </div>

        {!isEmpty && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleGenerate} style={{ background: 'var(--ink)', color: 'white', padding: '14px 32px', borderRadius: '100px', fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Generate PDF →
            </button>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Browser print dialog will open → select &quot;Save as PDF&quot;</span>
          </div>
        )}

        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
          <strong>📄 Tip:</strong> For more powerful formatting, use <a href="/markdown-to-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Markdown to PDF</a> or convert a <a href="/word-to-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Word document</a>.
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>
    </>
  )
}
