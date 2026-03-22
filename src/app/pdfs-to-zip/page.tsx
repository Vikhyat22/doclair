'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { pdfFilesToZip } from '@/lib/pdf/pdfsToZip'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'How many PDFs can I bundle into a ZIP?',
    a: 'Up to 50 PDF files. The total size should remain manageable for your browser — very large collections may take a moment to compress.',
  },
  {
    q: 'Does this change my PDF files in any way?',
    a: 'No. The PDFs are placed into the ZIP archive exactly as they are — no compression or modification of the PDF content occurs.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. Everything runs entirely in your browser using JSZip. Your files never leave your device.',
  },
  {
    q: 'Can I include other file types, not just PDFs?',
    a: 'This tool is optimised for PDF files. If you need to ZIP other file types, use your operating system\'s built-in archive utility.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDFs to ZIP — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pdfs-to-zip',
      description: 'Bundle multiple PDF files into a single ZIP archive for easy sharing and download. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Merge PDF',    slug: 'merge-pdf',    icon: '📎', colorBg: '#FFF0DC', desc: 'Combine into one PDF' },
  { name: 'Split PDF',    slug: 'split-pdf',    icon: '✂️', colorBg: '#DBEAFE', desc: 'Split into separate files' },
  { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#EDE9FE', desc: 'Reduce PDF file size' },
]

export default function PDFsToZIPPage() {
  const [files, setFiles]         = useState<File[]>([])
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [zipBlob, setZipBlob]     = useState<Blob | null>(null)
  const [error, setError]         = useState('')

  const handleFiles = useCallback((added: File[]) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      const fresh    = added.filter(f => !existing.has(f.name + f.size))
      return [...prev, ...fresh].slice(0, 50)
    })
    setToolState('idle')
    setZipBlob(null)
    setError('')
  }, [])

  const removeFile = useCallback((idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleCreate = useCallback(async () => {
    if (files.length === 0) return
    setToolState('processing')
    setError('')
    try {
      const blob = await pdfFilesToZip(files)
      setZipBlob(blob)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ZIP')
      setToolState('error')
    }
  }, [files])

  const handleDownload = useCallback(() => {
    if (!zipBlob) return
    const url = URL.createObjectURL(zipBlob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = 'doclair-pdfs.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [zipBlob])

  const handleReset = useCallback(() => {
    setFiles([])
    setZipBlob(null)
    setError('')
    setToolState('idle')
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="PDFs to ZIP"
        toolSlug="pdfs-to-zip"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>PDFs to ZIP </span>
            <span style={{ color: 'var(--amber)' }}>Bundle Files for Easy Sharing</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Combine multiple PDF files into a single ZIP archive for easy sharing and download. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>📁 Up to 50 Files</span>
          </div>
        </div>

        {/* Drop Zone */}
        {toolState !== 'done' && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={50} maxSizeMB={200} icon="📁" label="Drop PDF files here" subLabel="or click to browse — up to 50 files" currentCount={files.length} />
        )}

        {/* File list */}
        {files.length > 0 && toolState !== 'done' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '14px' }}>{files.length} PDF{files.length !== 1 ? 's' : ''} selected</span>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px' }}>Clear all</button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {files.map((f, i) => (
                <div key={i} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '20px' }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{(f.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleCreate}
                disabled={toolState === 'processing'}
                style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', opacity: toolState === 'processing' ? 0.7 : 1 }}
              >
                {toolState === 'processing' ? 'Creating ZIP…' : `Create ZIP (${files.length} files) →`}
              </button>
            </div>
          </div>
        )}

        {toolState === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try again</button>
          </div>
        )}

        {toolState === 'done' && zipBlob && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: '#166534', marginBottom: '6px' }}>ZIP Created!</div>
            <div style={{ fontSize: '13px', color: '#15803D', marginBottom: '20px' }}>{files.length} PDF files bundled · {(zipBlob.size / 1024 / 1024).toFixed(2)} MB</div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleDownload} style={{ background: '#166534', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                ⬇ Download doclair-pdfs.zip
              </button>
              <button onClick={handleReset} style={{ background: 'none', border: '1px solid #BBF7D0', color: '#15803D', padding: '12px 20px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer' }}>
                Bundle more files
              </button>
            </div>
          </div>
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
