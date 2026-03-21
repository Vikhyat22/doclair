import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Install Doclair as App — Works Offline',
  description: 'Install Doclair as a Progressive Web App on iPhone, Android, or desktop. Works offline. No App Store required.',
  alternates: { canonical: 'https://doclair.com/install-app' },
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', background: 'var(--amber)', color: 'white',
        fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
      }}>{num}</div>
      <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.75 }}>{text}</p>
    </div>
  )
}

export default function InstallAppPage() {
  return (
    <>
      <Navbar />
      <div style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '800px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>// install</div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-2px', color: 'var(--ink)', marginBottom: '16px', lineHeight: 1.05 }}>Install Doclair as an App</h1>
          <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, marginBottom: '48px', lineHeight: 1.6 }}>No App Store. No download. Works offline. Install straight from your browser in seconds.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '56px' }} className="benefits-grid">
            {[
              { icon: '📡', title: 'Works Offline', desc: 'Process PDFs without internet after first load' },
              { icon: '⚡', title: 'Faster Launch', desc: 'Opens instantly from your home screen' },
              { icon: '🔒', title: 'Same Privacy', desc: 'Identical privacy — files never leave your device' },
            ].map(b => (
              <div key={b.title} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{b.icon}</div>
                <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>{b.title}</div>
                <div style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.6, lineHeight: 1.55 }}>{b.desc}</div>
              </div>
            ))}
          </div>

          {[
            {
              title: 'iPhone / iPad (Safari)',
              steps: [
                'Open Doclair in Safari (must be Safari, not Chrome)',
                'Tap the Share button (□↑) at the bottom of the screen',
                'Scroll down and tap "Add to Home Screen"',
                'Tap "Add" in the top right corner',
                'Doclair appears on your home screen — tap to open',
              ]
            },
            {
              title: 'Android (Chrome)',
              steps: [
                'Open Doclair in Chrome',
                'Tap the three-dot menu (⋮) in the top right',
                'Tap "Add to Home screen" or "Install app"',
                'Tap "Add" or "Install" in the popup',
                'Doclair appears on your home screen',
              ]
            },
            {
              title: 'Windows, Mac, or Linux (Chrome or Edge)',
              steps: [
                'Open Doclair in Chrome or Edge',
                'Look for the install icon (⊕) in the address bar',
                'Click it and then click "Install"',
                'Doclair opens as a standalone window',
                'Find it in your taskbar, dock, or Start menu',
              ]
            },
          ].map(section => (
            <section key={section.title} style={{ marginBottom: '48px' }}>
              <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>{section.title}</h2>
              {section.steps.map((step, i) => <Step key={i} num={i + 1} text={step} />)}
            </section>
          ))}

          <div style={{ background: 'var(--ink)', borderRadius: '14px', padding: '24px 28px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '24px', flexShrink: 0 }}>📡</div>
            <div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'white', marginBottom: '6px' }}>Works fully offline once installed</div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>Once installed, all PDF processing tools work completely offline. Your files never leave your device.</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <style>{`@media (max-width: 599px) { .benefits-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  )
}
