'use client'

import Link from 'next/link'

interface SidebarTool {
  name: string
  slug: string
  icon: string
  colorBg: string
  desc?: string
}

interface ToolSidebarProps {
  reverseActions: SidebarTool[]
  relatedTools: SidebarTool[]
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
        <Link key={tool.slug} href={`/${tool.slug}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 10px',
          borderRadius: '10px',
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(26,22,18,0.06)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <div style={{
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

export default function ToolSidebar({ reverseActions, relatedTools }: ToolSidebarProps) {
  return (
    <>
      <SidebarCard label="// Reverse Actions" tools={reverseActions} />
      <SidebarCard label="// Related Tools" tools={relatedTools} showDesc />
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
