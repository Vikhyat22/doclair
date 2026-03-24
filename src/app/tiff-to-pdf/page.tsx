'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { imagesToPDF, generateThumb } from '@/lib/image/imagesToPdf'
import type { ImageItem, PageSize, Orientation } from '@/lib/image/imagesToPdf'
import type { ToolState } from '@/types'

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string; desc: string }[] = [
  { value: 'fit',    label: 'Fit',    desc: 'Each image fills one page exactly' },
  { value: 'a4',     label: 'A4',     desc: '210×297mm standard' },
  { value: 'letter', label: 'Letter', desc: '8.5×11in US standard' },
  { value: 'legal',  label: 'Legal',  desc: '8.5×14in US legal' },
  { value: 'a3',     label: 'A3',     desc: '297×420mm large format' },
]

const FAQS = [
  { q: 'What TIFF formats are supported?', a: 'Standard TIFF and TIF files are supported, including uncompressed, LZW-compressed, and most common TIFF variants. The conversion happens via browser canvas decoding, so support depends on your browser — Chrome and Edge support the widest range of TIFF files.' },
  { q: 'Can I convert multi-page TIFF files?', a: 'Single-page TIFF files are fully supported. For multi-page TIFFs, split the pages into individual TIFF files first, then drop them all here — each file becomes one page in the output PDF.' },
  { q: 'Can I convert multiple TIFF files at once?', a: 'Yes. Drop up to 50 TIFF files at once. Each becomes one page in the PDF, in the order you set by dragging the cards.' },
  { q: 'What page size should I choose?', a: 'Choose Fit to make each PDF page exactly the size of the TIFF image — ideal for scanned documents. Choose A4 or Letter to place the image centred on a standard page with margins.' },
  { q: 'Are my TIFF files uploaded to a server?', a: 'Never. All conversion happens in your browser using pdf-lib. Your images are never transmitted to any server, including ours.' },
  { q: 'What is the maximum TIFF file size?', a: 'Each TIFF file can be up to 50 MB. For large high-resolution TIFFs, conversion may take a few seconds while the browser decodes the image.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'TIFF to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/tiff-to-pdf',
      description: 'Convert TIFF and TIF images to PDF online for free. No upload, no watermark. Files stay in your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',        item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools',       item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'TIFF to PDF', item: 'https://doclair.in/tiff-to-pdf' },
      ],
    },
  ],
}

function SortableImageCard({
  item, onRotateCW, onRotateCCW, onRemove,
}: {
  item: ImageItem
  onRotateCW:  () => void
  onRotateCCW: () => void
  onRemove:    () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 'auto' as const }
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', position: 'relative', cursor: 'grab', userSelect: 'none' }} {...attributes} {...listeners}>
        <button onClick={e => { e.stopPropagation(); onRemove() }} onPointerDown={e => e.stopPropagation()} style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 2, width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <div style={{ height: '130px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
          {item.thumbUrl
            ? <img src={item.thumbUrl} alt={item.name} style={{ maxWidth: '100%', maxHeight: '130px', objectFit: 'contain', transform: `rotate(${item.rotation}deg)`, transition: 'transform 0.2s ease' }} />
            : <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--amber)', animation: 'spin 0.8s linear infinite' }} />}
        </div>
        <div style={{ padding: '8px 10px 4px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>{(item.size / 1024).toFixed(0)} KB</div>
        </div>
        <div style={{ display: 'flex', gap: '4px', padding: '4px 8px 8px', justifyContent: 'center' }} onPointerDown={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); onRotateCCW() }} style={{ flex: 1, height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--amber)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>↺</button>
          <button onClick={e => { e.stopPropagation(); onRotateCW() }}  style={{ flex: 1, height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--amber)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>↻</button>
        </div>
      </div>
    </div>
  )
}

export default function TiffToPdfPage() {
  const [items, setItems]             = useState<ImageItem[]>([])
  const [pageSize, setPageSize]       = useState<PageSize>('fit')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [toolState, setToolState]     = useState<ToolState>('idle')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [progress, setProgress]       = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const addFiles = useCallback(async (files: File[]) => {
    const newItems: ImageItem[] = files.map(f => ({
      id: crypto.randomUUID(), file: f, name: f.name, size: f.size, thumbUrl: '', rotation: 0 as const,
    }))
    setItems(prev => [...prev, ...newItems])
    for (const item of newItems) {
      generateThumb(item.file).then(url => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, thumbUrl: url } : i))
      }).catch(console.warn)
    }
  }, [])

  function rotateCW(id: string)  { setItems(prev => prev.map(i => i.id === id ? { ...i, rotation: ((i.rotation + 90)  % 360) as 0|90|180|270 } : i)) }
  function rotateCCW(id: string) { setItems(prev => prev.map(i => i.id === id ? { ...i, rotation: ((i.rotation + 270) % 360) as 0|90|180|270 } : i)) }
  function removeItem(id: string) {
    setItems(prev => { const item = prev.find(i => i.id === id); if (item?.thumbUrl) URL.revokeObjectURL(item.thumbUrl); return prev.filter(i => i.id !== id) })
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(prev => { const oi = prev.findIndex(i => i.id === active.id); const ni = prev.findIndex(i => i.id === over.id); return arrayMove(prev, oi, ni) })
    }
  }

  async function handleConvert() {
    if (items.length === 0) return
    setToolState('merging'); setProgress(0); setProgressLabel('Decoding TIFF images…')
    try {
      setProgress(20)
      setProgressLabel(`Converting ${items.length} image${items.length > 1 ? 's' : ''}…`)
      const bytes = await imagesToPDF(items, pageSize, orientation)
      setProgress(95); setProgressLabel('Finalising…')
      setResultBytes(bytes); setToolState('done'); setProgress(100)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message); setToolState('error')
    }
  }

  function handleDownload() {
    if (!resultBytes) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${items[0]?.file.name.replace(/\.[^.]+$/, '') ?? 'image'}.pdf`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    items.forEach(i => { if (i.thumbUrl) URL.revokeObjectURL(i.thumbUrl) })
    setItems([]); setResultBytes(null); setToolState('idle'); setProgress(0); setErrorMessage('')
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'PDF to TIFF', slug: 'pdf-to-tiff', icon: '🖼️', colorBg: '#EDE9FE', desc: 'Export PDF pages as TIFF' },
      ]}
      relatedTools={[
        { name: 'JPG to PDF',   slug: 'jpg-to-pdf',   icon: '🖼️', colorBg: '#DBEAFE', desc: 'Convert JPG to PDF' },
        { name: 'PNG to PDF',   slug: 'png-to-pdf',   icon: '🖼️', colorBg: '#DCFCE7', desc: 'Convert PNG to PDF' },
        { name: 'WebP to PDF',  slug: 'webp-to-pdf',  icon: '🌐', colorBg: '#EDE9FE', desc: 'WebP images to PDF' },
        { name: 'HEIF to PDF',  slug: 'heif-to-pdf',  icon: '📷', colorBg: '#FFF0DC', desc: 'iPhone HEIC/HEIF to PDF' },
        { name: 'Image to PDF', slug: 'image-to-pdf', icon: '📄', colorBg: '#D1FAE5', desc: 'Any image format to PDF' },
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce PDF file size' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="TIFF to PDF" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DBEAFE', color: '#1e40af', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>TIFF to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Convert TIF Images to PDF</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Convert TIFF and TIF images to a PDF document. Drag to reorder pages, rotate images, choose page size. No upload, no watermark, free.
        </p>
      </div>

      {/* Drop Zone */}
      {toolState === 'idle' && items.length === 0 && (
        <DropZone
          onFilesAdded={addFiles}
          accept=".tiff,.tif"
          maxFiles={50}
          maxSizeMB={50}
          currentCount={0}
          icon="🖼️"
          label="Drop TIFF / TIF images here"
          subLabel="or click to browse — up to 50 files, 50 MB each"
        />
      )}

      {/* Images loaded */}
      {toolState === 'idle' && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                  {items.map(item => (
                    <SortableImageCard key={item.id} item={item} onRotateCW={() => rotateCW(item.id)} onRotateCCW={() => rotateCCW(item.id)} onRemove={() => removeItem(item.id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '14px' }}>
              Drag to set page order · Click ↻ to rotate
            </div>
          </div>

          <DropZone onFilesAdded={addFiles} accept=".tiff,.tif" maxFiles={50} maxSizeMB={50} currentCount={items.length} icon="➕" label="Add more TIFF images" subLabel=".tiff and .tif files" />

          {/* Page settings */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>// Page Settings</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: pageSize !== 'fit' ? '14px' : '0' }}>
              {PAGE_SIZE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setPageSize(opt.value)} title={opt.desc}
                  style={{ padding: '8px 16px', borderRadius: '100px', border: `1px solid ${pageSize === opt.value ? 'var(--ink)' : 'var(--border)'}`, background: pageSize === opt.value ? 'var(--ink)' : 'transparent', color: pageSize === opt.value ? 'white' : 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (pageSize !== opt.value) { e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'; e.currentTarget.style.background = 'rgba(26,22,18,0.04)' } }}
                  onMouseLeave={e => { if (pageSize !== opt.value) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' } }}
                >{opt.label}</button>
              ))}
            </div>
            {pageSize !== 'fit' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['portrait', 'landscape'] as Orientation[]).map(o => (
                  <button key={o} onClick={() => setOrientation(o)}
                    style={{ padding: '7px 18px', borderRadius: '100px', border: `1px solid ${orientation === o ? 'var(--amber)' : 'var(--border)'}`, background: orientation === o ? 'var(--amber)' : 'transparent', color: orientation === o ? 'white' : 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '12px', fontWeight: 500, transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (orientation !== o) { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.background = 'rgba(240,160,0,0.07)' } }}
                    onMouseLeave={e => { if (orientation !== o) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' } }}
                  >{o.charAt(0).toUpperCase() + o.slice(1)}</button>
                ))}
              </div>
            )}
            <p style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '12px', lineHeight: 1.5 }}>
              {PAGE_SIZE_OPTIONS.find(o => o.value === pageSize)?.desc}{pageSize !== 'fit' ? ` · ${orientation}` : ''}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleConvert} style={{ flex: 1, background: 'var(--ink)', color: 'white', padding: '16px 24px', borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>Convert to PDF</button>
            <button onClick={handleReset} title="Clear all" style={{ width: '52px', height: '52px', borderRadius: '100px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.15s', color: 'var(--ink)', opacity: 0.5, flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.opacity = '0.5' }}>🗑</button>
          </div>
        </div>
      )}

      {/* Converting */}
      {toolState === 'merging' && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', color: 'white', marginBottom: '6px' }}>Converting TIFF to PDF…</div>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px' }}>{progressLabel}</div>
          <div style={{ maxWidth: '320px', margin: '0 auto', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--amber)', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* Done */}
      {toolState === 'done' && (
        <DownloadCard
          filename={`${items[0]?.file.name.replace(/\.[^.]+$/, '') ?? 'image'}.pdf`}
          description={`${items.length} image${items.length > 1 ? 's' : ''} · ${pageSize === 'fit' ? 'Fit to image' : pageSize.toUpperCase()}`}
          onDownload={handleDownload}
          onReset={handleReset}
          title="TIFF converted to PDF!"
          resetLabel="Convert another →"
          nextSteps={[
            { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
            { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
            { slug: 'add-watermark', name: 'Add Watermark', icon: '💧' },
          ]}
        />
      )}

      {toolState === 'error' && <ErrorCard message={errorMessage} onReset={handleReset} />}

      {/* SEO block */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>How to Convert TIFF to PDF Online — Free</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          TIFF (Tagged Image File Format) is a high-quality image format commonly used in scanning, printing, and document archiving. Converting TIFF files to PDF makes them easier to share, view, and archive. Doclair converts TIFF to PDF entirely in your browser — no installation, no account, no upload.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Drop your <strong>TIFF or TIF files</strong> into the upload area, or click to browse.',
            'Drag the image cards to <strong>reorder pages</strong>. Use ↺ ↻ to rotate any image before converting.',
            'Choose a <strong>Page Size</strong>: Fit (image fills the page), A4, Letter, Legal, or A3.',
            'Click <strong>Convert to PDF</strong> and download your file instantly.',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }} dangerouslySetInnerHTML={{ __html: step }} />
            </div>
          ))}
        </div>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
