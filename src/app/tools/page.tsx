'use client'

import type { Metadata } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { TOOLS, CATEGORIES, CATEGORY_ICON_BG } from '@/constants/tools'

export default function ToolsPage() {
  const [activeCat, setActiveCat] = useState('All Tools')

  const filteredTools = activeCat === 'All Tools'
    ? TOOLS
    : TOOLS.filter(t => t.category === activeCat)

  return (
    <>
      <Navbar />
      <section style={{ padding: '64px 0 40px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner">
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
            color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px',
          }}>55+ Free Tools</div>
          <h1 style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-2px', color: 'var(--ink)',
            marginBottom: '16px', lineHeight: 1.05,
          }}>All PDF &amp; Document Tools</h1>
          <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '560px', marginBottom: '40px', lineHeight: 1.6 }}>
            Every tool runs in your browser. No upload. No watermark.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '40px' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)} style={{
                padding: '9px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
                border: `1px solid ${activeCat === cat ? 'var(--ink)' : 'rgba(26,22,18,0.15)'}`,
                background: activeCat === cat ? 'var(--ink)' : 'transparent',
                color: activeCat === cat ? 'white' : 'var(--ink)',
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
              }}>{cat}</button>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            border: '1px solid var(--border)', borderRadius: '16px',
            overflow: 'hidden', background: 'white',
          }} className="tools-grid">
            {filteredTools.map((tool) => (
              <Link key={tool.id} href={`/${tool.slug}`} style={{
                padding: '24px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.18s', position: 'relative',
                textDecoration: 'none', display: 'flex', flexDirection: 'column', background: 'white',
              }}>
                <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '4px' }}>
                  {tool.ai && <span style={{ padding: '3px 7px', borderRadius: '100px', background: '#EDE9FE', color: '#5B21B6', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500, textTransform: 'uppercase' }}>AI</span>}
                  {tool.in && <span style={{ padding: '3px 7px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500 }}>IN 🇮🇳</span>}
                  {tool.isNew && <span style={{ padding: '3px 7px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500, textTransform: 'uppercase' }}>New</span>}
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: CATEGORY_ICON_BG[tool.category] || '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '14px', flexShrink: 0 }}>{tool.icon}</div>
                <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginBottom: '5px', lineHeight: 1.2 }}>{tool.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.55, lineHeight: 1.5, flex: 1 }}>{tool.desc}</div>
                <div style={{ marginTop: '14px', fontSize: '16px', color: 'var(--amber)', width: 'fit-content' }}>→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
      <style>{`
        @media (min-width: 1100px) { .tools-grid { grid-template-columns: repeat(4,1fr) !important; } }
        @media (max-width: 1099px) and (min-width: 768px) { .tools-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 767px) and (min-width: 600px) { .tools-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 599px) { .tools-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}
