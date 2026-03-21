'use client'

import { useRef, useState } from 'react'

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void
  accept?: string
  label?: string
  subLabel?: string
  icon?: string
  maxFiles?: number
  maxSizeMB?: number
  currentCount?: number
}

export default function DropZone({
  onFilesAdded,
  accept = '.pdf',
  label = 'Drop PDF files here',
  subLabel = 'or click to browse from your device',
  icon = '📄',
  maxFiles = 50,
  maxSizeMB = 100,
  currentCount = 0,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function handleFiles(raw: FileList | File[]) {
    const arr = Array.from(raw)
    const ext = accept.replace('.', '').toLowerCase()
    const valid = arr.filter(f => f.name.toLowerCase().endsWith(`.${ext}`))
    if (valid.length < arr.length) {
      alert(`Only ${ext.toUpperCase()} files are accepted.`)
    }
    if (valid.length > 0) {
      onFilesAdded(valid)
    }
  }

  return (
    <div style={{
      background: 'rgba(26,22,18,0.06)',
      borderRadius: '16px',
      padding: '16px',
    }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragOver(false)
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
        }}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--amber)' : 'var(--border)'}`,
          borderRadius: '12px',
          background: isDragOver ? '#FFF0DC' : 'white',
          padding: '56px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          animation: 'float 3s ease-in-out infinite',
          lineHeight: 1,
        }}>{icon}</div>

        <h2 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif',
          fontWeight: 700,
          fontSize: '20px',
          color: 'var(--ink)',
          marginBottom: '6px',
        }}>{label}</h2>

        <p style={{
          fontSize: '14px',
          color: 'var(--ink)',
          opacity: 0.5,
          marginBottom: '20px',
        }}>{subLabel}</p>

        <button
          onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
          style={{
            background: 'var(--ink)',
            color: 'white',
            padding: '11px 28px',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Choose {accept.toUpperCase().replace('.', '')} Files
        </button>

        <div style={{
          marginTop: '14px',
          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
          fontSize: '11px',
          color: 'var(--ink)',
          opacity: 0.4,
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
        }}>
          <span>{currentCount} / {maxFiles} files</span>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
          <span>Max {maxSizeMB}MB per file</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <style>{`
        @media (max-width: 767px) {
          .dropzone-inner { padding: 32px 20px !important; }
        }
      `}</style>
    </div>
  )
}
