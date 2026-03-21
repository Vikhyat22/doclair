import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = toolMetadata(
  'POS Billing',
  'pos-billing',
  'Generate quick thermal print receipts. 100% free, no upload, no watermark.'
)

export default function Page() {
  return (
    <>
      <Navbar />
      <main style={{ padding: '80px 48px', textAlign: 'center', position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 200px)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 52px)',
            letterSpacing: '-1.5px',
            color: 'var(--ink)',
            marginBottom: '16px',
            lineHeight: 1.05,
          }}>POS Billing</h1>
          <p style={{ color: 'var(--muted)', marginTop: '16px', fontSize: '17px', fontWeight: 300, lineHeight: 1.6, marginBottom: '40px' }}>
            Coming soon — this tool is under active development.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
            borderRadius: '100px', background: '#DCFCE7', color: '#166534',
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500,
          }}>✓ 100% Free · No Upload · No Watermark</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
