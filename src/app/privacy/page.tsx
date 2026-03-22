import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — Doclair',
  description: 'Doclair privacy policy — how we handle your files and data.',
  alternates: { canonical: 'https://doclair.in/privacy' },
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '720px' }}>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1.5px', color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.1 }}>Privacy Policy</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '48px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>Last updated: March 2026</p>

          {[
            {
              title: 'Files Are Never Uploaded',
              body: 'All file processing happens entirely in your browser using WebAssembly and JavaScript. Your files are never transmitted to Doclair servers or any third-party servers. This is an architectural guarantee — not a policy.',
            },
            {
              title: 'What We Collect',
              body: 'We use Plausible Analytics for anonymous, aggregate page view counts. Plausible does not use cookies, does not track individuals, and is GDPR-compliant by design. We collect no file content, no personal identifiers, and no usage patterns at the file level.',
            },
            {
              title: 'Cookies',
              body: 'We do not set any advertising or tracking cookies. Plausible Analytics is cookieless. The only browser storage we may use is for app preferences (theme, settings) stored locally on your device.',
            },
            {
              title: 'AI Features',
              body: 'For AI-powered tools (Chat with PDF, AI Summarizer), only extracted text from your PDF is sent to our API route, which then calls the Claude API. The PDF file itself never leaves your device. Text is not stored beyond the duration of your session.',
            },
            {
              title: 'Memory Cleared on Exit',
              body: 'All file data loaded into browser memory is automatically cleared when you close the browser tab. We have no persistent storage of your document content.',
            },
            {
              title: 'Third Parties',
              body: 'We do not sell, share, or license your data to any third party. We do not use advertising networks or data brokers.',
            },
            {
              title: 'Contact',
              body: 'For privacy questions, contact us at the address listed on our contact page.',
            },
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
