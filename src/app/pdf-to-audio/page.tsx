'use client'

import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ToolSidebar from '@/components/ui/ToolSidebar'

const SIDEBAR_RELATED = [
  { name: 'PDF to Text',   slug: 'pdf-to-text',   icon: '📝', colorBg: '#FFF0DC', desc: 'Extract plain text first' },
  { name: 'OCR PDF',       slug: 'ocr-pdf',       icon: '🔍', colorBg: '#EDE9FE', desc: 'Make scanned PDF searchable' },
  { name: 'Chat with PDF', slug: 'chat-with-pdf', icon: '💬', colorBg: '#DBEAFE', desc: 'Ask questions about PDF' },
]

export default function PDFToAudioPage() {
  return (
    <ToolPageLayout
      toolName="PDF to Audio"
      toolSlug="pdf-to-audio"
      sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
    >
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to Audio </span>
          <span style={{ color: 'var(--amber)' }}>Text-to-Speech Conversion</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
          Convert PDF text to spoken audio. Listen to your documents while commuting or working.
        </p>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎧</div>
        <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)', marginBottom: '10px' }}>Coming Soon</div>
        <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 20px' }}>
          We&apos;re implementing high-quality text-to-speech using the Web Speech API for natural-sounding audio output.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Try <a href="/pdf-to-text" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>PDF to Text</a> first, then paste into any TTS app.
        </p>
      </div>
    </ToolPageLayout>
  )
}
