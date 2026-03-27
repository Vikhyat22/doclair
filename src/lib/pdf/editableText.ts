import { createWorker } from 'tesseract.js'
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from '@cantoo/pdf-lib'

export const EDIT_PREVIEW_SCALE = 1.6
export const EDIT_REBUILD_SCALE = 2.4

export type TextBlockSource = 'native' | 'ocr'

export interface EditableTextBlock {
  id: string
  pageIndex: number
  originalText: string
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

export type EditOverlay = AddedTextOverlay | SignatureOverlay | MarkupOverlay | WhiteoutOverlay

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

interface FontDescriptor {
  family: 'sans' | 'serif' | 'mono'
  weight: 'regular' | 'bold'
  style: 'normal' | 'italic'
}

const LINE_BUCKET_SIZE = 3
const OCR_RENDER_SCALE = 2.2

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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

function classifyFont(fontHint: string): FontDescriptor {
  const hint = fontHint.toLowerCase()
  const family: FontDescriptor['family'] =
    hint.includes('mono') || hint.includes('courier')
      ? 'mono'
      : hint.includes('times') || hint.includes('serif') || hint.includes('georgia')
        ? 'serif'
        : 'sans'

  const weight: FontDescriptor['weight'] = hint.includes('bold') ? 'bold' : 'regular'
  const style: FontDescriptor['style'] =
    hint.includes('italic') || hint.includes('oblique') ? 'italic' : 'normal'

  return { family, weight, style }
}

function standardFontForHint(fontHint: string) {
  const descriptor = classifyFont(fontHint)

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
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) throw new Error('Could not get 2D canvas context')

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
    )

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
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) throw new Error('Could not get 2D canvas context')

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
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')
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

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
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
  const descriptor = classifyFont(fontHint)
  const family =
    descriptor.family === 'mono'
      ? '"Courier New", Courier, monospace'
      : descriptor.family === 'serif'
        ? 'Georgia, "Times New Roman", serif'
        : '"Helvetica Neue", Arial, sans-serif'
  const style = descriptor.style === 'italic' ? 'italic' : 'normal'
  const weight = descriptor.weight === 'bold' ? '700' : '400'

  return `${style} ${weight} ${fontSize}px ${family}`
}

function hexToRgb(color: string) {
  const value = color.replace('#', '')
  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16),
  }
}

function sampleCanvasFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const left = Math.floor(clamp(x - 4, 0, ctx.canvas.width - 1))
  const top = Math.floor(clamp(y - 4, 0, ctx.canvas.height - 1))
  const sampleWidth = Math.max(2, Math.ceil(clamp(width + 8, 2, ctx.canvas.width - left)))
  const sampleHeight = Math.max(2, Math.ceil(clamp(height + 8, 2, ctx.canvas.height - top)))
  const image = ctx.getImageData(left, top, sampleWidth, sampleHeight)

  let r = 0
  let g = 0
  let b = 0
  let samples = 0

  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = image.data[index + 3]
    if (alpha < 8) continue

    const red = image.data[index]
    const green = image.data[index + 1]
    const blue = image.data[index + 2]
    const brightness = (red + green + blue) / 3
    if (brightness < 40) continue

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
) {
  ctx.save()
  ctx.font = cssFontForHint(fontHint, fontSize)
  ctx.fillStyle = color
  ctx.textBaseline = 'top'
  const lines = wrapCanvasText(ctx, text, Math.max(maxWidth, fontSize))
  const lineHeight = fontSize * 1.18
  let widestLine = 0

  for (const line of lines) {
    widestLine = Math.max(widestLine, ctx.measureText(line || ' ').width)
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })
  ctx.restore()

  return {
    lineCount: lines.length,
    lineHeight,
    widestLine,
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
  const canvasContext = canvas.getContext('2d')
  if (!canvasContext) throw new Error('Could not get 2D canvas context')

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
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

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
    const background = sampleCanvasFill(ctx, metrics.x, metrics.y, metrics.width, metrics.height)
    ctx.save()
    ctx.fillStyle = background.fill
    ctx.fillRect(
      Math.max(0, metrics.x - 3),
      Math.max(0, metrics.y - 2),
      Math.min(canvas.width, metrics.width + 8),
      Math.min(canvas.height, Math.max(metrics.height + 6, metrics.fontSize * 1.4)),
    )
    ctx.restore()

    drawWrappedCanvasText(
      ctx,
      block.text,
      metrics.x,
      metrics.y,
      metrics.fontSize,
      metrics.width,
      'rgb(20, 17, 14)',
      block.fontHint,
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

    if (overlay.type === 'signature') {
      const image = await loadImageElement(overlay.dataUrl)
      ctx.drawImage(
        image,
        overlay.x * canvas.width,
        overlay.y * canvas.height,
        overlay.width * canvas.width,
        overlay.height * canvas.height,
      )
    }
  }
}

async function resolveFont(
  doc: PDFDocument,
  cache: Map<string, PDFFont>,
  fontHint: string,
) {
  const fontName = standardFontForHint(fontHint)
  if (!cache.has(fontName)) {
    cache.set(fontName, await doc.embedFont(fontName))
  }
  return {
    font: cache.get(fontName)!,
    substituted: !fontHint.toLowerCase().includes(fontName.toLowerCase().replace(/-/g, '')),
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
  color: ReturnType<typeof rgb>,
  opacity = 1,
) {
  const lines = wrapText(text, font, fontSize, Math.max(maxWidth, fontSize))
  const lineHeight = fontSize * 1.18
  let widestLine = 0

  lines.forEach(line => {
    widestLine = Math.max(widestLine, font.widthOfTextAtSize(line || ' ', fontSize))
  })

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      font,
      size: fontSize,
      color,
      lineHeight,
      opacity,
    })
  })

  return {
    lineCount: lines.length,
    lineHeight,
    widestLine,
  }
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
  const bytes = await file.arrayBuffer()
  const sourceDoc = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
  const doc = await PDFDocument.create()
  const fontCache = new Map<string, PDFFont>()
  let editedTextCount = 0
  let substitutedFontCount = 0
  let scannedPageCount = 0
  let rebuiltPageCount = 0
  let whiteoutCount = 0
  let pdfjsLib: Awaited<ReturnType<typeof getPdfJs>> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfjsDoc: any = null

  for (const pageState of pages) {
    const pageOverlays = overlays.filter(overlay => overlay.pageIndex === pageState.pageIndex)
    const hasEditedExistingText = pageState.textBlocks.some(block => block.edited)
    const whiteoutOverlays = pageOverlays.filter(
      (overlay): overlay is WhiteoutOverlay => overlay.type === 'whiteout'
    )
    const editedBlocks = pageState.textBlocks.filter(block => block.edited)
    const requiresRebuild = hasEditedExistingText || whiteoutOverlays.length > 0

    let pdfPage: PDFPage

    if (pageState.ocrApplied) {
      scannedPageCount += 1
    }

    whiteoutCount += whiteoutOverlays.length

    if (requiresRebuild) {
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
    } else {
      const [copiedPage] = await doc.copyPages(sourceDoc, [pageState.pageIndex])
      pdfPage = copiedPage
      doc.addPage(pdfPage)
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
        rgb(0, 0, 0),
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
            rgb(red / 255, green / 255, blue / 255),
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
            rgb(0, 0, 0),
            0.001,
          )
        }
      }

      if (!requiresRebuild && overlay.type === 'signature') {
        const image = await doc.embedPng(overlay.dataUrl)
        const drawWidth = overlay.width * pdfWidth
        const drawHeight = overlay.height * pdfHeight
        pdfPage.drawImage(image, {
          x: overlay.x * pdfWidth,
          y: pdfHeight - overlay.y * pdfHeight - drawHeight,
          width: drawWidth,
          height: drawHeight,
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
    visualReplacementCount: editedTextCount,
    rebuiltPageCount,
    whiteoutCount,
  }
}
