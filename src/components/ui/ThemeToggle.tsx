'use client'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: 80, height: 32, borderRadius: 100,
          border: '1px solid var(--border)',
          background: 'var(--card-bg)', flexShrink: 0,
        }}
      />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 12px', borderRadius: 100,
        border: '1px solid var(--border)',
        background: 'var(--card-bg)',
        cursor: 'pointer', color: 'var(--ink)',
        fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{
        width: 30, height: 17, borderRadius: 100,
        background: isDark ? 'var(--amber)' : 'var(--border)',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.25s', display: 'block',
      }}>
        <span style={{
          position: 'absolute', top: 2.5, left: 2.5,
          width: 12, height: 12, borderRadius: '50%',
          background: 'white',
          transition: 'transform 0.25s',
          transform: isDark ? 'translateX(13px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)', display: 'block',
        }} />
      </span>
      <span style={{ opacity: 0.7 }}>
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  )
}
