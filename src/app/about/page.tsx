import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'About Doclair — Privacy-First PDF Tools',
  description: 'Learn how Doclair works and why we built a 100% browser-based document processing suite.',
  alternates: { canonical: 'https://doclair.com/about' },
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <div style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '720px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>// about</div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-2px', color: 'var(--ink)', marginBottom: '32px', lineHeight: 1.05 }}>About Doclair</h1>

          {[
            {
              title: 'Our Mission',
              body: 'We built Doclair because we believe your documents are private by nature. When you process a legal contract, a medical record, or a business proposal, that file should never touch a remote server — not even ours.',
            },
            {
              title: 'How It Works',
              body: 'Doclair uses WebAssembly and modern JavaScript APIs to run document processing entirely inside your browser. When you open a tool and drop in a file, it is loaded into your device\'s memory and processed on your CPU. The result is a file that downloads directly to your device.',
            },
            {
              title: 'Tech Stack Transparency',
              body: 'Our tools are powered by open-source libraries: pdf-lib for PDF creation and modification, pdf.js for rendering and text extraction, Tesseract.js for OCR, and the Claude API (via server-side routes) for AI features — where only extracted text is sent, never the file itself.',
            },
            {
              title: 'Privacy by Architecture',
              body: 'Privacy is not a policy here — it is an architectural guarantee. We cannot see your files even if we wanted to. There are no upload endpoints, no cloud storage, and no document processing servers. It is physically impossible for us to access your content.',
            },
            {
              title: 'Independent & Sustainable',
              body: 'Doclair is independently built and sustained through direct tool sponsorships. We do not accept VC funding, run AdSense, or sell user data. We believe a free tool should actually be free — no degradation, no watermarks, no hidden limits.',
            },
          ].map(s => (
            <div key={s.title} style={{ marginBottom: '36px' }}>
              <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)', marginBottom: '10px' }}>{s.title}</h2>
              <p style={{ fontSize: '16px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.75 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  )
}
