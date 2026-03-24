'use client'

import { useState, useCallback } from 'react'
import { decryptPDF, isEncrypted } from '@/lib/pdf/decrypt'
import { decryptWithPassword } from '@/lib/pdf/decryptWithPassword'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { useRef } from 'react'
import type { ToolState } from '@/types'

const FAQS = [
  { q: 'Does Doclair crack or bypass PDF passwords?', a: 'No. If you provide the correct password, Doclair decrypts the file using it — the same way Adobe Reader would. For PDFs with only owner-password / permissions restrictions (the type that open without a password), no password is needed at all.' },
  { q: 'What is an owner password vs a user password?', a: 'A user password prevents the PDF from opening at all. An owner (permissions) password allows the file to open freely but restricts editing, printing or copying. Doclair handles both: owner-password restrictions are removed automatically; user-password PDFs are decrypted once you supply the correct password.' },
  { q: 'The output PDF text is not selectable — why?', a: 'When a PDF is decrypted using the password path, each page is rendered to an image in your browser and assembled into a new PDF. This is the only way to decrypt such files without a server. The result is fully printable and shareable, but text is not selectable. If you need selectable text, use the PDF → Text tool on the original file before unlocking.' },
  { q: 'Are my files uploaded?', a: 'Never. Decryption runs entirely in your browser using PDF.js and pdf-lib. Your password and your file never leave your device.' },
  { q: 'What if the PDF is not actually encrypted?', a: 'Doclair detects this and lets you download a clean copy directly.' },
  { q: 'Will the unlocked PDF lose any content?', a: 'For owner-password PDFs: no — only the restrictions flag is removed, all content is intact. For user-password PDFs: all pages are preserved, but as images rather than native PDF content.' },
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

  // Password-decryption state
  const [needsPassword, setNeedsPassword]   = useState(false)
  const [password, setPassword]             = useState('')
  const [showPassword, setShowPassword]     = useState(false)
  const [passwordError, setPasswordError]   = useState<string | null>(null)
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setResultBytes(null)
    setErrorMsg(null)
    setToolState('idle')
    setEncrypted(null)
    setNeedsPassword(false)
    setPassword('')
    setPasswordError(null)
    setRenderProgress(null)

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
      // Switch to password input mode instead of showing an error
      setNeedsPassword(true)
      setToolState('idle')
      setTimeout(() => passwordInputRef.current?.focus(), 50)
    } else {
      setErrorMsg('This PDF file appears to be corrupted or uses an unsupported format.')
      setToolState('idle')
    }
  }

  async function handleDecryptWithPassword() {
    if (!file || !password.trim()) return
    setToolState('merging')
    setPasswordError(null)
    setRenderProgress(null)

    const result = await decryptWithPassword(
      file,
      password,
      2, // 144 dpi — good balance of quality and file size
      (p) => setRenderProgress(p),
    )

    if (result.ok) {
      setResultBytes(result.bytes)
      setPageCount(result.pageCount)
      setRenderProgress(null)
      setToolState('done')
    } else if (result.reason === 'wrong-password') {
      setPasswordError('Incorrect password. Please try again.')
      setToolState('idle')
      setTimeout(() => passwordInputRef.current?.focus(), 50)
    } else {
      setPasswordError('This PDF appears to be corrupted or uses an unsupported format.')
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
    setNeedsPassword(false)
    setPassword('')
    setPasswordError(null)
    setRenderProgress(null)
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
        { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata',    icon: '✏️', colorBg: '#FFF0DC', desc: 'Edit title, author and more' },
        { name: 'Add Page Numbers',  slug: 'add-page-numbers', icon: '🔢', colorBg: '#FEE2E2', desc: 'Stamp page numbers on a PDF' },
      ]}
      blogPost={{ slug: 'how-to-remove-password-from-pdf', title: 'How to Remove Password From PDF Free — Unlock Instantly' }}
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
          <span style={{ color: 'var(--amber)' }}>& Decrypt</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '560px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Remove owner-password restrictions, or decrypt a password-protected PDF using your own password. Entirely in your browser — nothing uploaded, nothing sent.
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

          {/* Encrypted — owner-password action panel */}
          {encrypted === true && !needsPassword && (
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

          {/* User-password encrypted — password input panel */}
          {encrypted === true && needsPassword && (
            <div style={{
              background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '1px' }}>🔐</span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
                    fontSize: '15px', color: 'var(--ink)', marginBottom: '4px',
                  }}>This PDF requires a password to open</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.6, lineHeight: 1.6 }}>
                    Enter the password and Doclair will decrypt all pages in your browser. Nothing leaves your device.
                  </div>
                </div>
              </div>

              {/* Password input */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                border: `1.5px solid ${passwordError ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: '10px', padding: '10px 14px',
                background: passwordError ? '#FEF2F2' : 'white',
                transition: 'border-color 0.2s',
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>🔑</span>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' && password.trim()) handleDecryptWithPassword() }}
                  placeholder="Enter PDF password"
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontSize: '15px', color: 'var(--ink)',
                  }}
                  autoComplete="current-password"
                />
                <button
                  onClick={() => setShowPassword(s => !s)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    padding: '2px', color: 'var(--muted)', fontSize: '16px', flexShrink: 0,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Inline password error */}
              {passwordError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: '8px', padding: '10px 14px',
                }}>
                  <span style={{ fontSize: '14px' }}>❌</span>
                  <span style={{ fontSize: '13px', color: 'var(--red)', fontWeight: 500 }}>{passwordError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleDecryptWithPassword}
                  disabled={!password.trim()}
                  style={{
                    flex: 1, background: password.trim() ? 'var(--ink)' : 'var(--border)',
                    color: password.trim() ? 'white' : 'var(--muted)',
                    padding: '14px 24px', borderRadius: '100px',
                    fontFamily: 'var(--font-syne), Syne, sans-serif',
                    fontWeight: 700, fontSize: '16px', border: 'none',
                    cursor: password.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                  onMouseEnter={e => { if (password.trim()) e.currentTarget.style.transform = 'scale(1.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  🔓 Decrypt PDF
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '14px 18px', borderRadius: '100px',
                    border: '1px solid var(--border)', background: 'white',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontSize: '14px', color: 'var(--muted)', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                >
                  Cancel
                </button>
              </div>

              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--muted)', opacity: 0.6, textAlign: 'center',
              }}>
                Your password is used only in your browser and never sent anywhere.
              </div>
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
          {renderProgress ? (
            <>
              <div style={{
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
                fontSize: '24px', color: 'white', marginBottom: '10px',
              }}>Decrypting PDF…</div>
              <div style={{
                width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px', margin: '0 auto 12px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', background: 'var(--amber)', borderRadius: '2px',
                  width: `${Math.round((renderProgress.current / renderProgress.total) * 100)}%`,
                  transition: 'width 0.2s ease',
                }} />
              </div>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
                color: 'rgba(255,255,255,0.45)',
              }}>
                Rendering page {renderProgress.current} of {renderProgress.total}
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
                fontSize: '24px', color: 'white', marginBottom: '6px',
              }}>Removing restrictions…</div>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
                color: 'rgba(255,255,255,0.45)',
              }}>Stripping encryption and saving unrestricted PDF</div>
            </>
          )}
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DownloadCard
            filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}_unlocked.pdf`}
            description={`${pageCount} page${pageCount !== 1 ? 's' : ''} · ${needsPassword ? 'Decrypted' : 'Restrictions Removed'}`}
            onDownload={handleDownloadResult}
            onReset={handleReset}
            title={needsPassword ? 'PDF decrypted!' : 'Password removed!'}
            resetLabel="Unlock another →"
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
          How to Remove PDF Password — Free, No Upload
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Doclair handles both types of locked PDFs: owner-password restrictions (PDFs that open freely but can&apos;t be printed or edited) and user-password encrypted PDFs (those that ask for a password when opening).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Drop your PDF onto the tool — Doclair detects the encryption type automatically.',
            'If the PDF has <strong>owner-password restrictions</strong>, click <strong>Remove Restrictions</strong> — done instantly.',
            'If the PDF asks for a <strong>user password</strong>, a password field appears. Enter your password and click <strong>Decrypt PDF</strong>.',
            'Download the fully unlocked PDF. Your password never leaves your device.',
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
          Owner password vs user password
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          An <strong>owner password</strong> restricts what you can do with a PDF — printing, copying, or editing — but the file still opens without a password. An <strong>user password</strong> encrypts the entire file so it cannot be opened at all without the key. Doclair handles both automatically.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Why is the decrypted PDF image-based?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          When decrypting a user-password PDF, Doclair renders each page to a high-resolution image in your browser — the same way a printer would. The output is fully printable and shareable. If you need selectable text from the original, run the <strong>PDF → Text</strong> tool on it before unlocking.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
