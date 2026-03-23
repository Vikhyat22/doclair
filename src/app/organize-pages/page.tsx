'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PDFDocument } from 'pdf-lib'
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
import { organizePDF } from '@/lib/pdf/organize'
import type { PageOp } from '@/lib/pdf/organize'
import type { ToolState } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ActionBtn({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      title={title}
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '4px',
        border: '1px solid var(--border)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '12px',
        color: danger ? '#DC2626' : 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  )
}

function SortablePage({
  op,
  position,
  totalActive,
  thumbUrl,
  onRotate,
  onDuplicate,
  onDelete,
  onUndoDelete,
  onPreview,
}: {
  op: PageOp & { id: string }
  position: number
  totalActive: number
  thumbUrl: string
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onUndoDelete: () => void
  onPreview: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: op.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          background: op.deleted ? '#FEF2F2' : 'white',
          border: `1px solid ${op.deleted ? '#FCA5A5' : 'var(--border)'}`,
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          cursor: op.deleted ? 'default' : 'grab',
        }}
        {...(op.deleted ? {} : { ...attributes, ...listeners })}
      >
        {/* Action buttons row */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '6px 6px 4px',
            justifyContent: 'flex-end',
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          {!op.deleted && (
            <>
              <ActionBtn onClick={onPreview} title="Preview">🔍</ActionBtn>
              <ActionBtn onClick={onRotate} title="Rotate 90°">↻</ActionBtn>
              <ActionBtn onClick={onDuplicate} title="Duplicate">⊕</ActionBtn>
              <ActionBtn onClick={onDelete} title="Delete" danger>🗑</ActionBtn>
            </>
          )}
        </div>

        {/* Thumbnail */}
        <div
          style={{
            height: '120px',
            background: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {op.deleted && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(220,38,38,0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#DC2626',
                  letterSpacing: '0.1em',
                }}
              >
                DELETED
              </span>
              <button
                onClick={e => { e.stopPropagation(); onUndoDelete() }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '100px',
                  border: '1px solid #DC2626',
                  background: 'white',
                  color: '#DC2626',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Undo
              </button>
            </div>
          )}
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={`Page ${position}`}
              style={{
                maxWidth: '85%',
                maxHeight: '110px',
                objectFit: 'contain',
                transform: `rotate(${op.currentRotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
            />
          ) : (
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '3px solid #E5E7EB',
                borderTopColor: 'var(--amber)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '6px 8px 6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '10px',
              color: 'var(--muted)',
            }}
          >
            {op.deleted ? <s>Page {position}</s> : `Page ${position}`}
            {op.duplicated && (
              <span style={{ marginLeft: '4px', color: 'var(--amber)' }}>⊕</span>
            )}
          </div>
          {op.currentRotation !== 0 && !op.deleted && (
            <span
              style={{
                padding: '1px 5px',
                background: 'var(--amber)',
                color: 'white',
                borderRadius: '100px',
                fontSize: '9px',
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontWeight: 600,
              }}
            >
              {op.currentRotation}°
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Can I change the order of pages in a PDF?',
    a: 'Yes. Drag any page thumbnail to a new position. Touch drag is supported on mobile. The order shown in the grid is the order in the output PDF.',
  },
  {
    q: 'Can I delete a page and get it back?',
    a: 'Yes. Click 🗑 to delete a page — it shows a red "DELETED" overlay with an Undo button. Nothing is permanently removed until you click "Apply & Download PDF".',
  },
  {
    q: 'Can I rotate individual pages?',
    a: 'Yes. Click ↻ on any page thumbnail to rotate it 90° clockwise. The amber badge shows the accumulated rotation. Click multiple times for 180° or 270°.',
  },
  {
    q: 'What does the duplicate (⊕) button do?',
    a: 'It inserts an exact copy of that page immediately after the original. This is useful for repeating a signature page, a template, or a header across multiple sections of a document.',
  },
  {
    q: 'Are my changes saved automatically?',
    a: 'No. Your original PDF is never modified. All changes are applied only when you click "Apply & Download PDF". You can undo any action before downloading.',
  },
  {
    q: 'Are my files uploaded to a server?',
    a: 'Never. Doclair processes your PDF entirely in your browser using pdf-lib. Nothing is ever transmitted to any server.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function OrganizePagesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [thumbsLoading, setThumbsLoading] = useState(false)
  const [ops, setOps] = useState<(PageOp & { id: string })[]>([])
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [history, setHistory] = useState<(PageOp & { id: string })[][]>([])
  const thumbUrlsRef = useRef<string[]>([])

  // ── Sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  // ── Computed ─────────────────────────────────────────────────────────────
  const activeOps    = ops.filter(op => !op.deleted)
  const deletedCount = ops.filter(op => op.deleted).length
  const rotatedCount = ops.filter(op => !op.deleted && op.currentRotation !== 0).length
  const dupCount     = ops.filter(op => !op.deleted && op.duplicated).length
  const hasChanges   =
    deletedCount > 0 ||
    rotatedCount > 0 ||
    dupCount > 0 ||
    !ops.every((op, i) => op.originalIndex === i && !op.deleted && !op.duplicated)
  const originalCount = thumbnails.length

  // ── Thumbnail generation ──────────────────────────────────────────────────
  async function generateThumbnails(fileBytes: ArrayBuffer, pageCount: number) {
    setThumbsLoading(true)
    const urls: string[] = Array(pageCount).fill('')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(fileBytes),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise
      for (let i = 1; i <= pageCount; i++) {
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.5 })
        const canvas   = document.createElement('canvas')
        canvas.width   = Math.floor(viewport.width)
        canvas.height  = Math.floor(viewport.height)
        const ctx      = canvas.getContext('2d')!
        ctx.fillStyle  = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => (b ? res(b) : rej(new Error('fail'))), 'image/jpeg', 0.8)
        )
        const url   = URL.createObjectURL(blob)
        urls[i - 1] = url
        canvas.width  = 0
        canvas.height = 0
        setThumbnails([...urls])
      }
      thumbUrlsRef.current = urls
    } catch (e) {
      console.warn('Thumbnail generation failed:', e)
    } finally {
      setThumbsLoading(false)
    }
  }

  // ── Add file ──────────────────────────────────────────────────────────────
  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    thumbUrlsRef.current.forEach(URL.revokeObjectURL)
    thumbUrlsRef.current = []
    setThumbnails([])
    setOps([])
    setHistory([])
    setResultBytes(null)

    const bytes = await f.arrayBuffer()
    const doc   = await PDFDocument.load(bytes)
    const count = doc.getPageCount()
    setFile(f)

    const initialOps: (PageOp & { id: string })[] = Array.from({ length: count }, (_, i) => ({
      id:              crypto.randomUUID(),
      originalIndex:   i,
      currentRotation: 0,
      deleted:         false,
      duplicated:      false,
    }))
    setOps(initialOps)

    generateThumbnails(bytes, count)
  }, [])

  // ── History ───────────────────────────────────────────────────────────────
  function saveHistory(currentOps: (PageOp & { id: string })[]) {
    setHistory(prev => [...prev.slice(-19), currentOps])
  }

  function handleUndo() {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setOps(last)
      return prev.slice(0, -1)
    })
  }

  // ── Drag end ──────────────────────────────────────────────────────────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeOpsLocal = ops.filter(op => !op.deleted)
    const oldI = activeOpsLocal.findIndex(op => op.id === active.id)
    const newI = activeOpsLocal.findIndex(op => op.id === over.id)
    if (oldI === -1 || newI === -1) return
    const reordered   = arrayMove(activeOpsLocal, oldI, newI)
    const deletedOps  = ops.filter(op => op.deleted)
    saveHistory(ops)
    setOps([...reordered, ...deletedOps])
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  function rotatePage(opId: string) {
    saveHistory(ops)
    setOps(prev =>
      prev.map(op =>
        op.id === opId
          ? { ...op, currentRotation: (op.currentRotation + 90) % 360 }
          : op
      )
    )
  }

  function duplicatePage(opId: string) {
    saveHistory(ops)
    setOps(prev => {
      const idx = prev.findIndex(op => op.id === opId)
      if (idx === -1) return prev
      const source = prev[idx]
      const copy: PageOp & { id: string } = {
        ...source,
        id:          crypto.randomUUID(),
        duplicated:  true,
        duplicateOf: source.originalIndex,
      }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  function deletePage(opId: string) {
    saveHistory(ops)
    setOps(prev => prev.map(op => (op.id === opId ? { ...op, deleted: true } : op)))
  }

  function undoDelete(opId: string) {
    setOps(prev => prev.map(op => (op.id === opId ? { ...op, deleted: false } : op)))
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetAll() {
    thumbUrlsRef.current.forEach(URL.revokeObjectURL)
    thumbUrlsRef.current = []
    setFile(null)
    setThumbnails([])
    setOps([])
    setHistory([])
    setResultBytes(null)
    setToolState('idle')
    setPreviewIndex(null)
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  async function handleApply() {
    if (!file) return
    setToolState('merging')
    try {
      const saved = await organizePDF(file, ops)
      setResultBytes(saved)
      setToolState('done')
    } catch (err) {
      setToolState('idle')
      alert('Failed: ' + (err instanceof Error ? err.message : 'Unknown'))
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────
  function handleDownload() {
    if (!resultBytes) return
    const blob = new Blob([resultBytes as BlobPart], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'doclair-organized.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  // ── Keyboard handler for modal ────────────────────────────────────────────
  useEffect(() => {
    if (previewIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewIndex(null)
      if (e.key === 'ArrowRight') {
        const activeOpsLocal = ops.filter(op => !op.deleted)
        setPreviewIndex(prev =>
          prev !== null ? Math.min(prev + 1, activeOpsLocal.length - 1) : null
        )
      }
      if (e.key === 'ArrowLeft') {
        setPreviewIndex(prev => (prev !== null ? Math.max(prev - 1, 0) : null))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [previewIndex, ops])

  // ── Derived strings ───────────────────────────────────────────────────────
  const downloadDesc = [
    `${activeOps.length} page${activeOps.length !== 1 ? 's' : ''}`,
    deletedCount > 0 ? `${deletedCount} deleted` : null,
    rotatedCount > 0 ? `${rotatedCount} rotated` : null,
    dupCount > 0 ? `${dupCount} duplicated` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'Split PDF',  slug: 'split-pdf',  icon: '✂️', colorBg: '#DBEAFE', desc: 'Extract pages or ranges' },
        { name: 'Rotate PDF', slug: 'rotate-pdf', icon: '🔄', colorBg: '#DBEAFE', desc: 'Fix page orientation' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',        slug: 'merge-pdf',             icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Remove Pages',     slug: 'remove-pages-from-pdf', icon: '🗑️', colorBg: '#FEE2E2', desc: 'Delete unwanted pages' },
        { name: 'Compress PDF',     slug: 'compress-pdf',          icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Add Page Numbers', slug: 'add-page-numbers',      icon: '🔢', colorBg: '#FFF0DC', desc: 'Number your pages' },
        { name: 'PDF Viewer',       slug: 'pdf-viewer',            icon: '👁️', colorBg: '#EDE9FE', desc: 'View PDFs in browser' },
      ]}
    />
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ToolPageLayout toolName="Organize Pages" sidebar={sidebar}>

      {/* ── Preview Modal ── */}
      {previewIndex !== null && (() => {
        const activeOpsLocal = ops.filter(op => !op.deleted)
        const op = activeOpsLocal[previewIndex]
        if (!op) return null
        const thumbUrl = thumbnails[op.originalIndex] || ''
        return (
          <div
            onClick={() => setPreviewIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '560px',
                width: '100%',
                position: 'relative',
                boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              }}
            >
              <button
                onClick={() => setPreviewIndex(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
              <div
                style={{
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                Page {previewIndex + 1} of {activeOpsLocal.length}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                }}
              >
                <button
                  onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                  disabled={previewIndex === 0}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor: previewIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: previewIndex === 0 ? 0.3 : 1,
                    fontSize: '16px',
                  }}
                >
                  ←
                </button>
                {thumbUrl && (
                  <img
                    src={thumbUrl}
                    alt="Preview"
                    style={{
                      maxWidth: '400px',
                      maxHeight: '500px',
                      objectFit: 'contain',
                      transform: `rotate(${op.currentRotation}deg)`,
                      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                      borderRadius: '4px',
                    }}
                  />
                )}
                <button
                  onClick={() =>
                    setPreviewIndex(Math.min(activeOpsLocal.length - 1, previewIndex + 1))
                  }
                  disabled={previewIndex === activeOpsLocal.length - 1}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor:
                      previewIndex >= activeOpsLocal.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: previewIndex >= activeOpsLocal.length - 1 ? 0.3 : 1,
                    fontSize: '16px',
                  }}
                >
                  →
                </button>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--muted)',
                }}
              >
                Use ← → arrow keys to navigate · Esc to close
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Organize PDF Pages',
            url: 'https://doclair.in/organize-pages',
            description:
              'Reorder, rotate, delete and duplicate PDF pages. Free, no upload, browser-based.',
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />

      {/* ── Tool Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['✓ 100% Free', '🔒 Files Stay On Device', '✦ Non-destructive'].map(badge => (
            <span
              key={badge}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: '100px',
                background: '#DCFCE7',
                color: '#166534',
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              {badge}
            </span>
          ))}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 44px)',
            letterSpacing: '-1px',
            color: 'var(--ink)',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Organize Pages{' '}
          <span style={{ color: 'var(--amber)' }}>Reorder, Rotate &amp; Delete</span>
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: 'var(--muted)',
            lineHeight: 1.6,
            margin: 0,
            maxWidth: '580px',
          }}
        >
          Drag pages into any order. Rotate, delete or duplicate individual pages. Preview
          before saving. Free, no upload.
        </p>
      </div>

      {/* ── Drop Zone (idle, no file) ── */}
      {toolState === 'idle' && !file && (
        <DropZone
          accept=".pdf"
          maxFiles={1}
          icon="📋"
          label="Drop your PDF here"
          onFilesAdded={addFile}
        />
      )}

      {/* ── Editor (file loaded, not done) ── */}
      {file && (toolState === 'idle' || toolState === 'merging') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontSize: '12px',
                color: 'var(--muted)',
              }}
            >
              {activeOps.length} of {originalCount} page{originalCount !== 1 ? 's' : ''}
              {thumbsLoading && (
                <span style={{ marginLeft: '8px', color: 'var(--amber)', fontSize: '11px' }}>
                  loading thumbnails…
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: history.length === 0 ? 0.4 : 1,
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  transition: 'all 0.15s',
                }}
              >
                ↩ Undo
              </button>
              <button
                onClick={resetAll}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  transition: 'all 0.15s',
                }}
              >
                Reset all
              </button>
            </div>
          </div>

          {/* DnD Grid */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ops.map(op => op.id)} strategy={rectSortingStrategy}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '12px',
                }}
              >
                {(() => {
                  let position = 0
                  return ops.map(op => {
                    if (!op.deleted) position++
                    const thumbUrl = thumbnails[op.originalIndex] || ''
                    return (
                      <SortablePage
                        key={op.id}
                        op={op}
                        position={op.deleted ? 0 : position}
                        totalActive={activeOps.length}
                        thumbUrl={thumbUrl}
                        onRotate={() => rotatePage(op.id)}
                        onDuplicate={() => duplicatePage(op.id)}
                        onDelete={() => deletePage(op.id)}
                        onUndoDelete={() => undoDelete(op.id)}
                        onPreview={() => {
                          const activeIdx = activeOps.findIndex(a => a.id === op.id)
                          if (activeIdx !== -1) setPreviewIndex(activeIdx)
                        }}
                      />
                    )
                  })
                })()}
              </div>
            </SortableContext>
          </DndContext>

          {/* Action bar */}
          <div
            style={{
              padding: '20px',
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                fontSize: '11px',
                color: 'var(--muted)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Nothing saves until you click Download. All changes can be undone.
            </p>
            <button
              onClick={handleApply}
              disabled={!hasChanges || toolState === 'merging'}
              style={{
                background: hasChanges && toolState !== 'merging' ? 'var(--ink)' : '#9CA3AF',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '100px',
                fontSize: '15px',
                fontWeight: 500,
                border: 'none',
                cursor: hasChanges && toolState !== 'merging' ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                width: '100%',
                transition: 'all 0.2s',
              }}
            >
              {toolState === 'merging' ? 'Applying…' : 'Apply & Download PDF'}
            </button>
            {hasChanges && (
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
                  fontSize: '11px',
                  color: 'var(--muted)',
                }}
              >
                Changes:{' '}
                {[
                  deletedCount > 0 ? `${deletedCount} deleted` : null,
                  rotatedCount > 0 ? `${rotatedCount} rotated` : null,
                  dupCount > 0 ? `${dupCount} duplicated` : null,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Merging spinner (standalone, no file editor) ── */}
      {toolState === 'merging' && !file && (
        <div
          style={{
            padding: '48px 32px',
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '4px solid #E5E7EB',
              borderTopColor: 'var(--amber)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p
            style={{
              fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
              fontSize: '13px',
              color: 'var(--muted)',
            }}
          >
            Applying changes…
          </p>
        </div>
      )}

      {/* ── Done ── */}
      {toolState === 'done' && (
        <DownloadCard
          filename="doclair-organized.pdf"
          description={downloadDesc}
          onDownload={handleDownload}
          onReset={resetAll}
        />
      )}

      {/* ── SEO Content ── */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 700,
            fontSize: '22px',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          How to Organize PDF Pages Online — Free
        </h2>
        <ol
          style={{
            paddingLeft: '20px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {[
            'Upload your PDF — no account or sign-up required.',
            'Drag pages into the order you want. Rotate individual pages, delete pages you don\'t need, or duplicate pages for repeating content.',
            'Click "Apply & Download PDF" to save your organized PDF directly to your device.',
          ].map((step, i) => (
            <li
              key={i}
              style={{
                fontSize: '14px',
                color: 'var(--ink)',
                opacity: 0.75,
                lineHeight: 1.7,
              }}
            >
              {step}
            </li>
          ))}
        </ol>

        <div>
          <h3
            style={{
              fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700,
              fontSize: '17px',
              color: 'var(--ink)',
              margin: '0 0 8px',
            }}
          >
            Duplicate pages in a PDF
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, margin: 0 }}>
            Doclair is the only free browser-based PDF organiser that lets you duplicate pages.
            This is useful for repeating signature blocks, template headers, or cover pages
            without downloading and re-uploading the file.
          </p>
        </div>

        <div>
          <h3
            style={{
              fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700,
              fontSize: '17px',
              color: 'var(--ink)',
              margin: '0 0 8px',
            }}
          >
            Undo changes before downloading
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, margin: 0 }}>
            Nothing is permanent until you click Download. Use the Undo button to reverse the
            last action, or Reset to start over with the original file.
          </p>
        </div>

        <div>
          <h3
            style={{
              fontFamily: 'var(--font-syne), Syne, sans-serif',
              fontWeight: 700,
              fontSize: '17px',
              color: 'var(--ink)',
              margin: '0 0 8px',
            }}
          >
            Organize PDF pages on iPhone and Android
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, margin: 0 }}>
            Drag-and-drop reordering is fully touch-compatible. Upload from Files app on iPhone
            or Downloads on Android, organize the pages, and save directly to your device.
          </p>
        </div>
      </div>

      {/* ── FAQ ── */}
      <FAQ faqs={FAQS} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ToolPageLayout>
  )
}
