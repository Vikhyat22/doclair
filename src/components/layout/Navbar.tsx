'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(245, 240, 232, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--ink)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 800,
              fontSize: '18px',
              color: 'var(--amber)',
              flexShrink: 0,
            }}>D</div>
            <span style={{
              fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 800,
              fontSize: '22px',
              color: 'var(--ink)',
              letterSpacing: '-0.5px',
            }}>Doclair</span>
          </Link>

          {/* Desktop nav */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {[
              { href: '/tools', label: 'All Tools' },
              { href: '/blog', label: 'Blog' },
              { href: '/faqs', label: 'FAQs' },
              { href: '/install-app', label: 'Install App' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="nav-link" style={{
                fontSize: '14px', fontWeight: 500, color: 'var(--muted)', textDecoration: 'none',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--ink)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--muted)'}
              >{link.label}</Link>
            ))}
            <ThemeToggle />
            <Link href="/tools" style={{
              background: 'var(--ink)',
              color: 'var(--cream)',
              padding: '10px 22px',
              borderRadius: '100px',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.2s, transform 0.15s',
              display: 'inline-block',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}>
              Browse 70+ Tools →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(true)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--ink)',
              padding: '8px',
              opacity: 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            aria-label="Open menu"
          >☰</button>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--cream)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
            <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <div style={{
                width: '36px', height: '36px', background: 'var(--ink)', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--amber)',
              }}>D</div>
              <span style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: 'var(--ink)', letterSpacing: '-0.5px' }}>Doclair</span>
            </Link>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--ink)' }}>✕</button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { href: '/tools', label: 'All Tools' },
              { href: '/blog', label: 'Blog' },
              { href: '/faqs', label: 'FAQs' },
              { href: '/install-app', label: 'Install App' },
            ].map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{
                fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700,
                fontSize: '28px',
                color: 'var(--ink)',
                textDecoration: 'none',
                padding: '20px 0',
                borderBottom: '1px solid var(--border)',
                display: 'block',
              }}>{link.label}</Link>
            ))}
          </nav>
          <Link href="/tools" onClick={() => setMenuOpen(false)} style={{
            marginTop: '40px',
            background: 'var(--ink)',
            color: 'var(--cream)',
            padding: '16px 32px',
            borderRadius: '100px',
            fontSize: '16px',
            fontWeight: 500,
            textDecoration: 'none',
            textAlign: 'center',
            display: 'block',
          }}>Browse 70+ Tools →</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
