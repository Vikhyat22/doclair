import Link from 'next/link'
import Navbar from './Navbar'
import Footer from './Footer'

interface ToolPageLayoutProps {
  toolName: string
  toolSlug: string
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export default function ToolPageLayout({
  toolName,
  children,
  sidebar,
}: ToolPageLayoutProps) {
  return (
    <>
      <Navbar />

      {/* Breadcrumb */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--cream)',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
          fontSize: '12px',
        }}>
          <Link href="/" style={{ color: 'var(--ink)', opacity: 0.45, textDecoration: 'none' }}>Home</Link>
          <span style={{ opacity: 0.25, fontSize: '11px' }}>›</span>
          <Link href="/tools" style={{ color: 'var(--ink)', opacity: 0.45, textDecoration: 'none' }}>Tools</Link>
          <span style={{ opacity: 0.25, fontSize: '11px' }}>›</span>
          <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{toolName}</span>
        </div>
      </div>

      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '32px 32px 80px',
        display: 'flex',
        gap: '32px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {children}
        </div>

        {/* Sidebar — desktop only */}
        {sidebar && (
          <>
            <aside className="tool-sidebar" style={{
              width: '290px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'sticky',
              top: '100px',
              alignSelf: 'flex-start',
              height: 'fit-content',
            }}>
              {sidebar}
            </aside>
          </>
        )}
      </main>

      {/* Mobile sidebar strip — below FAQ */}
      {sidebar && (
        <div className="tool-sidebar-mobile" style={{ display: 'none', padding: '0 20px 40px' }}>
          {sidebar}
        </div>
      )}

      <Footer />

      <style>{`
        @media (max-width: 1023px) {
          .tool-sidebar { display: none !important; }
          .tool-sidebar-mobile { display: block !important; }
        }
        @media (max-width: 767px) {
          main { padding: 24px 20px 60px !important; }
        }
      `}</style>
    </>
  )
}
