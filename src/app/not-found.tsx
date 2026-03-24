import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist or has moved.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 68px)', padding: '64px 32px', textAlign: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(80px,15vw,160px)', color: 'var(--amber)',
          letterSpacing: '-4px', lineHeight: 1, marginBottom: '24px',
        }}>404</div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(24px,3vw,40px)', color: 'var(--ink)',
          letterSpacing: '-1px', marginBottom: '16px',
        }}>Page not found</h1>
        <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.6, maxWidth: '440px', lineHeight: 1.6, marginBottom: '40px' }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/tools" style={{
          background: 'var(--ink)', color: 'white', padding: '14px 32px', borderRadius: '100px',
          fontSize: '15px', fontWeight: 500, textDecoration: 'none', display: 'inline-flex',
          alignItems: 'center', gap: '8px',
        }}>← Back to All Tools</Link>
      </div>
      <Footer />
    </>
  )
}
