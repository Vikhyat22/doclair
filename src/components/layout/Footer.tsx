'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TOOLS } from '@/constants/tools'

function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    // In production wire this to an email service (Mailchimp, Resend, etc.)
    setStatus('done')
  }

  if (status === 'done') {
    return <p style={{ color: 'var(--amber)', fontWeight: 600, fontSize: 14 }}>Thanks! We&apos;ll keep you posted.</p>
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        style={{
          flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)',
          color: 'white', fontSize: 14, outline: 'none',
        }}
      />
      <button type="submit" style={{
        padding: '10px 20px', borderRadius: 8, border: 'none',
        background: 'var(--amber)', color: 'var(--ink)',
        fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        Subscribe
      </button>
    </form>
  )
}

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
          </div>
        </div>

        {/* Newsletter */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '40px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'white', margin: '0 0 4px' }}>Stay in the loop</p>
            <small style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>New tools, tips, and updates. No spam — ever.</small>
          </div>
          <div style={{ flex: 1, maxWidth: 420 }}>
            <NewsletterForm />
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
