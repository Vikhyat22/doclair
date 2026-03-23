'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { scanPDFPrivacy, stripAllMetadata, type PrivacyScanResult } from '@/lib/pdf/privacyScanner'

type ToolState = 'idle' | 'scanning' | 'scanned' | 'stripping' | 'done' | 'error'

const FAQS = [
  {
    q: 'What kind of private data can be found in a PDF?',
    a: 'PDFs can contain author name, software used to create the file, creation timestamps, document title, subject, and keywords — all embedded in invisible metadata fields.',
  },
  {
    q: 'Does stripping metadata change the visible content?',
    a: 'No. Only invisible metadata fields are cleared. The visible text, images and layout of the PDF remain completely unchanged.',
  },
  {
    q: 'Is this a complete privacy audit?',
    a: 'This tool checks standard PDF metadata fields. It does not scan the visible text for personally identifiable information — use the Redact PDF tool for that.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. All scanning and metadata removal runs entirely in your browser. Your file never leaves your device.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PDF Privacy Scanner — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/privacy-scanner',
      description: 'Scan any PDF for hidden metadata that could expose your identity. Strip all detected data with one click. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Fingerprint PDF',   slug: 'fingerprint-pdf',   icon: '🔏', colorBg: '#FFF0DC', desc: 'Track document recipients' },
  { name: 'Redact PDF',        slug: 'redact-pdf',        icon: '⬛', colorBg: '#FEE2E2', desc: 'Redact visible content' },
  { name: 'Flatten PDF',       slug: 'flatten-pdf',       icon: '🔥', colorBg: '#FEE2E2', desc: 'Lock content permanently' },
  { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata', icon: '✏️', colorBg: '#EDE9FE', desc: 'Edit document metadata' },
]

const SEVERITY_LABELS: Record<string, { icon: string; color: string; bg: string }> = {
  high:   { icon: '🔴', color: '#991B1B', bg: '#FEF2F2' },
  medium: { icon: '🟡', color: '#92400E', bg: '#FFFBEB' },
  low:    { icon: '🟢', color: '#166534', bg: '#F0FDF4' },
}

const LEVEL_BANNERS = {
  clean:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', icon: '✅', msg: 'No privacy risks found' },
  low:    { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '⚠️', msg: 'Low privacy risk — minor metadata found' },
  medium: { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E', icon: '⚠️', msg: 'Medium privacy risk — personal data found' },
  high:   { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '🔴', msg: 'High privacy risk — sensitive data found' },
}

export default function PrivacyScannerPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [scanResult, setScanResult] = useState<PrivacyScanResult | null>(null)
  const [strippedBytes, setStrippedBytes] = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFile(f)
    setScanResult(null)
    setStrippedBytes(null)
    setError('')
    setToolState('scanning')
    try {
      const result = await scanPDFPrivacy(f)
      setScanResult(result)
      setToolState('scanned')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan PDF')
      setToolState('error')
    }
  }, [])

  const handleStrip = useCallback(async () => {
    if (!file) return
    setToolState('stripping')
    try {
      const bytes = await stripAllMetadata(file)
      setStrippedBytes(bytes)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to strip metadata')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!strippedBytes || !file) return
    const blob = new Blob([strippedBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-clean.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [strippedBytes, file])

  const handleReset = useCallback(() => {
    setFile(null); setScanResult(null); setStrippedBytes(null); setError(''); setToolState('idle')
  }, [])

  const banner = scanResult ? LEVEL_BANNERS[scanResult.riskLevel] : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="PDF Privacy Scanner"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Privacy Scanner </span>
            <span style={{ color: 'var(--amber)' }}>Find Hidden Data in Your PDF</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Scan any PDF for hidden metadata that could expose your identity before sharing. Strip all detected data with one click. Free, no upload.
          </p>
        </div>

        {toolState === 'idle' && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="🔍" label="Drop your PDF here to scan" subLabel="Scan starts automatically — up to 200 MB" currentCount={0} />
        )}

        {toolState === 'scanning' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Scanning PDF…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Checking metadata fields</div>
          </div>
        )}

        {(toolState === 'scanned' || toolState === 'stripping' || toolState === 'done') && scanResult && banner && (
          <>
            {/* Risk banner */}
            <div style={{ background: banner.bg, border: `1px solid ${banner.border}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{banner.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: banner.text }}>{banner.msg}</div>
                <div style={{ fontSize: '12px', color: banner.text, opacity: 0.8, marginTop: '2px' }}>
                  Risk Score: {scanResult.riskScore}/100 · {scanResult.totalFound} item{scanResult.totalFound !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>

            {/* Risk items */}
            {scanResult.risks.length > 0 && (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  // Privacy Risks Found
                </div>
                {scanResult.risks.map((risk, i) => {
                  const sev = SEVERITY_LABELS[risk.severity]
                  const masked = risk.value.length > 20 ? risk.value.slice(0, 20) + '…' : risk.value
                  return (
                    <div key={i} style={{ padding: '14px 20px', borderBottom: i < scanResult.risks.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.bg}`, borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {sev.icon} {risk.severity.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{risk.finding}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>&quot;{masked}&quot;</div>
                      </div>
                      {risk.canRemove && (
                        <span style={{ fontSize: '11px', color: '#166534', background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '3px 8px' }}>Removable</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {scanResult.riskLevel === 'clean' && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡</div>
                <div style={{ fontWeight: 600, color: '#166534', fontSize: '15px' }}>This PDF contains no detectable metadata.</div>
                <div style={{ fontSize: '13px', color: '#15803D', marginTop: '4px' }}>It is safe to share.</div>
              </div>
            )}

            {/* Actions */}
            {toolState !== 'done' && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handleStrip} disabled={toolState === 'stripping'}
                  style={{ background: 'var(--ink)', color: 'white', padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', opacity: toolState === 'stripping' ? 0.7 : 1 }}>
                  {toolState === 'stripping' ? 'Stripping…' : '🛡 Strip All Metadata & Download'}
                </button>
                <button onClick={handleReset} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '12px 20px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer' }}>
                  Scan another file
                </button>
              </div>
            )}

            {toolState === 'done' && strippedBytes && file && (
              <DownloadCard filename={file.name.replace(/\.pdf$/i, '-clean.pdf')} description="All metadata stripped — safe to share" onDownload={handleDownload} onReset={handleReset} />
            )}
          </>
        )}

        {toolState === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try again</button>
          </div>
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
