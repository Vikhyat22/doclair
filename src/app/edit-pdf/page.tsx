'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import {
  EDIT_PREVIEW_SCALE,
  type AddedTextOverlay,
  composeFontHint,
  describeFontHint,
  type EditableFontDescriptor,
  type EditablePdfPage,
  type EditableTextBlock,
  type EditOverlay,
  type MarkupOverlay,
  type SignatureOverlay,
  type WhiteoutOverlay,
  isTextBlockEdited,
  loadEditablePdf,
  runOcrForEditablePages,
  saveEditedPdf,
} from '@/lib/pdf/editableText'
import { OCR_LANGUAGES } from '@/lib/ocr/tesseract'

type ToolMode = 'edit' | 'select' | 'pan' | 'text' | 'signature' | 'highlight' | 'underline' | 'whiteout'
type PageQualityTone = 'original' | 'overlay' | 'ocr' | 'rebuild' | 'attention'
type ResizeHandle = 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface PageQualityState {
  tone: PageQualityTone
  chip: string
  title: string
  detail: string
}

interface SignatureDraft {
  dataUrl: string
  widthPx: number
  heightPx: number
}

interface DragState {
  kind: 'move' | 'resize'
  id: string
  overlayType: EditOverlay['type']
  handle?: ResizeHandle
  startX: number
  startY: number
  originX: number
  originY: number
  originWidth: number
  originHeight: number
}

interface PanState {
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
}

interface PageFrame {
  width: number
  height: number
}

interface BlockStyleDraft extends EditableFontDescriptor {
  fontSize: number
  color: string
}

const FAQS = [
  {
    q: 'Can I edit the existing text inside my PDF?',
    a: 'Yes for text-based PDFs. Click existing text to edit it in place. For scanned PDFs, run OCR first to detect editable text blocks before making changes.',
  },
  {
    q: 'Are my PDF files uploaded to a server?',
    a: 'No. Your PDF stays on your device. Rendering, text detection, editing, and export run locally in your browser, and OCR also runs locally after the needed language data loads on first use.',
  },
  {
    q: 'Can I still add signatures, highlights, and extra text?',
    a: 'Yes. The editor supports existing-text edits plus new text boxes, highlights, underlines, whiteout erase areas, and signatures in the same workflow.',
  },
  {
    q: 'Will the downloaded PDF stay searchable?',
    a: 'Yes, but with an honest tradeoff. When you edit existing text, Doclair can rebuild just that page with a clean searchable text layer so copied and searched text matches your edit. Unedited pages stay in their original PDF form. Complex PDFs may still need light touch-ups in desktop software.',
  },
]

const TOOL_SEO_NAME = 'Edit PDF Text + Sign'
const TOOL_SLUG = 'edit-pdf'
const TOOL_DESCRIPTION =
  'Edit existing PDF text for text-based files, run OCR for scanned PDFs, and add text, highlights, whiteout erase areas, and signatures. No upload, no watermark, files stay in your browser.'

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: `${TOOL_SEO_NAME} - Doclair`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: `https://doclair.in/${TOOL_SLUG}`,
      description: TOOL_DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Edit existing PDF text for text-based files',
        'Run OCR for scanned PDFs',
        'Add highlights, whiteout erase areas, new text, and signatures',
        'Browser-only, no upload, no watermark',
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(faq => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
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
    { '@type': 'ListItem', position: 3, name: TOOL_SEO_NAME, item: `https://doclair.in/${TOOL_SLUG}` },
  ],
}

const PAGE_QUALITY_STYLES: Record<
  PageQualityTone,
  { badgeBg: string; badgeColor: string; borderColor: string; panelBg: string }
> = {
  original: {
    badgeBg: '#ECFDF5',
    badgeColor: '#166534',
    borderColor: '#BBF7D0',
    panelBg: '#F0FDF4',
  },
  overlay: {
    badgeBg: '#EFF6FF',
    badgeColor: '#1D4ED8',
    borderColor: '#BFDBFE',
    panelBg: '#F8FBFF',
  },
  ocr: {
    badgeBg: '#EEF2FF',
    badgeColor: '#4338CA',
    borderColor: '#C7D2FE',
    panelBg: '#F5F7FF',
  },
  rebuild: {
    badgeBg: '#FFF7ED',
    badgeColor: '#9A3412',
    borderColor: '#FDBA74',
    panelBg: '#FFF8F1',
  },
  attention: {
    badgeBg: '#FEF3C7',
    badgeColor: '#92400E',
    borderColor: '#FCD34D',
    panelBg: '#FFFBEB',
  },
}

function summarizePageOverlays(overlays: EditOverlay[], pageIndex: number) {
  return overlays.reduce(
    (summary, overlay) => {
      if (overlay.pageIndex !== pageIndex) return summary
      if (overlay.type === 'text-overlay' && !overlay.text.trim()) return summary

      summary.hasOverlay = true
      if (overlay.type === 'whiteout') summary.hasWhiteout = true
      return summary
    },
    {
      hasOverlay: false,
      hasWhiteout: false,
    },
  )
}

function getPageQualityState(
  page: EditablePdfPage,
  overlaySummary: ReturnType<typeof summarizePageOverlays>,
): PageQualityState {
  const hasEditedText = page.textBlocks.some(block => block.edited)
  const hasRebuildOverlay = overlaySummary.hasWhiteout

  if (!page.hasTextLayer && !page.ocrApplied) {
    return {
      tone: 'attention',
      chip: 'Needs OCR',
      title: 'Scan needs OCR',
      detail: 'This page is image-based right now. Run OCR before editing existing text on it.',
    }
  }

  if ((hasEditedText || hasRebuildOverlay) && page.ocrApplied) {
    const actions = [
      hasEditedText ? 'text edits' : null,
      hasRebuildOverlay ? 'whiteout erasures' : null,
    ]
      .filter(Boolean)
      .join(' and ')

    return {
      tone: 'rebuild',
      chip: 'Rebuilt',
      title: 'Edited scan rebuilt cleanly',
      detail: `This scanned page will export from a rebuilt high-resolution page with ${actions} reflected in the visible page and OCR-backed searchable text layer.`,
    }
  }

  if (hasEditedText || hasRebuildOverlay) {
    const actions = [
      hasEditedText ? 'text edits' : null,
      hasRebuildOverlay ? 'whiteout erasures' : null,
    ]
      .filter(Boolean)
      .join(' and ')

    return {
      tone: 'rebuild',
      chip: 'Rebuilt',
      title: 'Edited page rebuilt cleanly',
      detail: `This page will export from a rebuilt high-resolution page with ${actions} reflected in the visible page and searchable text layer.`,
    }
  }

  if (page.ocrApplied && overlaySummary.hasOverlay) {
    return {
      tone: 'ocr',
      chip: 'OCR + edits',
      title: 'OCR layer added on original scan',
      detail: 'The original scan stays visible, searchable OCR text is added, and your overlay edits are applied on top.',
    }
  }

  if (page.ocrApplied) {
    return {
      tone: 'ocr',
      chip: 'OCR layer',
      title: 'OCR text layer added',
      detail: 'The original scan stays visible and searchable OCR text is added to this page.',
    }
  }

  if (overlaySummary.hasOverlay) {
    return {
      tone: 'overlay',
      chip: 'Overlay edits',
      title: 'Overlay edits on original page',
      detail: 'The original PDF page stays intact while your added text, signature, or markup is layered on top.',
    }
  }

  return {
    tone: 'original',
    chip: 'Original',
    title: 'Original page kept',
    detail: 'This page currently exports in its original PDF form.',
  }
}

const RESIZE_HANDLE_STYLE: Record<
  ResizeHandle,
  {
    cursor: string
    style: {
      left?: number | string
      right?: number | string
      top?: number | string
      bottom?: number | string
      transform?: string
    }
  }
> = {
  e: {
    cursor: 'ew-resize',
    style: { right: -7, top: '50%', transform: 'translateY(-50%)' },
  },
  w: {
    cursor: 'ew-resize',
    style: { left: -7, top: '50%', transform: 'translateY(-50%)' },
  },
  ne: {
    cursor: 'nesw-resize',
    style: { right: -7, top: -7 },
  },
  nw: {
    cursor: 'nwse-resize',
    style: { left: -7, top: -7 },
  },
  se: {
    cursor: 'nwse-resize',
    style: { right: -7, bottom: -7 },
  },
  sw: {
    cursor: 'nesw-resize',
    style: { left: -7, bottom: -7 },
  },
}

const EXISTING_TEXT_SWATCHES = ['#111827', '#0F766E', '#1D4ED8', '#7C3AED', '#C2410C', '#BE123C']
const MIN_EDITOR_ZOOM = 0.75
const MAX_EDITOR_ZOOM = 2.5
const EDITOR_ZOOM_STEP = 0.25

function clampZoom(value: number) {
  return Math.min(MAX_EDITOR_ZOOM, Math.max(MIN_EDITOR_ZOOM, Number(value.toFixed(2))))
}

function blockStyleDraftFromBlock(block: EditableTextBlock, useOriginal = false): BlockStyleDraft {
  const fontHint = useOriginal ? block.originalFontHint : block.fontHint
  const fontSize = useOriginal ? block.originalPdfFontSize : block.pdfFontSize
  const color = useOriginal ? block.originalTextColor : block.textColor
  const descriptor = describeFontHint(fontHint)

  return {
    ...descriptor,
    fontSize: Math.max(8, Math.round(fontSize)),
    color,
  }
}

function cssFontFromHint(fontHint: string) {
  const descriptor = describeFontHint(fontHint)

  return {
    fontFamily:
      descriptor.family === 'mono'
        ? '"Courier New", Courier, monospace'
        : descriptor.family === 'serif'
          ? 'Georgia, "Times New Roman", serif'
          : '"Helvetica Neue", Arial, sans-serif',
    fontWeight: descriptor.weight === 'bold' ? 700 : 400,
    fontStyle: descriptor.style === 'italic' ? 'italic' as const : 'normal' as const,
  }
}

function SignatureModal({
  onDone,
  onCancel,
}: {
  onDone: (dataUrl: string, width: number, height: number) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typedText, setTypedText] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 460, 180)
    ctx.strokeStyle = '#1A1612'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [mode])

  const getPosition = (
    event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handlePointerDown = (
    event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>,
  ) => {
    if (mode !== 'draw') return
    drawing.current = true
    lastPoint.current = getPosition(event, canvasRef.current!)
  }

  const handlePointerMove = (
    event: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>,
  ) => {
    if (!drawing.current || mode !== 'draw') return
    event.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const point = getPosition(event, canvas)

    if (lastPoint.current) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }

    lastPoint.current = point
  }

  const finishDrawing = () => {
    drawing.current = false
    lastPoint.current = null
  }

  const commit = () => {
    if (mode === 'draw') {
      const canvas = canvasRef.current!
      onDone(canvas.toDataURL('image/png'), canvas.width, canvas.height)
      return
    }

    const offscreen = document.createElement('canvas')
    offscreen.width = 420
    offscreen.height = 110
    const ctx = offscreen.getContext('2d')!
    ctx.font = 'italic 58px Georgia, serif'
    ctx.fillStyle = '#1A1612'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedText || 'Signature', 10, 55)
    onDone(offscreen.toDataURL('image/png'), offscreen.width, offscreen.height)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          background: '#fff',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20 }}>Create Signature</h3>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {(['draw', 'type'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 7,
                border: 'none',
                background: mode === tab ? '#fff' : 'transparent',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: mode === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {mode === 'draw' ? (
          <>
            <canvas
              ref={canvasRef}
              width={460}
              height={180}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={finishDrawing}
              onMouseLeave={finishDrawing}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={finishDrawing}
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: 12,
                width: '100%',
                height: 180,
                display: 'block',
                cursor: 'crosshair',
                touchAction: 'none',
              }}
            />
            <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
              Draw your signature above
            </p>
          </>
        ) : (
          <input
            value={typedText}
            onChange={event => setTypedText(event.target.value)}
            placeholder="Type your name…"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: 12,
              fontSize: 30,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              boxSizing: 'border-box',
            }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={commit}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#F59E0B',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Use Signature
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EditPDFPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pages, setPages] = useState<EditablePdfPage[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [tool, setTool] = useState<ToolMode>('edit')
  const [fontSize, setFontSize] = useState(18)
  const [fontColor, setFontColor] = useState('#111827')
  const [ocrLanguage, setOcrLanguage] = useState('eng')
  const [loadingMessage, setLoadingMessage] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingEditor, setLoadingEditor] = useState(false)
  const [runningOcr, setRunningOcr] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveNote, setSaveNote] = useState('')
  const [overlays, setOverlays] = useState<EditOverlay[]>([])
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [blockDraft, setBlockDraft] = useState('')
  const [blockStyleDraft, setBlockStyleDraft] = useState<BlockStyleDraft | null>(null)
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null)
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureDraft, setSignatureDraft] = useState<SignatureDraft | null>(null)
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [panning, setPanning] = useState<PanState | null>(null)
  const [pageFrame, setPageFrame] = useState<PageFrame>({ width: 0, height: 0 })
  const [viewerWidth, setViewerWidth] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [markupDraft, setMarkupDraft] = useState<MarkupOverlay | WhiteoutOverlay | null>(null)
  const viewerViewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const blockEditorRef = useRef<HTMLDivElement | null>(null)
  const blockInspectorRef = useRef<HTMLDivElement>(null)
  const overlayTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const markupStart = useRef<{ x: number; y: number } | null>(null)
  const panStateRef = useRef<PanState | null>(null)

  const applyDraftToBlock = useCallback(
    (block: EditableTextBlock, nextTextOverride?: string) => {
      if (block.id !== activeBlockId || !blockStyleDraft) return block

      const nextText = (nextTextOverride ?? blockDraft).replace(/\r/g, '')
      const nextPdfFontSize = Math.max(8, blockStyleDraft.fontSize)
      const nextFontHint = composeFontHint(blockStyleDraft)
      const nextColor = blockStyleDraft.color

      return {
        ...block,
        text: nextText,
        fontHint: nextFontHint,
        pdfFontSize: nextPdfFontSize,
        previewFontSize: nextPdfFontSize * EDIT_PREVIEW_SCALE,
        pdfHeight: Math.max(block.pdfHeight, nextPdfFontSize * 1.2),
        previewHeight: Math.max(block.previewHeight, nextPdfFontSize * EDIT_PREVIEW_SCALE * 1.2),
        textColor: nextColor,
        edited: isTextBlockEdited(block, {
          text: nextText,
          fontHint: nextFontHint,
          pdfFontSize: nextPdfFontSize,
          textColor: nextColor,
        }),
      }
    },
    [activeBlockId, blockDraft, blockStyleDraft],
  )

  const readLiveBlockDraft = useCallback(
    () => blockEditorRef.current?.innerText.replace(/\r/g, '') ?? blockDraft.replace(/\r/g, ''),
    [blockDraft],
  )

  const previewPages = useMemo(() => {
    if (!activeBlockId || !blockStyleDraft) return pages

    return pages.map(page => ({
      ...page,
      textBlocks: page.textBlocks.map(block => applyDraftToBlock(block)),
    }))
  }, [activeBlockId, applyDraftToBlock, blockStyleDraft, pages])

  const currentPageState = previewPages[currentPage] ?? null
  const pageCount = previewPages.length
  const currentOverlays = useMemo(
    () => overlays.filter(overlay => overlay.pageIndex === currentPage),
    [currentPage, overlays],
  )
  const pageQualities = useMemo(
    () =>
      previewPages.map(page =>
        getPageQualityState(page, summarizePageOverlays(overlays, page.pageIndex)),
      ),
    [overlays, previewPages],
  )
  const currentPageQuality = pageQualities[currentPage] ?? null
  const selectedOverlay = useMemo(
    () => currentOverlays.find(overlay => overlay.id === selectedOverlayId) ?? null,
    [currentOverlays, selectedOverlayId],
  )
  const activeBlock = useMemo(
    () => previewPages.flatMap(page => page.textBlocks).find(block => block.id === activeBlockId) ?? null,
    [activeBlockId, previewPages],
  )
  const sourceActiveBlock = useMemo(
    () => pages.flatMap(page => page.textBlocks).find(block => block.id === activeBlockId) ?? null,
    [activeBlockId, pages],
  )
  const qualitySummary = useMemo(
    () =>
      pageQualities.reduce(
        (summary, quality) => {
          summary[quality.tone] += 1
          return summary
        },
        {
          original: 0,
          overlay: 0,
          ocr: 0,
          rebuild: 0,
          attention: 0,
        } satisfies Record<PageQualityTone, number>,
      ),
    [pageQualities],
  )
  const fittedPageWidth = useMemo(() => {
    if (!currentPageState) return 0
    if (!viewerWidth) return currentPageState.previewWidth

    return Math.min(
      Math.max(viewerWidth - 28, 280),
      currentPageState.previewWidth,
    )
  }, [currentPageState, viewerWidth])
  const editorCanvasWidth = useMemo(
    () => (fittedPageWidth > 0 ? fittedPageWidth * zoomLevel : 0),
    [fittedPageWidth, zoomLevel],
  )
  const viewerSurfaceWidth = useMemo(() => {
    if (!editorCanvasWidth) return 0
    const minimumWidth = viewerWidth > 0 ? Math.max(viewerWidth - 32, 0) : editorCanvasWidth
    return Math.max(editorCanvasWidth, minimumWidth)
  }, [editorCanvasWidth, viewerWidth])

  const scaledByPreview = useCallback(
    (value: number) => {
      if (!currentPageState || !pageFrame.width) return value
      return value * (pageFrame.width / currentPageState.previewWidth)
    },
    [currentPageState, pageFrame.width],
  )

  const blockInspectorPosition = useMemo(() => {
    if (!activeBlock || !currentPageState || !pageFrame.width) return null

    const blockLeft = scaledByPreview(activeBlock.previewX)
    const blockTop = scaledByPreview(activeBlock.previewY)
    const blockWidth = Math.max(scaledByPreview(activeBlock.previewWidth), 20)
    const inspectorWidth = 248
    const gutter = 18
    const placeRight = blockLeft + blockWidth + gutter + inspectorWidth <= pageFrame.width - 12

    return {
      left: placeRight
        ? blockLeft + blockWidth + gutter
        : Math.max(12, blockLeft - inspectorWidth - gutter),
      top: Math.max(12, Math.min(blockTop - 8, pageFrame.height - 230)),
      width: inspectorWidth,
    }
  }, [activeBlock, currentPageState, pageFrame.height, pageFrame.width, scaledByPreview])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      setPageFrame({
        width: rect.width,
        height: rect.height,
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [currentPageState?.previewDataUrl])

  useEffect(() => {
    const node = viewerViewportRef.current
    if (!node) return

    const updateSize = () => {
      setViewerWidth(node.clientWidth)
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [currentPageState?.previewDataUrl])

  useEffect(() => {
    const editor = blockEditorRef.current
    if (!editor) return
    if (editor.innerText !== blockDraft) editor.innerText = blockDraft
  }, [activeBlockId, blockDraft])

  useEffect(() => {
    const editor = blockEditorRef.current
    if (!editor || !activeBlockId) return

    editor.focus()
    const selection = window.getSelection()
    if (!selection) return
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }, [activeBlockId])

  useEffect(() => {
    const textarea = overlayTextareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.max(textarea.scrollHeight, 42)}px`
  }, [editingOverlayId, currentOverlays])

  const loadFile = useCallback(async (file: File) => {
    setPdfFile(file)
    setPages([])
    setCurrentPage(0)
    setOverlays([])
    setActiveBlockId(null)
    setBlockStyleDraft(null)
    setEditingOverlayId(null)
    setSelectedOverlayId(null)
    setSignatureDraft(null)
    setDragging(null)
    setPanning(null)
    setMarkupDraft(null)
    setZoomLevel(1)
    setSaveError('')
    setSaveNote('')
    setTool('edit')
    setLoadingEditor(true)

    try {
      const loaded = await loadEditablePdf(file, progress => {
        setLoadingMessage(progress.message)
        setLoadingProgress(progress.total > 0 ? progress.current / progress.total : 0)
      })

      setPages(loaded.pages)
      setCurrentPage(0)
      setLoadingMessage(
        loaded.scannedPageCount > 0
          ? `Loaded ${loaded.pageCount} page${loaded.pageCount === 1 ? '' : 's'}. ${loaded.scannedPageCount} page${loaded.scannedPageCount === 1 ? ' looks' : 's look'} scanned and may need OCR.`
          : `Loaded ${loaded.pageCount} page${loaded.pageCount === 1 ? '' : 's'} with editable text detected.`,
      )
      setLoadingProgress(1)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not load PDF')
    } finally {
      setLoadingEditor(false)
    }
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file?.type === 'application/pdf') {
        void loadFile(file)
      }
    },
    [loadFile],
  )

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        void loadFile(file)
      }
    },
    [loadFile],
  )

  const updatePages = useCallback((updater: (page: EditablePdfPage) => EditablePdfPage) => {
    setPages(previous => previous.map(updater))
  }, [])

  const openBlockEditor = useCallback(
    (blockId: string) => {
      if (tool !== 'edit') return
      const block = pages.flatMap(page => page.textBlocks).find(entry => entry.id === blockId)
      if (!block) return
      setActiveBlockId(blockId)
      setBlockDraft(block.text)
      setBlockStyleDraft(blockStyleDraftFromBlock(block))
      setEditingOverlayId(null)
      setSelectedOverlayId(null)
    },
    [pages, tool],
  )

  const commitBlockEdit = useCallback(() => {
    if (!activeBlockId || !blockStyleDraft) return
    const liveText = readLiveBlockDraft()
    updatePages(page => ({
      ...page,
      textBlocks: page.textBlocks.map(block => applyDraftToBlock(block, liveText)),
    }))

    setActiveBlockId(null)
    setBlockDraft('')
    setBlockStyleDraft(null)
  }, [activeBlockId, applyDraftToBlock, blockStyleDraft, readLiveBlockDraft, updatePages])

  const cancelBlockEdit = useCallback(() => {
    setActiveBlockId(null)
    setBlockDraft('')
    setBlockStyleDraft(null)
  }, [])

  const keepBlockEditorOpen = useCallback((nextTarget: EventTarget | null) => {
    const node = nextTarget as Node | null
    return Boolean(
      node &&
        (blockInspectorRef.current?.contains(node) ||
          blockEditorRef.current?.contains(node)),
    )
  }, [])

  const updateBlockStyle = useCallback((updater: (current: BlockStyleDraft) => BlockStyleDraft) => {
    setBlockStyleDraft(current => (current ? updater(current) : current))
  }, [])

  const updateZoom = useCallback((value: number | ((current: number) => number)) => {
    setZoomLevel(current => {
      const nextValue = typeof value === 'function' ? value(current) : value
      return clampZoom(nextValue)
    })
  }, [])

  const goToPage = useCallback(
    (nextPage: number) => {
      if (activeBlockId) commitBlockEdit()
      setSelectedOverlayId(null)
      setCurrentPage(nextPage)
      requestAnimationFrame(() => {
        viewerViewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
      })
    },
    [activeBlockId, commitBlockEdit],
  )

  const updateOverlay = useCallback((id: string, updater: (overlay: EditOverlay) => EditOverlay) => {
    setOverlays(previous => previous.map(overlay => (overlay.id === id ? updater(overlay) : overlay)))
  }, [])

  const deleteOverlay = useCallback((id: string) => {
    if (selectedOverlayId === id) setSelectedOverlayId(null)
    if (editingOverlayId === id) setEditingOverlayId(null)
    setOverlays(previous => previous.filter(overlay => overlay.id !== id))
  }, [editingOverlayId, selectedOverlayId])

  const duplicateOverlay = useCallback(
    (id: string) => {
      const source = overlays.find(overlay => overlay.id === id)
      if (!source) return

      const shiftX = 0.015
      const shiftY = 0.02
      const duplicate: EditOverlay =
        source.type === 'text-overlay'
          ? {
              ...source,
              id: crypto.randomUUID(),
              x: Math.min(source.x + shiftX, 0.92),
              y: Math.min(source.y + shiftY, 0.92),
              editing: false,
            }
          : {
              ...source,
              id: crypto.randomUUID(),
              x: Math.min(source.x + shiftX, Math.max(0, 1 - source.width)),
              y: Math.min(source.y + shiftY, Math.max(0, 1 - source.height)),
            }

      setOverlays(previous => [...previous, duplicate])
      setSelectedOverlayId(duplicate.id)
      if (duplicate.type === 'text-overlay') setEditingOverlayId(null)
    },
    [overlays],
  )

  const getRelativePoint = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    }
  }, [])

  const beginPanning = useCallback(
    (clientX: number, clientY: number) => {
      if (tool !== 'pan') return false
      const viewport = viewerViewportRef.current
      if (!viewport) return false

      setActiveBlockId(null)
      setEditingOverlayId(null)
      setSelectedOverlayId(null)
      const nextPan = {
        startX: clientX,
        startY: clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      }
      panStateRef.current = nextPan
      setPanning(nextPan)
      return true
    },
    [tool],
  )

  const updatePanPosition = useCallback((clientX: number, clientY: number) => {
    const activePan = panStateRef.current
    if (!activePan) return
    const viewport = viewerViewportRef.current
    if (!viewport) return

    viewport.scrollLeft = activePan.scrollLeft - (clientX - activePan.startX)
    viewport.scrollTop = activePan.scrollTop - (clientY - activePan.startY)
  }, [])

  const handleViewerMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!beginPanning(event.clientX, event.clientY)) return
      event.preventDefault()
    },
    [beginPanning],
  )

  const handleViewerMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      updatePanPosition(event.clientX, event.clientY)
    },
    [updatePanPosition],
  )

  const handleViewerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!beginPanning(event.clientX, event.clientY)) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [beginPanning],
  )

  const handleViewerPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      updatePanPosition(event.clientX, event.clientY)
    },
    [updatePanPosition],
  )

  const stopPanning = useCallback(() => {
    panStateRef.current = null
    setPanning(null)
  }, [])

  const handleViewerPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      stopPanning()
    },
    [stopPanning],
  )

  const getOverlayMinimumSize = useCallback((overlay: EditOverlay) => {
    if (overlay.type === 'text-overlay') return { width: 0.08, height: 0.04 }
    if (overlay.type === 'underline') return { width: 0.05, height: 0.01 }
    if (overlay.type === 'signature') return { width: 0.09, height: 0.05 }
    return { width: 0.04, height: 0.03 }
  }, [])

  const handleCanvasMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!currentPageState) return
      if (tool !== 'highlight' && tool !== 'underline' && tool !== 'whiteout') return

      const point = getRelativePoint(event.clientX, event.clientY)
      if (!point) return

      markupStart.current = point
      setSelectedOverlayId(null)
      setActiveBlockId(null)
      setEditingOverlayId(null)
      setMarkupDraft(
        tool === 'whiteout'
          ? {
              id: '__preview__',
              type: 'whiteout',
              pageIndex: currentPage,
              x: point.x,
              y: point.y,
              width: 0,
              height: 0,
            }
          : {
              id: '__preview__',
              type: tool,
              pageIndex: currentPage,
              x: point.x,
              y: point.y,
              width: 0,
              height: 0,
              color: fontColor,
            },
      )
    },
    [currentPage, currentPageState, fontColor, getRelativePoint, tool],
  )

  const handleMarkupDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!markupStart.current) return

      const point = getRelativePoint(clientX, clientY)
      if (!point) return

      const start = markupStart.current
      setMarkupDraft(previous =>
        previous
          ? {
              ...previous,
              x: Math.min(start.x, point.x),
              y: Math.min(start.y, point.y),
              width: Math.abs(point.x - start.x),
              height: Math.abs(point.y - start.y),
            }
          : previous,
      )
    },
    [getRelativePoint],
  )

  const finalizeMarkupDraft = useCallback(() => {
    setMarkupDraft(previous => {
      if (!previous) return previous
      if (previous.width > 0.004 || previous.height > 0.004) {
        const nextOverlay = {
          ...previous,
          id: crypto.randomUUID(),
        }
        setOverlays(current => [...current, nextOverlay])
        setSelectedOverlayId(nextOverlay.id)
      }
      return null
    })
    markupStart.current = null
  }, [])

  useEffect(() => {
    if (!markupDraft || !markupStart.current) return

    const move = (event: MouseEvent) => {
      handleMarkupDragMove(event.clientX, event.clientY)
    }

    const stop = () => {
      finalizeMarkupDraft()
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
  }, [finalizeMarkupDraft, handleMarkupDragMove, markupDraft])

  const handleCanvasMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!markupStart.current) return
      handleMarkupDragMove(event.clientX, event.clientY)
    },
    [handleMarkupDragMove],
  )

  const handleCanvasMouseUp = useCallback(() => {
    if (!markupStart.current) return
    finalizeMarkupDraft()
  }, [finalizeMarkupDraft])

  const handleCanvasClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!currentPageState) return
      if (tool === 'pan') return
      if (tool === 'highlight' || tool === 'underline' || tool === 'whiteout') return

      const point = getRelativePoint(event.clientX, event.clientY)
      if (!point) return

      if (tool === 'select') {
        setSelectedOverlayId(null)
        return
      }

      if (tool === 'edit') {
        setSelectedOverlayId(null)
        return
      }

      if (tool === 'text') {
        const overlay: AddedTextOverlay = {
          id: crypto.randomUUID(),
          type: 'text-overlay',
          pageIndex: currentPage,
          x: point.x,
          y: point.y,
          width: 0.28,
          text: '',
          fontSize: fontSize / EDIT_PREVIEW_SCALE,
          color: fontColor,
          editing: true,
        }

        setOverlays(previous => [...previous, overlay])
        setEditingOverlayId(overlay.id)
        setSelectedOverlayId(overlay.id)
        setActiveBlockId(null)
        return
      }

      if (tool === 'signature' && signatureDraft) {
        const baseWidth = Math.min(Math.max(signatureDraft.widthPx / currentPageState.previewWidth, 0.12), 0.32)
        const baseHeight = Math.min(
          (signatureDraft.heightPx / signatureDraft.widthPx) * baseWidth * (currentPageState.previewWidth / currentPageState.previewHeight),
          0.18,
        )

        const overlay: SignatureOverlay = {
          id: crypto.randomUUID(),
          type: 'signature',
          pageIndex: currentPage,
          x: point.x,
          y: point.y,
          width: baseWidth,
          height: baseHeight,
          dataUrl: signatureDraft.dataUrl,
        }

        setOverlays(previous => [...previous, overlay])
        setSignatureDraft(null)
        setSelectedOverlayId(overlay.id)
        setTool('select')
      }
    },
    [currentPage, currentPageState, fontColor, fontSize, getRelativePoint, signatureDraft, tool],
  )

  const startDrag = useCallback(
    (event: ReactMouseEvent<HTMLElement>, overlay: EditOverlay) => {
      if (tool !== 'select') return
      event.stopPropagation()
      const containerRect = containerRef.current?.getBoundingClientRect()
      const elementRect = event.currentTarget.getBoundingClientRect()
      const originHeight =
        overlay.type === 'text-overlay' && containerRect && containerRect.height > 0
          ? elementRect.height / containerRect.height
          : overlay.type === 'text-overlay'
            ? 0.06
            : overlay.height

      setSelectedOverlayId(overlay.id)
      setActiveBlockId(null)
      setDragging({
        kind: 'move',
        id: overlay.id,
        overlayType: overlay.type,
        startX: event.clientX,
        startY: event.clientY,
        originX: overlay.x,
        originY: overlay.y,
        originWidth: overlay.width,
        originHeight,
      })
    },
    [tool],
  )

  const startResize = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, overlay: EditOverlay, handle: ResizeHandle) => {
      if (tool !== 'select') return
      event.preventDefault()
      event.stopPropagation()
      setSelectedOverlayId(overlay.id)
      setActiveBlockId(null)
      setDragging({
        kind: 'resize',
        id: overlay.id,
        overlayType: overlay.type,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        originX: overlay.x,
        originY: overlay.y,
        originWidth: overlay.width,
        originHeight: overlay.type === 'text-overlay' ? 0.06 : overlay.height,
      })
    },
    [tool],
  )

  useEffect(() => {
    if (!dragging) return

    const move = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const dx = (event.clientX - dragging.startX) / rect.width
      const dy = (event.clientY - dragging.startY) / rect.height

      setOverlays(previous => {
        if (!previous.some(overlay => overlay.id === dragging.id)) return previous

        return previous.map(overlay => {
          if (overlay.id !== dragging.id) return overlay
          const minimum = getOverlayMinimumSize(overlay)

          if (dragging.kind === 'move') {
            const maxX = overlay.type === 'text-overlay' ? Math.max(0, 0.99 - overlay.width) : Math.max(0, 1 - overlay.width)
            const maxY =
              overlay.type === 'text-overlay'
                ? Math.max(0, 0.98 - dragging.originHeight)
                : Math.max(0, 1 - overlay.height)

            return {
              ...overlay,
              x: Math.min(Math.max(dragging.originX + dx, 0), maxX),
              y: Math.min(Math.max(dragging.originY + dy, 0), maxY),
            }
          }

          if (overlay.type === 'text-overlay') {
            let nextX = dragging.originX
            let nextWidth = dragging.originWidth

            if (dragging.handle === 'e' || dragging.handle === 'ne' || dragging.handle === 'se') {
              nextWidth = dragging.originWidth + dx
            }

            if (dragging.handle === 'w' || dragging.handle === 'nw' || dragging.handle === 'sw') {
              nextWidth = dragging.originWidth - dx
              nextX = dragging.originX + dx
            }

            nextWidth = Math.max(nextWidth, minimum.width)

            if (nextX < 0) {
              nextWidth += nextX
              nextX = 0
            }

            if (nextX + nextWidth > 0.99) {
              nextWidth = 0.99 - nextX
            }

            return {
              ...overlay,
              x: nextX,
              width: Math.max(nextWidth, minimum.width),
            }
          }

          let nextX = dragging.originX
          let nextY = dragging.originY
          let nextWidth = dragging.originWidth
          let nextHeight = dragging.originHeight

          if (dragging.handle?.includes('e')) {
            nextWidth = dragging.originWidth + dx
          }

          if (dragging.handle?.includes('s')) {
            nextHeight = dragging.originHeight + dy
          }

          if (dragging.handle?.includes('w')) {
            nextWidth = dragging.originWidth - dx
            nextX = dragging.originX + dx
          }

          if (dragging.handle?.includes('n')) {
            nextHeight = dragging.originHeight - dy
            nextY = dragging.originY + dy
          }

          nextWidth = Math.max(nextWidth, minimum.width)
          nextHeight = Math.max(nextHeight, minimum.height)

          if (overlay.type === 'signature') {
            const aspectRatio = dragging.originWidth / Math.max(dragging.originHeight, 0.0001)
            const widthChanged = Math.abs(nextWidth - dragging.originWidth)
            const heightChanged = Math.abs(nextHeight - dragging.originHeight)

            if (widthChanged >= heightChanged * aspectRatio) {
              nextHeight = Math.max(nextWidth / aspectRatio, minimum.height)
              if (dragging.handle?.includes('n')) {
                nextY = dragging.originY + (dragging.originHeight - nextHeight)
              }
            } else {
              nextWidth = Math.max(nextHeight * aspectRatio, minimum.width)
              if (dragging.handle?.includes('w')) {
                nextX = dragging.originX + (dragging.originWidth - nextWidth)
              }
            }
          }

          if (nextX < 0) {
            nextWidth += nextX
            nextX = 0
          }

          if (nextY < 0) {
            nextHeight += nextY
            nextY = 0
          }

          if (nextX + nextWidth > 1) {
            nextWidth = 1 - nextX
          }

          if (nextY + nextHeight > 1) {
            nextHeight = 1 - nextY
          }

          return {
            ...overlay,
            x: Math.max(0, nextX),
            y: Math.max(0, nextY),
            width: Math.max(nextWidth, minimum.width),
            height: Math.max(nextHeight, minimum.height),
          }
        })
      })
    }

    const stop = () => setDragging(null)

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
  }, [dragging, getOverlayMinimumSize])

  useEffect(() => {
    if (!panning) return

    const move = (event: MouseEvent) => {
      const activePan = panStateRef.current
      if (!activePan) return
      const viewport = viewerViewportRef.current
      if (!viewport) return

      viewport.scrollLeft = activePan.scrollLeft - (event.clientX - activePan.startX)
      viewport.scrollTop = activePan.scrollTop - (event.clientY - activePan.startY)
    }

    const stop = () => stopPanning()

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
  }, [panning, stopPanning])

  const handleRunOcr = useCallback(async () => {
    if (!pdfFile || !pages.length) return
    setRunningOcr(true)
    setSaveError('')
    setSaveNote('')

    try {
      const result = await runOcrForEditablePages(pdfFile, pages, ocrLanguage, progress => {
        setLoadingMessage(progress.message)
        setLoadingProgress(progress.total > 0 ? progress.current / progress.total : 0)
      })

      setPages(result.pages)
      if (result.detectedBlockCount > 0) {
        setLoadingMessage(
          result.unresolvedPageCount > 0
            ? `OCR found ${result.detectedBlockCount} editable text block${result.detectedBlockCount === 1 ? '' : 's'} across ${result.recognizedPageCount} page${result.recognizedPageCount === 1 ? '' : 's'}. ${result.unresolvedPageCount} page${result.unresolvedPageCount === 1 ? ' still needs' : 's still need'} a clearer scan or a different OCR language.`
            : `OCR found ${result.detectedBlockCount} editable text block${result.detectedBlockCount === 1 ? '' : 's'} across ${result.recognizedPageCount} page${result.recognizedPageCount === 1 ? '' : 's'}. Review and edit before downloading.`
        )
      } else {
        setLoadingMessage('OCR ran, but no editable text regions were detected. Try a clearer scan or a different OCR language.')
      }
      setLoadingProgress(1)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'OCR failed')
    } finally {
      setRunningOcr(false)
    }
  }, [ocrLanguage, pages, pdfFile])

  const finalizePagesForSave = useCallback(() => {
    if (!activeBlockId || !blockStyleDraft) return pages
    const liveText = readLiveBlockDraft()

    return pages.map(page => ({
      ...page,
      textBlocks: page.textBlocks.map(block => applyDraftToBlock(block, liveText)),
    }))
  }, [activeBlockId, applyDraftToBlock, blockStyleDraft, pages, readLiveBlockDraft])

  const handleSave = useCallback(async () => {
    if (!pdfFile || !pages.length) return
    setSaving(true)
    setSaveError('')
    setSaveNote('')

    const pagesToSave = finalizePagesForSave()
    if (pagesToSave !== pages) setPages(pagesToSave)
    setActiveBlockId(null)
    setBlockDraft('')
    setBlockStyleDraft(null)
    setEditingOverlayId(null)
    setSelectedOverlayId(null)

    try {
      const result = await saveEditedPdf(
        pdfFile,
        pagesToSave,
        overlays.filter(overlay => {
          if (overlay.type === 'text-overlay') return overlay.text.trim().length > 0
          return true
        }),
      )

      const url = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = pdfFile.name.replace(/\.pdf$/i, '-edited.pdf')
      anchor.click()
      URL.revokeObjectURL(url)

      const notes = [
        result.editedTextCount > 0 ? `${result.editedTextCount} text edit${result.editedTextCount === 1 ? '' : 's'} saved` : null,
        result.substitutedFontCount > 0 ? `${result.substitutedFontCount} edit${result.substitutedFontCount === 1 ? ' uses' : 's use'} a matched standard PDF font` : null,
        result.rebuiltPageCount > 0 ? `${result.rebuiltPageCount} page${result.rebuiltPageCount === 1 ? '' : 's'} rebuilt with a clean searchable text layer` : null,
        result.whiteoutCount > 0 ? `${result.whiteoutCount} erased area${result.whiteoutCount === 1 ? '' : 's'} applied` : null,
        result.scannedPageCount > 0 ? `OCR-enhanced text layer included for ${result.scannedPageCount} scanned page${result.scannedPageCount === 1 ? '' : 's'}` : null,
      ].filter(Boolean)

      setSaveNote(notes.join(' - '))
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not export PDF')
    } finally {
      setSaving(false)
    }
  }, [finalizePagesForSave, overlays, pages, pdfFile])

  const scannedPages = previewPages.filter(page => !page.hasTextLayer).length
  const ocrApplied = previewPages.some(page => page.ocrApplied)
  const totalEditableBlockCount = previewPages.reduce(
    (sum, page) => sum + page.textBlocks.length,
    0,
  )
  const editedBlockCount = previewPages.reduce(
    (sum, page) => sum + page.textBlocks.filter(block => block.edited).length,
    0,
  )
  const getResizeHandles = useCallback(
    (overlay: EditOverlay): ResizeHandle[] =>
      overlay.type === 'text-overlay' ? ['w', 'e'] : ['nw', 'ne', 'sw', 'se'],
    [],
  )
  const selectedOverlayLabel = selectedOverlay
    ? selectedOverlay.type === 'text-overlay'
      ? 'text box'
      : selectedOverlay.type === 'signature'
        ? 'signature'
        : selectedOverlay.type === 'highlight'
          ? 'highlight'
          : selectedOverlay.type === 'underline'
            ? 'underline'
            : 'whiteout area'
    : ''
  const activeToolLabel =
    tool === 'edit'
      ? 'Edit mode active'
      : tool === 'select'
        ? 'Select mode active'
        : tool === 'pan'
          ? 'Pan mode active'
          : tool === 'text'
            ? 'Add text mode active'
            : tool === 'signature'
              ? 'Signature mode active'
              : tool === 'highlight'
                ? 'Highlight mode active'
                : tool === 'underline'
                  ? 'Underline mode active'
                  : 'Whiteout mode active'
  const setSelectedOverlayMetric = useCallback(
    (field: 'x' | 'y' | 'width' | 'height', value: number) => {
      if (!selectedOverlay) return
      const nextValue = Number.isFinite(value) ? value / 100 : 0

      updateOverlay(selectedOverlay.id, current => {
        const minimum = getOverlayMinimumSize(current)

        if (field === 'x') {
          const maxX = current.type === 'text-overlay' ? 0.99 - current.width : 1 - current.width
          return { ...current, x: Math.min(Math.max(nextValue, 0), Math.max(0, maxX)) }
        }

        if (field === 'y') {
          const maxY = current.type === 'text-overlay' ? 0.98 : 1 - current.height
          return { ...current, y: Math.min(Math.max(nextValue, 0), Math.max(0, maxY)) }
        }

        if (field === 'width') {
          if (current.type === 'signature') {
            const ratio = current.width / Math.max(current.height, 0.0001)
            const width = Math.min(Math.max(nextValue, minimum.width), Math.max(minimum.width, 1 - current.x))
            const height = Math.min(Math.max(width / ratio, minimum.height), Math.max(minimum.height, 1 - current.y))
            return {
              ...current,
              width: Math.min(Math.max(height * ratio, minimum.width), Math.max(minimum.width, 1 - current.x)),
              height,
            }
          }

          return {
            ...current,
            width: Math.min(
              Math.max(nextValue, minimum.width),
              Math.max(minimum.width, (current.type === 'text-overlay' ? 0.99 : 1) - current.x),
            ),
          }
        }

        if (current.type === 'text-overlay') return current

        if (current.type === 'signature') {
          const ratio = current.width / Math.max(current.height, 0.0001)
          const height = Math.min(Math.max(nextValue, minimum.height), Math.max(minimum.height, 1 - current.y))
          const width = Math.min(Math.max(height * ratio, minimum.width), Math.max(minimum.width, 1 - current.x))
          return {
            ...current,
            width,
            height: Math.min(Math.max(width / ratio, minimum.height), Math.max(minimum.height, 1 - current.y)),
          }
        }

        return {
          ...current,
          height: Math.min(Math.max(nextValue, minimum.height), Math.max(minimum.height, 1 - current.y)),
        }
      })
    },
    [getOverlayMinimumSize, selectedOverlay, updateOverlay],
  )

  const toolbarButton = (mode: ToolMode, label: string, icon: string) => (
    <button
      key={mode}
      onClick={() => {
        if (mode === 'signature') {
          if (signatureDraft) {
            setTool('signature')
            return
          }
          setShowSignatureModal(true)
          return
        }
        setTool(mode)
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1.5px solid',
        borderColor: tool === mode ? '#F59E0B' : '#e5e7eb',
        background: tool === mode ? '#FFF8EC' : '#fff',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 600,
        color: tool === mode ? '#92400e' : '#374151',
        minWidth: 68,
      }}
      type="button"
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label}
    </button>
  )

  const renderResizeHandles = (overlay: EditOverlay) => {
    if (tool !== 'select' || selectedOverlayId !== overlay.id) return null

    return getResizeHandles(overlay).map(handle => {
      const config = RESIZE_HANDLE_STYLE[handle]
      return (
        <button
          key={`${overlay.id}-${handle}`}
          type="button"
          onMouseDown={event => startResize(event, overlay, handle)}
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '2px solid #fff',
            background: '#F59E0B',
            boxShadow: '0 2px 8px rgba(17,24,39,0.18)',
            cursor: config.cursor,
            zIndex: 30,
            ...config.style,
          }}
        />
      )
    })
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[]}
      relatedTools={[
        { name: 'Sign PDF', slug: 'sign-pdf', icon: '✍️', colorBg: '#DBEAFE', desc: 'Dedicated signing workflow' },
        { name: 'Annotate PDF', slug: 'annotate-pdf', icon: '🖍️', colorBg: '#DBEAFE', desc: 'More markup tools' },
        { name: 'OCR PDF', slug: 'ocr-pdf', icon: '🔎', colorBg: '#FFF0DC', desc: 'Make scanned PDFs searchable' },
        { name: 'Redact PDF', slug: 'redact-pdf', icon: '⬛', colorBg: '#DBEAFE', desc: 'Permanently remove content' },
        { name: 'PDF to Word', slug: 'pdf-to-word', icon: '📝', colorBg: '#FFF0DC', desc: 'For heavier reflow edits' },
      ]}
      blogPost={{ slug: 'best-free-pdf-editor-no-watermark', title: 'Best Free PDF Editor - No Watermark, No Sign-Up' }}
    />
  )

  return (
    <ToolPageLayout toolName={TOOL_SEO_NAME} sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 36 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{ padding: '5px 12px', borderRadius: 999, background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.04em' }}>
            ✓ Existing Text Editing
          </span>
          <span style={{ padding: '5px 12px', borderRadius: 999, background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.04em' }}>
            🔒 Files Stay On Device
          </span>
          <span style={{ padding: '5px 12px', borderRadius: 999, background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.04em' }}>
            ✦ OCR For Scanned PDFs
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px', margin: 0 }}>
          <span style={{ color: 'var(--ink)' }}>Edit PDF Text </span>
          <span style={{ color: 'var(--amber)' }}>Without Uploading It</span>
        </h1>
        <p style={{ fontSize: 16, fontWeight: 300, color: 'var(--ink)', opacity: 0.7, maxWidth: 720, marginTop: 12, lineHeight: 1.7 }}>
          Edit existing text in text-based PDFs, run OCR on scanned files, then add highlights, whiteout erase areas, extra text, and signatures in one local-first editor.
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 18,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {toolbarButton('edit', 'Edit Text', '✎')}
          {toolbarButton('select', 'Select', '↖')}
          {toolbarButton('pan', 'Pan', '✋')}
          {toolbarButton('text', 'Add Text', 'T')}
          {toolbarButton('highlight', 'Highlight', '🖍')}
          {toolbarButton('underline', 'Underline', '〰')}
          {toolbarButton('whiteout', 'Whiteout', '⬜')}
          {toolbarButton('signature', 'Sign', '✍')}

          <div style={{ width: 1, height: 40, background: '#e5e7eb', margin: '0 4px' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>New text size</label>
          <select
            value={fontSize}
            onChange={event => setFontSize(Number(event.target.value))}
            style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
          >
            {[12, 14, 16, 18, 20, 24, 28, 32].map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Markup / text color</label>
          <input
            type="color"
            value={fontColor}
            onChange={event => setFontColor(event.target.value)}
            style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', padding: 2 }}
          />

          <div style={{ width: 1, height: 40, background: '#e5e7eb', margin: '0 4px' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Zoom</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              background: '#fff',
            }}
          >
            <button
              type="button"
              onClick={() => updateZoom(current => current - EDITOR_ZOOM_STEP)}
              disabled={zoomLevel <= MIN_EDITOR_ZOOM}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              -
            </button>
            <span style={{ minWidth: 54, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#111827' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => updateZoom(current => current + EDITOR_ZOOM_STEP)}
              disabled={zoomLevel >= MAX_EDITOR_ZOOM}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              updateZoom(1)
              viewerViewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 9,
              border: '1px solid #E5E7EB',
              background: '#fff',
              color: '#374151',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Fit
          </button>

          <div style={{ flex: 1 }} />

          {pageCount > 0 && (
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                background: saving ? '#fbbf24' : '#F59E0B',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Download PDF'}
            </button>
          )}
        </div>

        {pageCount > 0 && (
          <div
            style={{
              display: 'grid',
              gap: 10,
              padding: '14px 16px',
              borderRadius: 12,
              background: scannedPages > 0 ? '#FFF8EC' : '#F9FAFB',
              border: `1px solid ${scannedPages > 0 ? '#FCD34D' : '#E5E7EB'}`,
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                {totalEditableBlockCount} editable text block{totalEditableBlockCount === 1 ? '' : 's'} detected
              </span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {editedBlockCount} text edit{editedBlockCount === 1 ? '' : 's'} pending
              </span>
              {ocrApplied && (
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  OCR added on scanned pages
                </span>
              )}
            </div>

            {scannedPages > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#92400e' }}>
                  {scannedPages} page{scannedPages === 1 ? ' looks' : 's look'} image-based. Run OCR to unlock text editing there.
                </span>
                <select
                  value={ocrLanguage}
                  onChange={event => setOcrLanguage(event.target.value)}
                  style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff' }}
                >
                  {OCR_LANGUAGES.map(language => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => void handleRunOcr()}
                  disabled={runningOcr}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 9,
                    border: 'none',
                    background: runningOcr ? '#fbbf24' : '#F59E0B',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: runningOcr ? 'not-allowed' : 'pointer',
                  }}
                >
                  {runningOcr ? 'Running OCR…' : 'Run OCR'}
                </button>
              </div>
            )}

            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              Honest UX: when you edit existing text or erase an area with whiteout, Doclair can rebuild just those affected pages from a high-resolution render plus a clean searchable text layer so copied text matches the new content. Unedited pages stay in their original PDF form. The first OCR run may download language data before everything continues locally in your browser, and complex layouts, rare fonts, or tightly packed text may still need light touch-ups after export.
            </p>
          </div>
        )}

        {pageCount > 0 && (
          <div
            style={{
              display: 'grid',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 12,
              background: '#FCFCFD',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Page export map</span>
              {qualitySummary.original > 0 && (
                <span style={{ fontSize: 12, color: '#166534' }}>{qualitySummary.original} original</span>
              )}
              {qualitySummary.overlay > 0 && (
                <span style={{ fontSize: 12, color: '#1D4ED8' }}>{qualitySummary.overlay} overlay</span>
              )}
              {qualitySummary.ocr > 0 && (
                <span style={{ fontSize: 12, color: '#4338CA' }}>{qualitySummary.ocr} OCR</span>
              )}
              {qualitySummary.rebuild > 0 && (
                <span style={{ fontSize: 12, color: '#9A3412' }}>{qualitySummary.rebuild} rebuilt</span>
              )}
              {qualitySummary.attention > 0 && (
                <span style={{ fontSize: 12, color: '#92400E' }}>{qualitySummary.attention} needs OCR</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {pageQualities.map((quality, pageIndex) => {
                const style = PAGE_QUALITY_STYLES[quality.tone]
                const isActive = pageIndex === currentPage

                return (
                  <button
                    key={`page-${pageIndex}`}
                    onClick={() => goToPage(pageIndex)}
                    type="button"
                    style={{
                      minWidth: 150,
                      padding: '10px',
                      borderRadius: 12,
                      border: `1.5px solid ${isActive ? style.borderColor : '#E5E7EB'}`,
                      background: isActive ? '#fff' : '#FCFCFD',
                      boxShadow: isActive ? '0 8px 20px rgba(17,24,39,0.06)' : 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid #E5E7EB',
                        background: '#fff',
                        aspectRatio: `${previewPages[pageIndex]?.previewWidth ?? 1} / ${previewPages[pageIndex]?.previewHeight ?? 1.3}`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewPages[pageIndex]?.previewDataUrl}
                        alt={`Thumbnail for page ${pageIndex + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        draggable={false}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Page {pageIndex + 1}</span>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: style.badgeBg,
                          color: style.badgeColor,
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {quality.chip}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{quality.title}</span>
                  </button>
                )
              })}
            </div>

            {currentPageQuality && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: PAGE_QUALITY_STYLES[currentPageQuality.tone].panelBg,
                  border: `1px solid ${PAGE_QUALITY_STYLES[currentPageQuality.tone].borderColor}`,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13, color: '#111827' }}>Current page status</strong>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: PAGE_QUALITY_STYLES[currentPageQuality.tone].badgeBg,
                      color: PAGE_QUALITY_STYLES[currentPageQuality.tone].badgeColor,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {currentPageQuality.chip}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>
                  <strong style={{ color: '#111827' }}>{currentPageQuality.title}.</strong> {currentPageQuality.detail}
                </p>
              </div>
            )}
          </div>
        )}

        {selectedOverlay && (
          <div
            style={{
              display: 'grid',
              gap: 14,
              padding: '16px 18px',
              borderRadius: 12,
              background: '#FFFDF7',
              border: '1px solid #FCD34D',
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <strong style={{ fontSize: 13, color: '#111827', textTransform: 'capitalize' }}>
                  Selected {selectedOverlayLabel}
                </strong>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  Drag the box on the page or fine-tune it here. Resizing stays aligned with export.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => duplicateOverlay(selectedOverlay.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => deleteOverlay(selectedOverlay.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1px solid #FECACA',
                    background: '#FEF2F2',
                    color: '#B91C1C',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                Left (%)
                <input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={Math.round(selectedOverlay.x * 100)}
                  onChange={event => setSelectedOverlayMetric('x', Number(event.target.value))}
                  style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                Top (%)
                <input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={Math.round(selectedOverlay.y * 100)}
                  onChange={event => setSelectedOverlayMetric('y', Number(event.target.value))}
                  style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                Width (%)
                <input
                  type="number"
                  min={4}
                  max={99}
                  step={1}
                  value={Math.round(selectedOverlay.width * 100)}
                  onChange={event => setSelectedOverlayMetric('width', Number(event.target.value))}
                  style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13 }}
                />
              </label>
              {selectedOverlay.type !== 'text-overlay' && (
                <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  Height (%)
                  <input
                    type="number"
                    min={1}
                    max={99}
                    step={1}
                    value={Math.round(selectedOverlay.height * 100)}
                    onChange={event => setSelectedOverlayMetric('height', Number(event.target.value))}
                    style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13 }}
                  />
                </label>
              )}
              {selectedOverlay.type === 'text-overlay' && (
                <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  Text size
                  <input
                    type="number"
                    min={10}
                    max={72}
                    step={1}
                    value={Math.round(selectedOverlay.fontSize * EDIT_PREVIEW_SCALE)}
                    onChange={event =>
                      updateOverlay(selectedOverlay.id, current =>
                        current.type === 'text-overlay'
                          ? {
                              ...current,
                              fontSize: Math.min(Math.max(Number(event.target.value) / EDIT_PREVIEW_SCALE, 8), 48),
                            }
                          : current,
                      )
                    }
                    style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13 }}
                  />
                </label>
              )}
              {(selectedOverlay.type === 'text-overlay' ||
                selectedOverlay.type === 'highlight' ||
                selectedOverlay.type === 'underline') && (
                <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  Color
                  <input
                    type="color"
                    value={selectedOverlay.color}
                    onChange={event =>
                      updateOverlay(selectedOverlay.id, current =>
                        current.type === 'text-overlay' ||
                        current.type === 'highlight' ||
                        current.type === 'underline'
                          ? { ...current, color: event.target.value }
                          : current,
                      )
                    }
                    style={{ width: '100%', height: 40, borderRadius: 9, border: '1px solid #E5E7EB', padding: 4, background: '#fff' }}
                  />
                </label>
              )}
            </div>

            <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
              {selectedOverlay.type === 'signature' &&
                'Signature resizing keeps its original aspect ratio so strokes do not look stretched.'}
              {selectedOverlay.type === 'text-overlay' &&
                'Use the side handles or width control to reflow longer paragraphs into cleaner text boxes.'}
              {selectedOverlay.type === 'whiteout' &&
                'Whiteout areas rebuild this page on export so covered text is removed from the visible page and searchable layer.'}
              {(selectedOverlay.type === 'highlight' || selectedOverlay.type === 'underline') &&
                'Highlights and underlines stay selectable here so you can tighten their placement after drawing them.'}
            </p>
          </div>
        )}

        {(loadingEditor || runningOcr || loadingMessage) && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ height: 8, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round(loadingProgress * 100)}%`,
                  height: '100%',
                  background: '#F59E0B',
                  transition: 'width 180ms ease',
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{loadingMessage}</p>
          </div>
        )}

        {(saveError || saveNote) && (
          <div style={{ fontSize: 13, color: saveError ? '#DC2626' : '#166534' }}>
            {saveError || saveNote}
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => goToPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
          >
            ←
          </button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            onClick={() => goToPage(Math.min(pageCount - 1, currentPage + 1))}
            disabled={currentPage === pageCount - 1}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
          >
            →
          </button>
        </div>
      )}

      {!currentPageState ? (
        <div
          onDrop={handleDrop}
          onDragOver={event => event.preventDefault()}
          style={{
            border: '3px dashed #e5e7eb',
            borderRadius: 16,
            padding: 80,
            textAlign: 'center',
            cursor: 'pointer',
            background: '#fafafa',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</p>
          <p style={{ color: '#9ca3af', marginBottom: 24 }}>Text PDFs become directly editable. Scanned PDFs can be OCR&apos;d first.</p>
          <label
            style={{
              padding: '12px 28px',
              borderRadius: 10,
              background: '#F59E0B',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            Choose PDF
            <input type="file" accept="application/pdf" onChange={handleFileInput} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <strong style={{ fontSize: 13, color: '#111827' }}>Precision View</strong>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                Zoom in for dense documents, switch to Pan to move around the page, then jump with thumbnails below.
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              Page canvas {Math.round(zoomLevel * 100)}% · {activeToolLabel}
            </span>
          </div>

          <div
            ref={viewerViewportRef}
            onMouseDown={handleViewerMouseDown}
            onMouseMove={handleViewerMouseMove}
            onMouseUp={stopPanning}
            style={{
              width: '100%',
              maxHeight: '78vh',
              overflow: 'auto',
              borderRadius: 14,
              border: '1px solid #E5E7EB',
              background: tool === 'pan' ? '#F8FAFC' : '#FCFCFD',
              cursor: tool === 'pan' ? (panning ? 'grabbing' : 'grab') : 'default',
              userSelect: tool === 'pan' ? 'none' : 'auto',
            }}
          >
            <div
              style={{
                width: viewerSurfaceWidth || '100%',
                minHeight: '100%',
                padding: 16,
                boxSizing: 'border-box',
              }}
            >
              <div
                ref={containerRef}
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                style={{
                  position: 'relative',
                  width: editorCanvasWidth || '100%',
                  flex: '0 0 auto',
                  margin: '0 auto',
                  cursor:
                    tool === 'pan'
                      ? panning
                        ? 'grabbing'
                        : 'grab'
                      : tool === 'edit'
                        ? 'text'
                        : tool === 'text'
                          ? 'text'
                          : tool === 'signature'
                            ? 'crosshair'
                            : tool === 'highlight' || tool === 'underline' || tool === 'whiteout'
                              ? 'crosshair'
                              : 'default',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPageState.previewDataUrl}
                  alt={`Page ${currentPage + 1}`}
                  style={{
                    width: '100%',
                    display: 'block',
                    borderRadius: 6,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                  draggable={false}
                />

                {currentPageState.textBlocks.map(block => {
              const left = scaledByPreview(block.previewX)
              const top = scaledByPreview(block.previewY)
              const width = Math.max(scaledByPreview(block.previewWidth), 20)
              const height = Math.max(scaledByPreview(block.previewHeight), 16)
              const fontSizePx = Math.max(scaledByPreview(block.previewFontSize), 10)
              const isActive = activeBlockId === block.id
              const blockFontStyle = cssFontFromHint(block.fontHint)

              if (isActive) {
                return (
                  <div
                    key={block.id}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width: Math.max(width + 12, 140),
                      minHeight: Math.max(height + 8, fontSizePx * 1.5),
                      boxSizing: 'border-box',
                      zIndex: 24,
                    }}
                  >
                    <div
                      ref={blockEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={false}
                      onInput={event => setBlockDraft(event.currentTarget.innerText.replace(/\r/g, ''))}
                      onBlur={event => {
                        if (keepBlockEditorOpen(event.relatedTarget)) return
                        commitBlockEdit()
                      }}
                      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                          event.preventDefault()
                          commitBlockEdit()
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelBlockEdit()
                        }
                      }}
                      style={{
                        width: '100%',
                        minHeight: Math.max(height + 8, fontSizePx * 1.5),
                        padding: '7px 9px',
                        borderRadius: 10,
                        border: '1px solid rgba(59, 130, 246, 0.45)',
                        background: 'rgba(255,255,255,0.985)',
                        boxShadow: '0 10px 26px rgba(15, 23, 42, 0.12)',
                        fontSize: `${fontSizePx}px`,
                        lineHeight: 1.24,
                        color: block.textColor,
                        outline: 'none',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                        ...blockFontStyle,
                      }}
                    />
                  </div>
                )
              }

              if (block.edited) {
                return (
                  <div
                    key={block.id}
                    onClick={event => {
                      event.stopPropagation()
                      if (tool === 'edit') openBlockEditor(block.id)
                    }}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      minWidth: width,
                      minHeight: height,
                      padding: '4px 6px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.94)',
                      border: '1px solid rgba(59, 130, 246, 0.22)',
                      color: block.textColor,
                      fontSize: `${fontSizePx}px`,
                      lineHeight: 1.18,
                      cursor: tool === 'edit' ? 'text' : 'default',
                      zIndex: 14,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      boxShadow: '0 3px 12px rgba(15, 23, 42, 0.06)',
                      ...blockFontStyle,
                    }}
                  >
                    {block.text || <span style={{ color: '#9ca3af' }}>Text removed</span>}
                  </div>
                )
              }

              return (
                <button
                  key={block.id}
                  onClick={event => {
                    event.stopPropagation()
                    openBlockEditor(block.id)
                  }}
                  type="button"
                  aria-label={`Edit text block: ${block.text || 'Empty text block'}`}
                  title={block.text || 'Empty text block'}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width,
                    height,
                    borderRadius: 5,
                    border: tool === 'edit' ? '1px solid rgba(245, 158, 11, 0.18)' : '1px solid transparent',
                    background: tool === 'edit' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                    cursor: tool === 'edit' ? 'text' : 'default',
                    zIndex: 10,
                    opacity: tool === 'edit' ? 1 : 0,
                    pointerEvents: tool === 'edit' ? 'auto' : 'none',
                  }}
                />
              )
            })}

            {activeBlock && blockStyleDraft && blockInspectorPosition && tool === 'edit' && (
              <div
                ref={blockInspectorRef}
                style={{
                  position: 'absolute',
                  left: blockInspectorPosition.left,
                  top: blockInspectorPosition.top,
                  width: blockInspectorPosition.width,
                  padding: 14,
                  borderRadius: 16,
                  background: 'rgba(17, 24, 39, 0.96)',
                  color: '#F9FAFB',
                  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.28)',
                  zIndex: 36,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'grid', gap: 3 }}>
                    <strong style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#CBD5E1' }}>
                      Edit Text
                    </strong>
                    <span style={{ fontSize: 12, color: '#E5E7EB', lineHeight: 1.4 }}>
                      {activeBlock.text || 'Empty text block'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={commitBlockEdit}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      padding: '8px 12px',
                      background: '#F59E0B',
                      color: '#111827',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Done
                  </button>
                </div>

                <label style={{ display: 'grid', gap: 6, fontSize: 11, color: '#CBD5E1', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Font Family
                  <select
                    value={blockStyleDraft.family}
                    onChange={event =>
                      updateBlockStyle(current => ({
                        ...current,
                        family: event.target.value as BlockStyleDraft['family'],
                      }))
                    }
                    style={{
                      padding: '9px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.28)',
                      background: 'rgba(30, 41, 59, 0.94)',
                      color: '#F8FAFC',
                    }}
                  >
                    <option value="sans">Helvetica</option>
                    <option value="serif">Times</option>
                    <option value="mono">Courier</option>
                  </select>
                </label>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Size (pt)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => updateBlockStyle(current => ({ ...current, fontSize: Math.max(8, current.fontSize - 1) }))}
                      style={{
                        borderRadius: 10,
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        background: 'rgba(30, 41, 59, 0.94)',
                        color: '#F8FAFC',
                        cursor: 'pointer',
                        fontSize: 18,
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={8}
                      max={72}
                      value={blockStyleDraft.fontSize}
                      onChange={event =>
                        updateBlockStyle(current => ({
                          ...current,
                          fontSize: Math.min(72, Math.max(8, Number(event.target.value) || current.fontSize)),
                        }))
                      }
                      style={{
                        padding: '9px 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        background: 'rgba(30, 41, 59, 0.94)',
                        color: '#F8FAFC',
                        textAlign: 'center',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => updateBlockStyle(current => ({ ...current, fontSize: Math.min(72, current.fontSize + 1) }))}
                      style={{
                        borderRadius: 10,
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        background: 'rgba(30, 41, 59, 0.94)',
                        color: '#F8FAFC',
                        cursor: 'pointer',
                        fontSize: 18,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Style
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlockStyle(current => ({
                          ...current,
                          weight: current.weight === 'bold' ? 'regular' : 'bold',
                        }))
                      }
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        background: blockStyleDraft.weight === 'bold' ? '#334155' : 'rgba(30, 41, 59, 0.94)',
                        color: '#F8FAFC',
                        cursor: 'pointer',
                        fontWeight: 800,
                        padding: '8px 0',
                      }}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlockStyle(current => ({
                          ...current,
                          style: current.style === 'italic' ? 'normal' : 'italic',
                        }))
                      }
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        background: blockStyleDraft.style === 'italic' ? '#334155' : 'rgba(30, 41, 59, 0.94)',
                        color: '#F8FAFC',
                        cursor: 'pointer',
                        fontStyle: 'italic',
                        padding: '8px 0',
                      }}
                    >
                      I
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Color
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {EXISTING_TEXT_SWATCHES.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateBlockStyle(current => ({ ...current, color }))}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: color === blockStyleDraft.color ? '2px solid #F8FAFC' : '1px solid rgba(255,255,255,0.24)',
                          background: color,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={blockStyleDraft.color}
                      onChange={event => updateBlockStyle(current => ({ ...current, color: event.target.value }))}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        background: 'transparent',
                        padding: 2,
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!sourceActiveBlock) return
                      setBlockStyleDraft(blockStyleDraftFromBlock(sourceActiveBlock, true))
                    }}
                    style={{
                      border: '1px solid rgba(148, 163, 184, 0.28)',
                      borderRadius: 10,
                      padding: '9px 12px',
                      background: 'rgba(30, 41, 59, 0.94)',
                      color: '#E5E7EB',
                      cursor: 'pointer',
                    }}
                  >
                    Reset Style
                  </button>
                  <span style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right' }}>
                    Cmd/Ctrl + Enter saves
                  </span>
                </div>
              </div>
            )}

            {currentOverlays.map(overlay => {
              if (overlay.type === 'highlight') {
                const isSelected = selectedOverlayId === overlay.id
                return (
                  <div
                    key={overlay.id}
                    onMouseDown={event => startDrag(event, overlay)}
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedOverlayId(overlay.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: overlay.x * pageFrame.width,
                      top: overlay.y * pageFrame.height,
                      width: overlay.width * pageFrame.width,
                      height: overlay.height * pageFrame.height,
                      background: overlay.color,
                      opacity: 0.28,
                      borderRadius: 3,
                      border: isSelected ? '1.5px solid rgba(245, 158, 11, 0.9)' : '1px solid rgba(255,255,255,0.55)',
                      boxShadow: isSelected ? '0 0 0 1px rgba(255,255,255,0.85)' : 'none',
                      zIndex: isSelected ? 19 : 8,
                      cursor: tool === 'select' ? 'move' : 'default',
                    }}
                  >
                    <button
                      type="button"
                      onMouseDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation()
                        deleteOverlay(overlay.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                    {renderResizeHandles(overlay)}
                  </div>
                )
              }

              if (overlay.type === 'underline') {
                const isSelected = selectedOverlayId === overlay.id
                const boxHeight = Math.max(overlay.height * pageFrame.height, 12)
                return (
                  <div
                    key={overlay.id}
                    onMouseDown={event => startDrag(event, overlay)}
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedOverlayId(overlay.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: overlay.x * pageFrame.width,
                      top: overlay.y * pageFrame.height,
                      width: overlay.width * pageFrame.width,
                      height: boxHeight,
                      borderRadius: 10,
                      border: isSelected ? '1.5px solid rgba(245, 158, 11, 0.9)' : '1px dashed rgba(0,0,0,0.08)',
                      zIndex: isSelected ? 19 : 8,
                      cursor: tool === 'select' ? 'move' : 'default',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 3,
                        background: overlay.color,
                        borderRadius: 999,
                      }}
                    />
                    <button
                      type="button"
                      onMouseDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation()
                        deleteOverlay(overlay.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: -8,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                    {renderResizeHandles(overlay)}
                  </div>
                )
              }

              if (overlay.type === 'whiteout') {
                const isSelected = selectedOverlayId === overlay.id
                return (
                  <div
                    key={overlay.id}
                    onMouseDown={event => startDrag(event, overlay)}
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedOverlayId(overlay.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: overlay.x * pageFrame.width,
                      top: overlay.y * pageFrame.height,
                      width: overlay.width * pageFrame.width,
                      height: overlay.height * pageFrame.height,
                      background: 'rgba(255,255,255,0.96)',
                      borderRadius: 4,
                      border: isSelected ? '1.5px solid rgba(245, 158, 11, 0.9)' : '1px dashed rgba(17,24,39,0.24)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.95)',
                      zIndex: isSelected ? 19 : 9,
                      cursor: tool === 'select' ? 'move' : 'default',
                    }}
                  >
                    <button
                      type="button"
                      onMouseDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation()
                        deleteOverlay(overlay.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                    {renderResizeHandles(overlay)}
                  </div>
                )
              }

              if (overlay.type === 'text-overlay') {
                const displayFontSize = Math.max(overlay.fontSize * EDIT_PREVIEW_SCALE * (pageFrame.width / currentPageState.previewWidth), 11)
                const displayWidth = Math.max(overlay.width * pageFrame.width, 100)
                const isEditing = editingOverlayId === overlay.id
                const isSelected = selectedOverlayId === overlay.id

                return (
                  <div
                    key={overlay.id}
                    onMouseDown={event => startDrag(event, overlay)}
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedOverlayId(overlay.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: overlay.x * pageFrame.width,
                      top: overlay.y * pageFrame.height,
                      width: displayWidth,
                      zIndex: 18,
                      cursor: tool === 'select' ? 'move' : 'text',
                      borderRadius: 8,
                      boxShadow: isSelected ? '0 0 0 1.5px rgba(245, 158, 11, 0.9)' : 'none',
                    }}
                  >
                    {isEditing ? (
                      <textarea
                        ref={overlayTextareaRef}
                        autoFocus
                        value={overlay.text}
                        onChange={event =>
                          updateOverlay(overlay.id, current => ({
                            ...current,
                            text: event.target.value,
                          }))
                        }
                        onBlur={() => {
                          setEditingOverlayId(null)
                          if (!overlay.text.trim()) deleteOverlay(overlay.id)
                        }}
                        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault()
                            setEditingOverlayId(null)
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            setEditingOverlayId(null)
                          }
                        }}
                        style={{
                          width: '100%',
                          minHeight: displayFontSize * 1.6,
                          padding: '5px 6px',
                          borderRadius: 7,
                          border: '1px dashed #F59E0B',
                          background: 'rgba(255,255,255,0.96)',
                          fontSize: `${displayFontSize}px`,
                          color: overlay.color,
                          lineHeight: 1.2,
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'none',
                          overflow: 'hidden',
                        }}
                      />
                    ) : (
                      <div
                        onDoubleClick={event => {
                          event.stopPropagation()
                          setSelectedOverlayId(overlay.id)
                          setEditingOverlayId(overlay.id)
                        }}
                        style={{
                          minHeight: displayFontSize * 1.3,
                          padding: '4px 6px',
                          borderRadius: 7,
                          background: 'rgba(255,255,255,0.94)',
                          border: isSelected ? '1px dashed #F59E0B' : '1px dashed #d1d5db',
                          fontSize: `${displayFontSize}px`,
                          color: overlay.color,
                          lineHeight: 1.2,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {overlay.text || <span style={{ color: '#9ca3af' }}>Double-click to type</span>}
                      </div>
                    )}
                    <button
                      type="button"
                      onMouseDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation()
                        deleteOverlay(overlay.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                    {renderResizeHandles(overlay)}
                  </div>
                )
              }

              if (overlay.type === 'signature') {
                const isSelected = selectedOverlayId === overlay.id
                return (
                  <div
                    key={overlay.id}
                    onMouseDown={event => startDrag(event, overlay)}
                    onClick={event => {
                      event.stopPropagation()
                      setSelectedOverlayId(overlay.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: overlay.x * pageFrame.width,
                      top: overlay.y * pageFrame.height,
                      width: overlay.width * pageFrame.width,
                      height: overlay.height * pageFrame.height,
                      zIndex: isSelected ? 19 : 18,
                      cursor: tool === 'select' ? 'move' : 'default',
                      borderRadius: 6,
                      boxShadow: isSelected ? '0 0 0 1.5px rgba(245, 158, 11, 0.9)' : 'none',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={overlay.dataUrl}
                      alt="signature"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                      }}
                      draggable={false}
                    />
                    <button
                      type="button"
                      onMouseDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation()
                        deleteOverlay(overlay.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                    {renderResizeHandles(overlay)}
                  </div>
                )
              }

              return null
            })}

            {markupDraft && (
              <div
                style={{
                  position: 'absolute',
                  left: markupDraft.x * pageFrame.width,
                  top: markupDraft.y * pageFrame.height,
                  width: markupDraft.width * pageFrame.width,
                  height: markupDraft.type === 'underline' ? Math.max(markupDraft.height * pageFrame.height, 12) : markupDraft.height * pageFrame.height,
                  background:
                    markupDraft.type === 'highlight'
                      ? markupDraft.color
                      : markupDraft.type === 'whiteout'
                        ? 'rgba(255,255,255,0.96)'
                        : undefined,
                  borderRadius: markupDraft.type === 'highlight' ? 3 : markupDraft.type === 'whiteout' ? 4 : 999,
                  border:
                    markupDraft.type === 'whiteout'
                      ? '1px dashed rgba(17,24,39,0.24)'
                      : markupDraft.type === 'underline'
                        ? '1px dashed rgba(0,0,0,0.08)'
                        : undefined,
                  borderBottom:
                    markupDraft.type === 'underline' ? `3px solid ${markupDraft.color}` : undefined,
                  opacity: markupDraft.type === 'highlight' ? 0.28 : 1,
                  zIndex: 9,
                }}
              />
            )}

            {tool === 'pan' && (
              <div
                onMouseDown={handleViewerMouseDown}
                onMouseMove={handleViewerMouseMove}
                onMouseUp={stopPanning}
                onPointerDown={handleViewerPointerDown}
                onPointerMove={handleViewerPointerMove}
                onPointerUp={handleViewerPointerUp}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 42,
                  cursor: panning ? 'grabbing' : 'grab',
                  background: 'transparent',
                }}
              />
            )}
              </div>
            </div>
          </div>

          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 14, marginBottom: 0, lineHeight: 1.65 }}>
            {tool === 'edit' && 'Click existing text to edit it. Cmd/Ctrl + Enter saves the active text edit.'}
            {tool === 'select' && 'Select any added box, signature, highlight, underline, or whiteout area to move it or resize it with the handles.'}
            {tool === 'pan' && 'Drag the page to move around at higher zoom levels, then jump between pages with the thumbnails above.'}
            {tool === 'text' && 'Click anywhere to place a new text box. Use the side handles later to reflow longer paragraphs.'}
            {tool === 'signature' && signatureDraft && 'Click anywhere on the page to place your signature.'}
            {tool === 'highlight' && 'Drag across the page to create a highlight.'}
            {tool === 'underline' && 'Drag across the page to underline an area.'}
            {tool === 'whiteout' && 'Drag across the page to erase an area visually and remove it from the rebuilt searchable export.'}
          </p>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginTop: 0, marginBottom: 12 }}>
          How This Editor Works
        </h2>
        <div style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
          {[
            'Upload a PDF. Doclair scans the text layer and marks editable text regions automatically.',
            'If any page is image-based, run OCR first. Doclair will detect editable text blocks for those scanned pages.',
            'Click existing text to edit, then add highlights, whiteout erase areas, new text boxes, or signatures where needed.',
            'Use Select to move or resize the overlays you added, then download the finished PDF with everything written back locally in the browser.',
          ].map((step, index) => (
            <div key={step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--amber)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--ink)', opacity: 0.72 }}>{step}</p>
            </div>
          ))}
        </div>

        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 8 }}>
          Honest Capability Notes
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)', opacity: 0.72, marginBottom: 16 }}>
          Text-based PDFs are the best fit: Doclair can target existing text regions directly and save your changes back as new PDF text at the same location. Scanned PDFs need OCR first, and their accuracy depends on scan quality and language choice.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)', opacity: 0.72, marginBottom: 16 }}>
          Rare embedded fonts may be matched to the closest standard PDF font on export. That keeps the file lightweight and searchable, but some visual drift can still happen in dense layouts or heavily designed documents.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)', opacity: 0.72, marginBottom: 0 }}>
          For deeply reflowed editing, full document redesign, or exact font preservation across every edge case, a desktop PDF editor can still be stronger. For fast local edits, resumes, contracts, invoices, forms, and signatures, this workflow is built to get you there without uploads.
        </p>
      </div>

      <FAQ faqs={FAQS} />

      {showSignatureModal && (
        <SignatureModal
          onDone={(dataUrl, width, height) => {
            setSignatureDraft({ dataUrl, widthPx: width, heightPx: height })
            setShowSignatureModal(false)
            setTool('signature')
          }}
          onCancel={() => {
            setShowSignatureModal(false)
            if (tool === 'signature') setTool('select')
          }}
        />
      )}
    </ToolPageLayout>
  )
}
