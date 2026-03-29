import { createWorker } from 'tesseract.js'
import {
  PDFDocument,
  PDFContentStream,
  PDFName,
  PDFRawStream,
  StandardFonts,
  decodePDFRawStream,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from '@cantoo/pdf-lib'

export const EDIT_PREVIEW_SCALE = 1.6
export const EDIT_REBUILD_SCALE = 2.4
export const MIN_MEDIA_OVERLAY_OPACITY = 0.1
export const MAX_MEDIA_OVERLAY_ROTATION_DEG = 180

export type TextBlockSource = 'native' | 'ocr'
export type EditableFontFamily = 'sans' | 'serif' | 'mono'
export type EditableFontWeight = 'regular' | 'bold'
export type EditableFontStyle = 'normal' | 'italic'
export type EditableTextAlign = 'left' | 'center' | 'right'
type EmbeddedFontFamily = 'arimo' | 'carlito' | 'tinos' | 'cousine'

export interface EditableFontDescriptor {
  family: EditableFontFamily
  weight: EditableFontWeight
  style: EditableFontStyle
}

export interface FontPresentation {
  cssFontFamily: string
  detectedFamilyLabel: string
  exportFamilyLabel: string
  exactMatch: boolean
}

export interface EditableTextBlock {
  id: string
  pageIndex: number
  originalText: string
  originalFontHint: string
  originalPdfFontSize: number
  originalTextColor: string
  originalTextAlign: EditableTextAlign
  originalLineHeightMultiplier: number
  text: string
  source: TextBlockSource
  pdfX: number
  pdfY: number
  pdfWidth: number
  pdfHeight: number
  previewX: number
  previewY: number
  previewWidth: number
  previewHeight: number
  previewFontSize: number
  pdfFontSize: number
  fontHint: string
  textColor: string
  textAlign: EditableTextAlign
  lineHeightMultiplier: number
  edited: boolean
}

export interface EditablePdfPage {
  pageIndex: number
  previewDataUrl: string
  previewWidth: number
  previewHeight: number
  pdfWidth: number
  pdfHeight: number
  textBlocks: EditableTextBlock[]
  hasTextLayer: boolean
  ocrApplied: boolean
  wordCount: number
}

export interface EditablePdfDocument {
  pageCount: number
  pages: EditablePdfPage[]
  scannedPageCount: number
  allPagesScanned: boolean
  totalWordCount: number
}

export interface AddedTextOverlay {
  id: string
  type: 'text-overlay'
  pageIndex: number
  x: number
  y: number
  width: number
  text: string
  fontSize: number
  color: string
  textAlign: EditableTextAlign
  lineHeightMultiplier: number
  editing: boolean
}

export interface SignatureOverlay {
  id: string
  type: 'signature'
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
  rotationDeg: number
  opacity: number
}

export interface ImageOverlay {
  id: string
  type: 'image'
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
  rotationDeg: number
  opacity: number
}

export interface MarkupOverlay {
  id: string
  type: 'highlight' | 'underline'
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface WhiteoutOverlay {
  id: string
  type: 'whiteout'
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

export type EditOverlay = AddedTextOverlay | SignatureOverlay | ImageOverlay | MarkupOverlay | WhiteoutOverlay

export interface EditorLoadProgress {
  current: number
  total: number
  message: string
}

export interface OcrProgress {
  current: number
  total: number
  message: string
}

export interface SaveEditedPdfResult {
  blob: Blob
  editedTextCount: number
  substitutedFontCount: number
  scannedPageCount: number
  visualReplacementCount: number
  rebuiltPageCount: number
  exactRewritePageCount: number
  whiteoutCount: number
}

export interface EditableOcrResult {
  pages: EditablePdfPage[]
  recognizedPageCount: number
  detectedBlockCount: number
  unresolvedPageCount: number
}

interface PdfJsTextItem {
  str: string
  transform: number[]
  width?: number
  height?: number
  fontName?: string
  hasEOL?: boolean
}

interface PdfJsTextStyle {
  fontFamily?: string
}

interface PositionedTextItem {
  text: string
  pdfX: number
  pdfY: number
  pdfWidth: number
  pdfHeight: number
  previewX: number
  previewY: number
  previewWidth: number
  previewHeight: number
  previewFontSize: number
  pdfFontSize: number
  fontHint: string
  hasEOL: boolean
}

interface TesseractBbox {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface TesseractLine {
  text?: string
  bbox?: TesseractBbox
  words?: TesseractWord[]
}

interface TesseractWord {
  text?: string
  bbox?: TesseractBbox
  font_name?: string
}

interface TesseractParagraph {
  lines?: TesseractLine[]
}

interface TesseractBlock {
  text?: string
  bbox?: TesseractBbox
  paragraphs?: TesseractParagraph[]
}

interface EmbeddedFontAsset {
  label: string
  cssFallbacks: string[]
  files: {
    regular: string
    italic: string
    bold: string
    boldItalic: string
  }
}

function getMediaOverlayRotationDeg(overlay: SignatureOverlay | ImageOverlay) {
  const safeRotation = Number.isFinite(overlay.rotationDeg) ? overlay.rotationDeg : 0
  return Math.min(MAX_MEDIA_OVERLAY_ROTATION_DEG, Math.max(-MAX_MEDIA_OVERLAY_ROTATION_DEG, safeRotation))
}

function getMediaOverlayOpacity(overlay: SignatureOverlay | ImageOverlay) {
  const safeOpacity = Number.isFinite(overlay.opacity) ? overlay.opacity : 1
  return Math.min(1, Math.max(MIN_MEDIA_OVERLAY_OPACITY, safeOpacity))
}

const LINE_BUCKET_SIZE = 3
const OCR_RENDER_SCALE = 2.2
const DEFAULT_TEXT_COLOR = '#111827'
const EMBEDDED_FONT_ASSETS: Record<EmbeddedFontFamily, EmbeddedFontAsset> = {
  arimo: {
    label: 'Arimo',
    cssFallbacks: ['Arial', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
    files: {
      regular: '/editor-fonts/Arimo-Regular.ttf',
      italic: '/editor-fonts/Arimo-Italic.ttf',
      bold: '/editor-fonts/Arimo-Bold.ttf',
      boldItalic: '/editor-fonts/Arimo-BoldItalic.ttf',
    },
  },
  carlito: {
    label: 'Carlito',
    cssFallbacks: ['Calibri', 'Segoe UI', 'Arial', 'sans-serif'],
    files: {
      regular: '/editor-fonts/Carlito-Regular.ttf',
      italic: '/editor-fonts/Carlito-Italic.ttf',
      bold: '/editor-fonts/Carlito-Bold.ttf',
      boldItalic: '/editor-fonts/Carlito-BoldItalic.ttf',
    },
  },
  tinos: {
    label: 'Tinos',
    cssFallbacks: ['Times New Roman', 'Times', 'Georgia', 'serif'],
    files: {
      regular: '/editor-fonts/Tinos-Regular.ttf',
      italic: '/editor-fonts/Tinos-Italic.ttf',
      bold: '/editor-fonts/Tinos-Bold.ttf',
      boldItalic: '/editor-fonts/Tinos-BoldItalic.ttf',
    },
  },
  cousine: {
    label: 'Cousine',
    cssFallbacks: ['Courier New', 'Courier', 'Consolas', 'Menlo', 'Monaco', 'monospace'],
    files: {
      regular: '/editor-fonts/Cousine-Regular.ttf',
      italic: '/editor-fonts/Cousine-Italic.ttf',
      bold: '/editor-fonts/Cousine-Bold.ttf',
      boldItalic: '/editor-fonts/Cousine-BoldItalic.ttf',
    },
  },
}
const SPECIFIC_FONT_ALIASES: Array<{ token: string; label: string; family: EmbeddedFontFamily }> = [
  { token: 'calibri', label: 'Calibri', family: 'carlito' },
  { token: 'carlito', label: 'Carlito', family: 'carlito' },
  { token: 'aptos', label: 'Aptos', family: 'carlito' },
  { token: 'arial', label: 'Arial', family: 'arimo' },
  { token: 'helvetica neue', label: 'Helvetica Neue', family: 'arimo' },
  { token: 'helvetica', label: 'Helvetica', family: 'arimo' },
  { token: 'arimo', label: 'Arimo', family: 'arimo' },
  { token: 'roboto', label: 'Roboto', family: 'arimo' },
  { token: 'open sans', label: 'Open Sans', family: 'arimo' },
  { token: 'inter', label: 'Inter', family: 'arimo' },
  { token: 'avenir', label: 'Avenir', family: 'arimo' },
  { token: 'segoe ui', label: 'Segoe UI', family: 'arimo' },
  { token: 'verdana', label: 'Verdana', family: 'arimo' },
  { token: 'tahoma', label: 'Tahoma', family: 'arimo' },
  { token: 'times new roman', label: 'Times New Roman', family: 'tinos' },
  { token: 'times', label: 'Times', family: 'tinos' },
  { token: 'tinos', label: 'Tinos', family: 'tinos' },
  { token: 'georgia', label: 'Georgia', family: 'tinos' },
  { token: 'cambria', label: 'Cambria', family: 'tinos' },
  { token: 'garamond', label: 'Garamond', family: 'tinos' },
  { token: 'palatino', label: 'Palatino', family: 'tinos' },
  { token: 'baskerville', label: 'Baskerville', family: 'tinos' },
  { token: 'courier new', label: 'Courier New', family: 'cousine' },
  { token: 'courier', label: 'Courier', family: 'cousine' },
  { token: 'cousine', label: 'Cousine', family: 'cousine' },
  { token: 'consolas', label: 'Consolas', family: 'cousine' },
  { token: 'source code', label: 'Source Code', family: 'cousine' },
  { token: 'menlo', label: 'Menlo', family: 'cousine' },
  { token: 'monaco', label: 'Monaco', family: 'cousine' },
]
const fontByteCache = new Map<string, Promise<ArrayBuffer>>()
const docsWithFontkit = new WeakSet<PDFDocument>()
let fontkitModulePromise: Promise<unknown> | null = null
let browserFontLoadPromise: Promise<void> | null = null

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getCanvas2dContext(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderingContext2DSettings,
) {
  const context = canvas.getContext('2d', options)
  if (!context) throw new Error('Could not get 2D canvas context')
  return context
}

function parseBbox(title: string | null): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!title) return null
  const match = title.match(/\bbbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i)
  if (!match) return null
  return {
    x0: Number(match[1]),
    y0: Number(match[2]),
    x1: Number(match[3]),
    y1: Number(match[4]),
  }
}

function countWords(text: string) {
  return (text.match(/\b\S+\b/g) ?? []).length
}

async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  return pdfjsLib
}

function normalizeHexColor(color: string) {
  const trimmed = color.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }
  return DEFAULT_TEXT_COLOR
}

function normalizeFontHint(fontHint: string) {
  return fontHint.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function quoteFontFamily(family: string) {
  return /[\s]/.test(family) && !/^".*"$/.test(family) ? `"${family}"` : family
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

export function describeFontHint(fontHint: string): EditableFontDescriptor {
  const hint = normalizeFontHint(fontHint)
  const isMono = hint.includes('monospace') || hint.includes('mono') || hint.includes('courier')
  const isSans =
    hint.includes('sans-serif') ||
    hint.includes('sans serif') ||
    hint.includes('sans') ||
    hint.includes('arial') ||
    hint.includes('helvetica')
  const family: EditableFontDescriptor['family'] =
    isMono
      ? 'mono'
      : isSans
        ? 'sans'
        : hint.includes('times') || /\bserif\b/.test(hint) || hint.includes('georgia')
        ? 'serif'
        : 'sans'

  const weight: EditableFontDescriptor['weight'] = hint.includes('bold') ? 'bold' : 'regular'
  const style: EditableFontDescriptor['style'] =
    hint.includes('italic') || hint.includes('oblique') ? 'italic' : 'normal'

  return { family, weight, style }
}

function resolveEmbeddedFontFamily(fontHint: string, descriptor = describeFontHint(fontHint)) {
  const normalizedHint = normalizeFontHint(fontHint)
  const aliasMatch = SPECIFIC_FONT_ALIASES.find(alias => normalizedHint.includes(alias.token))

  if (aliasMatch) {
    return {
      family: aliasMatch.family,
      detectedFamilyLabel: aliasMatch.label,
      exactMatch: normalizedHint.includes(EMBEDDED_FONT_ASSETS[aliasMatch.family].label.toLowerCase()),
    }
  }

  if (descriptor.family === 'mono') {
    return { family: 'cousine' as const, detectedFamilyLabel: 'Monospace', exactMatch: false }
  }

  if (descriptor.family === 'serif') {
    return { family: 'tinos' as const, detectedFamilyLabel: 'Serif', exactMatch: false }
  }

  return { family: 'arimo' as const, detectedFamilyLabel: 'Sans', exactMatch: false }
}

export function getFontPresentation(fontHint: string): FontPresentation {
  const descriptor = describeFontHint(fontHint)
  const match = resolveEmbeddedFontFamily(fontHint, descriptor)
  const asset = EMBEDDED_FONT_ASSETS[match.family]
  const cssFontFamily = unique([match.detectedFamilyLabel, asset.label, ...asset.cssFallbacks])
    .map(quoteFontFamily)
    .join(', ')

  return {
    cssFontFamily,
    detectedFamilyLabel: match.detectedFamilyLabel,
    exportFamilyLabel: asset.label,
    exactMatch: match.exactMatch,
  }
}

export function composeFontHint(descriptor: EditableFontDescriptor) {
  return [descriptor.family, descriptor.weight === 'bold' ? 'bold' : '', descriptor.style === 'italic' ? 'italic' : '']
    .filter(Boolean)
    .join(' ')
}

function fontHintsMatch(left: string, right: string) {
  const leftDescriptor = describeFontHint(left)
  const rightDescriptor = describeFontHint(right)

  return (
    leftDescriptor.family === rightDescriptor.family &&
    leftDescriptor.weight === rightDescriptor.weight &&
    leftDescriptor.style === rightDescriptor.style
  )
}

export function isTextBlockEdited(
  block: EditableTextBlock,
  overrides?: Partial<
    Pick<
      EditableTextBlock,
      'text' | 'fontHint' | 'pdfFontSize' | 'textColor' | 'textAlign' | 'lineHeightMultiplier'
    >
  >,
) {
  const nextText = (overrides?.text ?? block.text).replace(/\r/g, '')
  const nextFontHint = overrides?.fontHint ?? block.fontHint
  const nextPdfFontSize = overrides?.pdfFontSize ?? block.pdfFontSize
  const nextTextColor = normalizeHexColor(overrides?.textColor ?? block.textColor)
  const nextTextAlign = overrides?.textAlign ?? block.textAlign
  const nextLineHeightMultiplier = overrides?.lineHeightMultiplier ?? block.lineHeightMultiplier

  return (
    nextText !== block.originalText ||
    !fontHintsMatch(nextFontHint, block.originalFontHint) ||
    Math.abs(nextPdfFontSize - block.originalPdfFontSize) > 0.15 ||
    nextTextColor !== normalizeHexColor(block.originalTextColor) ||
    nextTextAlign !== block.originalTextAlign ||
    Math.abs(nextLineHeightMultiplier - block.originalLineHeightMultiplier) > 0.02
  )
}

function standardFontForHint(fontHint: string) {
  const descriptor = describeFontHint(fontHint)

  if (descriptor.family === 'mono') {
    if (descriptor.weight === 'bold' && descriptor.style === 'italic') return StandardFonts.CourierBoldOblique
    if (descriptor.weight === 'bold') return StandardFonts.CourierBold
    if (descriptor.style === 'italic') return StandardFonts.CourierOblique
    return StandardFonts.Courier
  }

  if (descriptor.family === 'serif') {
    if (descriptor.weight === 'bold' && descriptor.style === 'italic') return StandardFonts.TimesRomanBoldItalic
    if (descriptor.weight === 'bold') return StandardFonts.TimesRomanBold
    if (descriptor.style === 'italic') return StandardFonts.TimesRomanItalic
    return StandardFonts.TimesRoman
  }

  if (descriptor.weight === 'bold' && descriptor.style === 'italic') return StandardFonts.HelveticaBoldOblique
  if (descriptor.weight === 'bold') return StandardFonts.HelveticaBold
  if (descriptor.style === 'italic') return StandardFonts.HelveticaOblique
  return StandardFonts.Helvetica
}

function fontVariantKey(descriptor: EditableFontDescriptor) {
  if (descriptor.weight === 'bold' && descriptor.style === 'italic') return 'boldItalic' as const
  if (descriptor.weight === 'bold') return 'bold' as const
  if (descriptor.style === 'italic') return 'italic' as const
  return 'regular' as const
}

async function ensureFontkit(doc: PDFDocument) {
  if (docsWithFontkit.has(doc)) return
  if (!fontkitModulePromise) {
    fontkitModulePromise = import('@pdf-lib/fontkit').then(module => module.default ?? module)
  }

  doc.registerFontkit(await fontkitModulePromise as Parameters<PDFDocument['registerFontkit']>[0])
  docsWithFontkit.add(doc)
}

async function fetchEmbeddedFontBytes(path: string) {
  let request = fontByteCache.get(path)
  if (!request) {
    request = fetch(path).then(async response => {
      if (!response.ok) throw new Error(`Could not load font asset: ${path}`)
      return response.arrayBuffer()
    })
    fontByteCache.set(path, request)
  }
  return request
}

async function ensureBrowserFallbackFontsLoaded() {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return
  if (browserFontLoadPromise) return browserFontLoadPromise

  browserFontLoadPromise = (async () => {
    const fontFaces = Object.values(EMBEDDED_FONT_ASSETS).flatMap(asset => [
      new FontFace(asset.label, `url(${asset.files.regular})`, { weight: '400', style: 'normal' }),
      new FontFace(asset.label, `url(${asset.files.italic})`, { weight: '400', style: 'italic' }),
      new FontFace(asset.label, `url(${asset.files.bold})`, { weight: '700', style: 'normal' }),
      new FontFace(asset.label, `url(${asset.files.boldItalic})`, { weight: '700', style: 'italic' }),
    ])

    await Promise.all(fontFaces.map(async face => {
      const loaded = await face.load()
      document.fonts.add(loaded)
    }))
  })()

  return browserFontLoadPromise
}

function blockToOverlayBox(block: EditableTextBlock, page: EditablePdfPage) {
  return {
    x: block.previewX / page.previewWidth,
    y: block.previewY / page.previewHeight,
    width: block.previewWidth / page.previewWidth,
    height: block.previewHeight / page.previewHeight,
  }
}

function buildBlocksFromItems(
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  previewWidth: number,
  previewHeight: number,
  items: PositionedTextItem[],
) {
  const groupedLines = new Map<number, PositionedTextItem[]>()

  for (const item of items) {
    const bucket = Math.round(item.pdfY / LINE_BUCKET_SIZE) * LINE_BUCKET_SIZE
    if (!groupedLines.has(bucket)) groupedLines.set(bucket, [])
    groupedLines.get(bucket)!.push(item)
  }

  const blocks: EditableTextBlock[] = []

  for (const line of Array.from(groupedLines.values())) {
    const sorted = [...line].sort((a, b) => a.pdfX - b.pdfX)
    let buffer: PositionedTextItem[] = []
    let text = ''

    const flush = () => {
      if (!buffer.length || !text.trim()) {
        buffer = []
        text = ''
        return
      }

      const first = buffer[0]
      const last = buffer[buffer.length - 1]
      const previewLeft = Math.min(...buffer.map(item => item.previewX))
      const previewTop = Math.min(...buffer.map(item => item.previewY))
      const previewRight = Math.max(...buffer.map(item => item.previewX + item.previewWidth))
      const previewBottom = Math.max(...buffer.map(item => item.previewY + item.previewHeight))
      const pdfLeft = Math.min(...buffer.map(item => item.pdfX))
      const pdfRight = Math.max(...buffer.map(item => item.pdfX + item.pdfWidth))
      const pdfHeightBox = Math.max(...buffer.map(item => item.pdfHeight))
      const previewFontSize = Math.max(...buffer.map(item => item.previewFontSize))
      const pdfFontSize = Math.max(...buffer.map(item => item.pdfFontSize))

      blocks.push({
        id: crypto.randomUUID(),
        pageIndex,
        originalText: text.trim(),
        originalFontHint: first.fontHint,
        originalPdfFontSize: pdfFontSize,
        originalTextColor: DEFAULT_TEXT_COLOR,
        originalTextAlign: 'left' as const,
        originalLineHeightMultiplier: 1,
        text: text.trim(),
        source: 'native',
        pdfX: pdfLeft,
        pdfY: first.pdfY,
        pdfWidth: Math.max(pdfRight - pdfLeft, pdfFontSize * 0.6),
        pdfHeight: pdfHeightBox,
        previewX: previewLeft,
        previewY: previewTop,
        previewWidth: Math.max(previewRight - previewLeft, previewFontSize * 0.6),
        previewHeight: Math.max(previewBottom - previewTop, previewFontSize),
        previewFontSize,
        pdfFontSize,
        fontHint: first.fontHint,
        textColor: DEFAULT_TEXT_COLOR,
        textAlign: 'left' as const,
        lineHeightMultiplier: 1,
        edited: false,
      })

      buffer = []
      text = ''
    }

    for (const item of sorted) {
      if (!buffer.length) {
        buffer = [item]
        text = item.text
        if (item.hasEOL) flush()
        continue
      }

      const previous = buffer[buffer.length - 1]
      const gap = item.pdfX - (previous.pdfX + previous.pdfWidth)
      const breakThreshold = Math.max(previous.pdfFontSize, item.pdfFontSize) * 0.9
      const addSpace = gap > Math.max(2, item.pdfFontSize * 0.18)

      if (gap > breakThreshold) {
        flush()
        buffer = [item]
        text = item.text
      } else {
        buffer.push(item)
        text += addSpace ? ` ${item.text}` : item.text
      }

      if (item.hasEOL) flush()
    }

    flush()
  }

  return blocks
    .filter(block => block.text.trim().length > 0)
    .map(block => ({
      ...block,
      previewX: clamp(block.previewX, 0, previewWidth),
      previewY: clamp(block.previewY, 0, previewHeight),
      previewWidth: clamp(block.previewWidth, 1, previewWidth),
      previewHeight: clamp(block.previewHeight, 1, previewHeight),
      pdfX: clamp(block.pdfX, 0, pageWidth),
      pdfY: clamp(block.pdfY, 0, pageHeight),
      pdfWidth: clamp(block.pdfWidth, 1, pageWidth),
      pdfHeight: clamp(block.pdfHeight, 1, pageHeight),
    }))
}

function extractNativeTextBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfjsLib: any,
  pageIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textContent: any,
  pageWidth: number,
  pageHeight: number,
  previewWidth: number,
  previewHeight: number,
) {
  const styles = (textContent.styles ?? {}) as Record<string, PdfJsTextStyle>
  const items = (textContent.items ?? []) as PdfJsTextItem[]
  const positionedItems: PositionedTextItem[] = []

  for (const item of items) {
    const rawText = item.str ?? ''
    if (!rawText.trim()) continue

    const previewTransform = pdfjsLib.Util.transform(
      [EDIT_PREVIEW_SCALE, 0, 0, -EDIT_PREVIEW_SCALE, 0, previewHeight],
      item.transform,
    )

    const pdfFontSize =
      Math.hypot(item.transform[0], item.transform[1]) ||
      Math.abs(item.height ?? 12) ||
      12
    const previewFontSize = pdfFontSize * EDIT_PREVIEW_SCALE
    const pdfWidthValue =
      typeof item.width === 'number' && item.width > 0
        ? item.width
        : Math.max(rawText.length * pdfFontSize * 0.5, pdfFontSize * 0.6)

    positionedItems.push({
      text: rawText.trim(),
      pdfX: item.transform[4],
      pdfY: item.transform[5],
      pdfWidth: pdfWidthValue,
      pdfHeight: Math.max(pdfFontSize * 1.05, 8),
      previewX: previewTransform[4],
      previewY: previewTransform[5] - previewFontSize,
      previewWidth: pdfWidthValue * EDIT_PREVIEW_SCALE,
      previewHeight: Math.max(previewFontSize * 1.05, 10),
      previewFontSize,
      pdfFontSize,
      fontHint: `${styles[item.fontName ?? '']?.fontFamily ?? ''} ${item.fontName ?? ''}`.trim(),
      hasEOL: Boolean(item.hasEOL),
    })
  }

  return buildBlocksFromItems(
    pageIndex,
    pageWidth,
    pageHeight,
    previewWidth,
    previewHeight,
    positionedItems,
  )
}

function createOcrBlock(
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  previewWidth: number,
  previewHeight: number,
  ocrWidth: number,
  ocrHeight: number,
  text: string,
  box: { x0: number; y0: number; x1: number; y1: number },
  fontHint = 'ocr sans',
) {
  const previewScaleX = previewWidth / ocrWidth
  const previewScaleY = previewHeight / ocrHeight
  const pdfScaleX = pageWidth / ocrWidth
  const pdfScaleY = pageHeight / ocrHeight

  const previewBoxWidth = Math.max((box.x1 - box.x0) * previewScaleX, 8)
  const previewBoxHeight = Math.max((box.y1 - box.y0) * previewScaleY, 10)
  const pdfBoxWidth = Math.max((box.x1 - box.x0) * pdfScaleX, 8 / EDIT_PREVIEW_SCALE)
  const pdfBoxHeight = Math.max((box.y1 - box.y0) * pdfScaleY, 10 / EDIT_PREVIEW_SCALE)
  const pdfFontSize = Math.max(8, pdfBoxHeight * 0.82)

  return {
    id: crypto.randomUUID(),
    pageIndex,
    originalText: text,
    originalFontHint: fontHint,
    originalPdfFontSize: pdfFontSize,
    originalTextColor: DEFAULT_TEXT_COLOR,
    originalTextAlign: 'left' as const,
    originalLineHeightMultiplier: 1,
    text,
    source: 'ocr' as const,
    pdfX: box.x0 * pdfScaleX,
    pdfY: pageHeight - box.y1 * pdfScaleY + pdfFontSize * 0.2,
    pdfWidth: pdfBoxWidth,
    pdfHeight: pdfBoxHeight,
    previewX: box.x0 * previewScaleX,
    previewY: box.y0 * previewScaleY,
    previewWidth: previewBoxWidth,
    previewHeight: previewBoxHeight,
    previewFontSize: Math.max(previewBoxHeight * 0.82, 10),
    pdfFontSize,
    fontHint,
    textColor: DEFAULT_TEXT_COLOR,
    textAlign: 'left' as const,
    lineHeightMultiplier: 1,
    edited: false,
  }
}

function extractOcrTextBlocks(
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  previewWidth: number,
  previewHeight: number,
  ocrWidth: number,
  ocrHeight: number,
  hocr: string,
) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(hocr, 'text/html')
  const lineNodes = Array.from(
    doc.querySelectorAll('.ocr_line, .ocr_textfloat, .ocr_header, .ocr_caption')
  )
  const blocks: EditableTextBlock[] = []

  const pushLine = (lineText: string, box: { x0: number; y0: number; x1: number; y1: number } | null) => {
    const normalizedText = lineText.replace(/\s+/g, ' ').trim()
    if (!normalizedText || !box) return
    blocks.push(
      createOcrBlock(
        pageIndex,
        pageWidth,
        pageHeight,
        previewWidth,
        previewHeight,
        ocrWidth,
        ocrHeight,
        normalizedText,
        box,
      ),
    )
  }

  if (lineNodes.length > 0) {
    for (const lineNode of lineNodes) {
      const lineBox = parseBbox(lineNode.getAttribute('title'))
      const wordNodes = Array.from(lineNode.querySelectorAll('.ocrx_word'))

      if (wordNodes.length > 0) {
        const words = wordNodes
          .map(node => ({
            text: node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            box: parseBbox(node.getAttribute('title')),
          }))
          .filter(word => word.text.length > 0 && word.box)

        if (!words.length) continue

        const text = words.map(word => word.text).join(' ')
        const mergedBox =
          lineBox ?? {
            x0: Math.min(...words.map(word => word.box!.x0)),
            y0: Math.min(...words.map(word => word.box!.y0)),
            x1: Math.max(...words.map(word => word.box!.x1)),
            y1: Math.max(...words.map(word => word.box!.y1)),
          }

        pushLine(text, mergedBox)
      } else {
        pushLine(lineNode.textContent ?? '', lineBox)
      }
    }
  }

  if (blocks.length > 0) return blocks

  const wordNodes = Array.from(doc.querySelectorAll('.ocrx_word'))
  const rawWords = wordNodes
    .map(node => ({
      text: node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      box: parseBbox(node.getAttribute('title')),
    }))
    .filter(word => word.text.length > 0 && word.box)

  const grouped = new Map<number, typeof rawWords>()

  for (const word of rawWords) {
    const key = Math.round(word.box!.y0 / 10) * 10
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(word)
  }

  for (const lineWords of Array.from(grouped.values())) {
    const sorted = [...lineWords].sort((a, b) => a.box!.x0 - b.box!.x0)
    const text = sorted.map(word => word.text).join(' ')
    const box = {
      x0: Math.min(...sorted.map(word => word.box!.x0)),
      y0: Math.min(...sorted.map(word => word.box!.y0)),
      x1: Math.max(...sorted.map(word => word.box!.x1)),
      y1: Math.max(...sorted.map(word => word.box!.y1)),
    }
    pushLine(text, box)
  }

  return blocks
}

function extractOcrTextBlocksFromLines(
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  previewWidth: number,
  previewHeight: number,
  ocrWidth: number,
  ocrHeight: number,
  lines: TesseractLine[] | undefined,
) {
  if (!Array.isArray(lines) || lines.length === 0) return []

  return lines
    .map(line => {
      const text =
        line.text?.replace(/\s+/g, ' ').trim() ??
        line.words?.map(word => word.text?.trim() ?? '').filter(Boolean).join(' ') ??
        ''
      const box = line.bbox
      if (!text || !box) return null
      return createOcrBlock(
        pageIndex,
        pageWidth,
        pageHeight,
        previewWidth,
        previewHeight,
        ocrWidth,
        ocrHeight,
        text,
        box,
        line.words?.find(word => word.font_name)?.font_name ?? 'ocr sans',
      )
    })
    .filter(Boolean) as EditableTextBlock[]
}

function extractOcrTextBlocksFromBlocks(
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
  previewWidth: number,
  previewHeight: number,
  ocrWidth: number,
  ocrHeight: number,
  blocks: TesseractBlock[] | null | undefined,
) {
  if (!Array.isArray(blocks) || blocks.length === 0) return []

  const lineBlocks: EditableTextBlock[] = []

  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      const extractedLines = extractOcrTextBlocksFromLines(
        pageIndex,
        pageWidth,
        pageHeight,
        previewWidth,
        previewHeight,
        ocrWidth,
        ocrHeight,
        paragraph.lines,
      )

      if (extractedLines.length > 0) {
        lineBlocks.push(...extractedLines)
      }
    }
  }

  if (lineBlocks.length > 0) return lineBlocks

  return blocks
    .map(block => {
      const text = block.text?.replace(/\s+/g, ' ').trim() ?? ''
      const box = block.bbox
      if (!text || !box) return null
      return createOcrBlock(
        pageIndex,
        pageWidth,
        pageHeight,
        previewWidth,
        previewHeight,
        ocrWidth,
        ocrHeight,
        text,
        box,
      )
    })
    .filter(Boolean) as EditableTextBlock[]
}

export async function loadEditablePdf(
  file: File,
  onProgress?: (progress: EditorLoadProgress) => void,
): Promise<EditablePdfDocument> {
  await ensureBrowserFallbackFontsLoaded()
  const pdfjsLib = await getPdfJs()
  const bytes = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: bytes,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise

  const pages: EditablePdfPage[] = []
  let totalWordCount = 0

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress?.({
      current: pageNumber - 1,
      total: pdf.numPages,
      message: `Loading page ${pageNumber} of ${pdf.numPages}…`,
    })

    const page = await pdf.getPage(pageNumber)
    const rawViewport = page.getViewport({ scale: 1 })
    const previewViewport = page.getViewport({ scale: EDIT_PREVIEW_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = previewViewport.width
    canvas.height = previewViewport.height
    const canvasContext = getCanvas2dContext(canvas, { willReadFrequently: true })

    await page.render({
      canvas,
      canvasContext,
      viewport: previewViewport,
      intent: 'display',
    }).promise

    const textContent = await page.getTextContent()
    const textBlocks = extractNativeTextBlocks(
      pdfjsLib,
      pageNumber - 1,
      textContent,
      rawViewport.width,
      rawViewport.height,
      previewViewport.width,
      previewViewport.height,
    ).map(block => {
      const textColor = sampleCanvasTextColor(
        canvasContext,
        block.previewX,
        block.previewY,
        block.previewWidth,
        block.previewHeight,
      )

      return {
        ...block,
        textColor,
        originalTextColor: textColor,
      }
    })

    const pageWordCount = textBlocks.reduce((sum, block) => sum + countWords(block.text), 0)
    totalWordCount += pageWordCount

    pages.push({
      pageIndex: pageNumber - 1,
      previewDataUrl: canvas.toDataURL('image/jpeg', 0.92),
      previewWidth: previewViewport.width,
      previewHeight: previewViewport.height,
      pdfWidth: rawViewport.width,
      pdfHeight: rawViewport.height,
      textBlocks,
      hasTextLayer: textBlocks.length > 0 && pageWordCount > 0,
      ocrApplied: false,
      wordCount: pageWordCount,
    })
  }

  const scannedPageCount = pages.filter(page => !page.hasTextLayer).length

  return {
    pageCount: pages.length,
    pages,
    scannedPageCount,
    allPagesScanned: scannedPageCount === pages.length,
    totalWordCount,
  }
}

export async function runOcrForEditablePages(
  file: File,
  pages: EditablePdfPage[],
  language: string,
  onProgress?: (progress: OcrProgress) => void,
): Promise<EditableOcrResult> {
  const targetPages = pages.filter(page => !page.hasTextLayer || page.textBlocks.length === 0)
  if (!targetPages.length) {
    return {
      pages,
      recognizedPageCount: 0,
      detectedBlockCount: 0,
      unresolvedPageCount: 0,
    }
  }

  const pdfjsLib = await getPdfJs()
  const bytes = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: bytes,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise

  const worker = await createWorker(language, 1, {
    workerPath: 'https://unpkg.com/tesseract.js/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://unpkg.com/tesseract.js-core/tesseract-core.wasm.js',
    logger: () => {},
  })

  await worker.setParameters({
    preserve_interword_spaces: '1',
  })

  const updatedPages = [...pages]
  let recognizedPageCount = 0
  let detectedBlockCount = 0

  for (let index = 0; index < targetPages.length; index++) {
    const pageState = targetPages[index]
    const page = await pdf.getPage(pageState.pageIndex + 1)
    const viewport = page.getViewport({ scale: OCR_RENDER_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const canvasContext = getCanvas2dContext(canvas)

    onProgress?.({
      current: index,
      total: targetPages.length,
      message: `Running OCR on page ${pageState.pageIndex + 1} of ${pages.length}…`,
    })

    await page.render({
      canvas,
      canvasContext,
      viewport,
      intent: 'print',
    }).promise

    const { data } = await worker.recognize(
      canvas,
      {},
      {
        blocks: true,
        hocr: true,
        tsv: true,
      },
    )
    const blockBlocks = extractOcrTextBlocksFromBlocks(
      pageState.pageIndex,
      pageState.pdfWidth,
      pageState.pdfHeight,
      pageState.previewWidth,
      pageState.previewHeight,
      canvas.width,
      canvas.height,
      (data as { blocks?: TesseractBlock[] | null }).blocks,
    )
    const ocrBlocks =
      blockBlocks.length > 0
        ? blockBlocks
        : extractOcrTextBlocks(
            pageState.pageIndex,
            pageState.pdfWidth,
            pageState.pdfHeight,
            pageState.previewWidth,
            pageState.previewHeight,
            canvas.width,
            canvas.height,
            data.hocr ?? '',
          )

    const wordCount = ocrBlocks.reduce((sum, block) => sum + countWords(block.text), 0)
    if (ocrBlocks.length > 0) {
      recognizedPageCount += 1
      detectedBlockCount += ocrBlocks.length
    }
    updatedPages[pageState.pageIndex] = {
      ...pageState,
      textBlocks: ocrBlocks.length > 0 ? ocrBlocks : pageState.textBlocks,
      hasTextLayer: ocrBlocks.length > 0,
      ocrApplied: ocrBlocks.length > 0,
      wordCount: ocrBlocks.length > 0 ? wordCount : pageState.wordCount,
    }

    canvas.width = 0
    canvas.height = 0
  }

  await worker.terminate()
  const unresolvedPageCount = updatedPages.filter(page => !page.hasTextLayer).length

  onProgress?.({
    current: targetPages.length,
    total: targetPages.length,
    message:
      detectedBlockCount > 0
        ? `OCR found ${detectedBlockCount} editable text block${detectedBlockCount === 1 ? '' : 's'}.`
        : 'OCR finished, but no editable text regions were detected.',
  })

  return {
    pages: updatedPages,
    recognizedPageCount,
    detectedBlockCount,
    unresolvedPageCount,
  }
}

async function loadPreviewCanvas(page: EditablePdfPage) {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Could not decode page preview'))
    image.src = page.previewDataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = page.previewWidth
  canvas.height = page.previewHeight
  const ctx = getCanvas2dContext(canvas, { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

function sampleBackgroundColor(
  ctx: CanvasRenderingContext2D,
  page: EditablePdfPage,
  block: EditableTextBlock,
) {
  const box = blockToOverlayBox(block, page)
  const x = Math.floor(clamp((box.x - 0.01) * page.previewWidth, 0, page.previewWidth - 1))
  const y = Math.floor(clamp((box.y - 0.01) * page.previewHeight, 0, page.previewHeight - 1))
  const width = Math.max(2, Math.ceil(clamp((box.width + 0.02) * page.previewWidth, 2, page.previewWidth - x)))
  const height = Math.max(2, Math.ceil(clamp((box.height + 0.02) * page.previewHeight, 2, page.previewHeight - y)))
  const image = ctx.getImageData(x, y, width, height)

  let r = 0
  let g = 0
  let b = 0
  let samples = 0

  for (let i = 0; i < image.data.length; i += 4) {
    const alpha = image.data[i + 3]
    if (alpha < 8) continue

    const red = image.data[i]
    const green = image.data[i + 1]
    const blue = image.data[i + 2]
    const brightness = (red + green + blue) / 3
    if (brightness < 40) continue

    r += red
    g += green
    b += blue
    samples += 1
  }

  if (!samples) return rgb(1, 1, 1)
  return rgb(r / samples / 255, g / samples / 255, b / samples / 255)
}

function normalizeSingleLineText(text: string) {
  return text.replace(/\s*\n+\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const splitWord = (word: string) => {
    if (!word) return ['']
    const segments: string[] = []
    let chunk = ''

    for (const character of word) {
      const candidate = `${chunk}${character}`
      if (!chunk || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        chunk = candidate
        continue
      }

      segments.push(chunk)
      chunk = character
    }

    if (chunk) segments.push(chunk)
    return segments.length ? segments : [word]
  }

  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }

    let line = ''
    for (const word of words) {
      const parts =
        font.widthOfTextAtSize(word, size) > maxWidth
          ? splitWord(word)
          : [word]

      for (const part of parts) {
        const candidate = line ? `${line} ${part}` : part
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
          line = candidate
        } else {
          lines.push(line)
          line = part
        }
      }
    }

    if (line) lines.push(line)
  }

  return lines.length ? lines : ['']
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const splitWord = (word: string) => {
    if (!word) return ['']
    const segments: string[] = []
    let chunk = ''

    for (const character of word) {
      const candidate = `${chunk}${character}`
      if (!chunk || ctx.measureText(candidate).width <= maxWidth) {
        chunk = candidate
        continue
      }

      segments.push(chunk)
      chunk = character
    }

    if (chunk) segments.push(chunk)
    return segments.length ? segments : [word]
  }

  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }

    let line = ''
    for (const word of words) {
      const parts = ctx.measureText(word).width > maxWidth ? splitWord(word) : [word]

      for (const part of parts) {
        const candidate = line ? `${line} ${part}` : part
        if (ctx.measureText(candidate).width <= maxWidth || !line) {
          line = candidate
        } else {
          lines.push(line)
          line = part
        }
      }
    }

    if (line) lines.push(line)
  }

  return lines.length ? lines : ['']
}

function cssFontForHint(fontHint: string, fontSize: number) {
  const descriptor = describeFontHint(fontHint)
  const family = getFontPresentation(fontHint).cssFontFamily
  const style = descriptor.style === 'italic' ? 'italic' : 'normal'
  const weight = descriptor.weight === 'bold' ? '700' : '400'

  return `${style} ${weight} ${fontSize}px ${family}`
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map(value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0'))
    .join('')}`
}

function hexToRgb(color: string) {
  const value = normalizeHexColor(color).replace('#', '')
  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16),
  }
}

function sampleCanvasTextColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const left = Math.floor(clamp(x, 0, ctx.canvas.width - 1))
  const top = Math.floor(clamp(y, 0, ctx.canvas.height - 1))
  const sampleWidth = Math.max(2, Math.ceil(clamp(width, 2, ctx.canvas.width - left)))
  const sampleHeight = Math.max(2, Math.ceil(clamp(height, 2, ctx.canvas.height - top)))
  const image = ctx.getImageData(left, top, sampleWidth, sampleHeight)
  const candidates: Array<{ red: number; green: number; blue: number; brightness: number }> = []

  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = image.data[index + 3]
    if (alpha < 32) continue

    const red = image.data[index]
    const green = image.data[index + 1]
    const blue = image.data[index + 2]
    const brightness = (red + green + blue) / 3
    if (brightness > 228) continue

    candidates.push({ red, green, blue, brightness })
  }

  if (!candidates.length) return DEFAULT_TEXT_COLOR

  candidates.sort((a, b) => a.brightness - b.brightness)
  const sampleCount = Math.max(1, Math.ceil(candidates.length * 0.2))
  const sample = candidates.slice(0, sampleCount)
  const red = sample.reduce((sum, item) => sum + item.red, 0) / sample.length
  const green = sample.reduce((sum, item) => sum + item.green, 0) / sample.length
  const blue = sample.reduce((sum, item) => sum + item.blue, 0) / sample.length
  return rgbToHex(red, green, blue)
}

function sampleCanvasFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const padding = 6
  const left = Math.floor(clamp(x - padding, 0, ctx.canvas.width - 1))
  const top = Math.floor(clamp(y - padding, 0, ctx.canvas.height - 1))
  const sampleWidth = Math.max(2, Math.ceil(clamp(width + padding * 2, 2, ctx.canvas.width - left)))
  const sampleHeight = Math.max(2, Math.ceil(clamp(height + padding * 2, 2, ctx.canvas.height - top)))
  const image = ctx.getImageData(left, top, sampleWidth, sampleHeight)

  let r = 0
  let g = 0
  let b = 0
  let samples = 0

  for (let index = 0; index < image.data.length; index += 4) {
    const pixelIndex = index / 4
    const pixelX = pixelIndex % sampleWidth
    const pixelY = Math.floor(pixelIndex / sampleWidth)
    const absoluteX = left + pixelX
    const absoluteY = top + pixelY
    const insideEditedBox =
      absoluteX >= x &&
      absoluteX <= x + width &&
      absoluteY >= y &&
      absoluteY <= y + height
    if (insideEditedBox) continue

    const alpha = image.data[index + 3]
    if (alpha < 8) continue

    const red = image.data[index]
    const green = image.data[index + 1]
    const blue = image.data[index + 2]
    const brightness = (red + green + blue) / 3
    if (brightness < 170) continue

    r += red
    g += green
    b += blue
    samples += 1
  }

  if (!samples) {
    return {
      fill: 'rgb(255, 255, 255)',
      pdf: rgb(1, 1, 1),
    }
  }

  return {
    fill: `rgb(${Math.round(r / samples)}, ${Math.round(g / samples)}, ${Math.round(b / samples)})`,
    pdf: rgb(r / samples / 255, g / samples / 255, b / samples / 255),
  }
}

interface FittedTextLayout {
  lines: string[]
  fontSize: number
  lineHeight: number
  widestLine: number
  height: number
  singleLine: boolean
}

function resolveSoftMaxHeight(text: string, fontSize: number, maxHeight?: number) {
  if (!maxHeight || !Number.isFinite(maxHeight)) return Number.POSITIVE_INFINITY

  const explicitLineCount = Math.max(text.split('\n').length, 1)
  const growthFactor = explicitLineCount > 1 ? Math.min(Math.max(explicitLineCount, 2), 4) : 1.9
  return Math.max(
    maxHeight,
    maxHeight * growthFactor,
    fontSize * 1.16 * Math.min(Math.max(explicitLineCount, 1), 4),
  )
}

function resolveLineHeight(fontSize: number, lineCount: number, targetHeight?: number) {
  if (!targetHeight || !Number.isFinite(targetHeight)) {
    return fontSize * (lineCount > 1 ? 1.1 : 1.16)
  }

  const idealLineHeight = targetHeight / Math.max(lineCount, 1)
  const minFactor = lineCount > 1 ? 1.02 : 1.08
  const maxFactor = lineCount > 2 ? 1.14 : 1.22

  return clamp(idealLineHeight, fontSize * minFactor, fontSize * maxFactor)
}

function fitPdfTextLayout(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxHeight?: number,
  lineHeightMultiplier = 1,
) {
  const prefersSingleLine = !text.includes('\n')
  const singleLineText = normalizeSingleLineText(text)
  const minimumSize = Math.max(6.5, fontSize * 0.58)
  const softMaxHeight = resolveSoftMaxHeight(text, fontSize, maxHeight)
  let nextSize = fontSize
  let bestLayout: FittedTextLayout | null = null

  if (prefersSingleLine && singleLineText) {
    while (nextSize >= minimumSize) {
      const width = font.widthOfTextAtSize(singleLineText, nextSize)
      if (width <= maxWidth * 0.995) {
        const lineHeight = resolveLineHeight(nextSize, 1, maxHeight) * lineHeightMultiplier
        return {
          lines: [singleLineText],
          fontSize: nextSize,
          lineHeight,
          widestLine: width,
          height: lineHeight,
          singleLine: true,
        } satisfies FittedTextLayout
      }

      if (nextSize === minimumSize) break
      nextSize = Math.max(minimumSize, Number((nextSize * 0.96).toFixed(2)))
    }
  }

  nextSize = fontSize

  while (nextSize >= minimumSize) {
    const lines = wrapText(text, font, nextSize, Math.max(maxWidth, nextSize))
    const widestLine = lines.reduce(
      (widest, line) => Math.max(widest, font.widthOfTextAtSize(line || ' ', nextSize)),
      0,
    )
    const lineHeight = resolveLineHeight(nextSize, lines.length, softMaxHeight) * lineHeightMultiplier
    const height = lineHeight * lines.length
    const layout = {
      lines,
      fontSize: nextSize,
      lineHeight,
      widestLine,
      height,
      singleLine: lines.length === 1,
    } satisfies FittedTextLayout

    if (
      !bestLayout ||
      layout.height < bestLayout.height - 0.1 ||
      (Math.abs(layout.height - bestLayout.height) <= 0.1 && layout.fontSize > bestLayout.fontSize)
    ) {
      bestLayout = layout
    }

    if (height <= softMaxHeight + 0.25) {
      return layout
    }

    if (nextSize === minimumSize) break
    nextSize = Math.max(minimumSize, Number((nextSize * 0.96).toFixed(2)))
  }

  return (
    bestLayout ?? {
      lines: wrapText(text, font, fontSize, Math.max(maxWidth, fontSize)),
      fontSize,
      lineHeight: resolveLineHeight(fontSize, 1, maxHeight) * lineHeightMultiplier,
      widestLine: font.widthOfTextAtSize(singleLineText || text || ' ', fontSize),
      height: resolveLineHeight(fontSize, 1, maxHeight) * lineHeightMultiplier,
      singleLine: true,
    }
  )
}

function fitCanvasTextLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  maxWidth: number,
  fontHint: string,
  maxHeight?: number,
  lineHeightMultiplier = 1,
) {
  const prefersSingleLine = !text.includes('\n')
  const singleLineText = normalizeSingleLineText(text)
  const minimumSize = Math.max(6.5, fontSize * 0.58)
  const softMaxHeight = resolveSoftMaxHeight(text, fontSize, maxHeight)
  let nextSize = fontSize
  let bestLayout: FittedTextLayout | null = null

  if (prefersSingleLine && singleLineText) {
    while (nextSize >= minimumSize) {
      ctx.save()
      ctx.font = cssFontForHint(fontHint, nextSize)
      const width = ctx.measureText(singleLineText).width
      ctx.restore()

      if (width <= maxWidth * 0.995) {
        const lineHeight = resolveLineHeight(nextSize, 1, maxHeight) * lineHeightMultiplier
        return {
          lines: [singleLineText],
          fontSize: nextSize,
          lineHeight,
          widestLine: width,
          height: lineHeight,
          singleLine: true,
        } satisfies FittedTextLayout
      }

      if (nextSize === minimumSize) break
      nextSize = Math.max(minimumSize, Number((nextSize * 0.96).toFixed(2)))
    }
  }

  nextSize = fontSize

  while (nextSize >= minimumSize) {
    ctx.save()
    ctx.font = cssFontForHint(fontHint, nextSize)
    const lines = wrapCanvasText(ctx, text, Math.max(maxWidth, nextSize))
    const widestLine = lines.reduce(
      (widest, line) => Math.max(widest, ctx.measureText(line || ' ').width),
      0,
    )
    ctx.restore()

    const lineHeight = resolveLineHeight(nextSize, lines.length, softMaxHeight) * lineHeightMultiplier
    const height = lineHeight * lines.length
    const layout = {
      lines,
      fontSize: nextSize,
      lineHeight,
      widestLine,
      height,
      singleLine: lines.length === 1,
    } satisfies FittedTextLayout

    if (
      !bestLayout ||
      layout.height < bestLayout.height - 0.1 ||
      (Math.abs(layout.height - bestLayout.height) <= 0.1 && layout.fontSize > bestLayout.fontSize)
    ) {
      bestLayout = layout
    }

    if (height <= softMaxHeight + 0.25) {
      return layout
    }

    if (nextSize === minimumSize) break
    nextSize = Math.max(minimumSize, Number((nextSize * 0.96).toFixed(2)))
  }

  ctx.save()
  ctx.font = cssFontForHint(fontHint, fontSize)
  const widestLine = ctx.measureText(singleLineText || text || ' ').width
  ctx.restore()

  return (
    bestLayout ?? {
      lines: [singleLineText || text || ''],
      fontSize,
      lineHeight: resolveLineHeight(fontSize, 1, maxHeight) * lineHeightMultiplier,
      widestLine,
      height: resolveLineHeight(fontSize, 1, maxHeight) * lineHeightMultiplier,
      singleLine: true,
    }
  )
}

function blockToCanvasMetrics(
  block: EditableTextBlock,
  page: EditablePdfPage,
  canvas: HTMLCanvasElement,
) {
  const scaleX = canvas.width / page.previewWidth
  const scaleY = canvas.height / page.previewHeight

  return {
    x: block.previewX * scaleX,
    y: block.previewY * scaleY,
    width: Math.max(block.previewWidth * scaleX, 20),
    height: Math.max(block.previewHeight * scaleY, 16),
    fontSize: Math.max(block.previewFontSize * scaleY, 10),
  }
}

function drawWrappedCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  maxWidth: number,
  color: string,
  fontHint: string,
  maxHeight?: number,
  textAlign: EditableTextAlign = 'left',
  lineHeightMultiplier = 1,
) {
  const layout = fitCanvasTextLayout(
    ctx,
    text,
    fontSize,
    Math.max(maxWidth, fontSize),
    fontHint,
    maxHeight,
    lineHeightMultiplier,
  )
  ctx.save()
  ctx.font = cssFontForHint(fontHint, layout.fontSize)
  ctx.fillStyle = color
  ctx.textBaseline = 'top'
  layout.lines.forEach((line, index) => {
    const lineWidth = ctx.measureText(line).width
    const drawX =
      textAlign === 'center'
        ? x + Math.max(0, (maxWidth - lineWidth) / 2)
        : textAlign === 'right'
          ? x + Math.max(0, maxWidth - lineWidth)
          : x
    ctx.fillText(line, drawX, y + index * layout.lineHeight)
  })
  ctx.restore()

  return {
    lineCount: layout.lines.length,
    lineHeight: layout.lineHeight,
    widestLine: layout.widestLine,
    fontSize: layout.fontSize,
    height: layout.height,
    singleLine: layout.singleLine,
  }
}

async function loadImageElement(src: string) {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Could not decode image asset'))
    image.src = src
  })
  return image
}

async function renderPdfPageForRebuild(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  pageIndex: number,
) {
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale: EDIT_REBUILD_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const canvasContext = getCanvas2dContext(canvas, { willReadFrequently: true })

  await page.render({
    canvas,
    canvasContext,
    viewport,
    intent: 'print',
  }).promise

  return canvas
}

async function drawRebuiltPageCanvas(
  canvas: HTMLCanvasElement,
  pageState: EditablePdfPage,
  pageOverlays: EditOverlay[],
) {
  await ensureBrowserFallbackFontsLoaded()
  const ctx = getCanvas2dContext(canvas)

  for (const overlay of pageOverlays) {
    if (overlay.type !== 'highlight') continue
    const { red, green, blue } = hexToRgb(overlay.color)
    ctx.save()
    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.35)`
    ctx.fillRect(
      overlay.x * canvas.width,
      overlay.y * canvas.height,
      overlay.width * canvas.width,
      overlay.height * canvas.height,
    )
    ctx.restore()
  }

  for (const overlay of pageOverlays) {
    if (overlay.type !== 'whiteout') continue
    ctx.save()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(
      overlay.x * canvas.width,
      overlay.y * canvas.height,
      overlay.width * canvas.width,
      overlay.height * canvas.height,
    )
    ctx.restore()
  }

  for (const block of pageState.textBlocks.filter(item => item.edited)) {
    const metrics = blockToCanvasMetrics(block, pageState, canvas)
    const previewLayout = fitCanvasTextLayout(
      ctx,
      block.text,
      metrics.fontSize,
      metrics.width,
      block.fontHint,
      metrics.height,
      block.lineHeightMultiplier,
    )
    const coverWidth = Math.max(metrics.width + 8, previewLayout.widestLine + previewLayout.fontSize * 1.05)
    const coverHeight = Math.max(metrics.height + 6, previewLayout.height + previewLayout.fontSize * 0.55)
    const background = sampleCanvasFill(ctx, metrics.x, metrics.y, coverWidth, coverHeight)
    ctx.save()
    ctx.fillStyle = background.fill
    ctx.fillRect(
      Math.max(0, metrics.x - 3),
      Math.max(0, metrics.y - 2),
      Math.min(canvas.width - Math.max(0, metrics.x - 3), coverWidth + 4),
      Math.min(canvas.height - Math.max(0, metrics.y - 2), coverHeight + 4),
    )
    ctx.restore()

    drawWrappedCanvasText(
      ctx,
      block.text,
      metrics.x,
      metrics.y,
      metrics.fontSize,
      metrics.width,
      block.textColor,
      block.fontHint,
      metrics.height,
      block.textAlign,
      block.lineHeightMultiplier,
    )
  }

  for (const overlay of pageOverlays) {
    if (overlay.type === 'text-overlay' && overlay.text.trim()) {
      const { red, green, blue } = hexToRgb(overlay.color)
      drawWrappedCanvasText(
        ctx,
        overlay.text,
        overlay.x * canvas.width,
        overlay.y * canvas.height,
        Math.max(overlay.fontSize * (canvas.height / pageState.pdfHeight), 10),
        Math.max(overlay.width * canvas.width, overlay.fontSize * 2),
        `rgb(${red}, ${green}, ${blue})`,
        'sans',
        undefined,
        overlay.textAlign,
        overlay.lineHeightMultiplier,
      )
    }

    if (overlay.type === 'underline') {
      const { red, green, blue } = hexToRgb(overlay.color)
      ctx.save()
      ctx.strokeStyle = `rgb(${red}, ${green}, ${blue})`
      ctx.lineWidth = Math.max(2, canvas.height / pageState.pdfHeight * 1.8)
      ctx.beginPath()
      ctx.moveTo(overlay.x * canvas.width, (overlay.y + overlay.height) * canvas.height)
      ctx.lineTo((overlay.x + overlay.width) * canvas.width, (overlay.y + overlay.height) * canvas.height)
      ctx.stroke()
      ctx.restore()
    }

    if (overlay.type === 'signature' || overlay.type === 'image') {
      const image = await loadImageElement(overlay.dataUrl)
      const drawWidth = overlay.width * canvas.width
      const drawHeight = overlay.height * canvas.height
      const centerX = overlay.x * canvas.width + drawWidth / 2
      const centerY = overlay.y * canvas.height + drawHeight / 2

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate((getMediaOverlayRotationDeg(overlay) * Math.PI) / 180)
      ctx.globalAlpha = getMediaOverlayOpacity(overlay)
      ctx.drawImage(
        image,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
      )
      ctx.restore()
    }
  }
}

async function resolveFont(
  doc: PDFDocument,
  cache: Map<string, PDFFont>,
  fontHint: string,
) {
  const descriptor = describeFontHint(fontHint)
  const match = resolveEmbeddedFontFamily(fontHint, descriptor)
  const asset = EMBEDDED_FONT_ASSETS[match.family]
  const variant = fontVariantKey(descriptor)
  const customKey = `custom:${match.family}:${variant}`

  if (!cache.has(customKey)) {
    try {
      await ensureFontkit(doc)
      const bytes = await fetchEmbeddedFontBytes(asset.files[variant])
      cache.set(customKey, await doc.embedFont(bytes, { subset: true }))
    } catch {
      // Fall back to a standard PDF font when embedded font loading fails.
    }
  }

  if (cache.has(customKey)) {
    return {
      font: cache.get(customKey)!,
      substituted: !match.exactMatch,
    }
  }

  const fontName = standardFontForHint(fontHint)
  const standardKey = `standard:${fontName}`
  if (!cache.has(standardKey)) {
    cache.set(standardKey, await doc.embedFont(fontName))
  }
  return {
    font: cache.get(standardKey)!,
    substituted: true,
  }
}

function drawWrappedText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  maxWidth: number,
  maxHeight: number | undefined,
  color: ReturnType<typeof rgb>,
  textAlign: EditableTextAlign = 'left',
  lineHeightMultiplier = 1,
  opacity = 1,
) {
  const layout = fitPdfTextLayout(
    text,
    font,
    fontSize,
    Math.max(maxWidth, fontSize),
    maxHeight,
    lineHeightMultiplier,
  )

  layout.lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, layout.fontSize)
    const drawX =
      textAlign === 'center'
        ? x + Math.max(0, (maxWidth - lineWidth) / 2)
        : textAlign === 'right'
          ? x + Math.max(0, maxWidth - lineWidth)
          : x
    page.drawText(line, {
      x: drawX,
      y: y - index * layout.lineHeight,
      font,
      size: layout.fontSize,
      color,
      lineHeight: layout.lineHeight,
      opacity,
    })
  })

  return {
    lineCount: layout.lines.length,
    lineHeight: layout.lineHeight,
    widestLine: layout.widestLine,
    fontSize: layout.fontSize,
    height: layout.height,
    singleLine: layout.singleLine,
  }
}

function escapePdfLiteralString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function encodeUtf16BeHexString(value: string) {
  let hex = 'FEFF'

  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0
    if (codePoint <= 0xffff) {
      hex += codePoint.toString(16).toUpperCase().padStart(4, '0')
      continue
    }

    const adjusted = codePoint - 0x10000
    const high = 0xd800 + (adjusted >> 10)
    const low = 0xdc00 + (adjusted & 0x3ff)
    hex += high.toString(16).toUpperCase().padStart(4, '0')
    hex += low.toString(16).toUpperCase().padStart(4, '0')
  }

  return `<${hex}>`
}

function countOccurrences(content: string, needle: string) {
  if (!needle) return 0

  let count = 0
  let cursor = 0

  while (cursor < content.length) {
    const index = content.indexOf(needle, cursor)
    if (index === -1) break
    count += 1
    cursor = index + needle.length
  }

  return count
}

function replaceUniqueEncodedText(content: string, originalText: string, replacementText: string) {
  const literalOriginal = `(${escapePdfLiteralString(originalText)})`
  const literalReplacement = `(${escapePdfLiteralString(replacementText)})`

  if (countOccurrences(content, literalOriginal) === 1) {
    return content.replace(literalOriginal, literalReplacement)
  }

  const utf16Original = encodeUtf16BeHexString(originalText)
  if (countOccurrences(content, utf16Original) === 1) {
    return content.replace(utf16Original, encodeUtf16BeHexString(replacementText))
  }

  return null
}

function stringToPdfBytes(value: string) {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff
  }
  return bytes
}

function styleChangedFromOriginal(block: EditableTextBlock) {
  return (
    !fontHintsMatch(block.fontHint, block.originalFontHint) ||
    Math.abs(block.pdfFontSize - block.originalPdfFontSize) > 0.02 ||
    normalizeHexColor(block.textColor) !== normalizeHexColor(block.originalTextColor) ||
    block.textAlign !== block.originalTextAlign ||
    Math.abs(block.lineHeightMultiplier - block.originalLineHeightMultiplier) > 0.02
  )
}

export function isExactRewriteCandidateBlock(block: EditableTextBlock) {
  return (
    block.edited &&
    block.source === 'native' &&
    !styleChangedFromOriginal(block) &&
    !block.originalText.includes('\n') &&
    !block.text.includes('\n')
  )
}

export function isExactRewriteCandidatePage(page: EditablePdfPage, overlays: EditOverlay[]) {
  if (!page.hasTextLayer || page.ocrApplied) return false
  if (overlays.some(overlay => overlay.pageIndex === page.pageIndex && overlay.type === 'whiteout')) return false

  const editedBlocks = page.textBlocks.filter(block => block.edited)
  return editedBlocks.length > 0 && editedBlocks.every(isExactRewriteCandidateBlock)
}

async function canKeepSingleLineForExactRewrite(
  doc: PDFDocument,
  cache: Map<string, PDFFont>,
  block: EditableTextBlock,
) {
  const { font } = await resolveFont(doc, cache, block.originalFontHint)
  const originalText = normalizeSingleLineText(block.originalText.replace(/\r/g, ''))
  const replacementText = normalizeSingleLineText(block.text.replace(/\r/g, ''))
  const originalWidth = font.widthOfTextAtSize(originalText || ' ', block.originalPdfFontSize)
  const replacementWidth = font.widthOfTextAtSize(replacementText || ' ', block.originalPdfFontSize)
  const maxWidth = Math.max(block.pdfWidth, originalWidth) + 0.5

  return replacementWidth <= maxWidth
}

async function tryExactRewritePage(
  doc: PDFDocument,
  page: PDFPage,
  pageState: EditablePdfPage,
  editedBlocks: EditableTextBlock[],
  fontCache: Map<string, PDFFont>,
) {
  const normalizedEntries = page.node.normalizedEntries()
  const contents = normalizedEntries.Contents
  if (!contents) return false

  let decodedContent = ''

  for (let index = 0, count = contents.size(); index < count; index += 1) {
    const stream = contents.lookup(index)
    if (stream instanceof PDFRawStream) {
      decodedContent += new TextDecoder('latin1').decode(decodePDFRawStream(stream).decode())
      decodedContent += '\n'
      continue
    }

    if (stream instanceof PDFContentStream) {
      decodedContent += new TextDecoder('latin1').decode(stream.getUnencodedContents())
      decodedContent += '\n'
      continue
    }

    return false
  }

  const blocksByLength = [...editedBlocks].sort((left, right) => right.originalText.length - left.originalText.length)

  for (const block of blocksByLength) {
    if (!(await canKeepSingleLineForExactRewrite(doc, fontCache, block))) return false

    const nextContent = replaceUniqueEncodedText(
      decodedContent,
      block.originalText.replace(/\r/g, ''),
      block.text.replace(/\r/g, ''),
    )

    if (!nextContent) return false
    decodedContent = nextContent
  }

  const replacementStream = doc.context.flateStream(stringToPdfBytes(decodedContent))
  const replacementRef = doc.context.register(replacementStream)
  page.node.set(PDFName.of('Contents'), doc.context.obj([replacementRef]))

  return true
}

function whiteoutCoversBlock(
  overlay: WhiteoutOverlay,
  block: EditableTextBlock,
  pageState: EditablePdfPage,
) {
  const overlayLeft = overlay.x
  const overlayTop = overlay.y
  const overlayRight = overlay.x + overlay.width
  const overlayBottom = overlay.y + overlay.height
  const blockLeft = block.previewX / pageState.previewWidth
  const blockTop = block.previewY / pageState.previewHeight
  const blockRight = (block.previewX + block.previewWidth) / pageState.previewWidth
  const blockBottom = (block.previewY + block.previewHeight) / pageState.previewHeight
  const blockCenterX = (blockLeft + blockRight) / 2
  const blockCenterY = (blockTop + blockBottom) / 2

  const intersectWidth = Math.max(0, Math.min(overlayRight, blockRight) - Math.max(overlayLeft, blockLeft))
  const intersectHeight = Math.max(0, Math.min(overlayBottom, blockBottom) - Math.max(overlayTop, blockTop))

  if (!intersectWidth || !intersectHeight) return false

  const intersectionArea = intersectWidth * intersectHeight
  const blockArea = Math.max((blockRight - blockLeft) * (blockBottom - blockTop), 0.0001)
  const widthCoverage = intersectWidth / Math.max(blockRight - blockLeft, 0.0001)
  const heightCoverage = intersectHeight / Math.max(blockBottom - blockTop, 0.0001)
  const centerCovered =
    blockCenterX >= overlayLeft &&
    blockCenterX <= overlayRight &&
    blockCenterY >= overlayTop &&
    blockCenterY <= overlayBottom

  return (
    centerCovered ||
    intersectionArea / blockArea >= 0.18 ||
    (widthCoverage >= 0.55 && heightCoverage >= 0.28)
  )
}

function blocksSubstantiallyOverlap(
  source: EditableTextBlock,
  target: EditableTextBlock,
  pageState: EditablePdfPage,
) {
  const sourceLeft = source.previewX / pageState.previewWidth
  const sourceTop = source.previewY / pageState.previewHeight
  const sourceRight = (source.previewX + source.previewWidth) / pageState.previewWidth
  const sourceBottom = (source.previewY + source.previewHeight) / pageState.previewHeight
  const targetLeft = target.previewX / pageState.previewWidth
  const targetTop = target.previewY / pageState.previewHeight
  const targetRight = (target.previewX + target.previewWidth) / pageState.previewWidth
  const targetBottom = (target.previewY + target.previewHeight) / pageState.previewHeight

  const intersectWidth = Math.max(0, Math.min(sourceRight, targetRight) - Math.max(sourceLeft, targetLeft))
  const intersectHeight = Math.max(0, Math.min(sourceBottom, targetBottom) - Math.max(sourceTop, targetTop))
  if (!intersectWidth || !intersectHeight) return false

  const intersectionArea = intersectWidth * intersectHeight
  const sourceArea = Math.max((sourceRight - sourceLeft) * (sourceBottom - sourceTop), 0.0001)
  const targetArea = Math.max((targetRight - targetLeft) * (targetBottom - targetTop), 0.0001)

  return intersectionArea / sourceArea >= 0.18 || intersectionArea / targetArea >= 0.18
}

function blocksShareLineBand(
  source: EditableTextBlock,
  target: EditableTextBlock,
  pageState: EditablePdfPage,
) {
  const sourceTop = source.previewY / pageState.previewHeight
  const sourceBottom = (source.previewY + source.previewHeight) / pageState.previewHeight
  const targetTop = target.previewY / pageState.previewHeight
  const targetBottom = (target.previewY + target.previewHeight) / pageState.previewHeight
  const overlapHeight = Math.max(0, Math.min(sourceBottom, targetBottom) - Math.max(sourceTop, targetTop))
  const sourceHeight = Math.max(sourceBottom - sourceTop, 0.0001)
  const targetHeight = Math.max(targetBottom - targetTop, 0.0001)
  const sourceCenter = (sourceTop + sourceBottom) / 2
  const targetCenter = (targetTop + targetBottom) / 2

  return (
    overlapHeight / sourceHeight >= 0.35 ||
    overlapHeight / targetHeight >= 0.35 ||
    Math.abs(sourceCenter - targetCenter) <= Math.max(sourceHeight, targetHeight) * 0.75
  )
}

export async function saveEditedPdf(
  file: File,
  pages: EditablePdfPage[],
  overlays: EditOverlay[],
): Promise<SaveEditedPdfResult> {
  await ensureBrowserFallbackFontsLoaded()
  const bytes = await file.arrayBuffer()
  const sourceDoc = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
  const doc = await PDFDocument.create()
  const fontCache = new Map<string, PDFFont>()
  let editedTextCount = 0
  let substitutedFontCount = 0
  let scannedPageCount = 0
  let rebuiltPageCount = 0
  let exactRewritePageCount = 0
  let exactRewriteTextCount = 0
  let whiteoutCount = 0
  let pdfjsLib: Awaited<ReturnType<typeof getPdfJs>> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfjsDoc: any = null

  for (const pageState of pages) {
    const pageOverlays = overlays.filter(overlay => overlay.pageIndex === pageState.pageIndex)
    const whiteoutOverlays = pageOverlays.filter(
      (overlay): overlay is WhiteoutOverlay => overlay.type === 'whiteout'
    )
    const editedBlocks = pageState.textBlocks.filter(block => block.edited)
    const hasEditedExistingText = editedBlocks.length > 0
    const canAttemptExactRewrite =
      whiteoutOverlays.length === 0 &&
      isExactRewriteCandidatePage(pageState, pageOverlays)

    let pdfPage: PDFPage | null = null
    let exactRewriteApplied = false

    if (pageState.ocrApplied) {
      scannedPageCount += 1
    }

    whiteoutCount += whiteoutOverlays.length

    if (canAttemptExactRewrite) {
      const [candidatePage] = await doc.copyPages(sourceDoc, [pageState.pageIndex])
      exactRewriteApplied = await tryExactRewritePage(
        doc,
        candidatePage,
        pageState,
        editedBlocks,
        fontCache,
      )

      if (exactRewriteApplied) {
        pdfPage = candidatePage
        doc.addPage(pdfPage)
        exactRewritePageCount += 1
        exactRewriteTextCount += editedBlocks.length
      }
    }

    const requiresRebuild = !exactRewriteApplied && (hasEditedExistingText || whiteoutOverlays.length > 0)

    if (!exactRewriteApplied && requiresRebuild) {
      if (!pdfjsLib) pdfjsLib = await getPdfJs()
      if (!pdfjsDoc) {
        pdfjsDoc = await pdfjsLib.getDocument({
          data: bytes.slice(0),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          useWorkerFetch: false,
          isEvalSupported: false,
        }).promise
      }

      const rebuiltCanvas = await renderPdfPageForRebuild(pdfjsDoc, pageState.pageIndex)
      await drawRebuiltPageCanvas(rebuiltCanvas, pageState, pageOverlays)

      pdfPage = doc.addPage([pageState.pdfWidth, pageState.pdfHeight])
      const image = await doc.embedPng(rebuiltCanvas.toDataURL('image/png'))
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: pageState.pdfWidth,
        height: pageState.pdfHeight,
      })
      rebuiltPageCount += 1
    } else if (!exactRewriteApplied) {
      const [copiedPage] = await doc.copyPages(sourceDoc, [pageState.pageIndex])
      pdfPage = copiedPage
      doc.addPage(pdfPage)
    }

    if (!pdfPage) {
      throw new Error(`Could not prepare export page ${pageState.pageIndex + 1}`)
    }

    const pdfWidth = pageState.pdfWidth || pdfPage.getWidth()
    const pdfHeight = pageState.pdfHeight || pdfPage.getHeight()

    const searchableBlocks = requiresRebuild
      ? pageState.textBlocks.filter(block => {
          if (whiteoutOverlays.some(overlay => whiteoutCoversBlock(overlay, block, pageState))) return false
          if (
            !block.edited &&
            editedBlocks.some(
              editedBlock =>
                blocksSubstantiallyOverlap(block, editedBlock, pageState) ||
                (block.source === 'ocr' &&
                  editedBlock.source === 'ocr' &&
                  blocksShareLineBand(block, editedBlock, pageState))
            )
          ) {
            return false
          }
          return true
        })
      : pageState.ocrApplied
        ? pageState.textBlocks.filter(
            block =>
              (block.source === 'ocr' || block.edited) &&
              !whiteoutOverlays.some(overlay => whiteoutCoversBlock(overlay, block, pageState))
          )
        : []

    for (const block of searchableBlocks) {
      const { font, substituted } = await resolveFont(doc, fontCache, block.fontHint)
      drawWrappedText(
        pdfPage,
        font,
        block.text,
        block.pdfX,
        block.pdfY,
        block.pdfFontSize,
        block.pdfWidth,
        block.pdfHeight,
        rgb(0, 0, 0),
        block.textAlign,
        block.lineHeightMultiplier,
        0.001,
      )

      if (block.edited) {
        editedTextCount += 1
        if (substituted) substitutedFontCount += 1
      }
    }

    for (const overlay of pageOverlays) {
      if (overlay.type === 'text-overlay' && overlay.text.trim()) {
        const { font } = await resolveFont(doc, fontCache, 'sans')
        const x = overlay.x * pdfWidth
        const y = pdfHeight - overlay.y * pdfHeight - overlay.fontSize * 0.15
        const width = Math.max(overlay.width * pdfWidth, overlay.fontSize * 2)
        const { red, green, blue } = hexToRgb(overlay.color)

        if (!requiresRebuild) {
          drawWrappedText(
            pdfPage,
            font,
            overlay.text,
            x,
            y,
            overlay.fontSize,
            width,
            undefined,
            rgb(red / 255, green / 255, blue / 255),
            overlay.textAlign,
            overlay.lineHeightMultiplier,
          )
        }

        if (requiresRebuild) {
          drawWrappedText(
            pdfPage,
            font,
            overlay.text,
            x,
            y,
            overlay.fontSize,
            width,
            undefined,
            rgb(0, 0, 0),
            overlay.textAlign,
            overlay.lineHeightMultiplier,
            0.001,
          )
        }
      }

      if (!requiresRebuild && (overlay.type === 'signature' || overlay.type === 'image')) {
        const image = await doc.embedPng(overlay.dataUrl)
        const drawWidth = overlay.width * pdfWidth
        const drawHeight = overlay.height * pdfHeight
        const rotationDeg = getMediaOverlayRotationDeg(overlay)
        const rotationRad = (rotationDeg * Math.PI) / 180
        const centerX = overlay.x * pdfWidth + drawWidth / 2
        const centerY = pdfHeight - overlay.y * pdfHeight - drawHeight / 2
        const anchorX = centerX - (drawWidth / 2) * Math.cos(rotationRad) + (drawHeight / 2) * Math.sin(rotationRad)
        const anchorY = centerY - (drawWidth / 2) * Math.sin(rotationRad) - (drawHeight / 2) * Math.cos(rotationRad)

        pdfPage.drawImage(image, {
          x: anchorX,
          y: anchorY,
          width: drawWidth,
          height: drawHeight,
          rotate: degrees(rotationDeg),
          opacity: getMediaOverlayOpacity(overlay),
        })
      }

      if (!requiresRebuild && overlay.type === 'highlight') {
        const { red, green, blue } = hexToRgb(overlay.color)

        pdfPage.drawRectangle({
          x: overlay.x * pdfWidth,
          y: pdfHeight - (overlay.y + overlay.height) * pdfHeight,
          width: overlay.width * pdfWidth,
          height: overlay.height * pdfHeight,
          color: rgb(red / 255, green / 255, blue / 255),
          opacity: 0.35,
        })
      }

      if (!requiresRebuild && overlay.type === 'underline') {
        const { red, green, blue } = hexToRgb(overlay.color)
        const x1 = overlay.x * pdfWidth
        const x2 = (overlay.x + overlay.width) * pdfWidth
        const y = pdfHeight - (overlay.y + overlay.height) * pdfHeight

        pdfPage.drawLine({
          start: { x: x1, y },
          end: { x: x2, y },
          thickness: 1.8,
          color: rgb(red / 255, green / 255, blue / 255),
        })
      }
    }
  }

  const output = await doc.save()
  return {
    blob: new Blob([output as unknown as BlobPart], { type: 'application/pdf' }),
    editedTextCount,
    substitutedFontCount,
    scannedPageCount,
    visualReplacementCount: Math.max(editedTextCount - exactRewriteTextCount, 0),
    rebuiltPageCount,
    exactRewritePageCount,
    whiteoutCount,
  }
}
