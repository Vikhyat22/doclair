'use client'

import { useState, useCallback } from 'react'
import { decryptPDF, isEncrypted } from '@/lib/pdf/decrypt'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'Does Doclair crack or bypass PDF passwords?', a: 'No. Doclair removes owner-password / permissions restrictions from PDFs that you can already open without a password. For user-password encrypted PDFs (those that ask for a password when opening), browser-based removal is not possible without the encryption key.' },
  { q: 'What is an owner password vs a user password?', a: 'A user password prevents the PDF from opening at all. An owner (permissions) password allows the file to open freely but restricts editing, printing or copying. Doclair removes owner-password restrictions, which is the most common type of "locked" PDF.' },
  { q: 'Are my files uploaded?', a: 'Never. pdf-lib runs entirely in your browser. No data leaves your device.' },
  { q: 'What if the PDF is not actually encrypted?', a: 'Doclair detects this and lets you download a clean copy directly.' },
  { q: 'Will the unlocked PDF lose any content?', a: 'No. Only the permissions restrictions are removed. All text, images, annotations and formatting are preserved exactly.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Remove PDF Password — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/remove-password',
      description: 'Remove password protection and unlock PDF permissions restrictions in your browser. No upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Remove PDF owner-password / permissions restrictions',
        'Detect unencrypted PDFs automatically',
        'No file upload to server',
        'No watermark on output',
        'No sign-up required',
        'Works on mobile',
      ],
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
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',            item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',           item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Remove Password', item: 'https://doclair.in/remove-password' },
  ],
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function RemovePasswordPage() {
  const [file, setFile]               = useState<File | null>(null)
  const [toolState, setToolState]     = useState<ToolState>('idle')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [pageCount, setPageCount]     = useState(0)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [encrypted, setEncrypted]     = useState<boolean | null>(null)

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setResultBytes(null)
    setErrorMsg(null)
    setToolState('idle')
    setEncrypted(null)

    const enc = await isEncrypted(f)
    setEncrypted(enc)
  }, [])

  async function handleRemove() {
    if (!file) return
    setToolState('merging')
    setErrorMsg(null)

    const result = await decryptPDF(file)

    if (result.ok) {
      setResultBytes(result.bytes)
      setPageCount(result.pageCount)
      setToolState('done')
    } else if (result.reason === 'user-password-required') {
      setErrorMsg(
        'This PDF requires a user password to open, which prevents browser-based unlocking. ' +
        'Only owner-password / permissions restrictions can be removed without the encryption key.'
      )
      setToolState('idle')
    } else {
      setErrorMsg('This PDF file appears to be corrupted or uses an unsupported format.')
      setToolState('idle')
    }
  }

  function handleDownloadOriginal() {
    if (!file) return
    const url = URL.createObjectURL(file)
    const a   = document.createElement('a')
    a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_unlocked.pdf`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleDownloadResult() {
    if (!resultBytes) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_unlocked.pdf`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    setFile(null)
    setToolState('idle')
    setResultBytes(null)
    setPageCount(0)
    setErrorMsg(null)
    setEncrypted(null)
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Encrypt PDF', slug: 'encrypt-pdf', icon: '🔒', colorBg: '#DCFCE7', desc: 'Add password protection to a PDF' },
      ]}
      relatedTools={[
        { name: 'Compress PDF',      slug: 'compress-pdf',     icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Merge PDF',         slug: 'merge-pdf',        icon: '🔀', colorBg: '#DBEAFE', desc: 'Combine multiple PDFs' },
        { name: 'Split PDF',         slug: 'split-pdf',        icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract page ranges' },
        { name: 'Edit PDF Metadata', slug: 'edit-metadata',    icon: '✏️', colorBg: '#FFF0DC', desc: 'Edit title, author and more' },
        { name: 'Add Page Numbers',  slug: 'add-page-numbers', icon: '🔢', colorBg: '#FEE2E2', desc: 'Stamp page numbers on a PDF' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Remove PDF Password" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Remove PDF Password </span>
          <span style={{ color: 'var(--amber)' }}>Unlock Restrictions</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '560px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Remove owner-password / permissions restrictions from a PDF. Files that are locked for editing, printing or copying are unlocked instantly. No upload.
        </p>
      </div>

      {/* State: idle, no file */}
      {toolState === 'idle' && !file && (
        <DropZone
          onFilesAdded={addFile}
          accept=".pdf"
          maxFiles={1}
          maxSizeMB={200}
          currentCount={0}
          icon="🔓"
          label="Drop your PDF here"
          subLabel="or click to browse — max 200 MB"
        />
      )}

      {/* State: idle, file selected */}
      {toolState === 'idle' && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Selected file row */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', background: '#FFF0DC', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {formatBytes(file.size)} · {encrypted === null ? 'Checking…' : encrypted ? '🔒 Restrictions detected' : '✓ No restrictions'}
              </div>
            </div>
            <button
              onClick={handleReset}
              style={{
                width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                background: 'transparent', cursor: 'pointer', fontSize: '14px',
                color: 'var(--muted)', transition: 'all 0.15s', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
            >✕</button>
          </div>

          {/* Not encrypted — info card */}
          {encrypted === false && (
            <div style={{
              background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>ℹ️</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#0C4A6E', marginBottom: '4px' }}>No password protection found</div>
                  <div style={{ fontSize: '13px', color: '#075985', lineHeight: 1.6 }}>This PDF has no permissions restrictions. You can download a clean copy directly.</div>
                </div>
              </div>
              <button
                onClick={handleDownloadOriginal}
                style={{
                  alignSelf: 'flex-start', background: '#0284C7', color: 'white',
                  padding: '10px 20px', borderRadius: '100px', border: 'none',
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0369A1'; e.currentTarget.style.transform = 'scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0284C7'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                ⬇ Download Copy
              </button>
            </div>
          )}

          {/* Encrypted — action panel */}
          {encrypted === true && (
            <div style={{
              background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>// Remove Restrictions</div>

              <p style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.7, lineHeight: 1.65, margin: 0 }}>
                This PDF has owner-password restrictions (locked for printing, editing or copying). Click below to remove them and generate an unrestricted copy.
              </p>

              {/* Error message */}
              {errorMsg && <ErrorCard message={errorMsg} onReset={handleReset} />}

              <button
                onClick={handleRemove}
                style={{
                  width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px',
                  borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                  fontWeight: 700, fontSize: '17px', border: 'none',
                  cursor: 'pointer', transition: 'transform 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                🔓 Remove Restrictions
              </button>
            </div>
          )}
        </div>
      )}

      {/* State: processing */}
      {toolState === 'merging' && (
        <div style={{
          background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--amber)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 24px',
          }} />
          <div style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: '24px', color: 'white', marginBottom: '6px',
          }}>Removing restrictions…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>Stripping encryption and saving unrestricted PDF</div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DownloadCard
            filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_unlocked.pdf`}
            description={`${pageCount} page${pageCount !== 1 ? 's' : ''} · Restrictions Removed`}
            onDownload={handleDownloadResult}
            onReset={handleReset}
            title="Password removed!"
            resetLabel="Remove from another →"
            nextSteps={[
              { slug: 'encrypt-pdf', name: 'Encrypt PDF', icon: '🔐' },
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
            ]}
          />
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pages</div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--ink)' }}>{pageCount}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: '#16A34A' }}>Unlocked ✓</div>
            </div>
          </div>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Remove PDF Password Restrictions — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Many PDFs are "locked" with owner passwords that restrict printing, copying or editing — even though you can open them freely. Doclair removes these restrictions instantly in your browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Upload your PDF by clicking <strong>Drop your PDF here</strong> or dragging it in.',
            'Doclair automatically detects whether the file has restrictions.',
            'Click <strong>Remove Restrictions</strong> and download your fully unlocked PDF.',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white',
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
              }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }} dangerouslySetInnerHTML={{ __html: step }} />
            </div>
          ))}
        </div>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '28px' }}>
          What kind of PDFs can Doclair unlock?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Doclair removes <em>owner-password</em> restrictions — the most common type. These are PDFs that open without asking for a password, but have printing, copying or editing disabled. User-password encrypted PDFs (that show a password prompt when opening) require the encryption key and cannot be unlocked in the browser.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Why is the PDF still restricted after unlocking?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          If the error "user-password-required" appears, the PDF is encrypted with a user password that requires the secret key to decrypt — this is beyond what browser-based tools can handle. In all other cases, the output PDF is fully unrestricted.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
