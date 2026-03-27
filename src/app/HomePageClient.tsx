'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { TOOLS, CATEGORY_ICON_BG } from '@/constants/tools'
import ToolSearchFilter, { ToolEmptyState } from '@/components/ui/ToolSearchFilter'
import { HOME_FAQS } from '@/constants/faqs'

function NoWatermarkMiniIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.7l1.6 1 1.9-.1.8 1.7 1.5 1.1-.5 1.8.5 1.8-1.5 1.1-.8 1.7-1.9-.1-1.6 1-1.6-1-1.9.1-.8-1.7-1.5-1.1.5-1.8-.5-1.8 1.5-1.1.8-1.7 1.9.1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m5.85 8.1 1.15 1.15 2.8-2.95"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function OnDeviceMiniIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="2.2"
        y="3.1"
        width="11.6"
        height="8.8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M5.2 5.7h5.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6.1 9.45h3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7.2 13.2h1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function OfflineMiniIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.05 6.1a7.4 7.4 0 0 1 9.9 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5.05 8.7a4.35 4.35 0 0 1 5.9 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7.95 11.7h.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m3.2 3.3 9.6 9.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function NoSignupMiniIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.05" cy="5.2" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.95 11.55c.7-1.75 2-2.7 3.95-2.7.95 0 1.8.2 2.45.65" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="m10.65 9.7 2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="m13.15 9.7-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function NoCapMiniIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.8 8.1c0 1.45.95 2.45 2.3 2.45 2.1 0 2.55-4.1 5-4.1 1.75 0 3.1 1.35 3.1 3.05s-1.35 3.05-3.1 3.05c-2.45 0-2.9-4.1-5-4.1-1.35 0-2.3 1-2.3 2.45z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const TRUST_BAR_ITEMS = [
  { icon: NoWatermarkMiniIcon, text: 'No watermark, ever' },
  { icon: OnDeviceMiniIcon, text: 'Files stay on device' },
  { icon: OfflineMiniIcon, text: 'Works offline' },
  { icon: NoSignupMiniIcon, text: 'No sign-up required' },
  { icon: NoCapMiniIcon, text: 'No file size cap' },
]

export default function HomePageClient() {
  const [filteredTools, setFilteredTools] = useState(TOOLS)
  const [activeSearch, setActiveSearch] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const toolsSectionRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const handleFiltered = useCallback((tools: typeof TOOLS) => {
    setFilteredTools(tools)
  }, [])

  const trustItemHover: TargetAndTransition | undefined = shouldReduceMotion
    ? undefined
    : {
        y: -1,
        backgroundColor: 'rgba(26,22,18,0.03)',
        transition: {
          type: 'spring' as const,
          stiffness: 420,
          damping: 30,
          mass: 0.9,
        },
      }

  const trustIconHover: TargetAndTransition | undefined = shouldReduceMotion
    ? undefined
    : {
        scale: 1.03,
        transition: {
          type: 'spring' as const,
          stiffness: 420,
          damping: 28,
        },
      }

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 'min(728px, calc(100vh - 68px))',
        position: 'relative',
        zIndex: 1,
      }} className="hero-grid">

        {/* Hero Left */}
        <div style={{
          padding: '52px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: '680px',
        }} className="hero-left">
          {/* Live badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '100px',
            border: '1px solid rgba(26,22,18,0.15)',
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(8px)',
            marginBottom: '28px',
            width: 'fit-content',
            animation: 'fadeUp 0.6s ease both',
            animationDelay: '0.05s',
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink)',
            }}>100% browser-based · zero upload</span>
          </div>

          {/* H1 */}
          <h1 className="hero-headline" style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 0.98,
            letterSpacing: '-1.6px',
            color: 'var(--ink)',
            marginBottom: '24px',
            animation: 'fadeUp 0.6s ease both',
            animationDelay: '0.12s',
          }}>
            <span style={{ display: 'inline-block' }}>Your files.</span><br />
            <span style={{ display: 'inline-block' }}>Your device.</span><br />
            <span style={{
              color: 'var(--amber)',
              position: 'relative',
              display: 'inline-block',
            }}>
              Your rules.
              <span style={{
                position: 'absolute',
                bottom: '-3px',
                left: 0,
                right: 0,
                height: '2px',
                background: 'var(--amber)',
                borderRadius: '2px',
                display: 'block',
              }} />
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '17px',
            fontWeight: 300,
            lineHeight: 1.65,
            color: 'var(--ink)',
            opacity: 0.72,
            maxWidth: '460px',
            marginBottom: '18px',
            animation: 'fadeUp 0.6s ease both',
            animationDelay: '0.18s',
          }}>
            70+ professional PDF, image &amp; document tools — all running privately in your browser.
            Nothing leaves your device. No watermarks. No sign-up. Forever free.
          </p>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '8px',
            animation: 'fadeUp 0.6s ease both',
            animationDelay: '0.22s',
          }}>
            <Link href="#tools" style={{
              background: 'var(--ink)', color: 'white', padding: '14px 28px', borderRadius: '100px',
              fontSize: '15px', fontWeight: 500, textDecoration: 'none', display: 'inline-flex',
              alignItems: 'center', gap: '8px', transition: 'background 0.2s, transform 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
            >Explore All Tools <span>→</span></Link>
            <Link href="#privacy" style={{
              background: 'transparent', color: 'var(--ink)', padding: '14px 28px', borderRadius: '100px',
              fontSize: '15px', fontWeight: 500, border: '2px solid rgba(26,22,18,0.25)',
              textDecoration: 'none', transition: 'all 0.2s',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(26,22,18,0.04)'
                el.style.borderColor = 'var(--ink)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.borderColor = 'rgba(26,22,18,0.25)'
              }}
            >How privacy works</Link>
          </div>

        </div>

        {/* Hero Right */}
        <div style={{
          background: 'var(--ink)',
          padding: '80px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }} className="hero-right">
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px', pointerEvents: 'none',
          }} />

          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '24px', position: 'relative',
          }}>{'// Popular right now'}</div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '32px', position: 'relative',
          }}>
            {[
              { icon: '🔀', label: 'Merge PDF', slug: 'merge-pdf', featured: true },
              { icon: '✂️', label: 'Split PDF', slug: 'split-pdf', featured: false },
              { icon: '📦', label: 'Compress', slug: 'compress-pdf', featured: false },
              { icon: '💬', label: 'Chat PDF', slug: 'chat-with-pdf', featured: true },
              { icon: '🖼️', label: 'PDF→JPG', slug: 'pdf-to-jpg', featured: false },
              { icon: '📄', label: 'Word→PDF', slug: 'word-to-pdf', featured: false },
              { icon: '🧾', label: 'GST Invoice', slug: 'gst-invoice', featured: true },
              { icon: '🔐', label: 'Encrypt', slug: 'encrypt-pdf', featured: false },
              { icon: '👁️', label: 'OCR PDF', slug: 'ocr-pdf', featured: false },
              { icon: '🎨', label: 'Remove BG', slug: 'remove-background', featured: true },
              { icon: '📊', label: 'Excel→PDF', slug: 'excel-to-pdf', featured: false },
              { icon: '🔪', label: 'Cut PDF', slug: 'cut-pdf', featured: false },
            ].map(pill => (
              <Link key={pill.slug} href={`/${pill.slug}`} style={{
                padding: '9px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 500,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', cursor: 'pointer',
                textAlign: 'center', transition: 'transform 0.15s, opacity 0.15s', textDecoration: 'none',
                whiteSpace: 'nowrap',
                border: pill.featured ? '1px solid var(--amber)' : '1px solid rgba(255,255,255,0.1)',
                color: pill.featured ? 'var(--ink)' : 'var(--cream)',
                background: pill.featured ? 'var(--amber)' : 'rgba(255,255,255,0.06)',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(-2px)'
                  if (pill.featured) el.style.opacity = '0.9'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(0)'
                  el.style.opacity = '1'
                }}
              >{pill.icon} {pill.label}</Link>
            ))}
          </div>

          <div style={{
            background: '#0D1117', borderRadius: '12px', padding: '20px 24px',
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px',
            lineHeight: '1.75', marginBottom: '24px',
            border: '1px solid rgba(255,255,255,0.08)', position: 'relative',
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>
            <div><span className="c-kw">const</span> result = <span className="c-kw">await</span> <span className="c-fn">mergePDF</span>(files);</div>
            <div><span className="c-cm">{'// ↑ runs entirely in your browser'}</span></div>
            <div><span className="c-kw">const</span> uploaded = <span className="c-val">false</span>; <span className="c-cm">{'// always'}</span></div>
            <div><span className="c-fn">download</span>(result); <span className="c-cm">{'// yours, instantly'}</span></div>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
            borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', position: 'relative',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)',
            }}>Zero-server architecture</span>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div
        className="trust-bar-shell"
        style={{
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        padding: '16px 0', position: 'relative', zIndex: 1, background: 'rgba(26,22,18,0.04)',
      }}>
        <div className="section-inner trust-bar-wrap">
          <div className="trust-bar-stage">
            <div
              className="trust-bar-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}
            >
              {TRUST_BAR_ITEMS.map((item, i) => {
                const Icon = item.icon

                return (
                  <motion.div
                    key={item.text}
                    className="trust-item"
                    whileHover={trustItemHover}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.995 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      justifyContent: 'center',
                      padding: '0 14px',
                      borderRight: i < TRUST_BAR_ITEMS.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span className="trust-item-icon-wrap" aria-hidden="true">
                      <motion.span className="trust-item-icon" whileHover={trustIconHover}>
                        <Icon />
                      </motion.span>
                    </span>
                    <span className="trust-item-label">
                      {item.text}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLS SECTION ── */}
      <section
        id="tools"
        ref={toolsSectionRef}
        style={{
          padding: '74px 0 80px',
          position: 'relative',
          zIndex: 1,
          background: 'linear-gradient(180deg, rgba(232,130,12,0.024), rgba(232,130,12,0) 104px)',
        }}
      >
        <div className="section-inner">
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
            color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px',
          }}>{'// 70+ tools'}</div>
          <h2 style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 48px)', letterSpacing: '-1.5px', color: 'var(--ink)',
            marginBottom: '40px', lineHeight: 1.1,
          }}>Everything your documents need</h2>

          <ToolSearchFilter
            tools={TOOLS}
            onFiltered={handleFiltered}
            onSearchChange={setActiveSearch}
            showResultCount={true}
            resetSignal={resetSignal}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'white',
          }} className="tools-grid">
            {filteredTools.length === 0 && (
              <ToolEmptyState
                searchText={activeSearch}
                onClear={() => { setFilteredTools(TOOLS); setActiveSearch(''); setResetSignal(s => s + 1) }}
              />
            )}
            {filteredTools.map((tool) => (
              <Link key={tool.id} href={`/${tool.slug}`} className="tool-card" style={{
                padding: '24px',
                borderRight: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                position: 'relative',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
                onTouchStart={e => e.currentTarget.classList.add('touching')}
                onTouchEnd={e => { const el = e.currentTarget; setTimeout(() => el.classList.remove('touching'), 150) }}
                onTouchCancel={e => e.currentTarget.classList.remove('touching')}
              >
                <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '4px' }}>
                  {tool.ai && (
                    <span style={{
                      padding: '3px 7px', borderRadius: '100px', background: '#EDE9FE', color: '#5B21B6',
                      fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>AI</span>
                  )}
                  {tool.in && (
                    <span style={{
                      padding: '3px 7px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E',
                      fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500,
                    }}>IN 🇮🇳</span>
                  )}
                  {tool.isNew && (
                    <span style={{
                      padding: '3px 7px', borderRadius: '100px', background: '#DCFCE7', color: '#166534',
                      fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '9px', fontWeight: 500,
                      textTransform: 'uppercase',
                    }}>New</span>
                  )}
                </div>
                <div className="tool-icon" style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: CATEGORY_ICON_BG[tool.category] || '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', marginBottom: '14px', flexShrink: 0,
                }}>{tool.icon}</div>
                <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginBottom: '5px', lineHeight: 1.2 }}>{tool.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.55, lineHeight: 1.5, flex: 1 }}>{tool.desc}</div>
                <div className="tool-arrow">→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{
        padding: '100px 0', background: 'var(--ink)', position: 'relative', overflow: 'hidden', zIndex: 1,
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px', pointerEvents: 'none',
        }} />
        <div className="section-inner" style={{ position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
            color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px',
          }}>{'// zero friction'}</div>
          <h2 style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 48px)', letterSpacing: '-1.5px', color: 'white',
            marginBottom: '64px', lineHeight: 1.1,
          }}>Done in three steps</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative',
          }} className="steps-grid">
            {[
              { num: '01', icon: '📂', name: 'Pick a tool & drop your file', desc: 'Choose from 70+ tools. Drag your file in — no account, no waiting, no limit.' },
              { num: '02', icon: '⚙️', name: 'Browser does the work', desc: 'WebAssembly runs the processing locally on your CPU. Your file never moves.' },
              { num: '03', icon: '⬇️', name: 'Download instantly', desc: 'Your processed file downloads directly. Memory clears when you close the tab.' },
            ].map((step, i) => (
              <div key={i}
                className="step-item"
                style={{
                  paddingLeft: i === 0 ? '0' : '40px',
                  paddingRight: i === 2 ? '0' : '40px',
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  position: 'relative',
                }}>
                <div style={{
                  fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
                  fontSize: '96px', lineHeight: 1, color: 'rgba(255,255,255,0.04)',
                  position: 'absolute', top: '-12px', right: '20px', userSelect: 'none',
                }}>{step.num}</div>
                {i < 2 && (
                  <div className="step-arrow" style={{
                    position: 'absolute', top: '20px', right: '-16px', width: '32px', height: '32px',
                    background: 'var(--amber)', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                    color: 'var(--ink)', zIndex: 2, fontWeight: 700,
                  }}>→</div>
                )}
                <div className="step-icon" style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(232,130,12,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '24px',
                }}>{step.icon}</div>
                <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'white', marginBottom: '10px' }}>{step.name}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.65' }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY SECTION ── */}
      <section id="privacy" style={{ padding: '100px 0', position: 'relative', zIndex: 1 }}>
        <div className="section-inner">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center',
          }} className="privacy-grid">
            <div style={{
              background: 'var(--ink)', borderRadius: '16px', padding: '32px',
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', lineHeight: '1.8',
            }}>
              <div><span className="c-kw">const</span> yourFile = dropZone.file;</div>
              <div><span className="c-cm">{'// file lives only in memory'}</span></div>
              <div><span className="c-kw">const</span> result = <span className="c-kw">await</span> <span className="c-fn">wasm.process</span>(yourFile);</div>
              <div style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.5 }}><span className="c-cm">{'// ✗ fetch(\'/upload\', yourFile)'}</span></div>
              <div style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.5 }}><span className="c-cm">{'// ✗ sendToServer(yourFile)'}</span></div>
              <div><span className="c-kw">const</span> uploaded = <span className="c-val">false</span>; <span className="c-cm">{'// always'}</span></div>
              <div><span className="c-fn">download</span>(result); <span className="c-cm">{"// that's it"}</span></div>
              <div><span className="c-fn">memory.clear</span>(); <span className="c-cm">{'// gone when you leave'}</span></div>
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
                color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px',
              }}>{'// privacy by design'}</div>
              <h2 style={{
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
                fontSize: 'clamp(32px, 4vw, 48px)', letterSpacing: '-1.5px', color: 'var(--ink)',
                marginBottom: '16px', lineHeight: 1.1,
              }}>Your files never<br />leave your device</h2>
              <p style={{ fontSize: '16px', fontWeight: 300, opacity: 0.65, lineHeight: 1.7, marginBottom: '32px' }}>
                Doclair brings the server to your browser using WebAssembly. Processing happens directly on your CPU.
                We don&apos;t have servers to store your files — absolute privacy guaranteed by architecture, not just policy.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[
                  { icon: '🛡️', bg: '#DBEAFE', title: 'Zero-upload architecture', desc: 'Files processed in WebAssembly, entirely client-side' },
                  { icon: '📡', bg: '#DCFCE7', title: 'Works fully offline', desc: 'Once loaded, no internet required for any processing' },
                  { icon: '🔍', bg: '#EDE9FE', title: 'No document tracking', desc: "We can't see your files even if we wanted to" },
                  { icon: '🧹', bg: '#FFF0DC', title: 'Memory cleared on exit', desc: 'Files vanish from memory when you close the tab' },
                ].map(feat => (
                  <div key={feat.title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div className="privacy-feat-icon" style={{
                      width: '44px', height: '44px', borderRadius: '10px', background: feat.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                    }}>{feat.icon}</div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginBottom: '3px' }}>{feat.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.55, lineHeight: 1.55 }}>{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{
        padding: '64px 0', borderTop: '1px solid var(--border)', position: 'relative', zIndex: 1,
        background: 'var(--amber-pale, #FDF8F0)',
      }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
            color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px',
          }}>{'// trusted by users worldwide'}</div>
          <h2 style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-1px', color: 'var(--ink)',
            marginBottom: '48px', lineHeight: 1.15,
          }}>Built different. Used everywhere.</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px',
          }} className="proof-grid">
            {[
              { num: '70+', label: 'Free tools', icon: '🛠️' },
              { num: '0 KB', label: 'Ever uploaded to any server', icon: '🔒' },
              { num: '100%', label: 'Client-side processing', icon: '⚡' },
              { num: '∞', label: 'No limits, no watermarks', icon: '✦' },
            ].map((stat, i) => (
              <div key={i} style={{
                padding: '28px 20px', borderRadius: '16px',
                background: 'white', border: '1px solid var(--border)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(26,22,18,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{stat.icon}</div>
                <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '32px', color: 'var(--ink)', marginBottom: '4px' }}>{stat.num}</div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.55 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{
        padding: '120px 24px', position: 'relative', zIndex: 1,
        background: 'var(--ink)', overflow: 'hidden',
      }}>
        {/* Noise overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px', pointerEvents: 'none',
        }} />
        <div className="section-inner" style={{ position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px',
            color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px',
          }}>{'// frequently asked'}</div>
          <h2 style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 48px)', letterSpacing: '-1.5px', color: 'white',
            marginBottom: '48px', lineHeight: 1.1,
          }}>Questions? Answered.</h2>
          <div style={{ maxWidth: '720px' }}>
            {HOME_FAQS.map((faq, i) => (
              <div key={i} style={{
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="faq-q"
                  style={{
                    width: '100%', textAlign: 'left', padding: '20px 0', border: 'none',
                    background: 'transparent', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
                    fontSize: '16px', color: 'white', lineHeight: 1.3,
                  }}>{faq.q}</span>
                  <span style={{
                    fontSize: '20px', color: 'var(--amber)', fontWeight: 700, flexShrink: 0,
                    transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: '0 0 20px', fontSize: '14px', color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.7, animation: 'fadeUp 0.3s ease both',
                  }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes heroTrustFloat {
          0%, 100% {
            transform: perspective(1100px) rotateX(4deg) rotateY(-6deg) translate3d(0, 0, 0);
          }
          50% {
            transform: perspective(1100px) rotateX(2deg) rotateY(2deg) translate3d(0, -1px, 0);
          }
        }
        .hero-trust-capsule {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          max-width: 100%;
          padding: 9px 14px 9px 13px;
          border-radius: 999px;
          border: 1px solid rgba(26,22,18,0.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0)) top/100% 56% no-repeat,
            linear-gradient(90deg, rgba(232,130,12,0.08) 0, rgba(255,255,255,0.88) 26%, rgba(247,241,232,0.94) 100%);
          box-shadow:
            0 4px 12px rgba(26,22,18,0.05),
            0 1px 2px rgba(26,22,18,0.03),
            inset 0 1px 0 rgba(255,255,255,0.8);
          transform-style: preserve-3d;
          backdrop-filter: blur(12px) saturate(1.03);
        }
        .hero-trust-capsule::before {
          content: '';
          position: absolute;
          left: 12px;
          top: 9px;
          bottom: 9px;
          width: 1.5px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(232,130,12,0.8), rgba(232,130,12,0.34));
          opacity: 0.72;
          pointer-events: none;
        }
        .hero-trust-capsule::after {
          content: '';
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: -6px;
          border-radius: inherit;
          height: 8px;
          background: rgba(26,22,18,0.16);
          filter: blur(8px);
          opacity: 0.05;
          pointer-events: none;
          z-index: -1;
        }
        .hero-trust-orb {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          flex-shrink: 0;
          margin-left: 6px;
          background: radial-gradient(circle at 32% 32%, #FFE3B8 0%, #E8820C 62%, #C46D09 100%);
          box-shadow:
            0 0 0 3px rgba(232,130,12,0.05),
            0 2px 6px rgba(232,130,12,0.12);
          transform: translateZ(8px);
        }
        .hero-trust-copy {
          position: relative;
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          color: rgba(26,22,18,0.74);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1.35;
          transition: opacity 0.22s ease, transform 0.22s ease;
          transform-origin: left center;
          will-change: opacity, transform;
          transform-style: preserve-3d;
        }
        .hero-trust-copy.is-visible {
          opacity: 1;
          transform: translateY(0) translateZ(8px);
        }
        .hero-trust-copy.is-hidden {
          opacity: 0;
          transform: translateY(5px) translateZ(8px);
        }
        @media (hover: hover) {
          .hero-trust-capsule:hover {
            transform: translateY(-1px);
          }
        }
        @media (max-width: 899px) {
          .hero-grid { grid-template-columns: 1fr !important; min-height: auto !important; }
          .hero-right { display: none !important; }
          .hero-left { padding: 48px 24px !important; max-width: 100% !important; }
          .hero-trust-capsule {
            padding: 9px 13px 9px 13px;
          }
          .hero-trust-copy {
            max-width: calc(100vw - 120px) !important;
          }
        }
        @media (min-width: 1100px) { .tools-grid { grid-template-columns: repeat(4,1fr) !important; } }
        @media (max-width: 1099px) and (min-width: 768px) { .tools-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 767px) and (min-width: 600px) { .tools-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 599px) {
          .tools-grid { grid-template-columns: 1fr !important; }
          .trust-bar-grid { grid-template-columns: repeat(2,1fr) !important; }
          .trust-bar-grid > .trust-item {
            border-right: none !important;
            border-bottom: 1px solid var(--border);
            padding: 14px 16px !important;
            justify-content: flex-start !important;
          }
          .trust-bar-grid > .trust-item:last-child {
            grid-column: 1 / -1;
            border-bottom: none !important;
          }
        }
        @media (max-width: 767px) {
          .steps-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .step-item { padding: 0 !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 40px !important; }
          .step-item:last-child { border-bottom: none !important; padding-bottom: 0 !important; }
          .step-arrow { display: none !important; }
          .privacy-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .proof-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
        }
        @media (max-width: 480px) {
          .hero-headline {
            font-size: clamp(37px, 11vw, 43px) !important;
            letter-spacing: -1.1px !important;
            line-height: 0.97 !important;
          }
          .hero-trust-rotator {
            margin-top: 16px !important;
          }
          .hero-trust-copy {
            font-size: 12.5px;
          }
          .proof-grid { grid-template-columns: 1fr !important; }
        }
        @media (hover: none) {
          .tool-card:hover { background: white !important; box-shadow: none !important; }
          .tool-arrow { opacity: 1 !important; transform: translateX(0) !important; }
        }
      `}</style>
    </>
  )
}
