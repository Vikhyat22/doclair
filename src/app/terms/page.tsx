import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service — Doclair',
  description: 'Doclair terms of service.',
  alternates: { canonical: 'https://doclair.in/terms' },
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '720px' }}>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1.5px', color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.1 }}>Terms of Service</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '48px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>Last updated: March 2026</p>
          {[
            { title: 'Free Forever Commitment', body: 'All core tools on Doclair are and will remain free to use with no daily usage limits. We may introduce a Pro tier for advanced features, but existing free tools will not be restricted.' },
            { title: 'Acceptable Use', body: 'You may not use Doclair to process files containing illegal content, including but not limited to child sexual abuse material, content that violates copyright without permission, or files used to facilitate illegal activities.' },
            { title: 'No Liability for Files', body: 'All processing is client-side. We cannot access or recover your files. We are not liable for file corruption, data loss, or output quality. Always keep backups of important documents.' },
            { title: 'Sponsorship Placements', body: 'We reserve the right to display relevant sponsor content in designated sidebar areas. Sponsor content is clearly distinguished from tool functionality and does not affect how tools operate.' },
            { title: 'Changes to Terms', body: 'We may update these terms. Continued use of Doclair after changes constitutes acceptance. Material changes will be announced on our website.' },
          ].map(s => (
            <div key={s.title} style={{ marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '8px' }}>{s.title}</h2>
              <p style={{ fontSize: '15px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.75 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  )
}
