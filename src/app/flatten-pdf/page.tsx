'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { flattenPDF } from '@/lib/pdf/flatten'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'What does "flattening" a PDF actually do?',
    a: 'Flattening merges interactive elements — form fields, annotations, highlights, and comments — permanently into the page content. The result looks identical but contains no editable or removable layers.',
  },
  {
    q: 'Will text in form fields still be readable after flattening?',
    a: 'Yes. When form fields are flattened, their current values are burned directly into the page as static text. Anyone viewing the PDF will see exactly what was typed, but they cannot change or delete it.',
  },
  {
    q: 'Does flattening reduce file size?',
    a: 'Often yes — removing interactive form structures, JavaScript, and annotation metadata can reduce size noticeably. However, if the PDF already had no forms or annotations the size change will be minimal.',
  },
  {
    q: 'Can I unflatten a PDF once it has been flattened?',
    a: 'No. Flattening is a one-way, permanent process. Once interactive elements are merged into the page content they cannot be separated again. Always keep the original file if you might need to edit it later.',
  },
  {
    q: 'Is it safe to flatten a signed PDF?',
    a: 'Flattening will visually preserve digital signature appearances on the page, but the cryptographic signature data will be invalidated — signature validators will no longer show the document as signed. If legal validity matters, do not flatten the PDF.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'No. Everything runs entirely in your browser using the @cantoo/pdf-lib library. Your file never leaves your device — not even to our servers.',
  },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Flatten PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/flatten-pdf',
      description: 'Merge form fields, annotations and signatures into static page content. Make PDF non-editable. Free, no upload, no watermark.',
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
        { '@type': 'ListItem', position: 1, name: 'Home',        item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools',       item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Flatten PDF', item: 'https://doclair.in/flatten-pdf' },
      ],
    },
  ],
}

const SIDEBAR_REVERSE = [
  { name: 'Encrypt PDF',     slug: 'encrypt-pdf',     icon: '🔐', colorBg: '#DCFCE7', desc: 'Password-protect PDF' },
  { name: 'Privacy Scanner', slug: 'privacy-scanner', icon: '🔍', colorBg: '#DBEAFE', desc: 'Detect sensitive data' },
]

const SIDEBAR_RELATED = [
  { name: 'Redact PDF',        slug: 'redact-pdf',        icon: '🔏', colorBg: '#FEE2E2', desc: 'Permanently redact content' },
  { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata', icon: '✏️', colorBg: '#EDE9FE', desc: 'Edit title, author, dates' },
  { name: 'Remove Password',   slug: 'remove-password',   icon: '🔓', colorBg: '#DCFCE7', desc: 'Unlock PDF' },
  { name: 'Compress PDF',      slug: 'compress-pdf',      icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size' },
]

interface ToggleProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <label htmlFor={id} style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '14px 16px',
      borderRadius: '10px',
      background: checked ? '#FFF8F0' : 'white',
      border: `1px solid ${checked ? 'var(--amber)' : 'var(--border)'}`,
      cursor: 'pointer',
      transition: 'all 0.2s',
    }}>
      <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
        <div style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          background: checked ? 'var(--amber)' : '#D1D5DB',
          transition: 'background 0.2s',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '21px' : '3px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'white',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>{description}</div>
      </div>
    </label>
  )
}

export default function FlattenPDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState('')

  const [flattenForms, setFlattenForms] = useState(true)
  const [flattenAnnotations, setFlattenAnnotations] = useState(true)
  const [removeJavaScript, setRemoveJavaScript] = useState(true)
  const [stripMetadata, setStripMetadata] = useState(false)

  const handleFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0])
      setToolState('idle')
      setResult(null)
      setError('')
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const out = await flattenPDF(file, { flattenForms, flattenAnnotations, stripMetadata, removeJavaScript })
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flatten PDF')
      setToolState('error')
    }
  }, [file, flattenForms, flattenAnnotations, stripMetadata, removeJavaScript])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-flattened.pdf')
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
<ToolPageLayout
        toolName="Flatten PDF"
        sidebar={<ToolSidebar reverseActions={SIDEBAR_REVERSE} relatedTools={SIDEBAR_RELATED} />}
      >
        {/* Header */}
        <div>
          <h1 style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 48px)',
            letterSpacing: '-1px',
            lineHeight: 1.05,
            marginBottom: '10px',
          }}>
            <span style={{ color: 'var(--ink)' }}>Flatten PDF </span>
            <span style={{ color: 'var(--amber)' }}>Lock Content Permanently</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Merge form fields, annotations and signatures into static page content. Make PDF non-editable. Free, no upload, no watermark.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✦ No Watermark</span>
          </div>
        </div>

        {/* Options */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '10px',
            color: 'var(--amber)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>// Flatten Options</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Toggle id="flattenForms" label="Flatten form fields" description="Form field values are baked into the page permanently" checked={flattenForms} onChange={setFlattenForms} />
            <Toggle id="flattenAnnotations" label="Flatten annotations" description="Comments, highlights and drawings become part of the page" checked={flattenAnnotations} onChange={setFlattenAnnotations} />
            <Toggle id="removeJavaScript" label="Remove JavaScript" description="Remove any embedded scripts from the document" checked={removeJavaScript} onChange={setRemoveJavaScript} />
            <Toggle id="stripMetadata" label="Strip metadata" description="Remove author, title and creation information" checked={stripMetadata} onChange={setStripMetadata} />
          </div>
        </div>

        {/* Drop Zone */}
        {toolState === 'idle' && !file && (
          <DropZone
            onFilesAdded={handleFiles}
            accept=".pdf"
            maxFiles={1}
            maxSizeMB={200}
            icon="🔥"
            label="Drop your PDF here"
            subLabel="or click to browse — up to 200 MB"
            currentCount={0}
          />
        )}

        {/* File selected */}
        {toolState === 'idle' && file && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button
              onClick={handleProcess}
              style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Flatten PDF →
            </button>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>✕ Remove</button>
          </div>
        )}

        {/* Processing */}
        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'flattenspin 1.5s linear infinite', display: 'inline-block' }}>⚙️</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>Flattening PDF…</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Merging interactive elements into page content</div>
            <style>{`@keyframes flattenspin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Error */}
        {toolState === 'error' && <ErrorCard message={error || 'Something went wrong. Try a different file.'} onReset={handleReset} />}

        {/* Done */}
        {toolState === 'done' && result && file && (
          <DownloadCard
            filename={file.name.replace(/\.pdf$/i, '-flattened.pdf')}
            description={`Flattened · ${(result.byteLength / 1024 / 1024).toFixed(2)} MB`}
            onDownload={handleDownload}
            onReset={handleReset}
            title="PDF flattened!"
            resetLabel="Flatten another →"
            nextSteps={[
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
              { slug: 'encrypt-pdf', name: 'Encrypt PDF', icon: '🔐' },
            ]}
          />
        )}

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Flatten a PDF — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Flattening a PDF merges all interactive form fields, annotations, and layers into a single non-editable page layer. This prevents further editing of form data and ensures the document looks the same in every PDF viewer.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF (typically a filled form or annotated document).</strong> Drop your file into the upload area above.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose your flatten options.</strong> Select which elements to merge — form fields, annotations, JavaScript, and metadata stripping.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Flatten.</strong> The PDF is processed entirely in your browser with no upload required.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the flattened PDF — form fields become static text.</strong> The visual appearance is identical but all interactive elements are permanently merged.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>When should I flatten a PDF?</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Flatten before sharing a completed form to prevent recipients from changing the answers. Flatten annotated PDFs before archiving to ensure annotations are permanently visible. Printers and archival systems often require flattened PDFs for reliable output.</p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Flatten PDF on iPhone and Android</h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your fillable form, flatten it, and download the static PDF directly to your device.</p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
