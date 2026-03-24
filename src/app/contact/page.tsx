import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Contact — Doclair',
  description: 'Contact Doclair for support, sponsorship, or general enquiries.',
  alternates: { canonical: 'https://doclair.in/contact' },
  openGraph: {
    title: 'Contact — Doclair',
    description: 'Contact Doclair for support, sponsorship, or general enquiries.',
    url: 'https://doclair.in/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact — Doclair',
    description: 'Contact Doclair for support, sponsorship, or general enquiries.',
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Doclair',
  description: 'Contact Doclair for support, sponsorship, or general enquiries.',
  url: 'https://doclair.in/contact',
  publisher: {
    '@type': 'Organization',
    name: 'Doclair',
    url: 'https://doclair.in',
    email: 'hello@doclair.in',
    logo: { '@type': 'ImageObject', url: 'https://doclair.in/icon.png' },
  },
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <div style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '720px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>// contact</div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-2px', color: 'var(--ink)', marginBottom: '16px', lineHeight: 1.05 }}>Contact</h1>
          <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, marginBottom: '48px', lineHeight: 1.6 }}>We&apos;re a small, independent team. Expect a response within 2–3 business days.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px' }}>
              <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '8px' }}>General Enquiries</h2>
              <p style={{ fontSize: '15px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '12px' }}>For questions about tools, bug reports, or feature requests:</p>
              <a href="mailto:hello@doclair.in" style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '14px', color: 'var(--amber)', textDecoration: 'none' }}>hello@doclair.in</a>
            </div>
            <div style={{ background: 'var(--ink)', borderRadius: '14px', padding: '28px' }}>
              <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'white', marginBottom: '8px' }}>Tool Sponsorship Slots</h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '16px' }}>We offer direct sidebar sponsorship slots on high-traffic tool pages. No ad network, no per-click billing — flat monthly rate. Relevant tools and SaaS products only.</p>
              <a href="mailto:hello@doclair.in" style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '14px', color: 'var(--amber)', textDecoration: 'none' }}>hello@doclair.in</a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
