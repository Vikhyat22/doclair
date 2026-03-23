'use client'

import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ToolSidebar from '@/components/ui/ToolSidebar'

const SIDEBAR_RELATED = [
  { name: 'PDF to Booklet', slug: 'pdf-to-booklet', icon: '📚', colorBg: '#FFF0DC', desc: 'Booklet layout' },
  { name: 'Cut PDF',        slug: 'cut-pdf',        icon: '✂️', colorBg: '#DBEAFE', desc: 'Split pages in half' },
  { name: 'Crop PDF',       slug: 'crop-pdf',       icon: '🖼', colorBg: '#EDE9FE', desc: 'Trim page margins' },
]

export default function PDFImpositionPage() {
  return (
    <ToolPageLayout
      toolName="PDF Imposition"
      sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
    >
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF Imposition </span>
          <span style={{ color: 'var(--amber)' }}>N-Up Print Layout</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
          Arrange multiple PDF pages on a single sheet — 2-up, 4-up, or custom grid layouts for efficient printing.
        </p>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📐</div>
        <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)', marginBottom: '10px' }}>Coming Soon</div>
        <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 20px' }}>
          N-up imposition requires precise page tiling. Full implementation with 2-up, 4-up, and booklet modes in progress.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          In the meantime, use <a href="/pdf-to-booklet" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>PDF to Booklet</a> for saddle-stitch printing.
        </p>
      </div>
    </ToolPageLayout>
  )
}
