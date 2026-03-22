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
  { q: 'Which image formats are supported?', a: 'JPG, PNG, WebP, GIF, BMP, TIFF, SVG, and HEIC/HEIF (iPhone photos). All formats are converted via canvas or the heic2any library.' },
  { q: 'Can I set the page size?', a: 'Yes. Choose Fit (each image fills one page exactly), A4, US Letter, Legal, or A3. Portrait and landscape orientation are both supported.' },
  { q: 'Can I rotate individual images before converting?', a: 'Yes. Each image card has ↺ and ↻ buttons to rotate in 90° increments. The rotation is applied when the PDF is generated.' },
  { q: 'Can I change the order of images?', a: 'Yes. Drag any image card to reposition it. Touch drag is supported on mobile. The PDF pages follow the order shown in the grid.' },
  { q: 'Will my HEIC iPhone photos work?', a: 'Yes. HEIC and HEIF files from iPhone cameras are automatically converted to JPEG before embedding in the PDF.' },
  { q: 'Are my images uploaded to a server?', a: 'Never. All conversion happens in your browser using pdf-lib. Your images never leave your device.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'JPG to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/jpg-to-pdf',
      description: 'Convert JPG, PNG, HEIC and other images to PDF online for free. Drag to reorder, rotate per image. Powered by pdf-lib — files never leave your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Supports JPG, PNG, WebP, HEIC, GIF, BMP, TIFF, SVG',
        'Drag-to-reorder images',
        'Per-image rotation controls',
        'Multiple page size options',
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
    { '@type': 'ListItem', position: 1, name: 'Home',       item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',      item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'JPG to PDF', item: 'https://doclair.in/jpg-to-pdf' },
  ],
}

function SortableImageCard({
  item,
  onRotateCW,
  onRotateCCW,
  onRemove,
}: {
  item: ImageItem
  onRotateCW:  () => void
  onRotateCCW: () => void
  onRemove:    () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'grab',
          userSelect: 'none',
        }}
        {...attributes}
        {...listeners}
      >
        {/* Remove button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: '6px', right: '6px', zIndex: 2,
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', border: 'none',
            color: 'white', cursor: 'pointer', fontSize: '11px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* Thumbnail with CSS rotation */}
        <div style={{ height: '130px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
          {item.thumbUrl ? (
            <img
              src={item.thumbUrl}
              alt={item.name}
              style={{
                maxWidth: '100%',
                maxHeight: '130px',
                objectFit: 'contain',
                transform: `rotate(${item.rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
            />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--amber)', animation: 'spin 0.8s linear infinite' }} />
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '8px 10px 4px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </div>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>
            {(item.size / 1024).toFixed(0)} KB
          </div>
        </div>

        {/* Rotation buttons */}
        <div
          style={{ display: 'flex', gap: '4px', padding: '4px 8px 8px', justifyContent: 'center' }}
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            onClick={e => { e.stopPropagation(); onRotateCCW() }}
            style={{ flex: 1, height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--amber)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >↺</button>
          <button
            onClick={e => { e.stopPropagation(); onRotateCW() }}
            style={{ flex: 1, height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--amber)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >↻</button>
        </div>
      </div>
    </div>
  )
}

export default function JpgToPDFPage() {
  const [items, setItems]               = useState<ImageItem[]>([])
  const [pageSize, setPageSize]         = useState<PageSize>('fit')
  const [orientation, setOrientation]   = useState<Orientation>('portrait')
  const [toolState, setToolState]       = useState<ToolState>('idle')
  const [resultBytes, setResultBytes]   = useState<Uint8Array | null>(null)
  const [progress, setProgress]         = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const addFiles = useCallback(async (files: File[]) => {
    const newItems: ImageItem[] = files.map(f => ({
      id:       crypto.randomUUID(),
      file:     f,
      name:     f.name,
      size:     f.size,
      thumbUrl: '',
      rotation: 0 as const,
    }))
    setItems(prev => [...prev, ...newItems])

    for (const item of newItems) {
      generateThumb(item.file).then(url => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, thumbUrl: url } : i))
      }).catch(console.warn)
    }
  }, [])

  function rotateCW(id: string) {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, rotation: ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
        : item
    ))
  }

  function rotateCCW(id: string) {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, rotation: ((item.rotation + 270) % 360) as 0 | 90 | 180 | 270 }
        : item
    ))
  }

  function removeItem(id: string) {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (item?.thumbUrl) URL.revokeObjectURL(item.thumbUrl)
      return prev.filter(i => i.id !== id)
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(i => i.id === active.id)
        const newIndex = prev.findIndex(i => i.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  async function handleConvert() {
    if (items.length === 0) return
    setToolState('merging')
    setProgress(0)
    setProgressLabel('Loading images…')
    try {
      setProgress(20)
      setProgressLabel(`Converting ${items.length} image${items.length > 1 ? 's' : ''}…`)
      const bytes = await imagesToPDF(items, pageSize, orientation)
      setProgress(95)
      setProgressLabel('Finalising…')
      setResultBytes(bytes)
      setToolState('done')
      setProgress(100)
    } catch (err) {
      setToolState('idle')
      alert('Conversion failed: ' + (err instanceof Error ? err.message : 'Unknown'))
    }
  }

  function handleDownload() {
    if (!resultBytes) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'doclair-images.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleReset() {
    items.forEach(i => { if (i.thumbUrl) URL.revokeObjectURL(i.thumbUrl) })
    setItems([])
    setResultBytes(null)
    setToolState('idle')
    setProgress(0)
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'PDF to JPG',    slug: 'pdf-to-jpg',    icon: '🖼️', colorBg: '#DCFCE7', desc: 'Extract PDF pages as images' },
        { name: 'Image to PDF',  slug: 'image-to-pdf',  icon: '📄', colorBg: '#DCFCE7', desc: 'Multiple formats supported' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',    slug: 'merge-pdf',    icon: '🔀', colorBg: '#DBEAFE', desc: 'Combine multiple PDFs' },
        { name: 'PNG to PDF',   slug: 'png-to-pdf',   icon: '🖼️', colorBg: '#EDE9FE', desc: 'PNG images to PDF' },
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Rotate PDF',   slug: 'rotate-pdf',   icon: '🔄', colorBg: '#FFF0DC', desc: 'Fix page orientation' },
        { name: 'PDF to PNG',   slug: 'pdf-to-png',   icon: '🖼️', colorBg: '#FEE2E2', desc: 'Lossless page images' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="JPG to PDF" toolSlug="jpg-to-pdf" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ 8 Formats</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>JPG to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Convert Images to PDF</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Convert JPG, PNG, HEIC and other images into a PDF. Drag to set order, rotate per image. Free, no upload.
        </p>
      </div>

      {/* State: idle, no images yet */}
      {toolState === 'idle' && items.length === 0 && (
        <DropZone
          onFilesAdded={addFiles}
          accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.heic,.heif,.svg"
          maxFiles={50}
          maxSizeMB={100}
          currentCount={0}
          icon="🖼️"
          label="Drop image files here"
          subLabel="JPG · PNG · WebP · HEIC · GIF · BMP · TIFF · SVG"
        />
      )}

      {/* State: idle, images added */}
      {toolState === 'idle' && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Drag-to-reorder grid */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                  {items.map(item => (
                    <SortableImageCard
                      key={item.id}
                      item={item}
                      onRotateCW={() => rotateCW(item.id)}
                      onRotateCCW={() => rotateCCW(item.id)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Hint */}
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '14px',
            }}>
              Drag to set page order · Click ↻ to rotate
            </div>
          </div>

          {/* Add more images */}
          <DropZone
            onFilesAdded={addFiles}
            accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.heic,.heif,.svg"
            maxFiles={50}
            maxSizeMB={100}
            currentCount={items.length}
            icon="➕"
            label="Add more images"
            subLabel="JPG · PNG · WebP · HEIC · GIF · BMP · TIFF · SVG"
          />

          {/* Page settings */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
              color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px',
            }}>// Page Settings</div>

            {/* Page size pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: pageSize !== 'fit' ? '14px' : '0' }}>
              {PAGE_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPageSize(opt.value)}
                  title={opt.desc}
                  style={{
                    padding: '8px 16px', borderRadius: '100px',
                    border: `1px solid ${pageSize === opt.value ? 'var(--ink)' : 'var(--border)'}`,
                    background: pageSize === opt.value ? 'var(--ink)' : 'transparent',
                    color: pageSize === opt.value ? 'white' : 'var(--ink)',
                    cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontSize: '13px', fontWeight: 500, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (pageSize !== opt.value) {
                      e.currentTarget.style.borderColor = 'rgba(26,22,18,0.3)'
                      e.currentTarget.style.background = 'rgba(26,22,18,0.04)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (pageSize !== opt.value) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >{opt.label}</button>
              ))}
            </div>

            {/* Orientation pills — only when pageSize !== 'fit' */}
            {pageSize !== 'fit' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['portrait', 'landscape'] as Orientation[]).map(o => (
                  <button
                    key={o}
                    onClick={() => setOrientation(o)}
                    style={{
                      padding: '7px 18px', borderRadius: '100px',
                      border: `1px solid ${orientation === o ? 'var(--amber)' : 'var(--border)'}`,
                      background: orientation === o ? 'var(--amber)' : 'transparent',
                      color: orientation === o ? 'white' : 'var(--ink)',
                      cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                      fontSize: '12px', fontWeight: 500, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (orientation !== o) {
                        e.currentTarget.style.borderColor = 'var(--amber)'
                        e.currentTarget.style.background = 'rgba(240,160,0,0.07)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (orientation !== o) {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >{o.charAt(0).toUpperCase() + o.slice(1)}</button>
                ))}
              </div>
            )}

            {/* Current setting hint */}
            <p style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '11px', color: 'var(--muted)', marginTop: '12px', lineHeight: 1.5,
            }}>
              {PAGE_SIZE_OPTIONS.find(o => o.value === pageSize)?.desc}
              {pageSize !== 'fit' ? ` · ${orientation}` : ''}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleConvert}
              style={{
                flex: 1, background: 'var(--ink)', color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >🖼️ Convert to PDF</button>
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

      {/* State: converting */}
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
          }}>Converting images to PDF…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', marginBottom: '24px',
          }}>{progressLabel}</div>
          <div style={{
            maxWidth: '320px', margin: '0 auto', height: '4px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--amber)', borderRadius: '2px',
              width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* State: done */}
      {toolState === 'done' && (
        <DownloadCard
          filename="doclair-images.pdf"
          description={`${items.length} image${items.length > 1 ? 's' : ''} · ${pageSize === 'fit' ? 'Fit to image' : pageSize.toUpperCase()}`}
          onDownload={handleDownload}
          onReset={handleReset}
        />
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Convert Images to PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Turning a folder of images into a single PDF document takes seconds with Doclair. No software to install, no account required, and your files never leave your device.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Click <strong>Drop image files here</strong> or drag your JPG, PNG, HEIC, or other images into the upload area.',
            'Reorder images by dragging the cards. Use the <strong>↺</strong> and <strong>↻</strong> buttons to rotate any image before converting.',
            'Choose a <strong>Page Size</strong> — Fit (each image fills one page), A4, Letter, Legal, or A3 — and select portrait or landscape orientation.',
            'Click <strong>Convert to PDF</strong> and download your merged PDF instantly.',
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
          Convert iPhone HEIC photos to PDF
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          iPhone cameras save photos in HEIC/HEIF format to save storage space. Doclair automatically converts HEIC files to JPEG before embedding them in your PDF — just drag your iPhone photos directly into the tool. No manual conversion step needed.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Drag-to-reorder and per-image rotation
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Every image card can be dragged to a new position — the PDF pages will follow the exact order you set. Each card also has individual rotation controls (↺ counter-clockwise, ↻ clockwise) that rotate in 90° increments. The rotation is baked into the final PDF, not just a preview effect.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Are my photos safe?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Completely. Doclair uses pdf-lib to generate the PDF entirely inside your browser tab. Your images are never transmitted to any server — not even ours. You can verify this by disconnecting from the internet and using the tool — it works exactly the same.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
