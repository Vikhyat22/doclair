'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { TOOLS, CATEGORY_ICON_BG } from '@/constants/tools'
import ToolSearchFilter, { ToolEmptyState } from '@/components/ui/ToolSearchFilter'

export default function ToolsPage() {
  const [filteredTools, setFilteredTools] = useState(TOOLS)
  const [activeSearch, setActiveSearch] = useState('')
  const [resetSignal, setResetSignal] = useState(0)

  const handleFiltered = useCallback((tools: typeof TOOLS) => {
    setFilteredTools(tools)
  }, [])

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
          <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '560px', marginBottom: '32px', lineHeight: 1.6 }}>
            Every tool runs in your browser. No upload. No watermark.
          </p>

          <ToolSearchFilter
            tools={TOOLS}
            onFiltered={handleFiltered}
            onSearchChange={setActiveSearch}
            showResultCount={true}
            resetSignal={resetSignal}
          />

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            border: '1px solid var(--border)', borderRadius: '16px',
            overflow: 'hidden', background: 'white',
          }} className="tools-grid">
            {filteredTools.length === 0 && (
              <ToolEmptyState
                searchText={activeSearch}
                onClear={() => { setFilteredTools(TOOLS); setActiveSearch(''); setResetSignal(s => s + 1) }}
              />
            )}
            {filteredTools.map((tool) => (
              <Link key={tool.id} href={`/${tool.slug}`} className="tool-card" style={{
                padding: '24px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', position: 'relative',
                textDecoration: 'none', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '4px' }}>
                  {tool.ai && <span style={{ padding: '3px 7px', borderRadius: '100px', background: '#EDE9FE', color: '#5B21B6', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500, textTransform: 'uppercase' }}>AI</span>}
                  {tool.in && <span style={{ padding: '3px 7px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500 }}>IN 🇮🇳</span>}
                  {tool.isNew && <span style={{ padding: '3px 7px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500, textTransform: 'uppercase' }}>New</span>}
                </div>
                <div className="tool-icon" style={{ width: '44px', height: '44px', borderRadius: '10px', background: CATEGORY_ICON_BG[tool.category] || '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '14px', flexShrink: 0 }}>{tool.icon}</div>
                <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginBottom: '5px', lineHeight: 1.2 }}>{tool.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.55, lineHeight: 1.5, flex: 1 }}>{tool.desc}</div>
                <div className="tool-arrow">→</div>
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
