'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        background: '#F5F0E8',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '32px',
        textAlign: 'center',
        color: '#1A1612',
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '24px',
        }}>⚠️</div>

        <div style={{
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#E8820C',
          marginBottom: '12px',
          fontWeight: 500,
        }}>Something went wrong</div>

        <h1 style={{
          fontSize: 'clamp(22px, 3vw, 36px)',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          marginBottom: '14px',
        }}>Doclair hit an unexpected error</h1>

        <p style={{
          fontSize: '16px',
          fontWeight: 300,
          opacity: 0.6,
          maxWidth: '400px',
          lineHeight: 1.6,
          marginBottom: '36px',
        }}>
          Your files are safe — nothing was uploaded. Please try refreshing the page.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              background: '#1A1612', color: '#fff',
              padding: '13px 28px', borderRadius: '100px',
              fontSize: '15px', fontWeight: 500,
              border: 'none', cursor: 'pointer',
            }}
          >↺ Try again</button>

          <a href="/" style={{
            background: 'transparent', color: '#1A1612',
            padding: '13px 28px', borderRadius: '100px',
            fontSize: '15px', fontWeight: 500,
            border: '1px solid #E0D8CC',
            textDecoration: 'none',
          }}>← Go home</a>
        </div>

        {error.digest && (
          <div style={{
            marginTop: '32px',
            fontSize: '10px',
            fontFamily: 'monospace',
            opacity: 0.4,
          }}>Error ID: {error.digest}</div>
        )}
      </body>
    </html>
  )
}
