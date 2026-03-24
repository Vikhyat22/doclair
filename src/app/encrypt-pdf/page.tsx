'use client'

import { useState, useCallback } from 'react'
import { encryptPDF, getPDFPageCount } from '@/lib/pdf/encrypt'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'What encryption standard does Doclair use?', a: 'AES-256 encryption compliant with PDF 2.0 / ISO 32000. This is the same standard used by Adobe Acrobat.' },
  { q: 'What is the difference between user and owner password?', a: 'The user (open) password is required to open the document. The owner password controls permissions — who can print, copy or edit. You can set only the user password and let Doclair generate a random owner password.' },
  { q: 'Can I set permissions without a password?', a: 'No — PDF permissions only apply to password-protected documents. Without a user password, anyone can open and ignore permissions.' },
  { q: 'Are my files uploaded?', a: 'Never. pdf-lib runs entirely in your browser. Your file and password never leave your device.' },
  { q: 'Will the encrypted PDF work on all devices?', a: 'Yes. AES-256 encrypted PDFs are supported by Adobe Reader, Preview on Mac/iOS, Chrome PDF viewer, and all modern readers.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Encrypt PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/encrypt-pdf',
      description: 'Password-protect your PDF with AES-256 encryption. Set open password and restrict printing, copying and editing. No upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'AES-256 encryption (PDF 2.0 / ISO 32000)',
        'User (open) password and owner password support',
        'Granular permissions: printing, copying, editing, annotations',
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
    { '@type': 'ListItem', position: 1, name: 'Home',        item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',       item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Encrypt PDF', item: 'https://doclair.in/encrypt-pdf' },
  ],
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function EncryptPDFPage() {
  const [file, setFile]                       = useState<File | null>(null)
  const [pageCount, setPageCount]             = useState(0)
  const [toolState, setToolState]             = useState<ToolState>('idle')
  const [resultBytes, setResultBytes]         = useState<Uint8Array | null>(null)
  const [userPassword, setUserPassword]       = useState('')
  const [ownerPassword, setOwnerPassword]     = useState('')
  const [showUserPw, setShowUserPw]           = useState(false)
  const [showOwnerPw, setShowOwnerPw]         = useState(false)
  const [allowPrinting, setAllowPrinting]     = useState(true)
  const [allowCopying, setAllowCopying]       = useState(true)
  const [allowEditing, setAllowEditing]       = useState(false)
  const [allowAnnotating, setAllowAnnotating] = useState(true)

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setResultBytes(null)
    setToolState('idle')
    const count = await getPDFPageCount(f)
    setFile(f)
    setPageCount(count)
  }, [])

  async function handleEncrypt() {
    if (!file || !userPassword) return
    setToolState('merging')
    try {
      const bytes = await encryptPDF(file, {
        userPassword,
        ownerPassword: ownerPassword || undefined,
        allowPrinting,
        allowCopying,
        allowEditing,
        allowAnnotating,
      })
      setResultBytes(bytes)
      setToolState('done')
    } catch (err) {
      setToolState('idle')
      alert('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  function handleDownload() {
    if (!resultBytes) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'doclair-encrypted.pdf'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    setFile(null)
    setPageCount(0)
    setToolState('idle')
    setResultBytes(null)
    setUserPassword('')
    setOwnerPassword('')
    setShowUserPw(false)
    setShowOwnerPw(false)
    setAllowPrinting(true)
    setAllowCopying(true)
    setAllowEditing(false)
    setAllowAnnotating(true)
  }

  const isEncryptDisabled = !userPassword || !file

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Remove Password', slug: 'remove-password', icon: '🔓', colorBg: '#DCFCE7', desc: 'Unlock password-protected PDFs' },
      ]}
      relatedTools={[
        { name: 'Compress PDF',     slug: 'compress-pdf',     icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Merge PDF',        slug: 'merge-pdf',        icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Split PDF',        slug: 'split-pdf',        icon: '✂️', colorBg: '#EDE9FE', desc: 'Extract page ranges' },
        { name: 'Add Watermark',    slug: 'add-watermark',    icon: '💧', colorBg: '#DBEAFE', desc: 'Stamp text or image watermark' },
        { name: 'Add Page Numbers', slug: 'add-page-numbers', icon: '🔢', colorBg: '#FFF0DC', desc: 'Number pages automatically' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Encrypt PDF" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#F0FDF4', color: '#14532D', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🛡 AES-256</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Encrypt PDF </span>
          <span style={{ color: 'var(--amber)' }}>Add Password Protection</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '540px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Password-protect your PDF with AES-256 encryption — the same standard used by banks, governments and financial institutions. No upload, no watermark.
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
          icon="🔒"
          label="Drop your PDF here"
          subLabel="or click to browse — max 200 MB"
        />
      )}

      {/* State: idle, file selected — configuration panel */}
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
                {formatBytes(file.size)} · {pageCount} page{pageCount !== 1 ? 's' : ''}
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

          {/* Configuration */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px',
            }}>// Encryption Settings</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Open Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                  Password to open the PDF <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showUserPw ? 'text' : 'password'}
                    value={userPassword}
                    onChange={e => setUserPassword(e.target.value)}
                    placeholder="Enter open password"
                    style={{
                      width: '100%', padding: '10px 40px 10px 12px',
                      border: '1px solid var(--border)', borderRadius: '8px',
                      fontSize: '14px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                      color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPw(v => !v)}
                    style={{
                      position: 'absolute', right: '8px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', fontSize: '16px',
                      lineHeight: 1, padding: '2px',
                    }}
                    title={showUserPw ? 'Hide password' : 'Show password'}
                  >{showUserPw ? '🙈' : '👁'}</button>
                </div>
              </div>

              {/* Owner Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
                  Owner password (optional — restricts editing permissions)
                </label>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
                  If omitted, a secure random password is set as owner
                </p>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showOwnerPw ? 'text' : 'password'}
                    value={ownerPassword}
                    onChange={e => setOwnerPassword(e.target.value)}
                    placeholder="Enter owner password (optional)"
                    style={{
                      width: '100%', padding: '10px 40px 10px 12px',
                      border: '1px solid var(--border)', borderRadius: '8px',
                      fontSize: '14px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                      color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPw(v => !v)}
                    style={{
                      position: 'absolute', right: '8px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', fontSize: '16px',
                      lineHeight: 1, padding: '2px',
                    }}
                    title={showOwnerPw ? 'Hide password' : 'Show password'}
                  >{showOwnerPw ? '🙈' : '👁'}</button>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                  color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
                }}>// Permissions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {([
                    { label: 'Allow Printing',      value: allowPrinting,    setter: setAllowPrinting },
                    { label: 'Allow Copying text',   value: allowCopying,     setter: setAllowCopying },
                    { label: 'Allow Editing',        value: allowEditing,     setter: setAllowEditing },
                    { label: 'Allow Annotations',    value: allowAnnotating,  setter: setAllowAnnotating },
                  ] as const).map(({ label, value, setter }) => (
                    <label
                      key={label}
                      style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={e => setter(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--amber)' }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Encrypt Button */}
          <button
            onClick={handleEncrypt}
            disabled={isEncryptDisabled}
            style={{
              width: '100%', background: 'var(--ink)', color: 'white', padding: '16px 24px',
              borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700, fontSize: '17px', border: 'none',
              cursor: isEncryptDisabled ? 'not-allowed' : 'pointer',
              opacity: isEncryptDisabled ? 0.4 : 1,
              transition: 'transform 0.15s, opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { if (!isEncryptDisabled) e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            🔒 Encrypt PDF
          </button>
        </div>
      )}

      {/* State: encrypting */}
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
          }}>Encrypting PDF…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>Setting AES-256 password protection</div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && resultBytes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DownloadCard
            filename="doclair-encrypted.pdf"
            description={`${pageCount} page${pageCount !== 1 ? 's' : ''} · AES-256 Encrypted`}
            onDownload={handleDownload}
            onReset={handleReset}
          />
          {/* Stats row */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Pages</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-syne), Syne, sans-serif' }}>{pageCount}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Encryption</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-syne), Syne, sans-serif' }}>AES-256</div>
            </div>
          </div>
        </div>
      )}

      {/* SEO */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Password Protect a PDF — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Encrypting a PDF with a password prevents unauthorized access. Anyone who opens the file must enter the password first. Doclair applies AES-256 encryption entirely in your browser.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Upload your PDF.</strong> Drop your file into the upload area — it stays on your device throughout.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Enter an owner password (required to change permissions).</strong> This controls who can edit, print, or copy the document.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Optionally add a user password (required to open the file).</strong> Leave blank if you only want to restrict permissions without blocking access.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Encrypt and download the protected PDF.</strong> AES-256 encryption is applied instantly in your browser.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>What is the difference between owner and user passwords?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>The user password (also called the open password) must be entered to open and read the PDF. The owner password controls editing, printing, and copying permissions. You can set both, one, or neither — but at minimum, you need an owner password to apply any restrictions.</p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Encrypt PDF on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Upload your PDF, set your passwords, and download the encrypted file directly to your device.</p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
