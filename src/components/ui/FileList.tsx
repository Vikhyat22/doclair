'use client'

import { useState } from 'react'
import type { FileItem } from '@/types'

interface FileListProps {
  files: FileItem[]
  onReorder: (reordered: FileItem[]) => void
  onRemove: (id: string) => void
}

function formatSize(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

export default function FileList({ files, onReorder, onRemove }: FileListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return
    const reordered = [...files]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    onReorder(reordered)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif',
          fontWeight: 700,
          fontSize: '17px',
          color: 'var(--ink)',
        }}>Files to merge</span>
        <span style={{
          background: 'var(--amber)',
          color: 'var(--ink)',
          padding: '2px 9px',
          borderRadius: '100px',
          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
          fontSize: '11px',
          fontWeight: 500,
        }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>
      <p style={{
        fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
        fontSize: '11px',
        color: 'var(--ink)',
        opacity: 0.4,
        marginBottom: '12px',
      }}>↕ Drag to reorder — merged PDF follows this order</p>

      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {files.map((f, i) => (
          <div
            key={f.id}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={e => { e.preventDefault(); setDragOverIdx(i); }}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none',
              borderLeft: dragOverIdx === i ? '3px solid var(--amber)' : '3px solid transparent',
              background: dragOverIdx === i ? '#FFF0DC' : 'transparent',
              transition: 'all 0.15s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              if (dragOverIdx !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(26,22,18,0.02)'
            }}
            onMouseLeave={e => {
              if (dragOverIdx !== i) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <span style={{
              fontSize: '16px',
              color: 'var(--ink)',
              opacity: 0.25,
              cursor: 'grab',
              padding: '0 6px',
              userSelect: 'none',
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              lineHeight: 1,
              minWidth: '32px',
            }}>⠿</span>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#FEE2E2',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              margin: '0 10px',
              flexShrink: 0,
            }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--ink)',
              }}>{f.name}</div>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontSize: '11px',
                opacity: 0.4,
                marginTop: '1px',
                color: 'var(--ink)',
              }}>{formatSize(f.size)}</div>
            </div>
            <button
              onClick={() => onRemove(f.id)}
              title="Remove"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                opacity: 0.3,
                transition: 'all 0.15s',
                color: 'var(--ink)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FEE2E2'
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.color = 'var(--red)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.opacity = '0.3'
                e.currentTarget.style.color = 'var(--ink)'
              }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
