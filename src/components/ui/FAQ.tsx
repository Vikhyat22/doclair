'use client'

import { useState } from 'react'

interface FAQItem {
  q: string
  a: string
}

interface FAQProps {
  faqs: FAQItem[]
}

export default function FAQ({ faqs }: FAQProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div style={{
      background: '#FFF0DC',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '32px',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-syne), Syne, sans-serif',
        fontWeight: 700,
        fontSize: '20px',
        color: 'var(--ink)',
        marginBottom: '20px',
      }}>Frequently Asked Questions</h2>
      <div style={{
        background: 'white',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {faqs.map((item, i) => (
          <div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => {
                const span = e.currentTarget.querySelector('.faq-q') as HTMLElement | null
                if (span) span.style.color = 'var(--amber)'
              }}
              onMouseLeave={e => {
                const span = e.currentTarget.querySelector('.faq-q') as HTMLElement | null
                if (span) span.style.color = openIdx === i ? 'var(--amber)' : 'var(--ink)'
              }}
            >
              <span className="faq-q" style={{
                fontSize: '14px',
                fontWeight: 500,
                color: openIdx === i ? 'var(--amber)' : 'var(--ink)',
                lineHeight: '1.45',
                transition: 'color 0.2s',
              }}>{item.q}</span>
              <span style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: openIdx === i ? 'var(--amber-light)' : 'var(--cream)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.25s, background 0.2s',
                fontSize: '12px',
                transform: openIdx === i ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>▾</span>
            </button>
            <div style={{
              overflow: 'hidden',
              maxHeight: openIdx === i ? '300px' : '0',
              transition: 'max-height 0.35s ease, padding 0.25s ease',
              padding: openIdx === i ? '0 20px 20px' : '0 20px',
            }}>
              <div style={{
                fontSize: '13px',
                lineHeight: '1.7',
                color: 'var(--ink)',
                opacity: 0.65,
              }}>{item.a}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
