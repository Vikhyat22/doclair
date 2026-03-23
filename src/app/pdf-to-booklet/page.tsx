'use client'

import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ToolSidebar from '@/components/ui/ToolSidebar'

const SIDEBAR_RELATED = [
  { name: 'Cut PDF',          slug: 'cut-pdf',          icon: '✂️', colorBg: '#DBEAFE', desc: 'Split pages in half' },
  { name: 'PDF Imposition',   slug: 'pdf-imposition',   icon: '📐', colorBg: '#FFF0DC', desc: 'N-up layout' },
  { name: 'Organize Pages',   slug: 'organize-pages',   icon: '📋', colorBg: '#EDE9FE', desc: 'Reorder PDF pages' },
]

export default function PDFToBookletPage() {
  return (
    <ToolPageLayout
      toolName="PDF to Booklet"
      sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
    >
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to Booklet </span>
          <span style={{ color: 'var(--amber)' }}>Arrange for Booklet Printing</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
          Rearrange PDF pages in booklet (saddle-stitch) order for printing folded A5 booklets from A4 sheets.
        </p>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
        <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)', marginBottom: '10px' }}>Coming Soon</div>
        <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 20px' }}>
          Booklet imposition requires complex page reordering and scaling. Full implementation in progress.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Try <a href="/cut-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Cut PDF</a> to split double-page scans, or <a href="/organize-pages" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Organize Pages</a> to reorder manually.
        </p>
      </div>
    </ToolPageLayout>
  )
}
