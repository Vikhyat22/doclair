'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { readMetadata, writeMetadata, deleteAllMetadata, type PDFMetadata } from '@/lib/pdf/editMetadata'

type ToolState = 'idle' | 'reading' | 'ready' | 'saving' | 'done' | 'error'

const FAQS = [
  {
    q: 'What is PDF metadata?',
    a: 'PDF metadata is descriptive information stored inside a PDF file but separate from its visible content. It typically includes the document title, author name, creation date, software that created it, and searchable keywords.',
  },
  {
    q: 'Why would I want to edit PDF metadata?',
    a: 'Common reasons include fixing auto-generated titles that show up in search results or document viewers, updating author information before sharing, adding keywords for better discoverability, or removing sensitive information like the creator software name.',
  },
  {
    q: 'Will editing metadata change the visible content of my PDF?',
    a: 'No. Metadata is stored separately from the page content. Editing titles, authors, dates, and keywords does not alter any text, images, or layout visible in the document.',
  },
  {
    q: 'What happens when I click "Delete All Metadata"?',
    a: 'All standard metadata fields — title, author, subject, keywords, creator, and producer — are cleared. Dates are also removed. This can be useful for privacy-sensitive documents before sharing externally.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. All processing happens locally in your browser using the @cantoo/pdf-lib library. Your PDF and any edits you make never leave your device.',
  },
  {
    q: 'Can I edit metadata in a password-protected PDF?',
    a: 'If the PDF has an owner password that restricts editing, the tool may not be able to save changes. Use the Remove Password tool first to unlock the PDF, then edit its metadata.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Edit PDF Metadata — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/edit-pdf-metadata',
      description: 'Read and edit the title, author, keywords and other properties stored inside any PDF. Free, no upload.',
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
        { '@type': 'ListItem', position: 1, name: 'Home',              item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools',             item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Edit PDF Metadata', item: 'https://doclair.in/edit-pdf-metadata' },
      ],
    },
  ],
}

const SIDEBAR_REVERSE = [
  { name: 'Privacy Scanner', slug: 'privacy-scanner', icon: '🔍', colorBg: '#DBEAFE', desc: 'Detect sensitive data' },
  { name: 'Flatten PDF',     slug: 'flatten-pdf',     icon: '🔥', colorBg: '#FEE2E2', desc: 'Bake content permanently' },
]

const SIDEBAR_RELATED = [
  { name: 'Encrypt PDF',      slug: 'encrypt-pdf',      icon: '🔐', colorBg: '#DCFCE7', desc: 'Password-protect PDF' },
  { name: 'Redact PDF',       slug: 'redact-pdf',       icon: '🔏', colorBg: '#FEE2E2', desc: 'Permanently redact content' },
  { name: 'Fingerprint PDF',  slug: 'fingerprint-pdf',  icon: '🪪', colorBg: '#FFF0DC', desc: 'Track document copies' },
  { name: 'Compress PDF',     slug: 'compress-pdf',     icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
]

const EMPTY_META: PDFMetadata = {
  title: '', author: '', subject: '', keywords: '',
  creator: '', producer: '', creationDate: '', modDate: '',
}

interface FieldProps {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function MetaField({ label, hint, value, onChange, type = 'text' }: FieldProps) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '5px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: '6px' }}>— {hint}</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          fontSize: '14px',
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          color: 'var(--ink)',
          background: 'white',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}

export default function EditPDFMetadataPage() {
  const [file, setFile] = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [meta, setMeta] = useState<PDFMetadata>(EMPTY_META)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [outputName, setOutputName] = useState('')

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFile(f)
    setToolState('reading')
    setError('')
    setResult(null)
    try {
      const m = await readMetadata(f)
      setMeta(m)
      setToolState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read PDF metadata')
      setToolState('error')
    }
  }, [])

  const updateField = useCallback((field: keyof PDFMetadata) => (val: string) => {
    setMeta(prev => ({ ...prev, [field]: val }))
  }, [])

  const handleWrite = useCallback(async () => {
    if (!file) return
    setToolState('saving')
    try {
      const out = await writeMetadata(file, meta)
      setResult(out)
      setOutputName(file.name.replace(/\.pdf$/i, '-updated.pdf'))
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save metadata')
      setToolState('error')
    }
  }, [file, meta])

  const handleDeleteAll = useCallback(async () => {
    if (!file) return
    setShowConfirm(false)
    setToolState('saving')
    try {
      const out = await deleteAllMetadata(file)
      setResult(out)
      setOutputName(file.name.replace(/\.pdf$/i, '-no-metadata.pdf'))
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete metadata')
      setToolState('error')
    }
  }, [file])

  const handleDownload = useCallback(() => {
    if (!result) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = outputName
    a.click()
    URL.revokeObjectURL(url)
  }, [result, outputName])

  const handleReset = useCallback(() => {
    setFile(null)
    setResult(null)
    setMeta(EMPTY_META)
    setError('')
    setToolState('idle')
    setShowConfirm(false)
  }, [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Edit PDF Metadata"
        sidebar={<ToolSidebar reverseActions={SIDEBAR_REVERSE} relatedTools={SIDEBAR_RELATED} />}
      >
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Edit PDF Metadata </span>
            <span style={{ color: 'var(--amber)' }}>Update Document Properties</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Read and edit the title, author, keywords and other properties stored inside any PDF. Free, no upload.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
          </div>
        </div>

        {/* Drop Zone */}
        {toolState === 'idle' && (
          <DropZone
            onFilesAdded={handleFiles}
            accept=".pdf"
            maxFiles={1}
            maxSizeMB={200}
            icon="✏️"
            label="Drop your PDF here to read metadata"
            subLabel="or click to browse — metadata is read instantly"
            currentCount={0}
          />
        )}

        {/* Reading */}
        {toolState === 'reading' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📖</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)' }}>Reading metadata…</div>
          </div>
        )}

        {/* Metadata form */}
        {(toolState === 'ready' || toolState === 'saving') && file && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>// Document Properties</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{file.name}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              <MetaField label="Title" value={meta.title} onChange={updateField('title')} />
              <MetaField label="Author" value={meta.author} onChange={updateField('author')} />
              <MetaField label="Subject" value={meta.subject} onChange={updateField('subject')} />
              <MetaField label="Keywords" hint="Separate with commas" value={meta.keywords} onChange={updateField('keywords')} />
              <MetaField label="Creator" hint="Application that created the PDF" value={meta.creator} onChange={updateField('creator')} />
              <MetaField label="Producer" hint="Application that produced the PDF" value={meta.producer} onChange={updateField('producer')} />
              <MetaField label="Creation Date" value={meta.creationDate} onChange={updateField('creationDate')} type="datetime-local" />
              <MetaField label="Modified Date" value={meta.modDate} onChange={updateField('modDate')} type="datetime-local" />
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleWrite}
                disabled={toolState === 'saving'}
                style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: toolState === 'saving' ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', opacity: toolState === 'saving' ? 0.6 : 1, transition: 'transform 0.15s' }}
                onMouseEnter={e => toolState !== 'saving' && (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {toolState === 'saving' ? 'Saving…' : 'Update Metadata →'}
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={toolState === 'saving'}
                style={{ background: 'none', color: 'var(--red, #DC2626)', padding: '11px 22px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: '1px solid var(--red, #DC2626)', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                Delete All Metadata
              </button>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕ Start over</button>
            </div>
          </div>
        )}

        {/* Confirm delete dialog */}
        {showConfirm && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontWeight: 600, color: '#991B1B', marginBottom: '8px' }}>Are you sure?</div>
            <div style={{ fontSize: '14px', color: '#991B1B', opacity: 0.8, marginBottom: '16px' }}>This will permanently remove all metadata (title, author, keywords, dates) from the PDF. This cannot be undone after downloading.</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleDeleteAll} style={{ background: '#DC2626', color: 'white', padding: '10px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>Yes, Delete All</button>
              <button onClick={() => setShowConfirm(false)} style={{ background: 'white', color: '#991B1B', padding: '10px 22px', borderRadius: '8px', border: '1px solid #FECACA', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Error */}
        {toolState === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#991B1B' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
            <button onClick={handleReset} style={{ marginTop: '12px', background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#991B1B', fontSize: '13px' }}>Try again</button>
          </div>
        )}

        {/* Done */}
        {toolState === 'done' && result && (
          <DownloadCard
            filename={outputName}
            description={`Metadata updated · ${(result.byteLength / 1024 / 1024).toFixed(2)} MB`}
            onDownload={handleDownload}
            onReset={handleReset}
            title="Metadata updated!"
            resetLabel="Edit another →"
            nextSteps={[
              { slug: 'privacy-scanner', name: 'Privacy Scanner', icon: '🔍' },
              { slug: 'encrypt-pdf', name: 'Encrypt PDF', icon: '🔐' },
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Edit PDF Metadata — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            PDF metadata includes the document title, author name, subject, keywords, and creation/modification dates. Editing metadata makes documents more searchable, ensures correct attribution, and removes sensitive information before sharing.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop your file into the editor — metadata is read and displayed instantly.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Edit the Title, Author, Subject, and Keywords fields.</strong> All standard metadata fields are shown and editable.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Save Metadata.</strong> The updated metadata is written into a new copy of the PDF in your browser.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the updated PDF.</strong> The original file is never modified — your download contains the new metadata.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Why does PDF metadata matter?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Metadata is indexed by search engines, document management systems, and Windows/macOS search. Correct metadata improves discoverability. Incorrect metadata — like the wrong author name or creation date — can be misleading. Before sharing a confidential document, use Privacy Scanner to check what metadata it contains.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Edit Metadata on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF from the Files app, edit the fields, and download the updated PDF.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
