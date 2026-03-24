export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Nav stub */}
      <div style={{
        height: '68px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(245, 240, 232, 0.92)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
      }}>
        <div style={{
          width: '96px', height: '20px',
          borderRadius: '6px',
          background: 'var(--border)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      </div>

      {/* Page skeleton */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '64px 32px',
      }}>
        {/* Eyebrow */}
        <div style={{
          width: '100px', height: '11px',
          borderRadius: '4px',
          background: 'var(--border)',
          marginBottom: '18px',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
        {/* H1 */}
        <div style={{
          width: 'min(480px, 70%)', height: '44px',
          borderRadius: '8px',
          background: 'var(--border)',
          marginBottom: '20px',
          animation: 'shimmer 1.4s ease-in-out infinite 0.1s',
        }} />
        {/* Sub-line */}
        <div style={{
          width: 'min(340px, 55%)', height: '18px',
          borderRadius: '6px',
          background: 'var(--border)',
          marginBottom: '52px',
          animation: 'shimmer 1.4s ease-in-out infinite 0.2s',
        }} />

        {/* Tool drop-zone card */}
        <div style={{
          width: '100%', height: '260px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '40px',
        }}>
          {/* Spinner */}
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--amber)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '11px',
            color: 'var(--muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>Loading tool…</div>
        </div>

        {/* Content rows */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: i === 2 ? '60%' : '100%', height: '14px',
            borderRadius: '5px',
            background: 'var(--border)',
            marginBottom: '12px',
            animation: `shimmer 1.4s ease-in-out infinite ${(i * 0.1).toFixed(1)}s`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
