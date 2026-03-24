import Link from 'next/link'

interface NextStep {
  slug: string
  name: string
  icon: string
}

interface DownloadCardProps {
  filename: string
  description: string
  onDownload: () => void
  onReset: () => void
  title?: string
  resetLabel?: string
  nextSteps?: NextStep[]
}

export default function DownloadCard({
  filename,
  description,
  onDownload,
  onReset,
  title = 'Your file is ready!',
  resetLabel = 'Process another file →',
  nextSteps,
}: DownloadCardProps) {
  return (
    <div>
      <div style={{
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: '16px',
        padding: '48px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
        <div style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif',
          fontWeight: 700,
          fontSize: '26px',
          color: '#166534',
          marginBottom: '6px',
        }}>{title}</div>
        <div style={{
          fontSize: '14px',
          color: '#166534',
          opacity: 0.65,
          marginBottom: '28px',
        }}>{description}</div>
        <button
          onClick={onDownload}
          style={{
            background: '#16A34A',
            color: 'white',
            padding: '14px 36px',
            borderRadius: '100px',
            fontSize: '15px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#1B4332'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#16A34A'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >⬇ Download {filename}</button>
        <button
          onClick={onReset}
          style={{
            display: 'block',
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '12px',
            color: 'var(--muted)',
            margin: '16px auto 0',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            textAlign: 'center',
            width: '100%',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
        >{resetLabel}</button>
      </div>

      {nextSteps && nextSteps.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '20px 24px',
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '14px',
        }}>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '11px',
            color: 'var(--amber)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>What&apos;s next?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {nextSteps.map(step => (
              <Link
                key={step.slug}
                href={`/${step.slug}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '100px',
                  border: '1px solid var(--border)',
                  background: 'var(--cream)',
                  fontSize: '13px',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--amber)'
                  e.currentTarget.style.background = 'white'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--cream)'
                }}
              >
                <span style={{ fontSize: '15px' }}>{step.icon}</span>
                {step.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
