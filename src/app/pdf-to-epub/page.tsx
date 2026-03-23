'use client'

import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ToolSidebar from '@/components/ui/ToolSidebar'

const SIDEBAR_RELATED = [
  { name: 'PDF to Text',     slug: 'pdf-to-text',     icon: '📝', colorBg: '#FFF0DC', desc: 'Extract plain text' },
  { name: 'PDF to Markdown', slug: 'pdf-to-markdown', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'Convert to Markdown' },
  { name: 'PDF to Word',     slug: 'pdf-to-word',     icon: '📄', colorBg: '#DBEAFE', desc: 'Convert to .docx' },
]

export default function PDFToEpubPage() {
  return (
    <ToolPageLayout
      toolName="PDF to ePub"
      sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
    >
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to ePub </span>
          <span style={{ color: 'var(--amber)' }}>Convert to eBook Format</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
          Convert PDF files to ePub format for reading on Kindle, Kobo, Apple Books and other eReaders.
        </p>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
        <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)', marginBottom: '10px' }}>Coming Soon</div>
        <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 20px' }}>
          ePub generation requires complex layout reflow. We&apos;re working on a high-quality implementation.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          In the meantime, use <a href="/pdf-to-text" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>PDF to Text</a> to extract content, then convert using Calibre.
        </p>
      </div>
    </ToolPageLayout>
  )
}
