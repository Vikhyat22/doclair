'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
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
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'PDF Privacy Scanner', item: 'https://doclair.in/privacy-scanner' },
      ],
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
  const [errorMessage, setErrorMessage] = useState('')

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
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setErrorMessage(message)
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
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setErrorMessage(message)
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
    setFile(null); setScanResult(null); setStrippedBytes(null); setError(''); setErrorMessage(''); setToolState('idle')
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
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
              <DownloadCard
                filename={file.name.replace(/\.pdf$/i, '-clean.pdf')}
                description="All metadata stripped — safe to share"
                onDownload={handleDownload}
                onReset={handleReset}
                title="Metadata stripped!"
                resetLabel="Scan another →"
                nextSteps={[
                  { slug: 'encrypt-pdf', name: 'Encrypt PDF', icon: '🔐' },
                  { slug: 'redact-pdf', name: 'Redact PDF', icon: '⬛' },
                  { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
                ]}
              />
            )}
          </>
        )}

        {toolState === 'error' && <ErrorCard message={errorMessage || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Scan a PDF for Private Data — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            PDFs can contain hidden personal data such as the author&apos;s name, email, company, creation date, GPS coordinates, and edit history. The Privacy Scanner reveals all metadata so you can decide whether to clean it before sharing.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop your file into the scanner above — scanning starts automatically.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair scans all metadata fields.</strong> XMP, DocInfo, embedded objects and custom properties are all inspected.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>View the full privacy report.</strong> Each detected field is shown with its severity level — high, medium, or low.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Use Clean PDF Metadata to remove any fields you don&apos;t want to share.</strong> Click Strip All Metadata to download a clean version instantly.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>What private data can be hidden in a PDF?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>PDFs may contain the author&apos;s name, email, organisation, software used to create the file, creation and modification timestamps, GPS coordinates from embedded images, comment threads, document history, custom properties, and embedded file attachments. Sharing a PDF without checking metadata can inadvertently expose this information.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Privacy Scanner on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF from Files and review the privacy report instantly in your browser.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
