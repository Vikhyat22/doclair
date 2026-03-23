'use client'

import { useState, useRef, useCallback } from 'react'
import type { Metadata } from 'next'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FileList from '@/components/ui/FileList'
import ProgressCard from '@/components/ui/ProgressCard'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import type { FileItem, ToolState } from '@/types'

const FAQS = [
  { q: 'Is merging PDF files on Doclair really free?', a: 'Yes, completely free forever. No daily limits, no fees, no watermark added to any output file.' },
  { q: 'Are my PDF files uploaded to your servers?', a: 'No. Files never leave your browser. All processing uses WebAssembly and JavaScript running in your browser tab.' },
  { q: 'How many PDF files can I merge at once?', a: 'Up to 50 files per merge, limited only by your device memory. There are no server-side file count limits.' },
  { q: 'Can I reorder pages before merging?', a: 'Yes. Drag and drop the files in the list to set their order before clicking Merge. The final PDF follows the exact order shown.' },
  { q: 'Will the merged PDF have a watermark?', a: 'Never. Unlike Smallpdf or iLovePDF free tier, Doclair adds zero watermarks to any output file on any tool.' },
  { q: 'Can I merge PDFs on iPhone or Android?', a: 'Yes. Doclair works in mobile Safari and Chrome. No app download needed — it is a Progressive Web App installable from the browser.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Merge PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/merge-pdf',
      description: 'Combine multiple PDF files into a single document online. Free, private, no watermark. Files are processed entirely in your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Unlimited PDF files', 'Drag to reorder before merging',
        'No file upload to server', 'No watermark on output',
        'No sign-up required', 'Works offline after first load'
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' }
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    }
  ]
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Merge PDF', item: 'https://doclair.in/merge-pdf' },
  ]
}

export default function MergePDFPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const fileMapRef = useRef<Map<string, File>>(new Map())
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [progress, setProgress] = useState(0)
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null)
  const addMoreRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((rawFiles: File[]) => {
    rawFiles.forEach(f => {
      const id = Math.random().toString(36).slice(2)
      setFiles(prev => [...prev, { id, name: f.name, size: f.size }])
      fileMapRef.current.set(id, f)
    })
  }, [])

  async function handleMerge() {
    if (files.length < 2) {
      alert('Please add at least 2 PDF files to merge.')
      return
    }
    setToolState('merging')
    setProgress(0)
    try {
      setProgress(20)
      const realFiles = files.map(f => fileMapRef.current.get(f.id)!)
      setProgress(40)
      const { mergePDFs } = await import('@/lib/pdf/merge')
      const bytes = await mergePDFs(realFiles)
      setProgress(100)
      setMergedBytes(bytes)
      setToolState('done')
    } catch (err: unknown) {
      setToolState('error')
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Merge failed: ' + message)
      setToolState('idle')
    }
  }

  function handleDownload() {
    if (!mergedBytes) return
    const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'doclair-merged.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    setFiles([])
    fileMapRef.current.clear()
    setMergedBytes(null)
    setProgress(0)
    setToolState('idle')
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Split PDF', slug: 'split-pdf', icon: '✂️', colorBg: '#DBEAFE', desc: 'Extract pages or split by range' },
        { name: 'Organize Pages', slug: 'organize-pages', icon: '📋', colorBg: '#DBEAFE', desc: 'Reorder, rotate or delete pages' },
      ]}
      relatedTools={[
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size safely' },
        { name: 'Edit PDF', slug: 'edit-pdf', icon: '✍️', colorBg: '#EDE9FE', desc: 'Add text and signatures' },
        { name: 'PDF → JPG', slug: 'pdf-to-jpg', icon: '🖼️', colorBg: '#DCFCE7', desc: 'Extract pages as images' },
        { name: 'Word → PDF', slug: 'word-to-pdf', icon: '📄', colorBg: '#DBEAFE', desc: 'Secure document conversion' },
        { name: 'Encrypt PDF', slug: 'encrypt-pdf', icon: '🔐', colorBg: '#FEE2E2', desc: 'Add password protection' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Merge PDF" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Tool Header */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Merge PDF </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Combine multiple PDF files into one document. Drag to reorder, then merge — instantly in your browser. No upload. No watermark. No account needed.
        </p>
      </div>

      {/* State: idle + no files → DropZone */}
      {toolState === 'idle' && files.length === 0 && (
        <DropZone
          onFilesAdded={addFiles}
          accept=".pdf"
          maxFiles={50}
          maxSizeMB={100}
          currentCount={files.length}
          icon="📄"
          label="Drop PDF files here"
        />
      )}

      {/* State: idle + files → FileList */}
      {toolState === 'idle' && files.length > 0 && (
        <div>
          <FileList
            files={files}
            onReorder={setFiles}
            onRemove={id => {
              fileMapRef.current.delete(id)
              setFiles(prev => prev.filter(f => f.id !== id))
            }}
          />
          <button
            onClick={() => addMoreRef.current?.click()}
            style={{
              width: '100%', marginTop: '10px', border: '2px dashed var(--border)',
              borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 500,
              color: 'var(--ink)', opacity: 0.55, background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--amber)'
              e.currentTarget.style.color = 'var(--amber)'
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--ink)'
              e.currentTarget.style.opacity = '0.55'
            }}
          >+ Add more PDF files</button>
          <input
            ref={addMoreRef}
            type="file"
            multiple
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files) addFiles(Array.from(e.target.files))
              e.target.value = ''
            }}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={handleMerge}
              style={{
                flex: 1, background: 'var(--ink)', color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >🔀 Merge PDFs</button>
            <button
              onClick={handleReset}
              title="Clear all"
              style={{
                width: '52px', height: '52px', borderRadius: '100px', border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', transition: 'all 0.15s',
                color: 'var(--ink)', opacity: 0.5, flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FEE2E2'
                e.currentTarget.style.borderColor = '#FCA5A5'
                e.currentTarget.style.color = 'var(--red)'
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.opacity = '0.5'
              }}
            >🗑</button>
          </div>
        </div>
      )}

      {/* State: merging */}
      {toolState === 'merging' && <ProgressCard progress={progress} />}

      {/* State: done */}
      {toolState === 'done' && (
        <DownloadCard
          filename="doclair-merged.pdf"
          description={`${files.length} files merged · No watermark added`}
          onDownload={handleDownload}
          onReset={handleReset}
        />
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Merge PDF Files Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Combining multiple documents into a single PDF is quick and completely free with Doclair. Here&apos;s how:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Click <strong>Choose PDF Files</strong> or drag and drop your PDFs into the upload area above.',
            'Drag the files to reorder them — the final PDF will follow this exact order.',
            'Click <strong>Merge PDFs</strong> and wait a few seconds while your browser combines the files.',
            'Click <strong>Download</strong> to save your merged PDF. No watermark, no size limit.',
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
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Why merge PDFs online instead of desktop software?
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65, marginBottom: '20px' }}>
          Desktop tools like Adobe Acrobat can be expensive and slow to install. Doclair gives you the same result instantly in your browser — no installation, no subscription, no compromise on quality.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Is it safe to merge confidential PDFs online?
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65, marginBottom: '20px' }}>
          Unlike older tools that upload files to remote servers, Doclair uses WebAssembly technology to process everything locally. Your files never leave your device — 100% safe for legal, medical, and business documents.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Merge PDFs on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }}>
          You don&apos;t need a dedicated app. Doclair works in mobile Safari and Chrome. Tap the upload button, select files from your Files app, and merge on the go.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
