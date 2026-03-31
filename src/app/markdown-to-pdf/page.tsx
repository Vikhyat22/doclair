'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { markdownToHTML } from '@/lib/pdf/markdownToPdf'

const FAQS = [
  {
    q: 'What Markdown features are supported?',
    a: 'Headings (H1-H3), bold, italic, unordered and ordered lists, tables, blockquotes, code blocks and inline code are all supported.',
  },
  {
    q: 'How does the PDF export work?',
    a: 'Clicking "Export as PDF" opens a print dialog in your browser. Select "Save as PDF" as the destination to create a PDF file.',
  },
  {
    q: 'Can I upload a .md file instead of pasting?',
    a: 'Yes — use the "Upload .md file" button above the editor to load any Markdown file directly.',
  },
  {
    q: 'Is there a character limit?',
    a: 'There is no hard limit in the browser, but very large documents (100k+ characters) may take a moment to render.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Markdown to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/markdown-to-pdf',
      description: 'Convert .md files or pasted Markdown to a clean formatted PDF. Supports tables, code blocks, headings. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'Markdown to PDF', item: 'https://doclair.in/markdown-to-pdf' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Text to PDF',   slug: 'text-to-pdf',   icon: '📄', colorBg: '#F3F4F6', desc: 'Plain text to PDF' },
  { name: 'HTML to PDF',   slug: 'html-to-pdf',   icon: '🌐', colorBg: '#DBEAFE', desc: 'HTML / URL to PDF' },
  { name: 'Word to PDF',   slug: 'word-to-pdf',   icon: '📝', colorBg: '#EDE9FE', desc: 'Convert .docx to PDF' },
  { name: 'Create PDF',    slug: 'create-pdf',    icon: '➕', colorBg: '#FFF0DC', desc: 'Start from blank' },
]

const PLACEHOLDER = `# My Document

## Introduction
This is **bold** and *italic* text.

- List item 1
- List item 2
- List item 3

## Table Example

| Column 1 | Column 2 |
|----------|----------|
| Data A   | Data B   |
| Data C   | Data D   |

> Blockquote example

\`\`\`
code block example
\`\`\`
`

const PRINT_STYLES = `
  @page { margin: 1in; size: A4; }
  body { font-family: Georgia, serif; font-size: 12pt; color: #111; line-height: 1.7; }
  h1 { font-size: 24pt; font-weight: bold; margin-bottom: 12pt; }
  h2 { font-size: 18pt; font-weight: bold; margin-top: 20pt; margin-bottom: 8pt; }
  h3 { font-size: 14pt; font-weight: bold; margin-top: 16pt; margin-bottom: 6pt; }
  code { font-family: 'Courier New', monospace; background: #f4f4f4; padding: 1pt 4pt; border-radius: 2pt; font-size: 10pt; }
  pre { background: #f4f4f4; padding: 12pt; border-radius: 4pt; overflow: hidden; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
  td, th { border: 1px solid #ccc; padding: 4pt 8pt; text-align: left; }
  th { background: #f4f4f4; font-weight: bold; }
  blockquote { border-left: 3pt solid #E8820C; padding-left: 12pt; color: #555; margin: 12pt 0; }
  ul, ol { padding-left: 20pt; }
  li { margin-bottom: 4pt; }
  hr { border: none; border-top: 1px solid #ccc; margin: 16pt 0; }
`

export default function MarkdownToPDFPage() {
  const [markdown, setMarkdown] = useState(PLACEHOLDER)
  const [html, setHtml]         = useState('')
  const fileInputRef            = useRef<HTMLInputElement>(null)

  useEffect(() => {
    markdownToHTML(markdown).then(setHtml).catch(() => setHtml('<p>Parsing error</p>'))
  }, [markdown])

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then(text => setMarkdown(text))
    e.target.value = ''
  }, [])

  const handleExport = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Markdown PDF</title>
<style>${PRINT_STYLES}</style>
</head><body>${html}</body></html>`)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 500)
  }, [html])

  return (
    <>
<ToolPageLayout
        toolName="Markdown to PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Markdown to PDF </span>
            <span style={{ color: 'var(--amber)' }}>Convert .md Files to PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Paste Markdown or upload a .md file and export as a clean formatted PDF. Supports tables, code blocks, headings. Free, no upload.
          </p>
        </div>

        {/* Two-panel editor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', minHeight: '500px' }}>
          {/* Left: Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Markdown</span>
              <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: '11px', color: 'var(--amber)', background: 'none', border: '1px solid var(--amber)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                Upload .md
              </button>
              <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleUpload} style={{ display: 'none' }} />
            </div>
            <textarea
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              style={{ flex: 1, padding: '16px', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', lineHeight: 1.7, color: 'var(--ink)', background: 'white' }}
              placeholder="Type or paste Markdown here…"
            />
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)', background: '#FAFAFA' }}>
              {markdown.length.toLocaleString()} characters
            </div>
          </div>

          {/* Right: Preview */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#FAFAFA' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Preview</span>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: html }}
              style={{
                flex: 1, padding: '16px', overflowY: 'auto', fontSize: '14px', lineHeight: 1.7, color: 'var(--ink)',
                fontFamily: 'Georgia, serif',
              }}
            />
          </div>
        </div>

        {/* Export */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
            <strong>📄 Export as PDF:</strong> Your browser will open a print dialog. Select &quot;Save as PDF&quot; as the destination.
          </div>
          <button onClick={handleExport} style={{ background: 'var(--amber)', color: 'white', padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Export as PDF →
          </button>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Convert Markdown to PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Markdown is the go-to format for developers, writers, and note-takers. Converting to PDF gives you a shareable, printable version with proper formatting for headings, code blocks, and lists.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Paste or type your Markdown into the editor, or upload a .md file.</strong> The preview updates in real time.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Preview the rendered output on the right.</strong> Check formatting before exporting.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Save as PDF — the browser&apos;s print dialog opens.</strong> No server processing required.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Select &apos;Save as PDF&apos; and download.</strong> The formatted document is saved to your device.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>What Markdown features are supported?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Doclair renders standard Markdown including headings (H1–H6), bold and italic, ordered and unordered lists, inline code and code blocks with syntax highlighting, blockquotes, horizontal rules, and links.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Markdown to PDF on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Type or upload your Markdown, preview it, and use your browser&apos;s print flow to save the PDF to your Files app.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>

      <style>{`
        .markdown-preview h1 { font-size: 24px; font-weight: bold; margin-bottom: 12px; }
        .markdown-preview h2 { font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 8px; }
        .markdown-preview h3 { font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 6px; }
        .markdown-preview code { font-family: 'DM Mono', monospace; background: #F3F4F6; padding: 1px 6px; border-radius: 3px; font-size: 12px; }
        .markdown-preview pre { background: #F3F4F6; padding: 12px; border-radius: 8px; overflow-x: auto; }
        .markdown-preview table { border-collapse: collapse; width: 100%; }
        .markdown-preview td, .markdown-preview th { border: 1px solid #E5E7EB; padding: 6px 10px; }
        .markdown-preview th { background: #F9FAFB; font-weight: 600; }
        .markdown-preview blockquote { border-left: 3px solid #E8820C; padding-left: 12px; color: #6B7280; margin: 12px 0; }
      `}</style>
    </>
  )
}
