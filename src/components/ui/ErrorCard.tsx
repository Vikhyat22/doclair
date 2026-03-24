interface ErrorCardProps {
  message: string
  hint?: string
  onReset: () => void
  resetLabel?: string
}

export default function ErrorCard({
  message,
  hint,
  onReset,
  resetLabel = 'Try again',
}: ErrorCardProps) {
  return (
    <div style={{
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '16px',
      padding: '32px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      <div style={{
        fontFamily: 'var(--font-syne), Syne, sans-serif',
        fontWeight: 700,
        fontSize: '18px',
        color: 'var(--red)',
        marginBottom: '8px',
      }}>Something went wrong</div>
      <div style={{
        fontSize: '13px',
        color: 'var(--ink)',
        opacity: 0.75,
        marginBottom: hint ? '8px' : '20px',
        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
      }}>{message}</div>
      {hint && (
        <div style={{
          fontSize: '12px',
          color: 'var(--ink)',
          opacity: 0.5,
          marginBottom: '20px',
        }}>{hint}</div>
      )}
      <button
        onClick={onReset}
        style={{
          padding: '10px 24px',
          borderRadius: '100px',
          border: '1px solid var(--border)',
          background: 'white',
          cursor: 'pointer',
          fontSize: '13px',
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          fontWeight: 500,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--red)'
          e.currentTarget.style.color = 'var(--red)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'inherit'
        }}
      >{resetLabel}</button>
    </div>
  )
}
