'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { addBookmarksToPDF, type Bookmark } from '@/lib/pdf/addBookmarks'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'Where do bookmarks appear in the PDF?',
    a: 'Bookmarks appear in the PDF reader\'s sidebar (usually called "Outline" or "Bookmarks" panel). When clicked they navigate to the linked page.',
  },
  {
    q: 'What do the levels mean?',
    a: 'Level 0 is a top-level bookmark. Levels 1-3 are indented sub-items shown beneath the parent. Currently all bookmarks are displayed as flat list items.',
  },
  {
    q: 'What if I enter a page number that doesn\'t exist?',
    a: 'Bookmarks with page numbers outside the valid range (1 to total pages) are silently skipped.',
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
      name: 'Add Bookmarks to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/add-bookmarks',
      description: 'Add clickable bookmarks that appear in the PDF reader sidebar. Create a table of contents for long documents. Free, no upload.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
  ],
}

const SIDEBAR_RELATED = [
  { name: 'Add Page Numbers',  slug: 'add-page-numbers',  icon: '🔢', colorBg: '#DBEAFE', desc: 'Auto number pages' },
  { name: 'Add Header/Footer', slug: 'add-header-footer', icon: '📝', colorBg: '#FFF0DC', desc: 'Add header and footer' },
  { name: 'Edit PDF Metadata', slug: 'edit-pdf-metadata', icon: '✏️', colorBg: '#EDE9FE', desc: 'Edit document info' },
]

let bookmarkIdCounter = 1

function makeId() { return String(bookmarkIdCounter++) }

export default function AddBookmarksPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [result, setResult]       = useState<Uint8Array | null>(null)
  const [error, setError]         = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [bookmarks, setBookmarks]   = useState<Bookmark[]>([
    { id: makeId(), title: 'Introduction', page: 1, level: 0 },
  ])

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const f = files[0]
    setFile(f)
    setToolState('idle')
    setResult(null)
    setError('')
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const bytes = await f.arrayBuffer()
      const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
      setTotalPages(doc.getPageCount())
    } catch { /* skip */ }
  }, [])

  const addBookmark = useCallback(() => {
    setBookmarks(prev => [...prev, { id: makeId(), title: 'New Section', page: 1, level: 0 }])
  }, [])

  const updateBookmark = useCallback((id: string, field: keyof Bookmark, value: string | number) => {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b))
  }, [])

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }, [])

  const moveBookmark = useCallback((id: string, dir: -1 | 1) => {
    setBookmarks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }, [])

  const handleApply = useCallback(async () => {
    if (!file) return
    setToolState('processing')
    setError('')
    try {
      const out = await addBookmarksToPDF(file, bookmarks)
      setResult(out)
      setToolState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bookmarks')
      setToolState('error')
    }
  }, [file, bookmarks])

  const handleDownload = useCallback(() => {
    if (!result || !file) return
    const blob = new Blob([result as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = file.name.replace(/\.pdf$/i, '-bookmarked.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null); setResult(null); setError(''); setToolState('idle'); setTotalPages(0)
  }, [])

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '12px', color: 'var(--ink)', background: 'white',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolPageLayout
        toolName="Add Bookmarks to PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Add Bookmarks </span>
            <span style={{ color: 'var(--amber)' }}>Create Navigation Outline</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Add clickable bookmarks that appear in the PDF reader&apos;s sidebar. Create a table of contents for long documents. Free, no upload.
          </p>
        </div>

        {!file && (
          <DropZone onFilesAdded={handleFiles} accept=".pdf" maxFiles={1} maxSizeMB={200} icon="🔖" label="Drop your PDF here" subLabel="or click to browse" currentCount={0} />
        )}

        {file && totalPages > 0 && toolState !== 'done' && (
          <div style={{ fontSize: '12px', color: 'var(--muted)', background: '#F9FAFB', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
            📄 {file.name} · {totalPages} pages
          </div>
        )}

        {/* Bookmark list */}
        {toolState !== 'done' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// Bookmarks</span>
              <button onClick={addBookmark} style={{ background: 'var(--amber)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>+ Add Bookmark</button>
            </div>
            <div style={{ padding: '8px' }}>
              {bookmarks.map((b, i) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', background: i % 2 === 0 ? '#FAFAFA' : 'white', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button onClick={() => moveBookmark(b.id, -1)} disabled={i === 0} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '1px 5px', fontSize: '10px', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                    <button onClick={() => moveBookmark(b.id, 1)} disabled={i === bookmarks.length - 1} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '1px 5px', fontSize: '10px', opacity: i === bookmarks.length - 1 ? 0.3 : 1 }}>▼</button>
                  </div>
                  <select value={b.level} onChange={e => updateBookmark(b.id, 'level', Number(e.target.value) as Bookmark['level'])} style={{ ...inputStyle, width: '80px' }}>
                    <option value={0}>Level 0</option>
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                  </select>
                  <input type="text" value={b.title} onChange={e => updateBookmark(b.id, 'title', e.target.value)}
                    placeholder="Bookmark title" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Pg</span>
                    <input type="number" min={1} max={totalPages || 9999} value={b.page}
                      onChange={e => updateBookmark(b.id, 'page', Number(e.target.value))}
                      style={{ ...inputStyle, width: '60px' }} />
                  </div>
                  <button onClick={() => removeBookmark(b.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>🗑</button>
                </div>
              ))}
              {bookmarks.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No bookmarks yet. Click &quot;+ Add Bookmark&quot; to start.</div>
              )}
            </div>
            {file && bookmarks.length > 0 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                <button onClick={handleApply} disabled={toolState === 'processing'}
                  style={{ background: 'var(--ink)', color: 'white', padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', opacity: toolState === 'processing' ? 0.7 : 1 }}>
                  {toolState === 'processing' ? 'Adding…' : `Add ${bookmarks.length} Bookmark${bookmarks.length !== 1 ? 's' : ''} →`}
                </button>
              </div>
            )}
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
          <DownloadCard
            filename={file.name.replace(/\.pdf$/i, '-bookmarked.pdf')}
            description={`${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''} added`}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        )}

        <FAQ faqs={FAQS} />
      </ToolPageLayout>
    </>
  )
}
