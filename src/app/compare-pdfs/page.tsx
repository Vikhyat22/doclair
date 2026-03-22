'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

type ViewMode = 'side-by-side' | 'overlay'

const FAQS = [
  { q: 'Does the tool automatically highlight differences?', a: 'The tool renders both documents visually so you can spot differences by sight. In overlay mode, differences appear as ghosted areas when you move the slider. Automatic text diff highlighting is not currently supported.' },
  { q: 'Are my PDFs uploaded to a server?', a: 'No — both PDFs are rendered entirely in your browser using pdfjs-dist (WebAssembly). No files are transmitted to any server. Documents stay private on your device.' },
  { q: 'Can I compare PDFs with different page counts?', a: 'Yes — if the documents have different page counts, the shorter document shows a blank panel for pages that don\'t exist. Navigation always goes up to the maximum page count of either document.' },
  { q: 'What is overlay mode?', a: 'Overlay mode blends both documents on top of each other. Use the slider to adjust opacity from 0% (only Version 1) to 100% (only Version 2). Moving the slider back and forth makes visual differences immediately apparent.' },
  { q: 'What is the best way to compare two contract versions?', a: 'Use side-by-side mode to read content differences, and overlay mode to spot layout and formatting changes. Navigate page by page and zoom in on sections of interest.' },
  { q: 'Can I zoom in on specific pages?', a: 'Yes — use the zoom controls in the toolbar to zoom in and out. Both panels zoom in sync in side-by-side mode.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'Compare PDFs — Doclair', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (browser-based)', url: 'https://doclair.in/compare-pdfs', description: 'Compare two PDF files side by side or with overlay blend. Free, no upload.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' } },
    { '@type': 'FAQPage', mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
}

const BREADCRUMB = {
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',          item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',         item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Compare PDFs',  item: 'https://doclair.in/compare-pdfs' },
  ],
}

async function renderPdfToPages(file: File, scale = 1.5): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  const bytes = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false }).promise
  const urls: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const url = await new Promise<string>(resolve => canvas.toBlob(b => resolve(URL.createObjectURL(b!)), 'image/jpeg', 0.85))
    urls.push(url)
    canvas.width = 0; canvas.height = 0
  }
  return urls
}

export default function ComparePdfsPage() {
  const [file1, setFile1]           = useState<File | null>(null)
  const [file2, setFile2]           = useState<File | null>(null)
  const [pages1, setPages1]         = useState<string[]>([])
  const [pages2, setPages2]         = useState<string[]>([])
  const [loading1, setLoading1]     = useState(false)
  const [loading2, setLoading2]     = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode]     = useState<ViewMode>('side-by-side')
  const [opacity, setOpacity]       = useState(50)
  const [zoom, setZoom]             = useState(1.0)
  const panel1Ref                   = useRef<HTMLDivElement>(null)
  const panel2Ref                   = useRef<HTMLDivElement>(null)
  const syncingRef                  = useRef(false)

  const totalPages = Math.max(pages1.length, pages2.length)
  const idx = currentPage - 1

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      pages1.forEach(u => URL.revokeObjectURL(u))
      pages2.forEach(u => URL.revokeObjectURL(u))
    }
  }, [pages1, pages2])

  // Sync scroll
  useEffect(() => {
    if (viewMode !== 'side-by-side') return
    const p1 = panel1Ref.current; const p2 = panel2Ref.current
    if (!p1 || !p2) return
    const onScroll1 = () => { if (syncingRef.current) return; syncingRef.current = true; p2.scrollTop = p1.scrollTop; syncingRef.current = false }
    const onScroll2 = () => { if (syncingRef.current) return; syncingRef.current = true; p1.scrollTop = p2.scrollTop; syncingRef.current = false }
    p1.addEventListener('scroll', onScroll1); p2.addEventListener('scroll', onScroll2)
    return () => { p1.removeEventListener('scroll', onScroll1); p2.removeEventListener('scroll', onScroll2) }
  }, [viewMode, pages1, pages2])

  const loadFile1 = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return
    pages1.forEach(u => URL.revokeObjectURL(u))
    setFile1(f); setPages1([]); setLoading1(true); setCurrentPage(1)
    try { const p = await renderPdfToPages(f, 1.5); setPages1(p) } catch { /* ignore */ } finally { setLoading1(false) }
  }, [pages1])

  const loadFile2 = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return
    pages2.forEach(u => URL.revokeObjectURL(u))
    setFile2(f); setPages2([]); setLoading2(true); setCurrentPage(1)
    try { const p = await renderPdfToPages(f, 1.5); setPages2(p) } catch { /* ignore */ } finally { setLoading2(false) }
  }, [pages2])

  const handleReset = useCallback(() => {
    pages1.forEach(u => URL.revokeObjectURL(u))
    pages2.forEach(u => URL.revokeObjectURL(u))
    setFile1(null); setFile2(null); setPages1([]); setPages2([])
    setLoading1(false); setLoading2(false); setCurrentPage(1); setZoom(1.0); setOpacity(50)
  }, [pages1, pages2])

  const bothLoaded = pages1.length > 0 && pages2.length > 0

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔗', colorBg: '#DCFCE7', desc: 'Combine PDFs into one' },
        { name: 'Split PDF', slug: 'split-pdf', icon: '✂️', colorBg: '#DBEAFE', desc: 'Split into separate files' },
      ]}
      relatedTools={[
        { name: 'Redact PDF',       slug: 'redact-pdf',       icon: '⬛', colorBg: '#F1F5F9' },
        { name: 'Flatten PDF',      slug: 'flatten-pdf',      icon: '📄', colorBg: '#FFF0DC' },
        { name: 'Edit Metadata',    slug: 'edit-pdf-metadata', icon: '✏️', colorBg: '#DCFCE7' },
        { name: 'Privacy Scanner',  slug: 'privacy-scanner',  icon: '🔍', colorBg: '#EDE9FE' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Compare PDFs" toolSlug="compare-pdfs" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }} />

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DBEAFE', color: '#1E40AF', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✦ Overlay Blend Mode</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(30px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Compare PDFs </span>
          <span style={{ color: 'var(--amber)' }}>Spot Differences Instantly</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          View two PDF versions side by side with synchronized scrolling. Or use overlay mode to blend both documents. Free, no upload.
        </p>
      </div>

      {/* Two upload dropzones */}
      {!bothLoaded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* File 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 600 }}>VERSION 1 — ORIGINAL</div>
            {loading1 ? (
              <div style={{ background: 'var(--ink)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Rendering pages…</div>
              </div>
            ) : file1 && pages1.length > 0 ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', fontWeight: 500, color: '#166534' }}>
                ✅ {file1.name} · {pages1.length} pages
              </div>
            ) : (
              <DropZone onFilesAdded={loadFile1} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={file1 ? 1 : 0} icon="📄" label="Drop Version 1 here" subLabel="Original / before" />
            )}
          </div>

          {/* File 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.06em', fontWeight: 600 }}>VERSION 2 — REVISED</div>
            {loading2 ? (
              <div style={{ background: 'var(--ink)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Rendering pages…</div>
              </div>
            ) : file2 && pages2.length > 0 ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', fontWeight: 500, color: '#166534' }}>
                ✅ {file2.name} · {pages2.length} pages
              </div>
            ) : (
              <DropZone onFilesAdded={loadFile2} accept=".pdf" maxFiles={1} maxSizeMB={200} currentCount={file2 ? 1 : 0} icon="📄" label="Drop Version 2 here" subLabel="Revised / after" />
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      {bothLoaded && (
        <>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            {/* Page nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, fontSize: '14px' }}>←</button>
              <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '12px', color: 'var(--ink)' }}>Page {currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1, fontSize: '14px' }}>→</button>
            </div>

            {/* View mode toggle */}
            <div style={{ display: 'flex', gap: '4px', background: '#F3F4F6', borderRadius: '10px', padding: '3px' }}>
              {([['side-by-side', '⊟ Side by Side'], ['overlay', '⊠ Overlay']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: viewMode === mode ? 'var(--amber)' : 'transparent', color: viewMode === mode ? 'var(--ink)' : 'var(--muted)', fontFamily: 'var(--font-dm-sans)', fontSize: '12px', fontWeight: viewMode === mode ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Zoom + reset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '14px' }}>−</button>
              <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--ink)', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '14px' }}>+</button>
              <button onClick={handleReset} style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: '8px' }}>Reset</button>
            </div>
          </div>

          {/* Overlay slider */}
          {viewMode === 'overlay' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)' }}>
                <span>Version 1</span>
                <span>Blend: {opacity}%</span>
                <span>Version 2</span>
              </div>
              <input type="range" min={0} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--amber)', cursor: 'pointer', height: '4px' }} />
            </div>
          )}

          {/* Comparison view */}
          {viewMode === 'side-by-side' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Version 1', pages: pages1, ref: panel1Ref, total: pages1.length },
                { label: 'Version 2', pages: pages2, ref: panel2Ref, total: pages2.length },
              ].map(({ label, pages, ref, total }, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.06em' }}>{label}</div>
                  <div ref={ref} style={{ overflowY: 'auto', maxHeight: '600px', borderRadius: '10px', border: '1px solid var(--border)', background: '#F8F7F5' }}>
                    {idx < total ? (
                      <img src={pages[idx]} alt={`${label} page ${currentPage}`} style={{ width: `${zoom * 100}%`, display: 'block', margin: '0 auto' }} />
                    ) : (
                      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-dm-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                        No page {currentPage} in {label}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Overlay mode */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.06em', textAlign: 'center' }}>Overlay — Page {currentPage}</div>
              <div style={{ position: 'relative', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', background: '#F8F7F5' }}>
                {pages1[idx] && (
                  <img src={pages1[idx]} alt={`Version 1 page ${currentPage}`} style={{ width: `${zoom * 100}%`, display: 'block', margin: '0 auto' }} />
                )}
                {pages2[idx] && (
                  <img src={pages2[idx]} alt={`Version 2 page ${currentPage}`} style={{ position: 'absolute', top: 0, left: 0, width: `${zoom * 100}%`, opacity: opacity / 100, mixBlendMode: 'normal' }} />
                )}
              </div>
            </div>
          )}

          {/* Thumbnail strip */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)}
                style={{ flexShrink: 0, width: '64px', borderRadius: '6px', border: `2px solid ${currentPage === i + 1 ? 'var(--amber)' : 'var(--border)'}`, overflow: 'hidden', padding: 0, cursor: 'pointer', background: 'white', transition: 'border-color 0.15s' }}>
                {pages1[i] ? (
                  <img src={pages1[i]} alt={`Page ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                ) : (
                  <div style={{ height: '80px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-dm-mono)', fontSize: '10px', color: 'var(--muted)' }}>—</div>
                )}
                <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '9px', color: currentPage === i + 1 ? 'var(--amber)' : 'var(--muted)', padding: '2px 0', textAlign: 'center', background: 'white' }}>{i + 1}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* SEO */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>How to Compare Two PDF Files Online — Free</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Upload both PDFs and instantly view them side by side with synchronized scrolling. Use overlay mode to blend the documents and see differences at a glance.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '20px' }}>Side by side vs overlay — which view to use</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Side by side is best for reading content differences — you can see exactly what text changed between versions. Overlay mode is best for spotting visual and layout changes — moving the blend slider back and forth reveals shifted elements, changed margins, or moved sections instantly.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Compare contract versions before signing</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Upload the original and revised contract side by side. Navigate to sections you care about and zoom in to read changes clearly. Both documents render entirely in your browser — nothing is sent to a server.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Compare PDFs on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Compare PDFs works on all devices. Open in Safari on iPhone or Chrome on Android, upload both documents from Files or Google Drive, and compare them on your phone screen.</p>
      </div>

      <FAQ faqs={FAQS} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ToolPageLayout>
  )
}
