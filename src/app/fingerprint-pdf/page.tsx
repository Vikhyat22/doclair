'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { fingerprintPDF } from '@/lib/pdf/fingerprint'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'How does the fingerprint work?',
    a: 'A unique string combining your recipient ID and timestamp is embedded in the PDF\'s Keywords metadata field and as invisible white text on each page.',
  },
  {
    q: 'How do I verify a fingerprint?',
    a: 'Open the PDF in a reader, go to File → Properties → Description (or Custom). Look for the Keywords field — it will contain the DOCLAIR-FP tag with the recipient ID and timestamp.',
  },
  {
    q: 'Can the fingerprint be removed?',
    a: 'Someone who knows to look for it in the metadata can clear it. However, the invisible text on pages is harder to detect and remove without knowing it exists.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. Everything runs in your browser using @cantoo/pdf-lib. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Fingerprint PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/fingerprint-pdf',
      description: 'Embed an invisible fingerprint to identify which recipient leaked a confidential document. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Privacy Scanner', slug: 'privacy-scanner', icon: '🔍', colorBg: '#DBEAFE', desc: 'Detect sensitive metadata' },
  { name: 'Add Watermark',   slug: 'add-watermark',   icon: '💧', colorBg: '#EDE9FE', desc: 'Visible watermark' },
  { name: 'Encrypt PDF',     slug: 'encrypt-pdf',     icon: '🔐', colorBg: '#DCFCE7', desc: 'Password-protect PDF' },
]

export default function FingerprintPDFPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')

  const [recipientId, setRecipientId] = useState('')
  const [mode, setMode]               = useState<'invisible' | 'visible'>('invisible')
  const [visibleText, setVisibleText] = useState('')

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]); setToolState('idle'); setResult(null); setError('')
    }
  }, [])

  const handleFingerprint = useCallback(async () => {
    if (!file || !recipientId.trim()) return
    setToolState('processing')
    setError('')
    try {
      const out = await fingerprintPDF(file, {
        recipientId:  recipientId.trim(),
        invisible:    mode === 'invisible',
        visibleText:  mode === 'visible' ? (visibleText || recipientId) : undefined,
      })
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fingerprint PDF')
      setToolState('error')
    }
  }, [file, recipientId, mode, visibleText])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, `-fp-${recipientId.slice(0, 8).replace(/[^a-z0-9]/gi, '-')}.pdf`)
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file, recipientId])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setError(''); setToolState('idle')
  }, [])

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
    border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
    background: active ? '#FFF8F0' : 'white',
    color: active ? '#92400E' : 'var(--muted)',
    cursor: 'pointer', transition: 'all 0.2s',
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Fingerprint PDF"
        toolSlug="fingerprint-pdf"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Fingerprint PDF </span>
            <span style={{ color: 'var(--amber)' }}>Track Document Recipients</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Embed an invisible fingerprint to identify which recipient leaked a confidential document. Free, no upload.
          </p>
        </div>

        {/* Options */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// Fingerprint Settings</div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>Recipient identifier</span>
            <input
              type="text"
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              placeholder="e.g. client@company.com or CLIENT-001"
              style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', color: 'var(--ink)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>This ID is embedded invisibly. If the document leaks, trace it back to this recipient.</span>
          </label>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '10px' }}>Fingerprint mode</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={pillStyle(mode === 'invisible')} onClick={() => setMode('invisible')}>🫥 Invisible fingerprint (default)</button>
              <button style={pillStyle(mode === 'visible')} onClick={() => setMode('visible')}>👁 Visible watermark</button>
            </div>
            {mode === 'visible' && (
              <input
                type="text"
                value={visibleText}
                onChange={e => setVisibleText(e.target.value)}
                placeholder="Watermark text (defaults to recipient ID)"
                style={{ marginTop: '10px', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--ink)', width: '100%', boxSizing: 'border-box' }}
              />
            )}
          </div>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="🔏" label="Drop your PDF here" subLabel="or click to browse — up to 200 MB" currentCount={0} />
        )}

        {file && toolState === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button
              onClick={handleFingerprint}
              disabled={!recipientId.trim()}
              style={{ background: recipientId.trim() ? 'var(--ink)' : '#9CA3AF', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: recipientId.trim() ? 'pointer' : 'not-allowed' }}
            >
              🔏 Fingerprint PDF →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔏</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Embedding fingerprint…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>For: {recipientId}</div>
          </div>
        )}

        {toolState === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try again</button>
          </div>
        )}

        {toolState === 'done' && result && file && (
          <>
            <DownloadCard
              filename={file.name.replace(/\.pdf$/i, `-fp-${recipientId.slice(0, 8).replace(/[^a-z0-9]/gi, '-')}.pdf`)}
              description={`Fingerprinted for: ${recipientId}`}
              onDownload={handleDownload}
              onReset={handleReset}
            />
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
              <strong>ℹ️ Verify:</strong> Open the PDF → File → Properties → Keywords field. Look for the <code style={{ background: '#FEF9C3', padding: '1px 5px', borderRadius: '3px' }}>DOCLAIR-FP:</code> tag.
            </div>
          </>
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
