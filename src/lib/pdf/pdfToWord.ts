import {
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAnchor,
  WidthType,
  WpsShapeRun,
} from 'docx'

interface PDFTextStyle {
  fontFamily?: string
  ascent?: number
  descent?: number
}

interface PDFTextItem {
  str: string
  width: number
  height?: number
  transform: number[]
  fontName: string
}

interface PreparedTextSpan {
  text: string
  x: number
  right: number
  y: number
  height: number
  fontSize: number
  fontFamily: string
  bold: boolean
  italics: boolean
  lineIndex: number
}

interface PreparedWordLine {
  index: number
  top: number
  height: number
  left: number
  right: number
  text: string
  cells: PreparedTextSpan[]
  fontSize: number
  fontFamily: string
  bold: boolean
  italics: boolean
}

interface WordTableRegion {
  startLineIndex: number
  endLineIndex: number
  top: number
  left: number
  width: number
  columnWidths: number[]
  rows: PreparedWordLine[]
}

interface ExtractedPdfImage {
  data: Uint8Array
  type: 'png'
  x: number
  top: number
  width: number
  height: number
}

interface PositionedWordPage {
  width: number
  height: number
  blocks: PreparedTextSpan[]
  lines: PreparedWordLine[]
  tables: WordTableRegion[]
  images: ExtractedPdfImage[]
}

export type PdfToWordMode = 'balanced' | 'editable' | 'layout'

export interface PdfToWordOptions {
  mode?: PdfToWordMode
}

export interface PdfToWordResult {
  blob:      Blob
  pageCount: number
  wordCount: number
  warnings:  string[]
}

const PDF_TO_WORD_CMAP_VERSION = '5.5.207'
const POINT_TO_TWIP = 20
const POINT_TO_EMU = 12700
const POINT_TO_DRAWING_PIXEL = 96 / 72
const MIN_CELL_GAP = 24
const IDENTITY_TRANSFORM: number[] = [1, 0, 0, 1, 0, 0]
const NO_BORDER = { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 }
const TABLE_NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
}
const CELL_NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function chooseWordFont(rawFontFamily?: string) {
  const family = (rawFontFamily ?? '').replace(/["']/g, '').trim()
  const lower = family.toLowerCase()

  if (lower.includes('courier') || lower.includes('mono')) return 'Courier New'
  if (lower.includes('times') || lower.includes('georgia') || lower.includes('serif')) return 'Times New Roman'
  if (lower.includes('calibri')) return 'Calibri'
  if (lower.includes('cambria')) return 'Cambria'
  if (lower.includes('arial')) return 'Arial'
  if (lower.includes('helvetica') || lower.includes('sans')) return 'Arial'
  return family || 'Arial'
}

function inferFontTraits(fontName: string, style?: PDFTextStyle) {
  const source = `${fontName} ${style?.fontFamily ?? ''}`.toLowerCase()
  const bold = /(bold|black|heavy|semibold|demi)/.test(source)
  const italics = /(italic|oblique)/.test(source)
  return { bold, italics }
}

function createSpacing(gap: number, fontSize: number) {
  const spaceWidth = Math.max(fontSize * 0.28, 2.8)
  const spaces = Math.round(gap / spaceWidth)
  return ' '.repeat(clamp(spaces, 1, 4))
}

function multiplyTransforms(
  left: readonly number[],
  right: readonly number[],
) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ] as const
}

function applyTransform(matrix: readonly number[], x: number, y: number) {
  return [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ] as const
}

function dataUrlToUint8Array(dataUrl: string) {
  const marker = ';base64,'
  const index = dataUrl.indexOf(marker)
  const base64 = index >= 0 ? dataUrl.slice(index + marker.length) : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function paintPdfImageDataToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  kind: number,
  data: Uint8Array | Uint8ClampedArray,
) {
  const imageData = ctx.createImageData(width, height)

  if (kind === 3 && data.length === width * height * 4) {
    imageData.data.set(data)
  } else if (kind === 2 && data.length === width * height * 3) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      imageData.data[pixel * 4] = data[pixel * 3]
      imageData.data[pixel * 4 + 1] = data[pixel * 3 + 1]
      imageData.data[pixel * 4 + 2] = data[pixel * 3 + 2]
      imageData.data[pixel * 4 + 3] = 255
    }
  } else if (kind === 1) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const byte = data[Math.floor(pixel / 8)]
      const bit = (byte >> (7 - (pixel % 8))) & 1
      const value = bit ? 255 : 0
      imageData.data[pixel * 4] = value
      imageData.data[pixel * 4 + 1] = value
      imageData.data[pixel * 4 + 2] = value
      imageData.data[pixel * 4 + 3] = 255
    }
  } else {
    return false
  }

  ctx.putImageData(imageData, 0, 0)
  return true
}

function drawPdfBitmapToCanvas(
  ctx: CanvasRenderingContext2D,
  bitmap: unknown,
  width: number,
  height: number,
) {
  if (
    typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap
    || typeof HTMLCanvasElement !== 'undefined' && bitmap instanceof HTMLCanvasElement
    || typeof HTMLImageElement !== 'undefined' && bitmap instanceof HTMLImageElement
    || typeof OffscreenCanvas !== 'undefined' && bitmap instanceof OffscreenCanvas
  ) {
    ctx.drawImage(bitmap, 0, 0, width, height)
    return true
  }

  return false
}

function rasterizePdfImageToPngBytes(image: unknown) {
  if (!image || typeof image !== 'object') return null

  const candidate = image as {
    width?: number
    height?: number
    kind?: number
    data?: Uint8Array | Uint8ClampedArray
    bitmap?: unknown
  }

  const width = Math.round(candidate.width ?? 0)
  const height = Math.round(candidate.height ?? 0)
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const drewBitmap = candidate.bitmap
    ? drawPdfBitmapToCanvas(ctx, candidate.bitmap, width, height)
    : false
  const drewRaw = !drewBitmap && candidate.data && typeof candidate.kind === 'number'
    ? paintPdfImageDataToCanvas(ctx, width, height, candidate.kind, candidate.data)
    : false

  if (!drewBitmap && !drewRaw) return null
  return dataUrlToUint8Array(canvas.toDataURL('image/png'))
}

function toViewportBounds(
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  matrix: readonly number[],
) {
  const corners = [
    viewport.convertToViewportPoint(...applyTransform(matrix, 0, 0)),
    viewport.convertToViewportPoint(...applyTransform(matrix, 1, 0)),
    viewport.convertToViewportPoint(...applyTransform(matrix, 0, 1)),
    viewport.convertToViewportPoint(...applyTransform(matrix, 1, 1)),
  ]

  const xs = corners.map(([x]) => x)
  const ys = corners.map(([, y]) => y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)

  return {
    x: round(left),
    top: round(top),
    width: round(right - left),
    height: round(bottom - top),
  }
}

function buildExtractedImage(
  image: unknown,
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  matrix: readonly number[],
) {
  const pngBytes = rasterizePdfImageToPngBytes(image)
  if (!pngBytes) return null

  const bounds = toViewportBounds(viewport, matrix)
  if (bounds.width < 10 || bounds.height < 10) return null

  return {
    data: pngBytes,
    type: 'png',
    x: bounds.x,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  } satisfies ExtractedPdfImage
}

async function extractPageImages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfjsLib: any,
) {
  const operatorList = await page.getOperatorList()
  const images: ExtractedPdfImage[] = []
  const seen = new Set<string>()
  const stack: number[][] = []
  const objectCache = new Map<string, Promise<unknown | null>>()
  let currentTransform = [...IDENTITY_TRANSFORM]

  const pushImage = (imageObject: unknown, matrix: readonly number[]) => {
    const extracted = buildExtractedImage(imageObject, viewport, matrix)
    if (!extracted) return
    const key = `${round(extracted.x, 1)}:${round(extracted.top, 1)}:${round(extracted.width, 1)}:${round(extracted.height, 1)}:${extracted.data.length}`
    if (seen.has(key)) return
    seen.add(key)
    images.push(extracted)
  }

  const resolveObject = async (name: string) => {
    if (!objectCache.has(name)) {
      objectCache.set(name, new Promise(resolve => {
        let settled = false
        const finish = (value: unknown | null) => {
          if (settled) return
          settled = true
          resolve(value)
        }

        try {
          if (page.objs?.has?.(name)) {
            finish(page.objs.get(name))
            return
          }
          if (page.commonObjs?.has?.(name)) {
            finish(page.commonObjs.get(name))
            return
          }
        } catch {
          finish(null)
          return
        }

        try {
          page.objs?.get?.(name, finish)
          page.commonObjs?.get?.(name, finish)
        } catch {
          finish(null)
          return
        }

        setTimeout(() => finish(null), 1500)
      }))
    }

    return objectCache.get(name) ?? null
  }

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const fn = operatorList.fnArray[index]
    const args = operatorList.argsArray[index]

    if (fn === pdfjsLib.OPS.save) {
      stack.push([...currentTransform])
      continue
    }

    if (fn === pdfjsLib.OPS.restore) {
      currentTransform = stack.pop() ?? [...IDENTITY_TRANSFORM]
      continue
    }

    if (fn === pdfjsLib.OPS.transform && Array.isArray(args)) {
      currentTransform = [...multiplyTransforms(currentTransform, args as number[])]
      continue
    }

    if (fn === pdfjsLib.OPS.paintImageXObject) {
      const name = args?.[0]
      if (typeof name === 'string') pushImage(await resolveObject(name), currentTransform)
      continue
    }

    if (fn === pdfjsLib.OPS.paintInlineImageXObject) {
      pushImage(args?.[0], currentTransform)
      continue
    }

    if (fn === pdfjsLib.OPS.paintImageXObjectRepeat) {
      const name = args?.[0]
      const scaleX = args?.[1]
      const scaleY = args?.[2]
      const positions = args?.[3]
      if (typeof name !== 'string' || typeof scaleX !== 'number' || typeof scaleY !== 'number' || !Array.isArray(positions)) {
        continue
      }

      const imageObject = await resolveObject(name)
      for (let positionIndex = 0; positionIndex < positions.length; positionIndex += 2) {
        const repeatTransform = [scaleX, 0, 0, scaleY, positions[positionIndex], positions[positionIndex + 1]]
        pushImage(imageObject, multiplyTransforms(currentTransform, repeatTransform))
      }
      continue
    }

    if (fn === pdfjsLib.OPS.paintInlineImageXObjectGroup) {
      const imageObject = args?.[0]
      const map = args?.[1]
      if (!Array.isArray(map)) continue
      for (const entry of map) {
        if (!Array.isArray(entry?.transform)) continue
        pushImage(imageObject, multiplyTransforms(currentTransform, entry.transform))
      }
    }
  }

  return images
}

function prepareTextSpans(
  items: readonly PDFTextItem[],
  styles: Record<string, PDFTextStyle>,
  pageHeight: number,
) {
  return items
    .filter(item => normalizeWhitespace(item.str))
    .map(item => {
      const style = styles[item.fontName] ?? {}
      const fontSize = Math.max(
        7,
        Math.min(
          36,
          Math.abs(item.height ?? item.transform[3] ?? item.transform[0] ?? 11),
        ),
      )
      const ascent = typeof style.ascent === 'number'
        ? style.ascent
        : typeof style.descent === 'number'
          ? 1 + style.descent
          : 0.82
      const top = pageHeight - item.transform[5] - fontSize * ascent
      const height = Math.max(fontSize * 1.05, fontSize + 1)
      const { bold, italics } = inferFontTraits(item.fontName, style)

      return {
        text: normalizeWhitespace(item.str),
        x: item.transform[4],
        right: item.transform[4] + item.width,
        y: round(top),
        height: round(height),
        fontSize: round(fontSize),
        fontFamily: chooseWordFont(style.fontFamily),
        bold,
        italics,
      }
    })
    .filter(item => item.text.length > 0)
}

function groupSpansIntoRows(spans: ReturnType<typeof prepareTextSpans>) {
  const rows: Array<typeof spans> = []

  for (const span of spans.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))) {
    const lastRow = rows[rows.length - 1]
    const rowReference = lastRow?.[0]
    const tolerance = Math.max(span.fontSize * 0.38, rowReference?.fontSize ? rowReference.fontSize * 0.38 : 0, 2.5)

    if (!lastRow || Math.abs(rowReference.y - span.y) > tolerance) {
      rows.push([span])
      continue
    }

    lastRow.push(span)
  }

  return rows
}

function mergeRowItemsIntoSpans(
  rowItems: ReturnType<typeof prepareTextSpans>,
  lineIndex: number,
): PreparedTextSpan[] {
  const sortedRowItems = [...rowItems].sort((a, b) => a.x - b.x)
  const merged: PreparedTextSpan[] = []
  let current: PreparedTextSpan | null = null

  for (const item of sortedRowItems) {
    if (!current) {
      current = { ...item, lineIndex }
      continue
    }

    const gap = item.x - current.right
    const similarFont = Math.abs(item.fontSize - current.fontSize) <= 1
      && item.fontFamily === current.fontFamily
      && item.bold === current.bold
      && item.italics === current.italics
    const mergeThreshold = Math.max(current.fontSize * 0.9, 8)

    if (gap <= mergeThreshold && similarFont) {
      const padding = gap > current.fontSize * 0.18 ? createSpacing(gap, current.fontSize) : ''
      current.text += `${padding}${item.text}`
      current.right = round(Math.max(current.right, item.right))
      current.height = round(Math.max(current.height, item.height))
      current.y = round(Math.min(current.y, item.y))
      continue
    }

    merged.push({
      ...current,
      x: round(current.x),
      right: round(current.right),
    })
    current = { ...item, lineIndex }
  }

  if (current) {
    merged.push({
      ...current,
      x: round(current.x),
      right: round(current.right),
    })
  }

  return merged
}

function splitSpansIntoCells(spans: PreparedTextSpan[]) {
  const cells: PreparedTextSpan[] = []
  let current: PreparedTextSpan | null = null

  for (const span of spans) {
    if (!current) {
      current = { ...span }
      continue
    }

    const gap = span.x - current.right
    const sameCell = gap <= Math.max(MIN_CELL_GAP, current.fontSize * 1.6)

    if (sameCell) {
      const padding = gap > current.fontSize * 0.18 ? createSpacing(gap, current.fontSize) : ''
      current.text += `${padding}${span.text}`
      current.right = round(Math.max(current.right, span.right))
      current.height = round(Math.max(current.height, span.height))
      current.y = round(Math.min(current.y, span.y))
      current.bold = current.bold || span.bold
      current.italics = current.italics || span.italics
      continue
    }

    cells.push(current)
    current = { ...span }
  }

  if (current) cells.push(current)
  return cells
}

function buildPreparedLine(spans: PreparedTextSpan[], index: number): PreparedWordLine | null {
  if (spans.length === 0) return null
  const cells = splitSpansIntoCells(spans)
  const text = cells.map(cell => cell.text).join(' ').trim()
  if (!text) return null

  const left = Math.min(...cells.map(cell => cell.x))
  const right = Math.max(...cells.map(cell => cell.right))
  const top = Math.min(...cells.map(cell => cell.y))
  const height = Math.max(...cells.map(cell => cell.height))
  const dominant = [...cells].sort((a, b) => b.text.length - a.text.length)[0]

  return {
    index,
    top: round(top),
    height: round(height),
    left: round(left),
    right: round(right),
    text,
    cells,
    fontSize: dominant.fontSize,
    fontFamily: dominant.fontFamily,
    bold: cells.some(cell => cell.bold),
    italics: cells.some(cell => cell.italics),
  }
}

function isPotentialTableRow(line: PreparedWordLine) {
  return line.cells.length >= 2
}

function rowsLookAligned(previous: PreparedWordLine, next: PreparedWordLine) {
  const comparableColumns = Math.min(previous.cells.length, next.cells.length)
  if (comparableColumns < 2) return false

  let aligned = 0
  for (let index = 0; index < comparableColumns; index++) {
    if (Math.abs(previous.cells[index].x - next.cells[index].x) <= 22) aligned += 1
  }

  return aligned >= Math.min(2, comparableColumns)
}

function buildTableRegion(rows: PreparedWordLine[]) {
  const maxColumns = Math.max(...rows.map(row => row.cells.length))
  const averageCellLength = rows
    .flatMap(row => row.cells)
    .reduce((sum, cell, _, cells) => sum + cell.text.length / cells.length, 0)

  if (rows.length < 2) return null
  if (maxColumns < 3 && rows.length < 3) return null
  if (averageCellLength > 42 && maxColumns < 4) return null

  const columnStarts = Array.from({ length: maxColumns }, (_, index) =>
    median(rows.map(row => row.cells[index]?.x).filter((value): value is number => typeof value === 'number')),
  )

  const maxRight = Math.max(
    ...rows.flatMap(row => row.cells.map(cell => cell.right)),
  )

  const columnWidths = columnStarts.map((start, index) => {
    const nextStart = columnStarts[index + 1]
    const contentRight = Math.max(
      ...rows.map(row => row.cells[index]?.right ?? start),
    )
    if (nextStart !== undefined) {
      return round(Math.max(48, Math.min(nextStart - start, Math.max(contentRight - start, 48))))
    }
    return round(Math.max(48, maxRight - start))
  })

  const left = columnStarts[0] ?? Math.min(...rows.map(row => row.left))
  const width = round(columnWidths.reduce((sum, current) => sum + current, 0))

  return {
    startLineIndex: rows[0].index,
    endLineIndex: rows[rows.length - 1].index,
    top: round(Math.min(...rows.map(row => row.top))),
    left: round(left),
    width,
    columnWidths,
    rows,
  } satisfies WordTableRegion
}

function detectTableRegions(lines: PreparedWordLine[]) {
  const tables: WordTableRegion[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!isPotentialTableRow(line)) {
      index += 1
      continue
    }

    const rows = [line]
    let cursor = index + 1

    while (cursor < lines.length) {
      const previous = rows[rows.length - 1]
      const candidate = lines[cursor]
      const verticalGap = candidate.top - (previous.top + previous.height)

      if (!isPotentialTableRow(candidate)) break
      if (verticalGap > Math.max(previous.height * 1.8, candidate.height * 1.8, 18)) break
      if (Math.abs(previous.cells.length - candidate.cells.length) > 1) break
      if (!rowsLookAligned(previous, candidate)) break

      rows.push(candidate)
      cursor += 1
    }

    const region = buildTableRegion(rows)
    if (region) {
      tables.push(region)
      index = cursor
      continue
    }

    index += 1
  }

  return tables
}

function buildPageModel(
  items: readonly PDFTextItem[],
  styles: Record<string, PDFTextStyle>,
  pageHeight: number,
  pageWidth: number,
  images: ExtractedPdfImage[],
) {
  const preparedItems = prepareTextSpans(items, styles, pageHeight)
  const rowGroups = groupSpansIntoRows(preparedItems)
  const blocks: PreparedTextSpan[] = []
  const lines: PreparedWordLine[] = []

  rowGroups.forEach((rowItems, lineIndex) => {
    const spans = mergeRowItemsIntoSpans(rowItems, lineIndex)
    blocks.push(...spans)
    const line = buildPreparedLine(spans, lineIndex)
    if (line) lines.push(line)
  })

  return {
    width: pageWidth,
    height: pageHeight,
    blocks,
    lines,
    tables: detectTableRegions(lines),
    images,
  } satisfies PositionedWordPage
}

function createPositionedTextShape(block: PreparedTextSpan) {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: Math.round(block.fontSize * POINT_TO_TWIP) },
    children: [
      new WpsShapeRun({
        type: 'wps',
        transformation: {
          width: Math.max((block.right - block.x + 1.5) * POINT_TO_DRAWING_PIXEL, block.fontSize * 0.8),
          height: Math.max((block.height + 1.5) * POINT_TO_DRAWING_PIXEL, block.fontSize * POINT_TO_DRAWING_PIXEL),
        },
        floating: {
          horizontalPosition: {
            relative: 'page',
            offset: Math.round(block.x * POINT_TO_EMU),
          },
          verticalPosition: {
            relative: 'page',
            offset: Math.round(block.y * POINT_TO_EMU),
          },
          wrap: { type: 0 },
          allowOverlap: true,
          behindDocument: false,
          layoutInCell: true,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          zIndex: 2,
        },
        outline: { type: 'noFill' },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0, line: Math.round(block.fontSize * POINT_TO_TWIP) },
            children: [
              new TextRun({
                text: block.text,
                font: block.fontFamily,
                size: Math.max(2, Math.round(block.fontSize * 2)),
                bold: block.bold,
                italics: block.italics,
                noProof: true,
              }),
            ],
          }),
        ],
        bodyProperties: {
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          verticalAnchor: VerticalAnchor.TOP,
          noAutoFit: true,
        },
      }),
    ],
  })
}

function createPositionedImage(image: ExtractedPdfImage) {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [
      new ImageRun({
        type: image.type,
        data: image.data,
        transformation: {
          width: Math.max(1, Math.round(image.width * POINT_TO_DRAWING_PIXEL)),
          height: Math.max(1, Math.round(image.height * POINT_TO_DRAWING_PIXEL)),
        },
        floating: {
          horizontalPosition: {
            relative: 'page',
            offset: Math.round(image.x * POINT_TO_EMU),
          },
          verticalPosition: {
            relative: 'page',
            offset: Math.round(image.top * POINT_TO_EMU),
          },
          wrap: { type: 0 },
          allowOverlap: true,
          behindDocument: false,
          layoutInCell: true,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          zIndex: 1,
        },
        altText: {
          name: 'Extracted PDF image',
          title: 'Extracted PDF image',
          description: 'Embedded image reconstructed from the source PDF',
        },
      }),
    ],
  })
}

function createTableParagraph(cell: PreparedTextSpan, header: boolean) {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: Math.round(cell.fontSize * POINT_TO_TWIP) },
    children: [
      new TextRun({
        text: cell.text,
        font: cell.fontFamily,
        size: Math.max(2, Math.round(cell.fontSize * 2)),
        bold: header || cell.bold,
        italics: cell.italics,
        noProof: true,
      }),
    ],
  })
}

function createNativeTable(region: WordTableRegion, floating: boolean) {
  return new Table({
    rows: region.rows.map((row, rowIndex) =>
      new TableRow({
        children: region.columnWidths.map((columnWidth, columnIndex) => {
          const cell = row.cells[columnIndex]
          return new TableCell({
            width: { size: Math.round(columnWidth * POINT_TO_TWIP), type: WidthType.DXA },
            margins: { top: 40, right: 60, bottom: 40, left: 60, marginUnitType: WidthType.DXA },
            borders: CELL_NO_BORDERS,
            children: cell
              ? [createTableParagraph(cell, rowIndex === 0)]
              : [new Paragraph('')],
          })
        }),
      }),
    ),
    width: { size: Math.round(region.width * POINT_TO_TWIP), type: WidthType.DXA },
    columnWidths: region.columnWidths.map(width => Math.round(width * POINT_TO_TWIP)),
    layout: TableLayoutType.FIXED,
    borders: TABLE_NO_BORDERS,
    indent: !floating
      ? { size: Math.round(region.left * POINT_TO_TWIP), type: WidthType.DXA }
      : undefined,
    float: floating
      ? {
          horizontalAnchor: 'page',
          verticalAnchor: 'page',
          absoluteHorizontalPosition: Math.round(region.left * POINT_TO_TWIP),
          absoluteVerticalPosition: Math.round(region.top * POINT_TO_TWIP),
          leftFromText: 0,
          rightFromText: 0,
          topFromText: 0,
          bottomFromText: 0,
          overlap: 'overlap',
        }
      : undefined,
  })
}

function createSpacerParagraph(points: number) {
  return new Paragraph({
    spacing: { before: Math.max(0, Math.round(points * POINT_TO_TWIP)), after: 0 },
    children: [new TextRun({ text: '' })],
  })
}

function createInlineImageParagraph(image: ExtractedPdfImage) {
  return new Paragraph({
    indent: { left: Math.max(0, Math.round(image.x * POINT_TO_TWIP)) },
    spacing: { before: 0, after: 100 },
    children: [
      new ImageRun({
        type: image.type,
        data: image.data,
        transformation: {
          width: Math.max(1, Math.round(image.width * POINT_TO_DRAWING_PIXEL)),
          height: Math.max(1, Math.round(image.height * POINT_TO_DRAWING_PIXEL)),
        },
        altText: {
          name: 'Extracted PDF image',
          title: 'Extracted PDF image',
          description: 'Embedded image reconstructed from the source PDF',
        },
      }),
    ],
  })
}

function createPageProperties(page: PositionedWordPage) {
  return {
    page: {
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      size: {
        width: Math.round(page.width * POINT_TO_TWIP),
        height: Math.round(page.height * POINT_TO_TWIP),
        orientation: page.width > page.height ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
      },
    },
  }
}

function lineLooksLikeHeading(line: PreparedWordLine) {
  const short = line.text.length <= 80
  return short && (
    line.fontSize >= 16
    || (line.bold && line.fontSize >= 13)
    || (/^[A-Z][\w\s/&()-]+$/.test(line.text) && line.text.length < 50)
  )
}

function lineLooksLikeBulletItem(line: PreparedWordLine) {
  return /^[\u2022\u2023\u25E6\u2043\-]\s+/.test(line.text)
}

function lineLooksLikeNumberedItem(line: PreparedWordLine) {
  return /^\d+[.)]\s+/.test(line.text)
}

function lineLooksLikeListItem(line: PreparedWordLine) {
  return lineLooksLikeBulletItem(line) || lineLooksLikeNumberedItem(line)
}

function pickHeadingLevel(line: PreparedWordLine) {
  if (line.fontSize >= 18) return HeadingLevel.HEADING_1
  if (line.fontSize >= 15) return HeadingLevel.HEADING_2
  return HeadingLevel.HEADING_3
}

function shouldMergeParagraphLine(current: PreparedWordLine, next: PreparedWordLine) {
  const verticalGap = next.top - (current.top + current.height)
  const similarIndent = Math.abs(current.left - next.left) <= 18
  const similarFont = Math.abs(current.fontSize - next.fontSize) <= 2 && current.fontFamily === next.fontFamily
  return verticalGap <= Math.max(current.height * 1.8, next.height * 1.8, 18)
    && similarIndent
    && similarFont
    && !lineLooksLikeHeading(next)
    && !lineLooksLikeListItem(next)
}

function createFlowParagraph(lines: PreparedWordLine[]) {
  const firstLine = lines[0]
  const text = lines.map(line => line.text).join(' ').replace(/\s+/g, ' ').trim()

  if (lineLooksLikeHeading(firstLine)) {
    return new Paragraph({
      heading: pickHeadingLevel(firstLine),
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text,
          font: firstLine.fontFamily,
          size: Math.max(2, Math.round(firstLine.fontSize * 2)),
          bold: true,
          italics: firstLine.italics,
          noProof: true,
        }),
      ],
    })
  }

  if (lineLooksLikeBulletItem(firstLine)) {
    return new Paragraph({
      bullet: { level: 0 },
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: text.replace(/^[\u2022\u2023\u25E6\u2043\-]\s+/, ''),
          font: firstLine.fontFamily,
          size: Math.max(2, Math.round(firstLine.fontSize * 2)),
          bold: firstLine.bold,
          italics: firstLine.italics,
          noProof: true,
        }),
      ],
    })
  }

  if (lineLooksLikeNumberedItem(firstLine)) {
    return new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text,
          font: firstLine.fontFamily,
          size: Math.max(2, Math.round(firstLine.fontSize * 2)),
          bold: firstLine.bold,
          italics: firstLine.italics,
          noProof: true,
        }),
      ],
    })
  }

  return new Paragraph({
    spacing: { before: 0, after: 100 },
    children: [
      new TextRun({
        text,
        font: firstLine.fontFamily,
        size: Math.max(2, Math.round(firstLine.fontSize * 2)),
        bold: firstLine.bold && lines.length === 1 && text.length < 60,
        italics: firstLine.italics,
        noProof: true,
      }),
    ],
  })
}

function buildLayoutSections(pages: PositionedWordPage[]) {
  return pages.map(page => ({
    properties: createPageProperties(page),
    children: [
      ...page.images.map(createPositionedImage),
      ...page.blocks.map(createPositionedTextShape),
    ],
  }))
}

function buildBalancedSections(pages: PositionedWordPage[]) {
  return pages.map(page => {
    const tableLines = new Set(
      page.tables.flatMap(table =>
        Array.from({ length: table.endLineIndex - table.startLineIndex + 1 }, (_, offset) => table.startLineIndex + offset),
      ),
    )

    const inlineTables: Array<Paragraph | Table> = []
    let flowCursor = 0

    for (const table of page.tables) {
      const gap = table.top - flowCursor
      if (gap > 6) inlineTables.push(createSpacerParagraph(gap))
      inlineTables.push(createNativeTable(table, false))
      const lastRow = table.rows[table.rows.length - 1]
      flowCursor = lastRow.top + lastRow.height + 8
    }

    return {
      properties: createPageProperties(page),
      children: [
        ...inlineTables,
        ...page.images.map(createPositionedImage),
        ...page.blocks.filter(block => !tableLines.has(block.lineIndex)).map(createPositionedTextShape),
      ],
    }
  })
}

function buildEditablePageChildren(page: PositionedWordPage) {
  const children: Array<Paragraph | Table> = []
  const tablesByStart = new Map(page.tables.map(table => [table.startLineIndex, table]))
  const tableLines = new Set(
    page.tables.flatMap(table =>
      Array.from({ length: table.endLineIndex - table.startLineIndex + 1 }, (_, offset) => table.startLineIndex + offset),
    ),
  )

  const remainingImages = [...page.images].sort((a, b) => (a.top === b.top ? a.x - b.x : a.top - b.top))
  const flushImagesBefore = (limit: number) => {
    while (remainingImages.length > 0 && remainingImages[0].top <= limit) {
      children.push(createInlineImageParagraph(remainingImages.shift()!))
    }
  }

  let lineIndex = 0
  while (lineIndex < page.lines.length) {
    const line = page.lines[lineIndex]
    const table = tablesByStart.get(line.index)
    flushImagesBefore(line.top)

    if (table) {
      children.push(createNativeTable(table, false))
      lineIndex += table.rows.length
      continue
    }

    if (tableLines.has(line.index)) {
      lineIndex += 1
      continue
    }

    const paragraphLines = [line]
    lineIndex += 1

    while (lineIndex < page.lines.length) {
      const next = page.lines[lineIndex]
      if (tablesByStart.has(next.index) || tableLines.has(next.index)) break
      if (!shouldMergeParagraphLine(paragraphLines[paragraphLines.length - 1], next)) break
      paragraphLines.push(next)
      lineIndex += 1
    }

    children.push(createFlowParagraph(paragraphLines))
  }

  flushImagesBefore(Number.POSITIVE_INFINITY)

  return children.length > 0
    ? children
    : [new Paragraph({ children: [new TextRun({ text: '' })] })]
}

function buildEditableSections(pages: PositionedWordPage[]) {
  return pages.map(page => ({
    properties: createPageProperties(page),
    children: buildEditablePageChildren(page),
  }))
}

export async function pdfToWord(
  file:        File,
  onProgress?: (current: number, total: number) => void,
  options?: PdfToWordOptions,
): Promise<PdfToWordResult> {
  const mode = options?.mode ?? 'balanced'

  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data:            bytes,
    cMapUrl:         `https://unpkg.com/pdfjs-dist@${PDF_TO_WORD_CMAP_VERSION}/cmaps/`,
    cMapPacked:      true,
    useWorkerFetch:  false,
    isEvalSupported: false,
  }).promise

  const totalPages = pdf.numPages
  const pages: PositionedWordPage[] = []
  const warnings: string[] = []
  let totalWordCount = 0

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum - 1, totalPages)

    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })
    const pageImages = await extractPageImages(page, viewport, pdfjsLib)
    const pageModel = buildPageModel(
      textContent.items as PDFTextItem[],
      textContent.styles as Record<string, PDFTextStyle>,
      viewport.height,
      viewport.width,
      pageImages,
    )

    totalWordCount += pageModel.lines.reduce((count, line) => count + line.text.split(/\s+/).filter(Boolean).length, 0)
    pages.push(pageModel)

    onProgress?.(pageNum, totalPages)
  }

  if (pages.every(page => page.lines.length === 0) || totalWordCount === 0) {
    warnings.push(
      'No text found in PDF. This may be a scanned document. Run OCR PDF first to add a searchable text layer.',
    )
  }

  if (pages.some(page => page.tables.length > 0)) {
    warnings.push(mode === 'layout'
      ? 'Detected tables were kept in preserve-layout mode. Switch to Balanced or Editable for native Word tables.'
      : 'Detected tables were exported as native Word tables where alignment was reliable.')
  }

  if (pages.some(page => page.images.length > 0)) {
    warnings.push(mode === 'editable'
      ? 'Embedded raster images were reconstructed as editable Word images and placed into the reading flow.'
      : 'Embedded raster images were reconstructed as native Word images at their PDF positions.')
  }

  warnings.push(
    mode === 'editable'
      ? 'Editable mode favors native paragraphs and tables over exact page geometry, so layout may reflow.'
      : mode === 'layout'
        ? 'Preserve-layout mode favors exact page positioning. Complex content stays closer to the PDF, but editing will rely more on positioned text boxes.'
        : 'Balanced mode uses native Word tables where safe and preserve-layout fallback for the rest of the page.',
  )

  warnings.push('Pure vector artwork may still need manual cleanup after export. Embedded raster images are preserved.')

  const doc = new Document({
    sections: mode === 'editable'
      ? buildEditableSections(pages)
      : mode === 'layout'
        ? buildLayoutSections(pages)
        : buildBalancedSections(pages),
  })

  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  return { blob, pageCount: totalPages, wordCount: totalWordCount, warnings }
}
