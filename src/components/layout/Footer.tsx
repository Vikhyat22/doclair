'use client'

import Link from 'next/link'
import { TOOLS } from '@/constants/tools'

export default function Footer() {
  const year = new Date().getFullYear()

  const essentials = TOOLS.filter(t => t.category === 'Essentials').slice(0, 8)
  const editConvert = [
    ...TOOLS.filter(t => t.category === 'Edit & Organize').slice(0, 3),
    ...TOOLS.filter(t => t.category === 'Convert').slice(0, 3),
  ]

  return (
    <footer style={{ background: 'var(--ink)', padding: '72px 0 32px', position: 'relative', zIndex: 1 }}>
      <div className="section-inner">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
          gap: '48px',
          marginBottom: '56px',
        }} className="footer-top">
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px', background: 'var(--amber)', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--ink)',
              }}>D</div>
              <span style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--cream)', letterSpacing: '-0.5px' }}>Doclair</span>
            </Link>
            <p style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--amber)', marginBottom: '8px' }}>
              Your files. Your rules. Forever free.
            </p>
            <small style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6', display: 'block' }}>
              The world&apos;s most capable browser-based document processing suite. Private by design.
            </small>
          </div>

          {/* Essentials */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'white', marginBottom: '20px' }}>Essentials</h4>
            {essentials.map(t => (
              <Link key={t.id} href={`/${t.slug}`} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', marginBottom: '12px', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'white'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.45)'}>
                {t.name}
              </Link>
            ))}
          </div>

          {/* Edit & Convert */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'white', marginBottom: '20px' }}>Edit &amp; Convert</h4>
            {editConvert.map(t => (
              <Link key={t.id} href={`/${t.slug}`} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', marginBottom: '12px', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'white'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.45)'}>
                {t.name}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'white', marginBottom: '20px' }}>Company</h4>
            {[
              { href: '/blog', label: 'Blog' },
              { href: '/about', label: 'About' },
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/faqs', label: 'FAQs' },
              { href: '/install-app', label: 'Install App' },
              { href: '/contact', label: 'Contact' },
              { href: '/terms', label: 'Terms' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', marginBottom: '12px', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'white'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.45)'}>
                {link.label}
              </Link>
            ))}
            {/* Social links */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <a href="https://x.com/vikhyatg22" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'white'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.linkedin.com/in/vikhyat-gupta-401978257" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'white'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
            © {year} Doclair. All processing happens in your browser.
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['ZERO UPLOAD', 'NO WATERMARK', 'ALWAYS FREE'].map(label => (
              <span key={label} className="footer-badge" style={{
                padding: '4px 10px',
                borderRadius: '100px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .footer-top { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 599px) {
          .footer-top { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
