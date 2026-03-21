interface DownloadCardProps {
  filename: string
  description: string
  onDownload: () => void
  onReset: () => void
}

export default function DownloadCard({ filename, description, onDownload, onReset }: DownloadCardProps) {
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
        }}>Your merged PDF is ready!</div>
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
        >Merge more files →</button>
      </div>
    </div>
  )
}
