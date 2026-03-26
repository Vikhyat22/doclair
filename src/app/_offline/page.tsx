import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 20px',
        background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)',
      }}
    >
      <section
        style={{
          width: 'min(560px, 100%)',
          background: '#FFFFFF',
          border: '1px solid #FED7AA',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 20px 45px rgba(245, 158, 11, 0.08)',
          color: '#1A1612',
        }}
      >
        <h1
          style={{
            margin: '0 0 10px',
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontSize: 30,
            lineHeight: 1.12,
            fontWeight: 700,
          }}
        >
          You are offline
        </h1>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            fontSize: 16,
            lineHeight: 1.6,
            color: '#4A4038',
          }}
        >
          Doclair could not reach the network for this page right now. Reconnect and retry.
        </p>
        <Link
          href="/"
          style={{
            marginTop: 20,
            display: 'inline-block',
            textDecoration: 'none',
            border: 'none',
            borderRadius: 10,
            background: '#F59E0B',
            color: '#FFFFFF',
            padding: '10px 16px',
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Go to home
        </Link>
      </section>
    </main>
  )
}
