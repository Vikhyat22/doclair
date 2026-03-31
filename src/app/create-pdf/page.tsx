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
        { '@type': 'ListItem', position: 3, name: 'Create PDF', item: 'https://doclair.in/create-pdf' },
      ],
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
<ToolPageLayout
        toolName="Create PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
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

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Create a PDF from Scratch — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Need a blank PDF with custom page size and orientation? Or want to quickly type content into a new document and save it as PDF? Doclair&apos;s Create PDF tool handles both.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose your page size (A4, Letter, or custom dimensions) and orientation.</strong> Portrait or landscape, your choice.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Type or paste your content into the editor.</strong> Use the toolbar for headings, bold, italic, and lists.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Adjust font size and margins if needed.</strong> Preview updates in real time.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Create PDF to download.</strong> Your browser&apos;s print dialog opens — select &apos;Save as PDF&apos;.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            When to create a PDF vs convert one?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Use Create PDF when you need a new document from scratch — for blank forms, cover pages, or simple text documents. For converting existing files (Word, Excel, images), use the dedicated conversion tools in the Convert category.
          </p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            Create PDF on iPhone and Android
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
            Doclair works in mobile Safari and Chrome. Type your content, configure the page settings, and download the PDF directly to your device without installing any app.
          </p>
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
