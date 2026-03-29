'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'Is my PDF uploaded to a server when I sign it?', a: 'Never. Doclair signs PDFs entirely in your browser. Your document is never transmitted to any server.' },
  { q: 'Can I draw my signature with a mouse or stylus?', a: 'Yes. Switch to Draw mode in the signature panel and draw directly on the canvas using your mouse, trackpad, or stylus.' },
  { q: 'How do I place my signature on a specific page?', a: 'Upload the PDF, pick or create a signature, then click the target page preview or thumbnail. You can move the signature later, resize it, or copy it across pages.' },
  { q: 'Can I resize or reposition my signature after placing it?', a: 'Yes. Click a placed signature to select it, drag it to move, use the corner handle to resize, or fine-tune it with the numeric controls and keyboard nudging.' },
  { q: 'Can I sign PDF on iPhone or Android?', a: 'Yes. Doclair works in mobile Safari and Chrome. Touch works for drawing signatures, placing them on the page, and switching pages.' },
  { q: 'Will signing flatten or compress my PDF?', a: 'No. Doclair keeps the original PDF pages intact and layers your signature on top, so text stays selectable and page quality does not get rebuilt into a screenshot.' },
  { q: 'Will the signed PDF have a watermark?', a: 'Never. Doclair adds zero watermarks to any output.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Sign PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/sign-pdf',
      description: 'Sign PDF documents online free. Draw, type or upload your signature, reuse saved signatures, and place them anywhere without flattening the whole PDF. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Sign PDF', item: 'https://doclair.in/sign-pdf' },
  ],
}

const MIN_ZOOM = 0.75
const MAX_ZOOM = 2
const SIGNATURE_STORAGE_KEY = 'doclair:sign-pdf:signature-assets:v1'

type SigMode = 'draw' | 'type' | 'upload'

interface SignatureAssetDraft {
  dataUrl: string
  widthPx: number
  heightPx: number
  label: string
}

interface SignatureAsset extends SignatureAssetDraft {
  id: string
}

interface SigField {
  id: string
  assetId: string | null
  pageIndex: number
  x: number
  y: number
  dataUrl: string
  w: number
  h: number
}

interface PageSize {
  width: number
  height: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampZoom(value: number) {
  return Number(clamp(Number(value.toFixed(2)), MIN_ZOOM, MAX_ZOOM))
}

function formatSignatureLabel(label: string) {
  const trimmed = label.trim()
  if (!trimmed) return 'Signature'
  return trimmed.length > 20 ? `${trimmed.slice(0, 19)}…` : trimmed
}

function normalizeSignatureAssets(assets: SignatureAsset[]) {
  const seen = new Set<string>()
  return assets
    .filter(asset => {
      if (!asset.dataUrl) return false
      const key = `${asset.label}::${asset.dataUrl}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)
}

function buildSignatureField(
  asset: SignatureAsset,
  pageIndex: number,
  x: number,
  y: number,
  pageWidth: number,
  pageHeight: number,
) {
  const scaledWidthPx = Math.min(asset.widthPx, pageWidth * 0.35)
  const scaledHeightPx = (asset.heightPx / asset.widthPx) * scaledWidthPx
  const widthFraction = scaledWidthPx / pageWidth
  const heightFraction = scaledHeightPx / pageHeight

  return {
    id: crypto.randomUUID(),
    assetId: asset.id,
    pageIndex,
    x: clamp(x, 0, 1 - widthFraction),
    y: clamp(y, 0, 1 - heightFraction),
    dataUrl: asset.dataUrl,
    w: widthFraction,
    h: heightFraction,
  } satisfies SigField
}

async function canvasToBlobUrl(canvas: HTMLCanvasElement, type: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(nextBlob => {
      if (nextBlob) {
        resolve(nextBlob)
        return
      }

      reject(new Error('Could not prepare PDF preview'))
    }, type)
  })

  return URL.createObjectURL(blob)
}

function revokeObjectUrls(urls: string[]) {
  urls.forEach(url => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  })
}

async function dataUrlToUint8Array(dataUrl: string) {
  const response = await fetch(dataUrl)
  return new Uint8Array(await response.arrayBuffer())
}

function SignatureModal({
  onDone,
  onCancel,
}: {
  onDone: (asset: SignatureAssetDraft) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<SigMode>('draw')
  const [typedText, setTypedText] = useState('')
  const [typedFont, setTypedFont] = useState('italic 52px Georgia, serif')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPt = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const isTouch = 'touches' in e
    return {
      x: ((isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - rect.left) * (canvas.width / rect.width),
      y: ((isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - rect.top) * (canvas.height / rect.height),
    }
  }

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true
    lastPt.current = getPos(e, canvasRef.current!)
  }

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1A1612'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const point = getPos(e, canvas)
    if (lastPt.current) {
      ctx.beginPath()
      ctx.moveTo(lastPt.current.x, lastPt.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
    lastPt.current = point
  }

  const onUp = () => {
    drawing.current = false
    lastPt.current = null
  }

  const clear = () => canvasRef.current?.getContext('2d')?.clearRect(0, 0, 480, 180)

  const commit = () => {
    if (mode === 'draw') {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let minX = canvas.width
      let maxX = 0
      let minY = canvas.height
      let maxY = 0

      for (let index = 0; index < data.data.length; index += 4) {
        if (data.data[index + 3] > 0) {
          const x = (index / 4) % canvas.width
          const y = Math.floor((index / 4) / canvas.width)
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }

      if (maxX <= minX) {
        onDone({
          dataUrl: canvas.toDataURL(),
          widthPx: 200,
          heightPx: 60,
          label: 'Drawn signature',
        })
        return
      }

      const pad = 10
      const cropLeft = Math.max(0, minX - pad)
      const cropTop = Math.max(0, minY - pad)
      const cropRight = Math.min(canvas.width, maxX + pad)
      const cropBottom = Math.min(canvas.height, maxY + pad)
      const output = document.createElement('canvas')
      output.width = cropRight - cropLeft
      output.height = cropBottom - cropTop
      output
        .getContext('2d')!
        .putImageData(ctx.getImageData(cropLeft, cropTop, output.width, output.height), 0, 0)

      onDone({
        dataUrl: output.toDataURL(),
        widthPx: output.width,
        heightPx: output.height,
        label: 'Drawn signature',
      })
      return
    }

    const text = typedText.trim() || 'Your Signature'
    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')!
    measureCtx.font = typedFont
    const textWidth = measureCtx.measureText(text).width
    const output = document.createElement('canvas')
    output.width = Math.max(240, Math.min(640, Math.ceil(textWidth + 28)))
    output.height = 90
    const ctx = output.getContext('2d')!
    ctx.font = typedFont
    ctx.fillStyle = '#1A1612'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 10, 45)
    onDone({
      dataUrl: output.toDataURL(),
      widthPx: output.width,
      heightPx: 90,
      label: text,
    })
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => {
      const img = new Image()
      img.onload = () =>
        onDone({
          dataUrl: img.src,
          widthPx: img.naturalWidth,
          heightPx: img.naturalHeight,
          label: file.name.replace(/\.[^.]+$/, '') || 'Uploaded signature',
        })
      img.src = event.target!.result as string
    }
    reader.readAsDataURL(file)
  }

  const fonts = [
    { label: 'Script', value: 'italic 52px Georgia, serif' },
    { label: 'Print', value: '500 48px Arial, sans-serif' },
    { label: 'Mono', value: '500 44px "Courier New", monospace' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 540, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20 }}>Create Your Signature</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {([['draw', 'Draw'], ['type', 'Type'], ['upload', 'Upload Image']] as const).map(([nextMode, label]) => (
            <button
              key={nextMode}
              onClick={() => setMode(nextMode)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 7,
                border: 'none',
                background: mode === nextMode ? '#fff' : 'transparent',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                color: mode === nextMode ? '#1A1612' : '#6b7280',
                boxShadow: mode === nextMode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'draw' && (
          <>
            <canvas
              ref={canvasRef}
              width={480}
              height={180}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
              onTouchStart={onDown}
              onTouchMove={onMove}
              onTouchEnd={onUp}
              style={{ border: '2px dashed #d1d5db', borderRadius: 10, display: 'block', width: '100%', height: 180, cursor: 'crosshair', touchAction: 'none' }}
            />
            <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 8 }}>Draw your signature above</p>
            <button onClick={clear} style={{ marginTop: 4, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>Clear</button>
          </>
        )}

        {mode === 'type' && (
          <>
            <input
              value={typedText}
              onChange={e => setTypedText(e.target.value)}
              placeholder="Type your name…"
              style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 28, fontFamily: 'Georgia, serif', fontStyle: 'italic', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {fonts.map(font => (
                <button
                  key={font.value}
                  onClick={() => setTypedFont(font.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1.5px solid',
                    borderColor: typedFont === font.value ? '#F59E0B' : '#e5e7eb',
                    background: typedFont === font.value ? '#FFF8EC' : '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'upload' && (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, border: '3px dashed #e5e7eb', borderRadius: 12, padding: '48px 24px', cursor: 'pointer', background: '#fafafa' }}>
            <span style={{ fontSize: 40 }}>🖼️</span>
            <span style={{ fontWeight: 600, color: '#374151' }}>Click to upload signature image</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>PNG with transparent background works best</span>
            <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
        )}

        {mode !== 'upload' && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={commit} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Use This Signature →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignPDFPage() {
  const [pageUrls, setPageUrls] = useState<string[]>([])
  const [pageSizes, setPageSizes] = useState<PageSize[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [fields, setFields] = useState<SigField[]>([])
  const [signatureAssets, setSignatureAssets] = useState<SignatureAsset[]>([])
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingSig, setPendingSig] = useState<SignatureAsset | null>(null)
  const [placing, setPlacing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; startW: number; startX: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIGNATURE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SignatureAsset[]
      if (!Array.isArray(parsed)) return

      const restored = normalizeSignatureAssets(
        parsed
          .filter(asset => asset && typeof asset === 'object' && typeof asset.dataUrl === 'string')
          .map(asset => ({
            id: typeof asset.id === 'string' && asset.id ? asset.id : crypto.randomUUID(),
            dataUrl: asset.dataUrl,
            widthPx: Number(asset.widthPx) || 200,
            heightPx: Number(asset.heightPx) || 60,
            label: formatSignatureLabel(String(asset.label || 'Signature')),
          })),
      )

      setSignatureAssets(restored)
      setActiveAssetId(restored[0]?.id ?? null)
    } catch {
      window.localStorage.removeItem(SIGNATURE_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(signatureAssets))
    } catch {
      // Ignore storage failures in private mode or quota limits.
    }
  }, [signatureAssets])

  const activeAsset = useMemo(
    () => signatureAssets.find(asset => asset.id === activeAssetId) ?? null,
    [activeAssetId, signatureAssets],
  )
  const selectedField = useMemo(
    () => fields.find(field => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  )
  const pageFields = useMemo(
    () => fields.filter(field => field.pageIndex === currentPage),
    [currentPage, fields],
  )
  const fieldCountByPage = useMemo(
    () => Array.from({ length: pageCount }, (_, pageIndex) => fields.filter(field => field.pageIndex === pageIndex).length),
    [fields, pageCount],
  )
  const hasFile = pageUrls.length > 0

  useEffect(() => {
    if (!signatureAssets.length) {
      if (activeAssetId) setActiveAssetId(null)
      if (pendingSig) setPendingSig(null)
      return
    }

    if (activeAssetId && signatureAssets.some(asset => asset.id === activeAssetId)) return
    setActiveAssetId(signatureAssets[0].id)
  }, [activeAssetId, pendingSig, signatureAssets])

  const loadPDF = useCallback(async (file: File) => {
    const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    const urls: string[] = []
    const sizes: PageSize[] = []

    for (let index = 1; index <= doc.numPages; index += 1) {
      const page = await doc.getPage(index)
      const viewport = page.getViewport({ scale: 1.6 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (page.render as any)({ canvasContext: canvas.getContext('2d'), viewport }).promise
      urls.push(await canvasToBlobUrl(canvas, 'image/png'))
      sizes.push({ width: viewport.width, height: viewport.height })
    }

    setPageCount(doc.numPages)
    setCurrentPage(0)
    setPageSizes(sizes)
    setFields([])
    setSelectedFieldId(null)
    setPendingSig(null)
    setPlacing(false)
    setZoom(1)
    setSaveError('')
    setPageUrls(prev => {
      revokeObjectUrls(prev)
      return urls
    })
  }, [])

  useEffect(() => () => revokeObjectUrls(pageUrls), [pageUrls])

  const handleFile = useCallback(
    (file: File) => {
      setPdfFile(file)
      void loadPDF(file)
    },
    [loadPDF],
  )

  const registerSignatureAsset = useCallback((assetDraft: SignatureAssetDraft) => {
    const asset = {
      id: crypto.randomUUID(),
      ...assetDraft,
      label: formatSignatureLabel(assetDraft.label),
    } satisfies SignatureAsset

    setSignatureAssets(prev => normalizeSignatureAssets([asset, ...prev]))
    setActiveAssetId(asset.id)
    setPendingSig(asset)
    setSelectedFieldId(null)
    setShowModal(false)
    setPlacing(true)
    setSaveError('')
  }, [])

  const removeSignatureAsset = useCallback((assetId: string) => {
    setSignatureAssets(prev => prev.filter(asset => asset.id !== assetId))
    setActiveAssetId(prev => (prev === assetId ? null : prev))
    setPendingSig(prev => (prev?.id === assetId ? null : prev))
  }, [])

  const clearStoredSignatures = useCallback(() => {
    setSignatureAssets([])
    setActiveAssetId(null)
    setPendingSig(null)
    try {
      window.localStorage.removeItem(SIGNATURE_STORAGE_KEY)
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const armPlacement = useCallback((asset: SignatureAsset) => {
    setActiveAssetId(asset.id)
    setPendingSig(asset)
    setSelectedFieldId(null)
    setPlacing(true)
    setSaveError('')
  }, [])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing || !pendingSig) {
      setSelectedFieldId(null)
      return
    }

    const pageSize = pageSizes[currentPage]
    if (!pageSize) return

    const rect = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    const field = buildSignatureField(pendingSig, currentPage, fx, fy, pageSize.width, pageSize.height)

    setFields(prev => [...prev, field])
    setSelectedFieldId(field.id)
    setPendingSig(null)
    setPlacing(false)
  }, [currentPage, pageSizes, pendingSig, placing])

  const updateField = useCallback((fieldId: string, updater: (field: SigField) => SigField) => {
    setFields(prev => prev.map(field => (field.id === fieldId ? updater(field) : field)))
  }, [])

  const deleteField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId))
    setSelectedFieldId(prev => (prev === fieldId ? null : prev))
  }, [])

  const duplicateField = useCallback((fieldId: string) => {
    const source = fields.find(field => field.id === fieldId)
    if (!source) return

    const duplicate = {
      ...source,
      id: crypto.randomUUID(),
      x: clamp(source.x + 0.02, 0, 1 - source.w),
      y: clamp(source.y + 0.02, 0, 1 - source.h),
    } satisfies SigField

    setFields(prev => [...prev, duplicate])
    setSelectedFieldId(duplicate.id)
    setCurrentPage(duplicate.pageIndex)
  }, [fields])

  const copyFieldToAllPages = useCallback((fieldId: string) => {
    const source = fields.find(field => field.id === fieldId)
    if (!source) return

    const copies = Array.from({ length: pageCount }, (_, pageIndex) => (
      pageIndex === source.pageIndex ||
      fields.some(field => (
        field.id !== source.id &&
        field.pageIndex === pageIndex &&
        field.assetId === source.assetId &&
        Math.abs(field.x - source.x) < 0.001 &&
        Math.abs(field.y - source.y) < 0.001 &&
        Math.abs(field.w - source.w) < 0.001 &&
        Math.abs(field.h - source.h) < 0.001
      ))
        ? null
        : {
            ...source,
            id: crypto.randomUUID(),
            pageIndex,
          } satisfies SigField
    )).filter(Boolean) as SigField[]

    setFields(prev => [...prev, ...copies])
  }, [fields, pageCount])

  const nudgeField = useCallback((fieldId: string, dx: number, dy: number) => {
    updateField(fieldId, field => ({
      ...field,
      x: clamp(field.x + dx, 0, 1 - field.w),
      y: clamp(field.y + dy, 0, 1 - field.h),
    }))
  }, [updateField])

  const setFieldX = useCallback((fieldId: string, nextPercent: number) => {
    updateField(fieldId, field => ({
      ...field,
      x: clamp(nextPercent / 100, 0, 1 - field.w),
    }))
  }, [updateField])

  const setFieldY = useCallback((fieldId: string, nextPercent: number) => {
    updateField(fieldId, field => ({
      ...field,
      y: clamp(nextPercent / 100, 0, 1 - field.h),
    }))
  }, [updateField])

  const setFieldWidth = useCallback((fieldId: string, nextPercent: number) => {
    updateField(fieldId, field => {
      const pageSize = pageSizes[field.pageIndex]
      const ratio = field.h / field.w
      const minWidth = pageSize ? 40 / pageSize.width : 0.04
      let nextWidth = clamp(nextPercent / 100, minWidth, 1 - field.x)
      nextWidth = Math.min(nextWidth, (1 - field.y) / ratio)

      return {
        ...field,
        w: nextWidth,
        h: nextWidth * ratio,
      }
    })
  }, [pageSizes, updateField])

  const setFieldPage = useCallback((fieldId: string, nextPageIndex: number) => {
    updateField(fieldId, field => ({
      ...field,
      pageIndex: clamp(nextPageIndex, 0, Math.max(0, pageCount - 1)),
    }))
    setCurrentPage(clamp(nextPageIndex, 0, Math.max(0, pageCount - 1)))
  }, [pageCount, updateField])

  const startDrag = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation()
    const field = fields.find(item => item.id === fieldId)
    if (!field) return
    setSelectedFieldId(fieldId)
    setDragging({ id: fieldId, ox: field.x, oy: field.y, sx: e.clientX, sy: e.clientY })
  }, [fields])

  useEffect(() => {
    if (!dragging) return

    const move = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setFields(prev => prev.map(field => (
        field.id === dragging.id
          ? {
              ...field,
              x: clamp(dragging.ox + (e.clientX - dragging.sx) / rect.width, 0, 1 - field.w),
              y: clamp(dragging.oy + (e.clientY - dragging.sy) / rect.height, 0, 1 - field.h),
            }
          : field
      )))
    }

    const up = () => setDragging(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [dragging])

  const startResize = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation()
    const field = fields.find(item => item.id === fieldId)
    if (!field) return
    setSelectedFieldId(fieldId)
    setResizing({ id: fieldId, startW: field.w, startX: e.clientX })
  }, [fields])

  useEffect(() => {
    if (!resizing) return

    const move = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const dx = (e.clientX - resizing.startX) / rect.width
      const field = fields.find(item => item.id === resizing.id)
      if (!field) return

      const ratio = field.h / field.w
      const pageSize = pageSizes[field.pageIndex]
      const minWidth = pageSize ? 40 / pageSize.width : 0.04
      let nextWidth = Math.max(minWidth, resizing.startW + dx)
      nextWidth = Math.min(nextWidth, 1 - field.x)
      nextWidth = Math.min(nextWidth, (1 - field.y) / ratio)

      setFields(prev => prev.map(item => (
        item.id === resizing.id
          ? { ...item, w: nextWidth, h: nextWidth * ratio }
          : item
      )))
    }

    const up = () => setResizing(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [fields, pageSizes, resizing])

  useEffect(() => {
    if (!selectedFieldId || showModal) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return

      if (event.key === 'Escape') {
        setSelectedFieldId(null)
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        deleteField(selectedFieldId)
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateField(selectedFieldId)
        return
      }

      const step = event.shiftKey ? 0.02 : 0.005
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        nudgeField(selectedFieldId, -step, 0)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        nudgeField(selectedFieldId, step, 0)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        nudgeField(selectedFieldId, 0, -step)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        nudgeField(selectedFieldId, 0, step)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteField, duplicateField, nudgeField, selectedFieldId, showModal])

  const savePDF = useCallback(async () => {
    if (!pageUrls.length) return
    setSaving(true)
    setSaveError('')

    try {
      if (!pdfFile) throw new Error('Choose a PDF first')
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const doc = await PDFDocument.load(await pdfFile.arrayBuffer(), {
        forIncrementalUpdate: true,
        throwOnInvalidObject: false,
      })
      const pages = doc.getPages()

      for (const field of fields) {
        const page = pages[field.pageIndex]
        if (!page) continue

        const imageBytes = await dataUrlToUint8Array(field.dataUrl)
        const isJpeg = /^data:image\/jpe?g/i.test(field.dataUrl)
        const embeddedImage = isJpeg ? await doc.embedJpg(imageBytes) : await doc.embedPng(imageBytes)
        const pageWidth = page.getWidth()
        const pageHeight = page.getHeight()
        const drawWidth = field.w * pageWidth
        const drawHeight = field.h * pageHeight

        page.drawImage(embeddedImage, {
          x: field.x * pageWidth,
          y: pageHeight - field.y * pageHeight - drawHeight,
          width: drawWidth,
          height: drawHeight,
        })
      }

      const bytes = await doc.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = pdfFile.name.replace(/\.pdf$/i, '-signed.pdf')
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save signed PDF')
    } finally {
      setSaving(false)
    }
  }, [fields, pageUrls.length, pdfFile])

  const sidebar = (
    <ToolSidebar
      reverseActions={[]}
      relatedTools={[
        { name: 'Edit PDF', slug: 'edit-pdf', icon: '✍️', colorBg: '#DBEAFE', desc: 'Edit text and signatures together' },
        { name: 'Annotate PDF', slug: 'annotate-pdf', icon: '💬', colorBg: '#DBEAFE', desc: 'Highlight and comment' },
        { name: 'Redact PDF', slug: 'redact-pdf', icon: '⬛', colorBg: '#DBEAFE', desc: 'Permanently remove content' },
        { name: 'Encrypt PDF', slug: 'encrypt-pdf', icon: '🔐', colorBg: '#FEE2E2', desc: 'Add password protection' },
        { name: 'PDF Viewer', slug: 'pdf-viewer', icon: '👓', colorBg: '#F3F4F6', desc: 'View PDFs in browser' },
      ]}
      blogPost={{ slug: 'how-to-sign-pdf-free', title: 'How to Sign a PDF Free — Add Your Signature Without Printing' }}
    />
  )

  const activeAssetLabel = activeAsset ? formatSignatureLabel(activeAsset.label) : 'No signature selected'

  return (
    <ToolPageLayout toolName="Sign PDF" sidebar={hasFile ? undefined : sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {!hasFile ? (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
            <span style={{ color: 'var(--ink)' }}>Sign PDF </span>
            <span style={{ color: 'var(--amber)' }}>Online Free</span>
          </h1>
          <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '650px', marginTop: '12px', lineHeight: 1.6 }}>
            Draw, type, or upload your signature, reuse it across pages, and place it precisely with thumbnails, zoom, and keyboard nudging. Original PDF text stays crisp and searchable because Doclair signs the source file instead of flattening the whole page into an image.
          </p>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <strong style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Signing Editor</strong>
            <span style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>
              Local-only signing with reusable signatures, page thumbnails, zoom, and source PDF quality preserved.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '5px 10px', borderRadius: '999px', background: 'rgba(34,197,94,0.14)', color: '#86EFAC', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: 11 }}>Text stays selectable</span>
            <span style={{ padding: '5px 10px', borderRadius: '999px', background: 'rgba(245,158,11,0.16)', color: '#FCD34D', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: 11 }}>Browser-only</span>
            <span style={{ padding: '5px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: 11 }}>
              {pdfFile?.name}
            </span>
          </div>
        </div>
      )}

      {!hasFile ? (
        <div
          onDrop={e => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file?.type === 'application/pdf') handleFile(file)
          }}
          onDragOver={e => e.preventDefault()}
          style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 80, textAlign: 'center', background: '#fafafa' }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>✍️</div>
          <p style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Drop your PDF here to sign</p>
          <p style={{ color: '#9ca3af', marginBottom: 28 }}>or</p>
          <label style={{ padding: '14px 32px', borderRadius: 12, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>
            Choose PDF
            <input type="file" accept="application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file) handleFile(file) }} style={{ display: 'none' }} />
          </label>
          <div style={{ marginTop: 28, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['No uploads — browser only', 'Free forever', 'Reuse one signature across pages'].map(text => (
              <span key={text} style={{ fontSize: 13, color: '#6b7280' }}>✓ {text}</span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1.5px solid #F59E0B',
                  background: '#FFF8EC',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  color: '#92400e',
                }}
              >
                ✍️ Create Signature
              </button>
              <button
                onClick={() => activeAsset && armPlacement(activeAsset)}
                disabled={!activeAsset}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: activeAsset ? '#fff' : '#F3F4F6',
                  color: activeAsset ? '#111827' : '#9CA3AF',
                  fontWeight: 600,
                  cursor: activeAsset ? 'pointer' : 'not-allowed',
                }}
              >
                {placing ? 'Click PDF To Place' : 'Place Selected Signature'}
              </button>
              {selectedField && (
                <>
                  <button
                    onClick={() => duplicateField(selectedField.id)}
                    style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Duplicate
                  </button>
                  {pageCount > 1 && (
                    <button
                      onClick={() => copyFieldToAllPages(selectedField.id)}
                      style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Copy To All Pages
                    </button>
                  )}
                </>
              )}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setZoom(prev => clampZoom(prev - 0.15))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>−</button>
                <span style={{ minWidth: 58, textAlign: 'center', fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(prev => clampZoom(prev + 0.15))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>+</button>
                <button onClick={() => setZoom(1)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Fit</button>
              </div>
              <button
                onClick={savePDF}
                disabled={saving}
                style={{
                  padding: '10px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: saving ? '#fcd34d' : '#F59E0B',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Download Signed PDF'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {pdfFile?.name} · {pageCount} page{pageCount !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Active signature: <strong style={{ color: '#111827' }}>{activeAssetLabel}</strong>
              </span>
              {placing && (
                <span style={{ fontSize: 13, color: '#92400E', fontWeight: 700 }}>
                  Click on any page to place the selected signature
                </span>
              )}
            </div>

            {signatureAssets.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14, color: '#111827' }}>Saved Signatures</strong>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Saved in this browser only. Click any saved signature to place it again.</span>
                    {signatureAssets.length > 1 && (
                      <button
                        type="button"
                        onClick={clearStoredSignatures}
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                  {signatureAssets.map(asset => (
                    <div
                      key={asset.id}
                      style={{
                        minWidth: 150,
                        borderRadius: 14,
                        border: `1.5px solid ${asset.id === activeAssetId ? '#F59E0B' : '#E5E7EB'}`,
                        background: asset.id === activeAssetId ? '#FFF8EC' : '#fff',
                        padding: 12,
                        display: 'grid',
                        gap: 8,
                        justifyItems: 'center',
                        position: 'relative',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => armPlacement(asset)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'grid',
                          gap: 8,
                          justifyItems: 'center',
                          padding: 0,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.dataUrl} alt={asset.label} style={{ maxWidth: 120, maxHeight: 52, objectFit: 'contain' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{asset.label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSignatureAsset(asset.id)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          borderRadius: '999px',
                          border: '1px solid #E5E7EB',
                          background: '#fff',
                          color: '#6B7280',
                          cursor: 'pointer',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label={`Remove ${asset.label}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {pageCount > 1 && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14, color: '#111827' }}>Page Thumbnails</strong>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Jump between pages before or after placing signatures.</span>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {pageUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setCurrentPage(index)
                      if (!placing) setSelectedFieldId(null)
                    }}
                    style={{
                      minWidth: 108,
                      borderRadius: 14,
                      border: `1.5px solid ${index === currentPage ? '#F59E0B' : '#E5E7EB'}`,
                      background: index === currentPage ? '#FFF8EC' : '#fff',
                      padding: 10,
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Page ${index + 1}`} style={{ width: '100%', borderRadius: 8, boxShadow: '0 2px 12px rgba(15,23,42,0.08)' }} />
                    <div style={{ display: 'grid', gap: 2, textAlign: 'left' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Page {index + 1}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        {fieldCountByPage[index] > 0 ? `${fieldCountByPage[index]} signature${fieldCountByPage[index] !== 1 ? 's' : ''}` : 'No signatures yet'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedField && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong style={{ fontSize: 14, color: '#111827' }}>Selected Signature</strong>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Fine-tune placement here or use arrow keys. Hold Shift for bigger nudges, press Delete to remove, or Cmd/Ctrl + D to duplicate.
                  </span>
                </div>
                <button
                  onClick={() => deleteField(selectedField.id)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontWeight: 700, cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>

              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {pageCount > 1 && (
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Page</span>
                    <select
                      value={selectedField.pageIndex}
                      onChange={e => setFieldPage(selectedField.id, Number(e.target.value))}
                      style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff' }}
                    >
                      {Array.from({ length: pageCount }, (_, index) => (
                        <option key={index} value={index}>
                          Page {index + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>X Position (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={Number((selectedField.x * 100).toFixed(1))}
                    onChange={e => setFieldX(selectedField.id, Number(e.target.value))}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Y Position (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={Number((selectedField.y * 100).toFixed(1))}
                    onChange={e => setFieldY(selectedField.id, Number(e.target.value))}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Width (%)</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={Number((selectedField.w * 100).toFixed(1))}
                    onChange={e => setFieldWidth(selectedField.id, Number(e.target.value))}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff' }}
                  />
                </label>
              </div>
            </div>
          )}

          {saveError && <div style={{ color: '#DC2626', fontSize: '13px', textAlign: 'center' }}>{saveError}</div>}

          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <strong style={{ fontSize: 14, color: '#111827' }}>Signing Workspace</strong>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {placing
                    ? 'Click on the page to place the active signature.'
                    : selectedField
                      ? 'Drag the selected signature, resize it from the amber handle, or edit its values above.'
                      : 'Pick a saved signature or create a new one, then place it anywhere on the document.'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Page {currentPage + 1} of {pageCount}
              </span>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '78vh', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E5E7EB', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: zoom > 1 ? 'flex-start' : 'center' }}>
                <div
                  ref={containerRef}
                  onClick={handleCanvasClick}
                  style={{ position: 'relative', width: `${zoom * 100}%`, flex: '0 0 auto', cursor: placing ? 'crosshair' : 'default' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pageUrls[currentPage]}
                    alt={`Page ${currentPage + 1}`}
                    style={{ width: '100%', display: 'block', borderRadius: 8, boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)' }}
                    draggable={false}
                  />

                  {pageFields.map(field => {
                    const isSelected = field.id === selectedFieldId
                    return (
                      <div
                        key={field.id}
                        style={{
                          position: 'absolute',
                          left: `${field.x * 100}%`,
                          top: `${field.y * 100}%`,
                          width: `${field.w * 100}%`,
                          height: `${field.h * 100}%`,
                          cursor: 'move',
                          userSelect: 'none',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #F59E0B' : '1px dashed rgba(245,158,11,0.3)',
                          boxShadow: isSelected ? '0 0 0 3px rgba(245, 158, 11, 0.16)' : 'none',
                          background: isSelected ? 'rgba(255, 248, 236, 0.2)' : 'transparent',
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedFieldId(field.id)
                        }}
                        onMouseDown={e => startDrag(e, field.id)}
                      >
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={field.dataUrl} alt="signature" style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} draggable={false} />
                          {isSelected && (
                            <>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  deleteField(field.id)
                                }}
                                style={{
                                  position: 'absolute',
                                  top: -12,
                                  right: -12,
                                  background: '#EF4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '999px',
                                  width: 24,
                                  height: 24,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 6px 16px rgba(239,68,68,0.28)',
                                }}
                              >
                                ×
                              </button>
                              <div
                                onMouseDown={e => startResize(e, field.id)}
                                style={{
                                  position: 'absolute',
                                  bottom: -8,
                                  right: -8,
                                  width: 16,
                                  height: 16,
                                  background: '#F59E0B',
                                  borderRadius: 4,
                                  cursor: 'se-resize',
                                  boxShadow: '0 6px 16px rgba(245,158,11,0.28)',
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, textAlign: 'center' }}>
              {placing
                ? 'Click on the document to place the active signature.'
                : 'Select a signature to edit it precisely. Drag to move, resize from the corner, use thumbnails to jump pages, and use arrow keys for pixel-like nudging.'}
            </p>
          </div>
        </div>
      )}

      {showModal && (
        <SignatureModal
          onDone={registerSignatureAsset}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Sign a PDF Online — Free
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Signing a PDF with Doclair is designed to feel more like a real editor, not a one-shot upload form. Here&apos;s the workflow:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Drop your PDF into the signing workspace.',
            'Create a signature by drawing, typing, or uploading an image.',
            'Reuse that signature across pages, place it from thumbnails, and fine-tune it with drag, resize, zoom, or numeric controls.',
            'Download the signed PDF with the original text layer and print quality preserved.',
          ].map((step, index) => (
            <div key={index} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white',
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
              }}>{index + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }}>{step}</p>
            </div>
          ))}
        </div>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Is it safe to sign confidential PDFs online?
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65, marginBottom: '20px' }}>
          Completely safe. Doclair processes everything in your browser using JavaScript. Legal contracts, medical forms, HR letters, and business documents stay 100% on your device.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Why this feels closer to a real signing editor
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65, marginBottom: '20px' }}>
          You can keep multiple signatures ready, jump between page thumbnails, zoom into tight document areas, duplicate a signature, and copy it across every page when needed. That makes the signing flow much more practical for agreements, invoices, onboarding packets, and multi-page government forms.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '6px', marginTop: '4px' }}>
          Does signing keep text selectable?
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }}>
          Yes. Doclair adds your signature directly onto the original PDF page instead of rebuilding the whole page from a screenshot, so the underlying text layer and print quality stay intact.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
