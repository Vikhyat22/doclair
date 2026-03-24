import Link from 'next/link'

interface SidebarTool {
  name: string
  slug: string
  icon: string
  colorBg: string
  desc?: string
}

export interface ToolSidebarProps {
  reverseActions?: SidebarTool[]
  relatedTools: SidebarTool[]
  blogPost?: { slug: string; title: string }
}

function SidebarCard({ label, tools, showDesc }: { label: string; tools: SidebarTool[]; showDesc?: boolean }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '18px',
      overflow: 'hidden',
    }}>
      <div style={{
        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
        fontSize: '10px',
        color: 'var(--amber)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontWeight: 500,
        marginBottom: '14px',
      }}>{label}</div>
      {tools.map(tool => (
        <Link key={tool.slug} href={`/${tool.slug}`} className="sidebar-link" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 10px',
          borderRadius: '10px',
          textDecoration: 'none',
          transition: 'all 0.2s',
          border: '1px solid transparent',
        }}>
          <div className="sidebar-icon" style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: tool.colorBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
            transition: 'transform 0.15s',
          }}>{tool.icon}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{tool.name}</div>
            {showDesc && tool.desc && (
              <div style={{ fontSize: '11px', color: 'var(--ink)', opacity: 0.45, marginTop: '1px' }}>{tool.desc}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function ToolSidebar({ reverseActions, relatedTools, blogPost }: ToolSidebarProps) {
  return (
    <>
      <style>{`
        .sidebar-link:hover { background: white !important; border-color: var(--border) !important; }
        .sidebar-link:hover .sidebar-icon { transform: scale(1.08); }
        .blog-guide-card:hover { background: #FDEBC8 !important; border-color: rgba(232,130,12,0.4) !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(232,130,12,0.12); }
      `}</style>
      {reverseActions && reverseActions.length > 0 && (
        <SidebarCard label="// Reverse Actions" tools={reverseActions} />
      )}
      <SidebarCard label="// Related Tools" tools={relatedTools} showDesc />
      {blogPost && (
        <Link href={`/blog/${blogPost.slug}`} className="blog-guide-card" style={{
          display: 'block',
          background: 'var(--amber-light)',
          border: '1px solid rgba(232,130,12,0.25)',
          borderRadius: '14px',
          padding: '16px 18px',
          textDecoration: 'none',
          transition: 'all 0.18s',
        }}>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '10px',
            color: 'var(--amber)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 500,
            marginBottom: '8px',
          }}>// Read the Guide</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginBottom: '10px' }}>{blogPost.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--amber)', fontWeight: 500 }}>Read article →</div>
        </Link>
      )}
      <div style={{
        background: 'var(--ink)',
        borderRadius: '14px',
        padding: '16px 18px',
      }}>
        <div style={{
          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
          fontSize: '10px',
          color: 'var(--amber)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '8px',
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
          Zero-Server Processing
        </div>
        <p style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: '1.6',
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
        }}>Your files are processed entirely in this browser tab. Nothing is transmitted to any server — not even ours.</p>
      </div>
    </>
  )
}
