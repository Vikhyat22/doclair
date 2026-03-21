interface ProgressCardProps {
  progress: number
}

function getStatus(progress: number) {
  if (progress < 35) return 'Reading files…'
  if (progress < 70) return 'Combining pages…'
  if (progress < 95) return 'Finalising PDF…'
  return 'Almost done…'
}

export default function ProgressCard({ progress }: ProgressCardProps) {
  return (
    <div style={{
      background: 'var(--ink)',
      borderRadius: '16px',
      padding: '56px 32px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        border: '4px solid rgba(255,255,255,0.1)',
        borderTopColor: 'var(--amber)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 24px',
      }} />
      <div style={{
        fontFamily: 'var(--font-syne), Syne, sans-serif',
        fontWeight: 700,
        fontSize: '24px',
        color: 'white',
        marginBottom: '6px',
      }}>Merging your PDFs…</div>
      <div style={{
        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.45)',
        marginBottom: '24px',
      }}>{getStatus(progress)}</div>
      <div style={{
        maxWidth: '320px',
        margin: '0 auto',
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'var(--amber)',
          borderRadius: '2px',
          width: `${progress}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
