'use client'

import { useState } from 'react'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    clarity?: (...args: unknown[]) => void
  }
}

function trackFeedback(value: 'yes' | 'no') {
  window.gtag?.('event', 'tool_feedback', { feedback: value })
  window.clarity?.('set', 'tool_feedback', value)
}

function trackBugReport(reason: string, detail: string) {
  const page = typeof window !== 'undefined' ? window.location.pathname : ''
  window.gtag?.('event', 'tool_bug_report', { reason, detail: detail.slice(0, 200), page })
  window.clarity?.('set', 'tool_bug_report', reason)
}

const BUG_REASONS = ['Tool didn\'t work', 'Wrong output', 'Too slow', 'File not supported', 'Other']

const mono = 'var(--font-dm-mono), DM Mono, monospace'

export default function FeedbackWidget() {
  const [stage, setStage] = useState<'ask' | 'report' | 'done_yes' | 'done_no'>('ask')
  const [selectedReason, setSelectedReason] = useState('')
  const [detail, setDetail] = useState('')

  if (stage === 'done_yes') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: '14px' }}>
        <span style={{ fontSize: '18px' }}>🎉</span>
        <span style={{ fontFamily: mono, fontSize: '12px', color: 'var(--ink)', opacity: 0.6 }}>Glad it helped!</span>
      </div>
    )
  }

  if (stage === 'done_no') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: '14px' }}>
        <span style={{ fontSize: '18px' }}>🙏</span>
        <span style={{ fontFamily: mono, fontSize: '12px', color: 'var(--ink)', opacity: 0.6 }}>Thanks for the report — we&apos;ll look into it.</span>
      </div>
    )
  }

  if (stage === 'report') {
    return (
      <div style={{ padding: '18px', background: 'white', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <span style={{ fontFamily: mono, fontSize: '11px', color: 'var(--ink)', opacity: 0.45, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          What went wrong?
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {BUG_REASONS.map(r => (
            <button
              key={r}
              onClick={() => setSelectedReason(r === selectedReason ? '' : r)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: `1px solid ${selectedReason === r ? '#fca5a5' : 'var(--border)'}`,
                background: selectedReason === r ? '#fee2e2' : 'var(--cream)',
                cursor: 'pointer',
                fontFamily: mono,
                fontSize: '12px',
                color: 'var(--ink)',
                transition: 'all 0.15s',
              }}
            >{r}</button>
          ))}
        </div>
        <textarea
          value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder="Anything else? (optional)"
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--cream)',
            fontFamily: mono,
            fontSize: '12px',
            color: 'var(--ink)',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              if (!selectedReason && !detail.trim()) return
              trackBugReport(selectedReason || 'unspecified', detail.trim())
              setStage('done_no')
            }}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--ink)',
              color: 'white',
              cursor: 'pointer',
              fontFamily: mono,
              fontSize: '12px',
              transition: 'opacity 0.15s',
              opacity: selectedReason || detail.trim() ? 1 : 0.4,
            }}
          >Send report</button>
          <button
            onClick={() => setStage('ask')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: mono,
              fontSize: '12px',
              color: 'var(--ink)',
              opacity: 0.5,
            }}
          >Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: '14px', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: mono, fontSize: '11px', color: 'var(--ink)', opacity: 0.45, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
        Was this tool helpful?
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => { trackFeedback('yes'); setStage('done_yes') }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontFamily: mono, fontSize: '12px', color: 'var(--ink)', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        ><span>👍</span> Yes</button>
        <button
          onClick={() => { trackFeedback('no'); setStage('report') }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontFamily: mono, fontSize: '12px', color: 'var(--ink)', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        ><span>👎</span> No</button>
      </div>
    </div>
  )
}
