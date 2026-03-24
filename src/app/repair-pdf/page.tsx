'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { repairPDF } from '@/lib/pdf/repair'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What types of PDF corruption can be repaired?',
    a: 'This tool can fix structural corruption — incomplete object tables, malformed cross-reference streams, and broken object references. It works best on PDFs that fail to open but have most of their data intact.',
  },
  {
    q: 'Will all content be recovered?',
    a: 'Recovery depends on the extent of damage. Structurally damaged PDFs can usually be fully recovered. Severely truncated or overwritten files may only have partial content recoverable.',
  },
  {
    q: 'Can it repair password-protected PDFs?',
    a: 'Yes — this tool uses encryption-ignoring mode which can process some encrypted PDFs even without the password, though decrypted content may not be accessible.',
  },
  {
    q: 'Is my file uploaded to a server?',
    a: 'No. The repair runs entirely in your browser using @cantoo/pdf-lib. Your file never leaves your device.',
  },
  {
    q: 'What if the repaired PDF still looks wrong?',
    a: 'If the file is too severely corrupted for structural repair, some content may be unrecoverable. Try opening the repaired file in Adobe Acrobat for additional recovery options.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Repair PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/repair-pdf',
      description: 'Fix corrupted or damaged PDF files. Re-builds PDF structure to recover readable content. Free, no upload.',
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
        { '@type': 'ListItem', position: 3, name: 'Repair PDF', item: 'https://doclair.in/repair-pdf' },
      ],
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Flatten PDF',       slug: 'flatten-pdf',       icon: '🔥', colorBg: '#FEE2E2', desc: 'Lock content permanently' },
  { name: 'Compress PDF',      slug: 'compress-pdf',      icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size' },
  { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata', icon: '✏️', colorBg: '#EDE9FE', desc: 'Edit title, author' },
  { name: 'Remove Password',   slug: 'remove-password',   icon: '🔓', colorBg: '#DCFCE7', desc: 'Unlock PDF' },
]

export default function RepairPDFPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0])
      setToolState('idle')
      setResult(null)
      setError('')
    }
  }, [])

  const handleRepair = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const out = await repairPDF(file)
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repair PDF')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-repaired.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null)
    setResult(null)
    setError('')
    setToolState('idle')
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Repair PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Repair PDF </span>
            <span style={{ color: 'var(--amber)' }}>Fix Corrupted Documents</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Attempt to repair damaged or corrupted PDF files. Re-builds the PDF structure to recover readable content. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px 20px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
          <strong>ℹ️ Repair works best on structurally damaged PDFs.</strong> Severely corrupted files may not be fully recoverable. Always keep a backup of your original file.
        </div>

        {toolState === 'idle' && !file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="🔧" label="Drop your damaged PDF here" subLabel="or click to browse — up to 200 MB" currentCount={0} />
        )}

        {toolState === 'idle' && file && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button onClick={handleRepair} style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
              Repair PDF →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕ Remove</button>
          </div>
        )}

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔧</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Repairing PDF…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Rebuilding PDF structure and recovering content</div>
          </div>
        )}

        {toolState === 'error' && <ErrorCard message={error || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        {toolState === 'done' && result && file && (
          <DownloadCard
            filename={file.name.replace(/\.pdf$/i, '-repaired.pdf')}
            description="PDF structure rebuilt"
            onDownload={handleDownload}
            onReset={handleReset}
            title="PDF repaired!"
            resetLabel="Repair another →"
            nextSteps={[
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
              { slug: 'encrypt-pdf', name: 'Encrypt PDF', icon: '🔐' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Repair a Corrupted PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            A corrupted PDF may fail to open, display garbled content, or show an error in your PDF reader. Doclair&apos;s repair tool re-parses the raw PDF stream and attempts to recover a valid document from the remaining data.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your PDF or click to upload.</strong> Select the corrupted or damaged PDF file from your device.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Doclair parses the raw PDF bytes and reconstructs the structure.</strong> The tool rebuilds the cross-reference table and recovers readable objects from the file.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the repaired PDF and try opening it in your PDF reader.</strong> Most structurally damaged PDFs will open normally after repair.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>What causes a PDF to become corrupted?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            PDFs can become corrupt during a failed download, interrupted email transfer, disk write error, or improper export from another application. Partially downloaded PDFs are the most common case. The repair tool works best on PDFs with structural issues — severely damaged files with missing data may not be fully recoverable.
          </p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Repair PDF on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
            Doclair works in Safari and Chrome on mobile. Upload your corrupted PDF from the Files app and download the repaired version directly to your device.
          </p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
