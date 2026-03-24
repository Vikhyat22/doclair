'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function Error({
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
    <>
      <Navbar />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 68px)', padding: '64px 32px', textAlign: 'center',
        position: 'relative', zIndex: 1,
      }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'var(--amber-light)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '36px', marginBottom: '32px',
        }}>⚠️</div>

        <div style={{
          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
          fontSize: '11px', color: 'var(--amber)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: '14px',
        }}>Something went wrong</div>

        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(24px, 3vw, 40px)', color: 'var(--ink)',
          letterSpacing: '-1px', marginBottom: '16px',
        }}>An unexpected error occurred</h1>

        <p style={{
          fontSize: '17px', fontWeight: 300, color: 'var(--ink)',
          opacity: 0.6, maxWidth: '440px', lineHeight: 1.6, marginBottom: '40px',
        }}>
          This tool hit an unexpected problem. Your files were never uploaded — everything runs in your browser.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              background: 'var(--ink)', color: 'white',
              padding: '14px 32px', borderRadius: '100px',
              fontSize: '15px', fontWeight: 500,
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            }}
          >↺ Try again</button>

          <Link href="/tools" style={{
            background: 'transparent', color: 'var(--ink)',
            padding: '14px 32px', borderRadius: '100px',
            fontSize: '15px', fontWeight: 500,
            border: '1px solid var(--border)',
            textDecoration: 'none', display: 'inline-flex',
            alignItems: 'center', gap: '8px',
          }}>← Browse all tools</Link>
        </div>

        {error.digest && (
          <div style={{
            marginTop: '40px',
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '10px', color: 'var(--muted)',
            opacity: 0.5,
          }}>Error ID: {error.digest}</div>
        )}
      </div>
      <Footer />
    </>
  )
}
