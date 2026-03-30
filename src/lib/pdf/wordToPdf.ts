import JSZip from 'jszip'
import mammoth from 'mammoth'

type WordAlignment = 'left' | 'center' | 'right' | 'justify'
type PdfFontFaceStyle = 'normal' | 'bold' | 'italics' | 'bolditalics'
type BundledPdfFontFamily = 'Roboto' | 'Arimo' | 'Carlito' | 'Cousine' | 'Tinos' | 'LibreBaskerville'
type WordWrapMode = 'square' | 'tight' | 'through' | 'topAndBottom' | 'none'
type WordWrapSide = 'bothSides' | 'left' | 'right' | 'largest'

interface PdfMakeLike {
  addVirtualFileSystem(vfs: Record<string, string>): void
  fonts: Record<string, {
    normal: string
    bold: string
    italics: string
    bolditalics: string
  }>
  createPdf(definition: unknown): {
    getBlob(): Promise<Blob>
  }
}

interface WordPageSettings {
  widthPt: number
  heightPt: number
  marginTopPt: number
  marginRightPt: number
  marginBottomPt: number
  marginLeftPt: number
  headerDistancePt: number
  footerDistancePt: number
  orientation: 'portrait' | 'landscape'
}

interface WordRunStyle {
  bold?: boolean
  italics?: boolean
  underline?: boolean
  smallCaps?: boolean
  allCaps?: boolean
  color?: string
  fontSizePt?: number
  fontFamily?: string
}

interface WordParagraphFormatting {
  alignment?: WordAlignment
  spacingBeforePt?: number
  spacingAfterPt?: number
  lineHeight?: number
  indentLeftPt?: number
  indentRightPt?: number
  firstLineIndentPt?: number
  pageBreakBefore?: boolean
  keepNext?: boolean
  keepLines?: boolean
  widowControl?: boolean
  rightTabStopPt?: number
  borderTop?: { color: string; widthPt: number; spacePt?: number }
  borderBottom?: { color: string; widthPt: number; spacePt?: number }
}

interface ResolvedWordStyle {
  name?: string
  paragraph: WordParagraphFormatting
  run: WordRunStyle
}

interface WordTextRun extends WordRunStyle {
  type: 'text'
  text: string
}

interface WordImageRun {
  type: 'image'
  dataUrl: string
  widthPt: number
  heightPt: number
  alt?: string
  anchorAlignment?: 'left' | 'center' | 'right'
  placement?: WordDrawingPlacement
}

interface WordImageEffects {
  grayscale?: boolean
  biLevelThreshold?: number
}

interface WordObjectRun {
  type: 'object'
  kind: 'textBox' | 'chart' | 'smartArt' | 'shape'
  widthPt: number
  heightPt: number
  alt?: string
  title?: string
  anchorAlignment?: 'left' | 'center' | 'right'
  placement?: WordDrawingPlacement
  blocks?: WordBlock[]
  labels?: string[]
  dataPoints?: Array<{ label: string; value: number }>
  borderColor?: string
  backgroundColor?: string
}

type WordRun = WordTextRun | WordImageRun | WordObjectRun

interface WordListInfo {
  ordered: boolean
  level: number
  label: string
}

interface WordParagraphBlock extends WordParagraphFormatting {
  type: 'paragraph'
  blockId: string
  runs: WordRun[]
  styleId?: string
  styleName?: string
  headingLevel?: 1 | 2 | 3 | 4
  list?: WordListInfo
}

interface WordTableCellBlock {
  blocks: WordBlock[]
  widthPt?: number
  colSpan?: number
  backgroundColor?: string
}

interface WordTableRowBlock {
  cells: WordTableCellBlock[]
}

interface WordTableBlock {
  type: 'table'
  blockId: string
  rows: WordTableRowBlock[]
  widthPt?: number
}

interface WordPageBreakBlock {
  type: 'pageBreak'
}

type WordBlock = WordParagraphBlock | WordTableBlock | WordPageBreakBlock

interface WordHeaderFooterSet {
  defaultBlocks: WordBlock[]
  firstBlocks: WordBlock[]
  evenBlocks: WordBlock[]
}

type WordSectionBreakType = 'nextPage' | 'continuous' | 'oddPage' | 'evenPage'

interface WordDocumentSection {
  page: WordPageSettings
  blocks: WordBlock[]
  header: WordHeaderFooterSet
  footer: WordHeaderFooterSet
  titlePage: boolean
  evenAndOddHeaders: boolean
  breakType: WordSectionBreakType
  pageNumberStart?: number
}

interface WordDrawingPlacement {
  xOffsetPt: number
  yOffsetPt: number
  horizontalAlignment?: 'left' | 'center' | 'right'
  horizontalRelativeTo?: string
  verticalAlignment?: 'top' | 'center' | 'bottom'
  verticalRelativeTo?: string
  wrap: WordWrapMode
  wrapSide: WordWrapSide
  behindText: boolean
  distanceLeftPt: number
  distanceRightPt: number
  distanceTopPt: number
  distanceBottomPt: number
}

interface WordPdfFontFamily {
  pdfName: string
  aliases: string[]
  files: Record<PdfFontFaceStyle, string>
  vfs: Record<string, string>
}

interface WordPdfFontRegistry {
  families: WordPdfFontFamily[]
  aliasToPdfName: Record<string, string>
}

interface StructuredWordDocument {
  source: 'docx-structured'
  sections: WordDocumentSection[]
  fontRegistry: WordPdfFontRegistry
}

interface HtmlFallbackDocument {
  source: 'html-fallback'
  html: string
}

export interface WordConversionResult {
  previewHtml: string
  warnings: string[]
  hasImages: boolean
  wordCount: number
  pageCountEstimate: number
  document: StructuredWordDocument | HtmlFallbackDocument
}

interface NumberingLevel {
  format: string
  text: string
  start: number
}

interface ParsedNumbering {
  abstracts: Map<string, Map<number, NumberingLevel>>
  nums: Map<string, string>
  counters: Map<string, number[]>
}

interface ParseContext {
  zip: JSZip
  parser: DOMParser
  sourcePath: string
  relationships: Map<string, { target: string; type: string; targetMode?: string }>
  styles: {
    resolve(styleId?: string): ResolvedWordStyle
  }
  numbering: ParsedNumbering
  warnings: Set<string>
  blockCounter: { value: number }
}

interface PdfRenderOptions {
  insideTableCell?: boolean
  currentPage?: number
  pageCount?: number
  availableWidth?: number
  pageHeight?: number
  fontRegistry?: WordPdfFontRegistry
  containerKind?: 'body' | 'header' | 'footer'
}

const DEFAULT_PAGE: WordPageSettings = {
  widthPt: 612,
  heightPt: 792,
  marginTopPt: 72,
  marginRightPt: 72,
  marginBottomPt: 72,
  marginLeftPt: 72,
  headerDistancePt: 36,
  footerDistancePt: 36,
  orientation: 'portrait',
}

const DEFAULT_PARAGRAPH: WordParagraphFormatting = {
  alignment: 'left',
  spacingBeforePt: 0,
  spacingAfterPt: 8,
  lineHeight: 1.35,
  indentLeftPt: 0,
  indentRightPt: 0,
  firstLineIndentPt: 0,
  pageBreakBefore: false,
  keepNext: false,
  keepLines: false,
  widowControl: true,
}

const DEFAULT_RUN: WordRunStyle = {
  bold: false,
  italics: false,
  underline: false,
  color: '#111111',
  fontSizePt: 11,
  fontFamily: 'Arial',
}

function twipToPt(value?: string | null) {
  return value ? Number(value) / 20 : undefined
}

function halfPointToPt(value?: string | null) {
  return value ? Number(value) / 2 : undefined
}

function emuToPt(value?: string | null) {
  return value ? Number(value) / 12700 : undefined
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeFontFamily(fontFamily?: string | null) {
  return (fontFamily ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .toLowerCase()
}

const BUNDLED_PDF_FONTS = [
  {
    pdfName: 'Arimo',
    aliases: ['arial', 'arialmt', 'helvetica', 'liberation sans', 'arimo', 'aptos', 'aptos sans'],
    files: {
      normal: '/editor-fonts/Arimo-Regular.ttf',
      bold: '/editor-fonts/Arimo-Bold.ttf',
      italics: '/editor-fonts/Arimo-Italic.ttf',
      bolditalics: '/editor-fonts/Arimo-BoldItalic.ttf',
    },
  },
  {
    pdfName: 'Carlito',
    aliases: ['calibri', 'calibri light', 'carlito', 'candara', 'corbel', 'segoe ui'],
    files: {
      normal: '/editor-fonts/Carlito-Regular.ttf',
      bold: '/editor-fonts/Carlito-Bold.ttf',
      italics: '/editor-fonts/Carlito-Italic.ttf',
      bolditalics: '/editor-fonts/Carlito-BoldItalic.ttf',
    },
  },
  {
    pdfName: 'Cousine',
    aliases: ['courier', 'courier new', 'liberation mono', 'consolas', 'menlo', 'monaco', 'cousine'],
    files: {
      normal: '/editor-fonts/Cousine-Regular.ttf',
      bold: '/editor-fonts/Cousine-Bold.ttf',
      italics: '/editor-fonts/Cousine-Italic.ttf',
      bolditalics: '/editor-fonts/Cousine-BoldItalic.ttf',
    },
  },
  {
    pdfName: 'Tinos',
    aliases: [
      'times',
      'times new roman',
      'cambria',
      'georgia',
      'garamond',
      'baskerville',
      'constantia',
      'tinos',
    ],
    files: {
      normal: '/editor-fonts/Tinos-Regular.ttf',
      bold: '/editor-fonts/Tinos-Bold.ttf',
      italics: '/editor-fonts/Tinos-Italic.ttf',
      bolditalics: '/editor-fonts/Tinos-BoldItalic.ttf',
    },
  },
  {
    pdfName: 'LibreBaskerville',
    aliases: [
      'bookman',
      'bookman old style',
      'palatino',
      'palatino linotype',
      'libre baskerville',
    ],
    files: {
      normal: '/editor-fonts/LibreBaskerville-Regular.ttf',
      bold: '/editor-fonts/LibreBaskerville-Bold.ttf',
      italics: '/editor-fonts/LibreBaskerville-Italic.ttf',
      bolditalics: '/editor-fonts/LibreBaskerville-BoldItalic.ttf',
    },
  },
] as const satisfies Array<{
  pdfName: Exclude<BundledPdfFontFamily, 'Roboto'>
  aliases: string[]
  files: Record<PdfFontFaceStyle, string>
}>

const fontFileBase64Cache = new Map<string, Promise<string>>()
const EMPTY_FONT_REGISTRY: WordPdfFontRegistry = {
  families: [],
  aliasToPdfName: {},
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes)
  return arrayBufferToBase64(copy.buffer)
}

async function loadFontFileBase64(path: string) {
  const cached = fontFileBase64Cache.get(path)
  if (cached) return cached

  const promise = fetch(path)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load bundled font: ${path}`)
      return response.arrayBuffer()
    })
    .then(arrayBufferToBase64)

  fontFileBase64Cache.set(path, promise)
  return promise
}

function normalizeFontAliases(...values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeFontFamily).filter(Boolean)))
}

function safePdfFontSlug(value: string) {
  return value
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'embedded'
}

function resolvePdfFontFamily(fontFamily?: string | null, fontRegistry: WordPdfFontRegistry = EMPTY_FONT_REGISTRY): string {
  const normalized = normalizeFontFamily(fontFamily)
  if (normalized && fontRegistry.aliasToPdfName[normalized]) {
    return fontRegistry.aliasToPdfName[normalized]
  }
  if (!normalized) return 'Carlito'

  for (const font of BUNDLED_PDF_FONTS) {
    if (font.aliases.some(alias => normalized.includes(alias))) return font.pdfName
  }

  const monoKeywords = ['mono', 'code', 'terminal']
  if (monoKeywords.some(keyword => normalized.includes(keyword))) return 'Cousine'

  const serifKeywords = ['serif']
  if (serifKeywords.some(keyword => normalized.includes(keyword))) return 'Tinos'

  return 'Arimo'
}

async function configurePdfMakeFonts(
  pdfMake: PdfMakeLike,
  pdfFonts: Record<string, string>,
  fontRegistry: WordPdfFontRegistry = EMPTY_FONT_REGISTRY,
) {
  const bundledEntries = await Promise.all([
    ...BUNDLED_PDF_FONTS.flatMap(font => (
      Object.entries(font.files).map(async ([style, path]) => [
        `${font.pdfName}-${style}.ttf`,
        await loadFontFileBase64(path),
      ] as const)
    )),
  ])
  const bundledVfs = Object.fromEntries(bundledEntries)
  const embeddedVfs = Object.assign({}, ...fontRegistry.families.map(font => font.vfs))

  pdfMake.addVirtualFileSystem(pdfFonts)
  pdfMake.addVirtualFileSystem(bundledVfs)
  if (Object.keys(embeddedVfs).length > 0) {
    pdfMake.addVirtualFileSystem(embeddedVfs)
  }

  pdfMake.fonts = {
    ...pdfMake.fonts,
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
    ...Object.fromEntries(BUNDLED_PDF_FONTS.map(font => [
      font.pdfName,
      {
        normal: `${font.pdfName}-normal.ttf`,
        bold: `${font.pdfName}-bold.ttf`,
        italics: `${font.pdfName}-italics.ttf`,
        bolditalics: `${font.pdfName}-bolditalics.ttf`,
      },
    ])),
    ...Object.fromEntries(fontRegistry.families.map(font => [
      font.pdfName,
      font.files,
    ])),
  }
}

function slugToMimeType(path: string) {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

function childElements(node: Element, localName?: string) {
  return Array.from(node.children).filter(child => !localName || child.localName === localName)
}

function firstChild(node: Element | null | undefined, localName: string) {
  if (!node) return null
  return childElements(node, localName)[0] ?? null
}

function descendants(node: Element | Document, localName: string): Element[] {
  return Array.from(node.getElementsByTagName('*')).filter((element): element is Element => element.localName === localName)
}

function firstDescendant(node: Element | Document | null | undefined, localName: string): Element | null {
  if (!node) return null
  return descendants(node, localName)[0] ?? null
}

function attr(node: Element | null | undefined, localName: string) {
  if (!node) return undefined
  return Array.from(node.attributes).find(attribute => attribute.localName === localName)?.value
}

function onOff(node: Element | null | undefined) {
  if (!node) return undefined
  const value = attr(node, 'val')
  if (value === undefined) return true
  return !['0', 'false', 'off'].includes(value.toLowerCase())
}

function mergeRunStyle(base: WordRunStyle, override?: WordRunStyle) {
  return {
    bold: override?.bold ?? base.bold,
    italics: override?.italics ?? base.italics,
    underline: override?.underline ?? base.underline,
    smallCaps: override?.smallCaps ?? base.smallCaps,
    allCaps: override?.allCaps ?? base.allCaps,
    color: override?.color ?? base.color,
    fontSizePt: override?.fontSizePt ?? base.fontSizePt,
    fontFamily: override?.fontFamily ?? base.fontFamily,
  } satisfies WordRunStyle
}

function mergeParagraphFormatting(base: WordParagraphFormatting, override?: WordParagraphFormatting) {
  return {
    alignment: override?.alignment ?? base.alignment,
    spacingBeforePt: override?.spacingBeforePt ?? base.spacingBeforePt,
    spacingAfterPt: override?.spacingAfterPt ?? base.spacingAfterPt,
    lineHeight: override?.lineHeight ?? base.lineHeight,
    indentLeftPt: override?.indentLeftPt ?? base.indentLeftPt,
    indentRightPt: override?.indentRightPt ?? base.indentRightPt,
    firstLineIndentPt: override?.firstLineIndentPt ?? base.firstLineIndentPt,
    pageBreakBefore: override?.pageBreakBefore ?? base.pageBreakBefore,
    keepNext: override?.keepNext ?? base.keepNext,
    keepLines: override?.keepLines ?? base.keepLines,
    widowControl: override?.widowControl ?? base.widowControl,
    rightTabStopPt: override?.rightTabStopPt ?? base.rightTabStopPt,
    borderTop: override?.borderTop ?? base.borderTop,
    borderBottom: override?.borderBottom ?? base.borderBottom,
  } satisfies WordParagraphFormatting
}

function parseRunStyle(node: Element | null) {
  if (!node) return {}

  const color = attr(firstChild(node, 'color'), 'val')
  const fonts = firstChild(node, 'rFonts')

  return {
    bold: onOff(firstChild(node, 'b')),
    italics: onOff(firstChild(node, 'i')),
    underline: (() => {
      const underline = firstChild(node, 'u')
      if (!underline) return undefined
      const value = attr(underline, 'val')
      return value ? value !== 'none' : true
    })(),
    smallCaps: onOff(firstChild(node, 'smallCaps')),
    allCaps: onOff(firstChild(node, 'caps')),
    color: color && color !== 'auto' ? `#${color}` : undefined,
    fontSizePt: halfPointToPt(attr(firstChild(node, 'sz'), 'val')),
    fontFamily: attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi') ?? attr(fonts, 'eastAsia'),
  } satisfies WordRunStyle
}

function parseParagraphFormatting(node: Element | null) {
  if (!node) return {}

  const spacing = firstChild(node, 'spacing')
  const indent = firstChild(node, 'ind')
  const tabs = firstChild(node, 'tabs')
  const borders = firstChild(node, 'pBdr')
  const line = attr(spacing, 'line')
  const lineRule = attr(spacing, 'lineRule')
  const rightTab = childElements(tabs ?? node, 'tab').find(tab => attr(tab, 'val') === 'right')

  const parseBorder = (element: Element | null) => {
    if (!element) return undefined
    const value = attr(element, 'val')
    if (!value || value === 'none' || value === 'nil') return undefined
    const size = Number(attr(element, 'sz') ?? 0)
    return {
      color: attr(element, 'color') && attr(element, 'color') !== 'auto'
        ? `#${attr(element, 'color')}`
        : '#CBD5E1',
      widthPt: size > 0 ? size / 8 : 0.5,
      spacePt: Number(attr(element, 'space') ?? 0) || undefined,
    }
  }

  return {
    alignment: (() => {
      const value = attr(firstChild(node, 'jc'), 'val')
      if (value === 'center' || value === 'right' || value === 'justify') return value
      return value ? 'left' : undefined
    })(),
    spacingBeforePt: twipToPt(attr(spacing, 'before')),
    spacingAfterPt: twipToPt(attr(spacing, 'after')),
    lineHeight: line
      ? lineRule === 'auto' || !lineRule
        ? Number(line) / 240
        : Math.max(1, Number(line) / 240)
      : undefined,
    indentLeftPt: twipToPt(attr(indent, 'left') ?? attr(indent, 'start')),
    indentRightPt: twipToPt(attr(indent, 'right') ?? attr(indent, 'end')),
    firstLineIndentPt: (() => {
      const firstLine = twipToPt(attr(indent, 'firstLine'))
      const hanging = twipToPt(attr(indent, 'hanging'))
      if (typeof firstLine === 'number') return firstLine
      if (typeof hanging === 'number') return -hanging
      return undefined
    })(),
    pageBreakBefore: onOff(firstChild(node, 'pageBreakBefore')),
    keepNext: onOff(firstChild(node, 'keepNext')),
    keepLines: onOff(firstChild(node, 'keepLines')),
    widowControl: onOff(firstChild(node, 'widowControl')),
    rightTabStopPt: twipToPt(attr(rightTab, 'pos')),
    borderTop: parseBorder(firstChild(borders, 'top')),
    borderBottom: parseBorder(firstChild(borders, 'bottom')),
  } satisfies WordParagraphFormatting
}

function parsePageSettings(node: Element | null) {
  if (!node) return DEFAULT_PAGE

  const size = firstChild(node, 'pgSz')
  const margins = firstChild(node, 'pgMar')
  const widthPt = twipToPt(attr(size, 'w')) ?? DEFAULT_PAGE.widthPt
  const heightPt = twipToPt(attr(size, 'h')) ?? DEFAULT_PAGE.heightPt
  const orientation = attr(size, 'orient') === 'landscape' || widthPt > heightPt ? 'landscape' : 'portrait'

  return {
    widthPt,
    heightPt,
    marginTopPt: twipToPt(attr(margins, 'top')) ?? DEFAULT_PAGE.marginTopPt,
    marginRightPt: twipToPt(attr(margins, 'right')) ?? DEFAULT_PAGE.marginRightPt,
    marginBottomPt: twipToPt(attr(margins, 'bottom')) ?? DEFAULT_PAGE.marginBottomPt,
    marginLeftPt: twipToPt(attr(margins, 'left')) ?? DEFAULT_PAGE.marginLeftPt,
    headerDistancePt: twipToPt(attr(margins, 'header')) ?? DEFAULT_PAGE.headerDistancePt,
    footerDistancePt: twipToPt(attr(margins, 'footer')) ?? DEFAULT_PAGE.footerDistancePt,
    orientation,
  } satisfies WordPageSettings
}

function parseSettings(xml: Document | null) {
  const settings = firstDescendant(xml, 'settings')
  return {
    evenAndOddHeaders: onOff(firstChild(settings, 'evenAndOddHeaders')) ?? false,
  }
}

function parseSectionBreakType(node: Element | null): WordSectionBreakType {
  const value = attr(firstChild(node, 'type'), 'val')
  if (value === 'continuous' || value === 'oddPage' || value === 'evenPage') return value
  return 'nextPage'
}

function parsePageNumberStart(node: Element | null) {
  const start = Number(attr(firstChild(node, 'pgNumType'), 'start') ?? '')
  return Number.isFinite(start) && start > 0 ? start : undefined
}

function nextBlockId(context: ParseContext) {
  const id = `word-block-${context.blockCounter.value}`
  context.blockCounter.value += 1
  return id
}

function parseStyleMap(stylesXml: Document | null) {
  const defaults = {
    paragraph: DEFAULT_PARAGRAPH,
    run: DEFAULT_RUN,
  }

  const styles = new Map<string, {
    name?: string
    basedOn?: string
    paragraph: WordParagraphFormatting
    run: WordRunStyle
  }>()

  if (!stylesXml) {
    return {
      resolve(styleId?: string) {
        return {
          paragraph: defaults.paragraph,
          run: defaults.run,
        } satisfies ResolvedWordStyle
      },
    }
  }

  const docDefaults = firstDescendant(stylesXml, 'docDefaults')
  const paragraphDefaults = firstDescendant(docDefaults ?? stylesXml, 'pPrDefault')
  const runDefaults = firstDescendant(docDefaults ?? stylesXml, 'rPrDefault')
  defaults.paragraph = mergeParagraphFormatting(
    defaults.paragraph,
    parseParagraphFormatting(firstDescendant(paragraphDefaults, 'pPr')),
  )
  defaults.run = mergeRunStyle(
    defaults.run,
    parseRunStyle(firstDescendant(runDefaults, 'rPr')),
  )

  for (const style of descendants(stylesXml, 'style')) {
    const styleId = attr(style, 'styleId')
    if (!styleId) continue
    styles.set(styleId, {
      name: attr(firstChild(style, 'name'), 'val'),
      basedOn: attr(firstChild(style, 'basedOn'), 'val'),
      paragraph: parseParagraphFormatting(firstChild(style, 'pPr')),
      run: parseRunStyle(firstChild(style, 'rPr')),
    })
  }

  const cache = new Map<string, ResolvedWordStyle>()

  function resolve(styleId?: string): ResolvedWordStyle {
    if (!styleId || !styles.has(styleId)) {
      return {
        paragraph: defaults.paragraph,
        run: defaults.run,
      }
    }

    if (cache.has(styleId)) return cache.get(styleId)!

    const raw = styles.get(styleId)!
    const base = raw.basedOn ? resolve(raw.basedOn) : {
      paragraph: defaults.paragraph,
      run: defaults.run,
    }

    const resolved = {
      name: raw.name ?? base.name,
      paragraph: mergeParagraphFormatting(base.paragraph, raw.paragraph),
      run: mergeRunStyle(base.run, raw.run),
    } satisfies ResolvedWordStyle

    cache.set(styleId, resolved)
    return resolved
  }

  return { resolve }
}

function parseRelationships(xml: Document | null) {
  const map = new Map<string, { target: string; type: string; targetMode?: string }>()
  if (!xml) return map

  for (const relationship of descendants(xml, 'Relationship')) {
    const id = attr(relationship, 'Id')
    const target = attr(relationship, 'Target')
    if (!id || !target) continue
    map.set(id, {
      target,
      type: attr(relationship, 'Type') ?? '',
      targetMode: attr(relationship, 'TargetMode'),
    })
  }

  return map
}

function relsPathForPart(sourcePath: string) {
  const parts = sourcePath.split('/')
  const filename = parts.pop()
  if (!filename) return null
  const directory = parts.join('/')
  return `${directory}/_rels/${filename}.rels`
}

function resolveZipPath(basePath: string, target: string) {
  const baseParts = basePath.split('/').slice(0, -1)
  const parts = target.split('/')
  const output = [...baseParts]

  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      output.pop()
      continue
    }
    output.push(part)
  }

  return output.join('/')
}

function buildCompletePdfFontFiles(files: Partial<Record<PdfFontFaceStyle, string>>) {
  const normal = files.normal ?? files.italics ?? files.bold ?? files.bolditalics
  const bold = files.bold ?? files.bolditalics ?? normal
  const italics = files.italics ?? files.bolditalics ?? normal
  const bolditalics = files.bolditalics ?? files.bold ?? files.italics ?? normal

  if (!normal || !bold || !italics || !bolditalics) return null
  return {
    normal,
    bold,
    italics,
    bolditalics,
  } satisfies Record<PdfFontFaceStyle, string>
}

function embeddedFontExtension(bytes: Uint8Array, sourcePath: string) {
  const signature = String.fromCharCode(...Array.from(bytes.slice(0, 4)))
  if (signature === 'OTTO') return 'otf'
  if (signature === '\u0000\u0001\u0000\u0000' || signature === 'true' || signature === 'typ1') return 'ttf'

  const lower = sourcePath.toLowerCase()
  if (lower.endsWith('.otf')) return 'otf'
  if (lower.endsWith('.ttf') || lower.endsWith('.odttf')) return 'ttf'
  return null
}

function deobfuscateEmbeddedFont(bytes: Uint8Array, fontKey?: string | null) {
  const normalized = (fontKey ?? '').replace(/[{}-]/g, '')
  if (normalized.length !== 32) return bytes

  const keyBytes = normalized
    .match(/../g)
    ?.map(value => Number.parseInt(value, 16))
    .reverse()

  if (!keyBytes || keyBytes.length !== 16 || keyBytes.some(Number.isNaN)) return bytes

  const output = bytes.slice()
  for (let index = 0; index < Math.min(32, output.length); index += 1) {
    output[index] ^= keyBytes[index % keyBytes.length]
  }
  return output
}

async function parseEmbeddedFontRegistry(
  zip: JSZip,
  parser: DOMParser,
  warnings: Set<string>,
) {
  const fontTableXmlText = await zip.file('word/fontTable.xml')?.async('string')
  if (!fontTableXmlText) return EMPTY_FONT_REGISTRY

  const fontTableXml = parser.parseFromString(fontTableXmlText, 'application/xml')
  const fontTableRelsXmlText = await zip.file('word/_rels/fontTable.xml.rels')?.async('string')
  const fontTableRelsXml = fontTableRelsXmlText ? parser.parseFromString(fontTableRelsXmlText, 'application/xml') : null
  const relationships = parseRelationships(fontTableRelsXml)

  const families: WordPdfFontFamily[] = []
  const aliasToPdfName: Record<string, string> = {}
  let fontIndex = 1

  for (const fontNode of descendants(fontTableXml, 'font')) {
    const familyName = attr(fontNode, 'name')?.trim()
    if (!familyName) continue

    const altName = attr(firstChild(fontNode, 'altName'), 'val')?.trim()
    const embedNodes: Partial<Record<PdfFontFaceStyle, Element | null>> = {
      normal: firstChild(fontNode, 'embedRegular'),
      bold: firstChild(fontNode, 'embedBold'),
      italics: firstChild(fontNode, 'embedItalic'),
      bolditalics: firstChild(fontNode, 'embedBoldItalic'),
    }

    const resolvedFiles: Partial<Record<PdfFontFaceStyle, string>> = {}
    const vfs: Record<string, string> = {}

    for (const style of Object.keys(embedNodes) as PdfFontFaceStyle[]) {
      const embedNode = embedNodes[style]
      const relationshipId = attr(embedNode, 'id')
      if (!relationshipId) continue

      const relationship = relationships.get(relationshipId)
      if (!relationship?.target) continue

      const sourcePath = resolveZipPath('word/fontTable.xml', relationship.target)
      const entry = zip.file(sourcePath)
      if (!entry) continue

      const rawBytes = await entry.async('uint8array')
      const decodedBytes = deobfuscateEmbeddedFont(rawBytes, attr(embedNode, 'fontKey'))
      const extension = embeddedFontExtension(decodedBytes, sourcePath)
      if (!extension) {
        warnings.add(`Embedded font "${familyName}" uses an unsupported font format and fell back to the closest bundled PDF font.`)
        continue
      }

      const fileName = `DocxFont-${fontIndex}-${safePdfFontSlug(familyName)}-${style}.${extension}`
      resolvedFiles[style] = fileName
      vfs[fileName] = uint8ArrayToBase64(decodedBytes)
    }

    const files = buildCompletePdfFontFiles(resolvedFiles)
    if (!files) continue

    const pdfName = `DocxFont${fontIndex}`
    const aliases = normalizeFontAliases(familyName, altName)
    const family = {
      pdfName,
      aliases,
      files,
      vfs,
    } satisfies WordPdfFontFamily

    for (const alias of aliases) {
      aliasToPdfName[alias] = pdfName
    }

    families.push(family)
    fontIndex += 1
  }

  if (families.length === 0) return EMPTY_FONT_REGISTRY

  return {
    families,
    aliasToPdfName,
  } satisfies WordPdfFontRegistry
}

function parseNumbering(xml: Document | null) {
  const abstracts = new Map<string, Map<number, NumberingLevel>>()
  const nums = new Map<string, string>()

  if (xml) {
    for (const abstractNum of descendants(xml, 'abstractNum')) {
      const abstractNumId = attr(abstractNum, 'abstractNumId')
      if (!abstractNumId) continue
      const levels = new Map<number, NumberingLevel>()

      for (const level of childElements(abstractNum, 'lvl')) {
        const levelIndex = Number(attr(level, 'ilvl') ?? 0)
        levels.set(levelIndex, {
          format: attr(firstChild(level, 'numFmt'), 'val') ?? 'decimal',
          text: attr(firstChild(level, 'lvlText'), 'val') ?? `%${levelIndex + 1}.`,
          start: Number(attr(firstChild(level, 'start'), 'val') ?? 1),
        })
      }

      abstracts.set(abstractNumId, levels)
    }

    for (const num of descendants(xml, 'num')) {
      const numId = attr(num, 'numId')
      const abstractNumId = attr(firstChild(num, 'abstractNumId'), 'val')
      if (numId && abstractNumId) nums.set(numId, abstractNumId)
    }
  }

  return {
    abstracts,
    nums,
    counters: new Map<string, number[]>(),
  } satisfies ParsedNumbering
}

function formatListCounter(value: number, format: string) {
  if (format === 'upperLetter' || format === 'lowerLetter') {
    let current = value
    let label = ''
    while (current > 0) {
      current -= 1
      label = String.fromCharCode(65 + (current % 26)) + label
      current = Math.floor(current / 26)
    }
    return format === 'lowerLetter' ? label.toLowerCase() : label
  }

  if (format === 'upperRoman' || format === 'lowerRoman') {
    const numerals: Array<[number, string]> = [
      [1000, 'M'],
      [900, 'CM'],
      [500, 'D'],
      [400, 'CD'],
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ]
    let remainder = value
    let label = ''
    for (const [amount, symbol] of numerals) {
      while (remainder >= amount) {
        label += symbol
        remainder -= amount
      }
    }
    return format === 'lowerRoman' ? label.toLowerCase() : label
  }

  return String(value)
}

function normalizeBulletLabel(label: string) {
  const cleaned = label.replace(/\u0000/g, '').trim()
  if (!cleaned) return '•'
  if (['•', '-', '–', '—', '*'].includes(cleaned)) return cleaned === '*' ? '•' : cleaned
  return '•'
}

function resolveListInfo(numbering: ParsedNumbering, numId?: string, level = 0) {
  if (!numId) return undefined
  const abstractNumId = numbering.nums.get(numId)
  const definition = abstractNumId ? numbering.abstracts.get(abstractNumId)?.get(level) : undefined
  if (!definition) return undefined

  if (definition.format === 'bullet') {
    return {
      ordered: false,
      level,
      label: normalizeBulletLabel(definition.text.includes('%') ? '•' : definition.text),
    } satisfies WordListInfo
  }

  const counters = numbering.counters.get(numId) ?? []
  counters.length = Math.max(counters.length, level + 1)
  counters[level] = (counters[level] ?? definition.start) + (counters[level] ? 1 : 0)
  for (let index = level + 1; index < counters.length; index += 1) counters[index] = 0
  numbering.counters.set(numId, counters)

  const label = (definition.text || `%${level + 1}.`).replace(/%(\d+)/g, (_, match: string) => {
    const targetLevel = Number(match) - 1
    const targetDefinition = abstractNumId ? numbering.abstracts.get(abstractNumId)?.get(targetLevel) : undefined
    const counter = counters[targetLevel] || targetDefinition?.start || 1
    return formatListCounter(counter, targetDefinition?.format ?? definition.format)
  })

  return {
    ordered: true,
    level,
    label,
  } satisfies WordListInfo
}

function headingLevelFromStyle(styleId?: string, styleName?: string) {
  const source = `${styleName ?? ''} ${styleId ?? ''}`.toLowerCase()
  if (source.includes('heading 1') || source.includes('heading1') || source === 'title') return 1
  if (source.includes('heading 2') || source.includes('heading2')) return 2
  if (source.includes('heading 3') || source.includes('heading3')) return 3
  if (source.includes('heading 4') || source.includes('heading4')) return 4
  return undefined
}

function dataUrlFromBytes(bytes: Uint8Array, mimeType: string) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${mimeType};base64,${btoa(binary)}`
}

function parseDrawingImageEffects(drawing: Element): WordImageEffects | undefined {
  const blip = firstDescendant(drawing, 'blip')
  if (!blip) return undefined

  const grayscale = !!firstChild(blip, 'grayscl')
  const biLevel = firstChild(blip, 'biLevel')
  const thresholdValue = Number(attr(biLevel, 'thresh') ?? '')
  const biLevelThreshold = Number.isFinite(thresholdValue) && thresholdValue > 0
    ? Math.max(0, Math.min(1, thresholdValue / 100000))
    : biLevel
      ? 0.5
      : undefined

  if (!grayscale && typeof biLevelThreshold !== 'number') return undefined

  return {
    grayscale,
    biLevelThreshold,
  }
}

function applyImageEffects(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  effects?: WordImageEffects,
) {
  if (!effects?.grayscale && typeof effects?.biLevelThreshold !== 'number') return

  const imageData = context.getImageData(0, 0, width, height)
  const threshold = typeof effects.biLevelThreshold === 'number'
    ? Math.round(Math.max(0, Math.min(1, effects.biLevelThreshold)) * 255)
    : undefined

  for (let index = 0; index < imageData.data.length; index += 4) {
    const r = imageData.data[index]
    const g = imageData.data[index + 1]
    const b = imageData.data[index + 2]
    const luminance = Math.round((0.299 * r) + (0.587 * g) + (0.114 * b))

    if (typeof threshold === 'number') {
      const next = luminance >= threshold ? 255 : 0
      imageData.data[index] = next
      imageData.data[index + 1] = next
      imageData.data[index + 2] = next
      continue
    }

    imageData.data[index] = luminance
    imageData.data[index + 1] = luminance
    imageData.data[index + 2] = luminance
  }

  context.putImageData(imageData, 0, 0)
}

async function ensurePdfImageDataUrl(
  bytes: Uint8Array,
  mimeType: string,
  effects?: WordImageEffects,
) {
  if (!effects?.grayscale && typeof effects?.biLevelThreshold !== 'number') {
    return dataUrlFromBytes(bytes, mimeType)
  }

  if (typeof window === 'undefined') {
    return dataUrlFromBytes(bytes, mimeType)
  }

  return await new Promise<string>((resolve, reject) => {
    const blob = new Blob([bytes as BlobPart], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth || image.width
        canvas.height = image.naturalHeight || image.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas context unavailable')
        context.drawImage(image, 0, 0)
        applyImageEffects(context, canvas.width, canvas.height, effects)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(dataUrlFromBytes(bytes, mimeType))
    }
    image.src = url
  })
}

async function loadImageRun(
  drawing: Element,
  context: ParseContext,
) {
  const blip = firstDescendant(drawing, 'blip')
  const relationshipId = attr(blip, 'embed')
  if (!relationshipId) return null

  const relationship = context.relationships.get(relationshipId)
  if (!relationship) return null
  if (relationship.targetMode?.toLowerCase() === 'external') {
    context.warnings.add('External linked images are not embedded in the PDF output.')
    return null
  }

  const zipPath = resolveZipPath(context.sourcePath, relationship.target)
  const entry = context.zip.file(zipPath)
  if (!entry) return null

  const extent = firstDescendant(drawing, 'extent')
  const widthPt = emuToPt(attr(extent, 'cx')) ?? 160
  const heightPt = emuToPt(attr(extent, 'cy')) ?? 120
  const mimeType = slugToMimeType(zipPath)
  const bytes = await entry.async('uint8array')
  const dataUrl = await ensurePdfImageDataUrl(bytes, mimeType, parseDrawingImageEffects(drawing))
  const docPr = firstDescendant(drawing, 'docPr')
  const placement = resolveDrawingPlacement(drawing)
  const anchorAlignment = resolveDrawingAnchorAlignment(placement)

  return {
    type: 'image',
    dataUrl,
    widthPt,
    heightPt,
    alt: attr(docPr, 'descr') ?? attr(docPr, 'title'),
    anchorAlignment,
    placement,
  } satisfies WordImageRun
}

function normalizeWordHorizontalAlignment(value?: string | null) {
  if (value === 'left' || value === 'center' || value === 'right') return value
  return undefined
}

function normalizeWordVerticalAlignment(value?: string | null) {
  if (value === 'top' || value === 'center' || value === 'bottom') return value
  return undefined
}

function parseWrapMode(anchor: Element): WordWrapMode {
  if (firstChild(anchor, 'wrapNone')) return 'none'
  if (firstChild(anchor, 'wrapTopAndBottom')) return 'topAndBottom'
  if (firstChild(anchor, 'wrapThrough')) return 'through'
  if (firstChild(anchor, 'wrapTight')) return 'tight'
  return 'square'
}

function parseWrapSide(anchor: Element): WordWrapSide {
  const wrapNode = firstChild(anchor, 'wrapSquare')
    ?? firstChild(anchor, 'wrapTight')
    ?? firstChild(anchor, 'wrapThrough')
  const wrapText = attr(wrapNode, 'wrapText')
  if (wrapText === 'left' || wrapText === 'right' || wrapText === 'largest') return wrapText
  return 'bothSides'
}

function resolveDrawingPlacement(drawing: Element) {
  const anchor = firstDescendant(drawing, 'anchor')
  if (!anchor) return undefined

  const positionH = firstChild(anchor, 'positionH')
  const positionV = firstChild(anchor, 'positionV')
  const simplePos = firstChild(anchor, 'simplePos')
  const simplePositionEnabled = ['1', 'true'].includes((attr(anchor, 'simplePos') ?? '').toLowerCase())
  const xOffsetPt = (simplePositionEnabled ? emuToPt(attr(simplePos, 'x')) : undefined)
    ?? emuToPt(firstChild(positionH, 'posOffset')?.textContent)
    ?? 0
  const yOffsetPt = (simplePositionEnabled ? emuToPt(attr(simplePos, 'y')) : undefined)
    ?? emuToPt(firstChild(positionV, 'posOffset')?.textContent)
    ?? 0

  return {
    xOffsetPt,
    yOffsetPt,
    horizontalAlignment: normalizeWordHorizontalAlignment(firstChild(positionH, 'align')?.textContent?.trim().toLowerCase()),
    horizontalRelativeTo: attr(positionH, 'relativeFrom'),
    verticalAlignment: normalizeWordVerticalAlignment(firstChild(positionV, 'align')?.textContent?.trim().toLowerCase()),
    verticalRelativeTo: attr(positionV, 'relativeFrom'),
    wrap: parseWrapMode(anchor),
    wrapSide: parseWrapSide(anchor),
    behindText: ['1', 'true', 'on'].includes((attr(anchor, 'behindDoc') ?? '').toLowerCase()),
    distanceLeftPt: emuToPt(attr(anchor, 'distL')) ?? 0,
    distanceRightPt: emuToPt(attr(anchor, 'distR')) ?? 0,
    distanceTopPt: emuToPt(attr(anchor, 'distT')) ?? 0,
    distanceBottomPt: emuToPt(attr(anchor, 'distB')) ?? 0,
  } satisfies WordDrawingPlacement
}

function resolveDrawingAnchorAlignment(placement?: WordDrawingPlacement) {
  if (!placement) return undefined
  if (placement.horizontalAlignment) return placement.horizontalAlignment
  if (placement.wrapSide === 'left') return 'left'
  if (placement.wrapSide === 'right') return 'right'
  if (placement.xOffsetPt < 0) return 'left'
  if (placement.xOffsetPt > 0) return 'right'
  return undefined
}

function resolveDrawingSize(drawing: Element) {
  const extent = firstDescendant(drawing, 'extent')
  return {
    widthPt: emuToPt(attr(extent, 'cx')) ?? 160,
    heightPt: emuToPt(attr(extent, 'cy')) ?? 120,
  }
}

function resolveDrawingShapeColors(drawing: Element) {
  const fill = firstDescendant(drawing, 'solidFill')
  const stroke = firstDescendant(drawing, 'ln')
  const fillColor = attr(firstDescendant(fill ?? drawing, 'srgbClr'), 'val')
  const strokeColor = attr(firstDescendant(stroke ?? drawing, 'srgbClr'), 'val')
  return {
    backgroundColor: fillColor ? `#${fillColor}` : undefined,
    borderColor: strokeColor ? `#${strokeColor}` : '#CBD5E1',
  }
}

async function loadTextBoxRun(
  drawing: Element,
  inheritedStyle: WordRunStyle,
  context: ParseContext,
) {
  const textBoxContent = firstDescendant(drawing, 'txbxContent')
  if (!textBoxContent) return null

  const blocks = await parseContainerBlocks(textBoxContent, context)
  if (blocks.length === 0) return null

  const docPr = firstDescendant(drawing, 'docPr')
  const { widthPt, heightPt } = resolveDrawingSize(drawing)
  const { backgroundColor, borderColor } = resolveDrawingShapeColors(drawing)
  const placement = resolveDrawingPlacement(drawing)

  if (inheritedStyle.fontFamily) {
    for (const block of blocks) {
      if (block.type !== 'paragraph') continue
      block.runs = block.runs.map(run => run.type === 'text' && !run.fontFamily
        ? { ...run, fontFamily: inheritedStyle.fontFamily }
        : run)
    }
  }

  return {
    type: 'object',
    kind: 'textBox',
    widthPt,
    heightPt,
    alt: attr(docPr, 'descr') ?? attr(docPr, 'title'),
    title: attr(docPr, 'title'),
    anchorAlignment: resolveDrawingAnchorAlignment(placement),
    placement,
    blocks,
    backgroundColor,
    borderColor,
  } satisfies WordObjectRun
}

async function loadChartRun(
  drawing: Element,
  context: ParseContext,
) {
  const chart = firstDescendant(drawing, 'chart')
  const relationshipId = attr(chart, 'id')
  if (!relationshipId) return null

  const relationship = context.relationships.get(relationshipId)
  if (!relationship?.target) return null
  const entry = context.zip.file(resolveZipPath(context.sourcePath, relationship.target))
  if (!entry) return null

  const chartXml = context.parser.parseFromString(await entry.async('string'), 'application/xml')
  const title = descendants(chartXml, 'title')
    .flatMap(node => descendants(node, 't'))
    .map(node => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ')

  const categories = descendants(chartXml, 'cat').flatMap(cat =>
    descendants(cat, 'pt').map(point =>
      firstDescendant(point, 'v')?.textContent?.trim() ?? ''
    ),
  ).filter(Boolean)

  const values = descendants(chartXml, 'val').flatMap(val =>
    descendants(val, 'pt').map(point =>
      Number(firstDescendant(point, 'v')?.textContent ?? NaN)
    ),
  ).filter(value => Number.isFinite(value))

  if (categories.length === 0 && values.length === 0) return null

  const { widthPt, heightPt } = resolveDrawingSize(drawing)
  const docPr = firstDescendant(drawing, 'docPr')
  const placement = resolveDrawingPlacement(drawing)
  const dataPoints = Array.from({ length: Math.max(categories.length, values.length) }, (_, index) => ({
    label: categories[index] ?? `Point ${index + 1}`,
    value: values[index] ?? 0,
  }))

  context.warnings.add('Chart objects were converted into structured chart summaries in the generated PDF.')

  return {
    type: 'object',
    kind: 'chart',
    widthPt,
    heightPt,
    alt: attr(docPr, 'descr') ?? attr(docPr, 'title'),
    title: title || attr(docPr, 'title'),
    anchorAlignment: resolveDrawingAnchorAlignment(placement),
    placement,
    dataPoints,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  } satisfies WordObjectRun
}

async function loadDiagramRun(
  drawing: Element,
  context: ParseContext,
) {
  const relIds = firstDescendant(drawing, 'relIds')
  const relationshipId = attr(relIds, 'dm') ?? attr(relIds, 'lo') ?? attr(relIds, 'qs') ?? attr(relIds, 'cs')
  if (!relationshipId) return null

  const relationship = context.relationships.get(relationshipId)
  if (!relationship?.target) return null
  const entry = context.zip.file(resolveZipPath(context.sourcePath, relationship.target))
  if (!entry) return null

  const diagramXml = context.parser.parseFromString(await entry.async('string'), 'application/xml')
  const labels = descendants(diagramXml, 't')
    .map(node => node.textContent?.trim() ?? '')
    .filter(Boolean)

  if (labels.length === 0) return null

  const { widthPt, heightPt } = resolveDrawingSize(drawing)
  const docPr = firstDescendant(drawing, 'docPr')
  const placement = resolveDrawingPlacement(drawing)
  context.warnings.add('SmartArt objects were simplified into editable labeled boxes in the generated PDF.')

  return {
    type: 'object',
    kind: 'smartArt',
    widthPt,
    heightPt,
    alt: attr(docPr, 'descr') ?? attr(docPr, 'title'),
    title: attr(docPr, 'title'),
    anchorAlignment: resolveDrawingAnchorAlignment(placement),
    placement,
    labels,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  } satisfies WordObjectRun
}

async function loadShapeRun(
  drawing: Element,
  context: ParseContext,
) {
  const docPr = firstDescendant(drawing, 'docPr')
  const shapeName = attr(docPr, 'title') ?? attr(docPr, 'descr')
  if (!shapeName) return null

  const { widthPt, heightPt } = resolveDrawingSize(drawing)
  const { backgroundColor, borderColor } = resolveDrawingShapeColors(drawing)
  const placement = resolveDrawingPlacement(drawing)
  context.warnings.add('Drawing shapes were converted into bordered callout boxes in the generated PDF.')

  return {
    type: 'object',
    kind: 'shape',
    widthPt,
    heightPt,
    alt: shapeName,
    title: shapeName,
    anchorAlignment: resolveDrawingAnchorAlignment(placement),
    placement,
    labels: [shapeName],
    borderColor,
    backgroundColor,
  } satisfies WordObjectRun
}

async function loadObjectRun(
  drawing: Element,
  inheritedStyle: WordRunStyle,
  context: ParseContext,
) {
  return (
    await loadTextBoxRun(drawing, inheritedStyle, context)
    ?? await loadChartRun(drawing, context)
    ?? await loadDiagramRun(drawing, context)
    ?? await loadShapeRun(drawing, context)
  )
}

async function parseRunElements(
  container: Element,
  inheritedStyle: WordRunStyle,
  context: ParseContext,
) {
  const runs: WordRun[] = []
  let pageBreakSeen = false

  async function visit(node: Element, activeStyle: WordRunStyle): Promise<void> {
    if (node.localName === 'del') return

    if (node.localName === 'r') {
      const runStyle = mergeRunStyle(activeStyle, parseRunStyle(firstChild(node, 'rPr')))

      for (const childNode of node.childNodes) {
        if (!(childNode instanceof Element)) continue

        if (childNode.localName === 't') {
          const text = childNode.textContent ?? ''
          if (text) runs.push({ type: 'text', text, ...runStyle })
        } else if (childNode.localName === 'instrText') {
          const instruction = (childNode.textContent ?? '').trim().toUpperCase()
          if (instruction.includes('NUMPAGES')) {
            runs.push({ type: 'text', text: '{{FIELD:NUMPAGES}}', ...runStyle })
          } else if (instruction.includes('PAGE')) {
            runs.push({ type: 'text', text: '{{FIELD:PAGE}}', ...runStyle })
          }
        } else if (childNode.localName === 'tab') {
          runs.push({ type: 'text', text: '    ', ...runStyle })
        } else if (childNode.localName === 'noBreakHyphen') {
          runs.push({ type: 'text', text: '-', ...runStyle })
        } else if (childNode.localName === 'br' || childNode.localName === 'cr') {
          if (attr(childNode, 'type') === 'page') {
            pageBreakSeen = true
          } else {
            runs.push({ type: 'text', text: '\n', ...runStyle })
          }
        } else if (childNode.localName === 'drawing') {
          const imageRun = await loadImageRun(childNode, context)
          if (imageRun) {
            runs.push(imageRun)
          } else {
            const objectRun = await loadObjectRun(childNode, runStyle, context)
            if (objectRun) runs.push(objectRun)
          }
        } else if (childNode.localName === 'pict') {
          context.warnings.add('Legacy VML drawings may simplify in the generated PDF.')
        } else {
          await visit(childNode, runStyle)
        }
      }

      return
    }

    for (const child of childElements(node)) {
      if (child.localName === 'pPr' || child.localName === 'rPr') continue
      await visit(child, activeStyle)
    }
  }

  for (const child of childElements(container)) {
    if (child.localName === 'pPr') continue
    await visit(child, inheritedStyle)
  }

  return { runs, pageBreakSeen }
}

async function parseParagraph(
  paragraph: Element,
  context: ParseContext,
) {
  const properties = firstChild(paragraph, 'pPr')
  const styleId = attr(firstChild(properties, 'pStyle'), 'val')
  const resolvedStyle = context.styles.resolve(styleId)
  const paragraphFormatting = mergeParagraphFormatting(
    resolvedStyle.paragraph,
    parseParagraphFormatting(properties),
  )
  const { runs, pageBreakSeen } = await parseRunElements(paragraph, resolvedStyle.run, context)
  const numPr = firstChild(properties, 'numPr')
  const list = resolveListInfo(
    context.numbering,
    attr(firstChild(numPr, 'numId'), 'val'),
    Number(attr(firstChild(numPr, 'ilvl'), 'val') ?? 0),
  )
  const hasContent = runs.some(run =>
    run.type === 'image'
    || run.type === 'object'
    || run.text.length > 0
  )

  const blocks: WordBlock[] = []
  if ((paragraphFormatting.pageBreakBefore || pageBreakSeen) && hasContent) {
    blocks.push({ type: 'pageBreak' })
  } else if ((paragraphFormatting.pageBreakBefore || pageBreakSeen) && !hasContent) {
    blocks.push({ type: 'pageBreak' })
    return blocks
  }

  if (!hasContent && !list) return blocks

  blocks.push({
    type: 'paragraph',
    blockId: nextBlockId(context),
    runs,
    styleId,
    styleName: resolvedStyle.name,
    headingLevel: headingLevelFromStyle(styleId, resolvedStyle.name),
    list,
    ...mergeParagraphFormatting(DEFAULT_PARAGRAPH, paragraphFormatting),
  } satisfies WordParagraphBlock)

  return blocks
}

async function parseTableCell(
  cell: Element,
  context: ParseContext,
) {
  const properties = firstChild(cell, 'tcPr')
  const blocks: WordBlock[] = []
  for (const child of childElements(cell)) {
    if (child.localName === 'p') {
      blocks.push(...await parseParagraph(child, context))
    } else if (child.localName === 'tbl') {
      blocks.push(await parseTable(child, context))
    }
  }

  if (firstChild(properties, 'vMerge')) {
    context.warnings.add('Vertically merged table cells may simplify in the generated PDF.')
  }

  return {
    blocks,
    widthPt: twipToPt(attr(firstChild(properties, 'tcW'), 'w')),
    colSpan: Number(attr(firstChild(properties, 'gridSpan'), 'val') ?? 1),
    backgroundColor: (() => {
      const fill = attr(firstChild(properties, 'shd'), 'fill')
      return fill && fill !== 'auto' ? `#${fill}` : undefined
    })(),
  } satisfies WordTableCellBlock
}

async function parseTable(
  table: Element,
  context: ParseContext,
) {
  const rows: WordTableRowBlock[] = []

  for (const row of childElements(table, 'tr')) {
    const cells: WordTableCellBlock[] = []
    for (const cell of childElements(row, 'tc')) {
      const parsedCell = await parseTableCell(cell, context)
      cells.push(parsedCell)
      const span = parsedCell.colSpan ?? 1
      for (let index = 1; index < span; index += 1) {
        cells.push({ blocks: [], colSpan: 0 })
      }
    }
    rows.push({ cells })
  }

  return {
    type: 'table',
    blockId: nextBlockId(context),
    rows,
    widthPt: twipToPt(attr(firstChild(firstChild(table, 'tblPr'), 'tblW'), 'w')),
  } satisfies WordTableBlock
}

async function parseContainerBlocks(
  container: Element,
  context: ParseContext,
): Promise<WordBlock[]> {
  const blocks: WordBlock[] = []

  for (const child of childElements(container)) {
    if (child.localName === 'p') {
      blocks.push(...await parseParagraph(child, context))
    } else if (child.localName === 'tbl') {
      blocks.push(await parseTable(child, context))
    } else if (child.localName === 'sdt') {
      const content = firstChild(child, 'sdtContent')
      if (content) {
        blocks.push(...await parseContainerBlocks(content, context))
      }
    }
  }

  return blocks
}

async function parseDocumentPartBlocks(
  zip: JSZip,
  parser: DOMParser,
  sourcePath: string,
  styles: ParseContext['styles'],
  numbering: ParsedNumbering,
  warnings: Set<string>,
  blockCounter: ParseContext['blockCounter'],
) {
  const xmlText = await zip.file(sourcePath)?.async('string')
  if (!xmlText) return []

  const xml = parser.parseFromString(xmlText, 'application/xml')
  const root = firstDescendant(xml, 'hdr') ?? firstDescendant(xml, 'ftr')
  if (!root) return []

  const relsPath = relsPathForPart(sourcePath)
  const relsXmlText = relsPath ? await zip.file(relsPath)?.async('string') : null
  const relsXml = relsXmlText ? parser.parseFromString(relsXmlText, 'application/xml') : null

  return parseContainerBlocks(root, {
    zip,
    parser,
    sourcePath,
    relationships: parseRelationships(relsXml),
    styles,
    numbering,
    warnings,
    blockCounter,
  })
}

async function parseSectionHeaderFooterSet(
  zip: JSZip,
  parser: DOMParser,
  sectionProperties: Element | null,
  documentRelationships: Map<string, { target: string; type: string; targetMode?: string }>,
  styles: ParseContext['styles'],
  numbering: ParsedNumbering,
  warnings: Set<string>,
  blockCounter: ParseContext['blockCounter'],
  evenAndOddHeaders: boolean,
) {
  async function loadReference(kind: 'header' | 'footer', type: 'default' | 'first' | 'even') {
    const reference = childElements(sectionProperties ?? parser.parseFromString('<root />', 'application/xml').documentElement, `${kind}Reference`)
      .find(item => attr(item, 'type') === type)
    if (!reference) return []
    const target = documentRelationships.get(attr(reference, 'id') ?? '')?.target
    if (!target) return []
    return parseDocumentPartBlocks(
      zip,
      parser,
      resolveZipPath('word/document.xml', target),
      styles,
      numbering,
      warnings,
      blockCounter,
    )
  }

  const [defaultHeader, firstHeader, evenHeader, defaultFooter, firstFooter, evenFooter] = await Promise.all([
    loadReference('header', 'default'),
    loadReference('header', 'first'),
    evenAndOddHeaders ? loadReference('header', 'even') : Promise.resolve([]),
    loadReference('footer', 'default'),
    loadReference('footer', 'first'),
    evenAndOddHeaders ? loadReference('footer', 'even') : Promise.resolve([]),
  ])

  return {
    header: {
      defaultBlocks: defaultHeader,
      firstBlocks: firstHeader,
      evenBlocks: evenHeader,
    } satisfies WordHeaderFooterSet,
    footer: {
      defaultBlocks: defaultFooter,
      firstBlocks: firstFooter,
      evenBlocks: evenFooter,
    } satisfies WordHeaderFooterSet,
  }
}

function paragraphText(run: WordRun) {
  if (run.type === 'text') return run.text
  if (run.type === 'object') {
    if (run.blocks) return run.blocks.map(blockTextContent).join(' ')
    if (run.labels) return run.labels.join(' ')
    if (run.dataPoints) return run.dataPoints.map(point => `${point.label} ${point.value}`).join(' ')
    return run.title ?? run.alt ?? ''
  }
  return ''
}

function blockTextContent(block: WordBlock): string {
  if (block.type === 'paragraph') {
    return block.runs.map(paragraphText).join(' ')
  }
  if (block.type === 'table') {
    return block.rows
      .flatMap(row => row.cells.map(cell => cell.blocks.map(blockTextContent).join(' ')))
      .join(' ')
  }
  return ''
}

function countWords(blocks: WordBlock[]): number {
  return blocks
    .map(blockTextContent)
    .join(' ')
    .match(/\b[\w'-]+\b/g)?.length ?? 0
}

function displayRunText(run: WordTextRun, currentPage = 1, pageCount = 1, mode: 'pdf' | 'html' = 'pdf') {
  const text = replaceFieldTokens(run.text, currentPage, pageCount)
  if (run.allCaps) return text.toUpperCase()
  if (run.smallCaps && mode === 'pdf') return text.toUpperCase()
  return text
}

function pdfFontSizeScale(fontName: string) {
  if (fontName === 'LibreBaskerville') return 0.94
  return 1
}

function effectivePdfRunFontSize(run: WordTextRun, fontRegistry: WordPdfFontRegistry = EMPTY_FONT_REGISTRY) {
  const fontSize = run.fontSizePt ?? 11
  const smallCapsAdjusted = run.smallCaps && !run.allCaps ? fontSize * 0.9 : fontSize
  const resolvedFont = resolvePdfFontFamily(run.fontFamily, fontRegistry)
  return smallCapsAdjusted * pdfFontSizeScale(resolvedFont)
}

function detectedParagraphFontSize(
  block: WordParagraphBlock,
  textRuns?: WordTextRun[],
  fontRegistry: WordPdfFontRegistry = EMPTY_FONT_REGISTRY,
) {
  const runs = textRuns ?? block.runs.filter((run): run is WordTextRun => run.type === 'text')
  const explicitRunSizes = runs
    .map(run => effectivePdfRunFontSize(run, fontRegistry))
    .filter(size => Number.isFinite(size) && size > 0)

  if (explicitRunSizes.length > 0) {
    return Math.max(...explicitRunSizes)
  }

  return block.headingLevel
    ? ([20, 16, 13, 12][block.headingLevel - 1] ?? 11)
    : 11
}

function effectiveParagraphLineHeight(
  block: WordParagraphBlock,
  textRuns?: WordTextRun[],
  fontRegistry: WordPdfFontRegistry = EMPTY_FONT_REGISTRY,
) {
  if (typeof block.lineHeight === 'number') return block.lineHeight
  const fontSize = detectedParagraphFontSize(block, textRuns, fontRegistry)
  if (block.alignment === 'center' && !block.list) {
    if (fontSize >= 30) return 1.05
    if (fontSize >= 18) return 1.1
    return 1.15
  }
  return 1.35
}

function resolvedParagraphLineHeight(
  block: WordParagraphBlock,
  textRuns: WordTextRun[],
  options?: PdfRenderOptions,
) {
  const base = effectiveParagraphLineHeight(block, textRuns, options?.fontRegistry)
  if (options?.containerKind && options.containerKind !== 'body' && block.alignment === 'center' && !block.list) {
    return Math.min(base, 1.02)
  }
  return base
}

function blockHasImages(block: WordBlock): boolean {
  if (block.type === 'paragraph') {
    return block.runs.some(run =>
      run.type === 'image'
      || (run.type === 'object' && !!run.blocks?.some(blockHasImages))
    )
  }
  if (block.type === 'table') {
    return block.rows.some(row => row.cells.some(cell => cell.blocks.some(blockHasImages)))
  }
  return false
}

function renderTextRunHtml(run: WordTextRun) {
  const styles = [
    run.bold ? 'font-weight:700' : '',
    run.italics ? 'font-style:italic' : '',
    run.underline ? 'text-decoration:underline' : '',
    run.smallCaps ? 'font-variant:small-caps' : '',
    run.allCaps ? 'text-transform:uppercase' : '',
    run.color ? `color:${run.color}` : '',
    run.fontSizePt ? `font-size:${run.fontSizePt}pt` : '',
    run.fontFamily ? `font-family:${resolvePreviewFontFamily(run.fontFamily)}` : '',
  ].filter(Boolean).join(';')

  return `<span${styles ? ` style="${styles}"` : ''}>${escapeHtml(displayRunText(run, 1, 1, 'html')).replace(/\n/g, '<br>')}</span>`
}

function resolvePreviewFontFamily(fontFamily?: string | null) {
  const normalized = normalizeFontFamily(fontFamily)

  if (normalized.includes('bookman') || normalized.includes('palatino') || normalized.includes('baskerville')) {
    return "'DoclairLibreBaskerville', Baskerville, 'Times New Roman', serif"
  }
  if (normalized.includes('cambria') || normalized.includes('georgia') || normalized.includes('garamond') || normalized.includes('times')) {
    return "'DoclairTinos', 'Times New Roman', serif"
  }
  if (normalized.includes('arial') || normalized.includes('aptos') || normalized.includes('helvetica') || normalized.includes('calibri') || normalized.includes('carlito')) {
    return "'DoclairArimo', Arial, sans-serif"
  }
  if (normalized.includes('courier') || normalized.includes('consolas') || normalized.includes('cousine')) {
    return "'DoclairCousine', 'Courier New', monospace"
  }

  if (fontFamily && fontFamily.trim()) {
    return `'${fontFamily.replace(/'/g, "\\'")}', Georgia, 'Times New Roman', serif`
  }

  return "Georgia, 'Times New Roman', serif"
}

function renderImageRunHtml(run: WordImageRun) {
  return `<img src="${run.dataUrl}" alt="${escapeHtml(run.alt ?? '')}" style="width:${run.widthPt}pt;height:${run.heightPt}pt;vertical-align:middle;margin:4pt 0" />`
}

function renderObjectRunHtml(run: WordObjectRun) {
  const baseStyles = [
    `width:${run.widthPt}pt`,
    run.backgroundColor ? `background:${run.backgroundColor}` : 'background:#F8FAFC',
    `border:1px solid ${run.borderColor ?? '#CBD5E1'}`,
    'border-radius:6pt',
    'padding:8pt',
    'margin:6pt 0',
  ].join(';')

  if (run.kind === 'textBox' && run.blocks) {
    return `<div style="${baseStyles}">${run.blocks.map(renderBlockHtml).join('')}</div>`
  }

  if (run.kind === 'chart' && run.dataPoints) {
    const rows = run.dataPoints.map(point => `<tr><td style="padding:4pt 6pt;border-top:1px solid #E5E7EB">${escapeHtml(point.label)}</td><td style="padding:4pt 6pt;border-top:1px solid #E5E7EB;text-align:right">${point.value}</td></tr>`).join('')
    return `<div style="${baseStyles}"><div style="font-weight:700;margin-bottom:6pt">${escapeHtml(run.title ?? run.alt ?? 'Chart')}</div><table style="width:100%;border-collapse:collapse">${rows}</table></div>`
  }

  if ((run.kind === 'smartArt' || run.kind === 'shape') && run.labels) {
    return `<div style="${baseStyles}"><div style="font-weight:700;margin-bottom:6pt">${escapeHtml(run.title ?? run.alt ?? (run.kind === 'smartArt' ? 'SmartArt' : 'Shape'))}</div>${run.labels.map(label => `<div style="padding:4pt 6pt;border:1px solid #E5E7EB;border-radius:4pt;margin-top:4pt;background:white">${escapeHtml(label)}</div>`).join('')}</div>`
  }

  return `<div style="${baseStyles}">${escapeHtml(run.title ?? run.alt ?? 'Embedded object')}</div>`
}

function splitTextRunsAtFirstTab(runs: WordTextRun[]) {
  const left: WordTextRun[] = []
  const right: WordTextRun[] = []
  let foundTab = false

  for (const run of runs) {
    if (!foundTab && run.text.includes('\t')) {
      const [before, ...rest] = run.text.split('\t')
      if (before) left.push({ ...run, text: before })
      const after = rest.join('\t')
      if (after) right.push({ ...run, text: after })
      foundTab = true
      continue
    }

    if (foundTab) right.push(run)
    else left.push(run)
  }

  return { left, right, foundTab }
}

function renderParagraphHtml(block: WordParagraphBlock) {
  const tag = block.headingLevel ? `h${block.headingLevel}` : 'p'
  const textRuns = block.runs.filter((run): run is WordTextRun => run.type === 'text')
  const detectedFontSize = detectedParagraphFontSize(block, textRuns)
  const detectedFontFamily = textRuns.find(run => run.fontFamily)?.fontFamily
  const topBorderSpace = block.borderTop?.spacePt ?? 0
  const bottomBorderSpace = block.borderBottom?.spacePt ?? 0
  const styles = [
    `text-align:${block.alignment ?? 'left'}`,
    `margin:${block.spacingBeforePt ?? 0}pt 0 ${block.spacingAfterPt ?? 8}pt`,
    `padding-left:${Math.max(0, (block.indentLeftPt ?? 0) + (block.list ? block.list.level * 18 : 0))}pt`,
    `text-indent:${block.firstLineIndentPt ?? 0}pt`,
    `font-size:${detectedFontSize}pt`,
    `font-family:${resolvePreviewFontFamily(detectedFontFamily)}`,
    `font-weight:${textRuns.some(run => run.bold) || block.headingLevel ? 700 : 400}`,
    `line-height:${effectiveParagraphLineHeight(block, textRuns)}`,
    topBorderSpace > 0 ? `padding-top:${topBorderSpace}pt` : '',
    bottomBorderSpace > 0 ? `padding-bottom:${bottomBorderSpace}pt` : '',
    block.borderTop ? `border-top:${block.borderTop.widthPt}pt solid ${block.borderTop.color}` : '',
    block.borderBottom ? `border-bottom:${block.borderBottom.widthPt}pt solid ${block.borderBottom.color}` : '',
  ].filter(Boolean).join(';')

  const listPrefix = block.list
    ? `<span style="display:inline-block;min-width:${18 + block.list.level * 8}pt">${escapeHtml(block.list.label)} </span>`
    : ''
  const imageRuns = block.runs.filter((run): run is WordImageRun => run.type === 'image')
  const objectRuns = block.runs.filter((run): run is WordObjectRun => run.type === 'object')
  const { left: leftTextRuns, right: rightTextRuns, foundTab } = splitTextRunsAtFirstTab(textRuns)
  const leftAnchored = [...imageRuns, ...objectRuns].filter(run => run.anchorAlignment === 'left')
  const rightAnchored = [...imageRuns, ...objectRuns].filter(run => run.anchorAlignment === 'right')
  const inlineImages = imageRuns.filter(run => !run.anchorAlignment || run.anchorAlignment === 'center')
  const inlineObjects = objectRuns.filter(run => !run.anchorAlignment || run.anchorAlignment === 'center')
  const content = [
    ...(foundTab ? leftTextRuns : textRuns).map(renderTextRunHtml),
    ...inlineImages.map(renderImageRunHtml),
    ...inlineObjects.map(renderObjectRunHtml),
  ].join('')
  const rightContent = rightTextRuns.map(renderTextRunHtml).join('')

  if (leftAnchored.length > 0 || rightAnchored.length > 0) {
    const renderFloatingRun = (run: WordImageRun | WordObjectRun) => run.type === 'image'
      ? renderImageRunHtml(run)
      : renderObjectRunHtml(run)
    const leftWidth = leftAnchored.reduce((sum, run) => Math.max(sum, run.widthPt + (run.placement?.distanceLeftPt ?? 0) + (run.placement?.distanceRightPt ?? 0) + 4), 0)
    const rightWidth = rightAnchored.reduce((sum, run) => Math.max(sum, run.widthPt + (run.placement?.distanceLeftPt ?? 0) + (run.placement?.distanceRightPt ?? 0) + 4), 0)
    const anchorHeight = Math.max(
      estimateParagraphTextHeight(block, textRuns),
      ...[...leftAnchored, ...rightAnchored].map(run =>
        run.heightPt
        + (run.placement?.distanceTopPt ?? 0)
        + (run.placement?.distanceBottomPt ?? 0),
      ),
    )
    const visualTopOffset = [...leftAnchored, ...rightAnchored].length > 0
      ? [...leftAnchored, ...rightAnchored].reduce((sum, run) => sum + ((run.placement?.distanceTopPt ?? 0) + (run.placement?.yOffsetPt ?? 0)), 0) / [...leftAnchored, ...rightAnchored].length
      : 0
    const textTopOffset = Math.max(0, Math.min(10, visualTopOffset * 0.35))
    const textSideInsetLeft = leftWidth > 0 ? Math.max(18, leftWidth - 30) : 0
    const textSideInsetRight = rightWidth > 0 ? Math.max(18, rightWidth - 30) : 0
    const renderPositionedRun = (run: WordImageRun | WordObjectRun, side: 'left' | 'right') => {
      const top = (run.placement?.distanceTopPt ?? 0) + (run.placement?.yOffsetPt ?? 0)
      const xStyle = side === 'left'
        ? `left:${(run.placement?.distanceLeftPt ?? 0) + (run.placement?.xOffsetPt ?? 0)}pt`
        : `right:${(run.placement?.distanceRightPt ?? 0) - (run.placement?.xOffsetPt ?? 0)}pt`
      return `<div style="position:absolute;top:${top}pt;${xStyle};width:${run.widthPt}pt;display:flex;justify-content:${side === 'left' ? 'flex-start' : 'flex-end'}">${renderFloatingRun(run)}</div>`
    }

    return `<div style="${styles};position:relative;min-height:${anchorHeight}pt">
      ${leftAnchored.map(run => renderPositionedRun(run, 'left')).join('')}
      ${rightAnchored.map(run => renderPositionedRun(run, 'right')).join('')}
      <div style="text-align:${block.alignment ?? 'left'};padding:${textTopOffset}pt ${textSideInsetRight}pt 0 ${textSideInsetLeft}pt">${listPrefix}${content || '&nbsp;'}</div>
    </div>`
  }

  if (block.rightTabStopPt && foundTab) {
    return `<div style="${styles};display:flex;align-items:flex-start;justify-content:space-between;gap:12pt">
      <div style="flex:1">${listPrefix}${content || '&nbsp;'}</div>
      <div style="white-space:nowrap;text-align:right;padding-left:12pt">${rightContent || '&nbsp;'}</div>
    </div>`
  }

  return `<${tag} style="${styles}">${listPrefix}${content || '&nbsp;'}</${tag}>`
}

function renderTableHtml(block: WordTableBlock): string {
  const rows = block.rows.map(row => {
    const cells = row.cells.map(cell => {
      if (cell.colSpan === 0) return ''
      const cellContent = cell.blocks.map(renderBlockHtml).join('')
      const styles = [
        cell.backgroundColor ? `background:${cell.backgroundColor}` : '',
        'border:1px solid #d1d5db',
        'padding:6pt 8pt',
        'vertical-align:top',
      ].filter(Boolean).join(';')
      const span = cell.colSpan && cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ''
      return `<td${span} style="${styles}">${cellContent || '&nbsp;'}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  return `<table style="border-collapse:collapse;width:100%;margin:8pt 0 12pt">${rows}</table>`
}

function renderBlockHtml(block: WordBlock): string {
  if (block.type === 'pageBreak') {
    return '<div class="docx-page-break" style="height:1px;border-top:1px dashed #d1d5db;margin:24pt 0"></div>'
  }
  if (block.type === 'table') {
    return renderTableHtml(block)
  }
  return renderParagraphHtml(block)
}

function resolveSectionHeaderFooterBlocks(
  headerFooter: WordHeaderFooterSet,
  pageNumber: number,
  titlePage: boolean,
  evenAndOddHeaders: boolean,
) {
  if (titlePage && pageNumber === 1 && headerFooter.firstBlocks.length > 0) {
    return headerFooter.firstBlocks
  }
  if (evenAndOddHeaders && pageNumber % 2 === 0 && headerFooter.evenBlocks.length > 0) {
    return headerFooter.evenBlocks
  }
  return headerFooter.defaultBlocks
}

function buildPreviewHtml(document: StructuredWordDocument) {
  return document.sections.map((section, index) => [
    ...resolveSectionHeaderFooterBlocks(section.header, 1, section.titlePage, section.evenAndOddHeaders).map(renderBlockHtml),
    ...section.blocks.map(renderBlockHtml),
    ...resolveSectionHeaderFooterBlocks(section.footer, 1, section.titlePage, section.evenAndOddHeaders).map(renderBlockHtml),
    index < document.sections.length - 1
      ? '<div class="docx-page-break" style="height:1px;border-top:1px dashed #d1d5db;margin:24pt 0"></div>'
      : '',
  ].join('')).join('')
}

function replaceFieldTokens(text: string, currentPage = 1, pageCount = 1) {
  return text
    .replace(/\{\{FIELD:PAGE\}\}/g, String(currentPage))
    .replace(/\{\{FIELD:NUMPAGES\}\}/g, String(pageCount))
    .replace(/\t/g, '    ')
}

function textRunsToPdfmakeText(
  block: WordParagraphBlock,
  options?: PdfRenderOptions,
) {
  const content: Array<string | Record<string, unknown>> = []

  if (block.list) {
    content.push({
      text: `${block.list.label} `,
      bold: true,
    })
  }

  for (const run of block.runs) {
    if (run.type !== 'text') continue
    content.push({
      text: displayRunText(run, options?.currentPage, options?.pageCount),
      bold: run.bold,
      italics: run.italics,
      decoration: run.underline ? 'underline' : undefined,
      color: run.color,
      fontSize: effectivePdfRunFontSize(run, options?.fontRegistry),
      font: resolvePdfFontFamily(run.fontFamily, options?.fontRegistry),
    })
  }

  return content.length === 1 && typeof content[0] === 'string' ? content[0] : content
}

function imageRunToPdfmakeNode(image: WordImageRun) {
  return {
    image: image.dataUrl,
    width: image.widthPt,
    height: image.heightPt,
    margin: [0, 4, 0, 4],
  }
}

function objectRunToPdfmakeNode(object: WordObjectRun, options?: PdfRenderOptions) {
  const common = {
    margin: [0, 6, 0, 6],
  }

  if (object.kind === 'textBox' && object.blocks) {
    return {
      ...common,
      table: {
        widths: [object.widthPt],
        body: [[{
          stack: blocksToPdfmake(object.blocks, {
            ...options,
            availableWidth: Math.max(80, object.widthPt - 18),
          }),
          fillColor: object.backgroundColor,
        }]],
      },
      layout: {
        hLineColor: () => object.borderColor ?? '#CBD5E1',
        vLineColor: () => object.borderColor ?? '#CBD5E1',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    }
  }

  if (object.kind === 'chart' && object.dataPoints) {
    return {
      ...common,
      stack: [
        { text: object.title ?? object.alt ?? 'Chart', bold: true, font: 'Carlito', margin: [0, 0, 0, 4] },
        {
          table: {
            widths: ['*', 'auto'],
            body: object.dataPoints.map(point => [
              { text: point.label, font: 'Carlito' },
              { text: String(point.value), alignment: 'right', font: 'Carlito' },
            ]),
          },
          layout: 'lightHorizontalLines',
        },
      ],
    }
  }

  if ((object.kind === 'smartArt' || object.kind === 'shape') && object.labels) {
    return {
      ...common,
      stack: [
        { text: object.title ?? object.alt ?? (object.kind === 'smartArt' ? 'SmartArt' : 'Shape'), bold: true, font: 'Carlito', margin: [0, 0, 0, 4] },
        ...object.labels.map(label => ({
          table: {
            widths: [Math.max(120, object.widthPt - 8)],
            body: [[{ text: label, font: 'Carlito', fillColor: '#FFFFFF' }]],
          },
          layout: {
            hLineColor: () => object.borderColor ?? '#CBD5E1',
            vLineColor: () => object.borderColor ?? '#CBD5E1',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 0, 0, 4],
        })),
      ],
    }
  }

  return {
    ...common,
    text: object.title ?? object.alt ?? 'Embedded object',
    font: 'Carlito',
    italics: true,
  }
}

function floatingRunSide(run: WordImageRun | WordObjectRun) {
  if (run.anchorAlignment) return run.anchorAlignment
  const placement = run.placement
  if (!placement) return 'center'
  if (placement.wrapSide === 'left') return 'left'
  if (placement.wrapSide === 'right') return 'right'
  return placement.horizontalAlignment ?? 'center'
}

function floatingRunWrapReserve(run: WordImageRun | WordObjectRun) {
  const placement = run.placement
  if (!placement) return 0
  if (placement.wrap === 'none' || placement.wrap === 'topAndBottom') return 0
  return run.widthPt + placement.distanceLeftPt + placement.distanceRightPt + 8
}

function floatingRunX(
  run: WordImageRun | WordObjectRun,
  availableWidth: number,
) {
  const placement = run.placement
  if (!placement) return 0

  const side = floatingRunSide(run)
  const leftGap = placement.distanceLeftPt
  const rightGap = placement.distanceRightPt

  if (side === 'right') {
    return availableWidth - run.widthPt - rightGap + placement.xOffsetPt
  }
  if (side === 'center') {
    return ((availableWidth - run.widthPt) / 2) + placement.xOffsetPt
  }
  return leftGap + placement.xOffsetPt
}

function floatingRunY(
  run: WordImageRun | WordObjectRun,
  anchorHeight: number,
) {
  const placement = run.placement
  if (!placement) return 0

  if (placement.verticalAlignment === 'bottom') {
    return anchorHeight - run.heightPt - placement.distanceBottomPt + placement.yOffsetPt
  }
  if (placement.verticalAlignment === 'center') {
    return ((anchorHeight - run.heightPt) / 2) + placement.yOffsetPt
  }
  return placement.distanceTopPt + placement.yOffsetPt
}

function floatingRunToPdfmakeNode(
  run: WordImageRun | WordObjectRun,
  options: PdfRenderOptions | undefined,
  availableWidth: number,
  anchorHeight: number,
  renderAfterFlow: boolean,
) {
  const baseNode = run.type === 'image'
    ? imageRunToPdfmakeNode(run)
    : objectRunToPdfmakeNode(run, options)

  if (!run.placement) return baseNode

  return {
    ...baseNode,
    margin: [0, 0, 0, 0],
    relativePosition: {
      x: floatingRunX(run, availableWidth),
      y: floatingRunY(run, anchorHeight) - (renderAfterFlow ? anchorHeight : 0),
    },
  }
}

function floatingRunColumnWidth(run: WordImageRun | WordObjectRun) {
  const placement = run.placement
  if (!placement) return run.widthPt
  return run.widthPt + placement.distanceLeftPt + placement.distanceRightPt + 4
}

function anchoredColumnRunNode(
  run: WordImageRun | WordObjectRun,
  side: 'left' | 'center' | 'right',
  options: PdfRenderOptions | undefined,
) {
  const baseNode = run.type === 'image'
    ? imageRunToPdfmakeNode(run)
    : objectRunToPdfmakeNode(run, options)

  const placement = run.placement
  const topMargin = (placement?.distanceTopPt ?? 0) + (placement?.yOffsetPt ?? 0)
  const bottomMargin = placement?.distanceBottomPt ?? 0
  const leftMargin = side === 'left'
    ? (placement?.distanceLeftPt ?? 0) + (placement?.xOffsetPt ?? 0)
    : 0
  const rightMargin = side === 'right'
    ? (placement?.distanceRightPt ?? 0) - (placement?.xOffsetPt ?? 0)
    : 0

  return {
    ...baseNode,
    alignment: side,
    margin: [leftMargin, topMargin, rightMargin, bottomMargin],
  }
}

function composeAnchoredColumnsParagraphNode(
  block: WordParagraphBlock,
  baseParagraph: Record<string, unknown>,
  textRuns: WordTextRun[],
  floatingRuns: Array<WordImageRun | WordObjectRun>,
  margin: number[],
  options: PdfRenderOptions | undefined,
) {
  if (block.alignment !== 'center' || floatingRuns.length === 0) return null

  const leftRuns = floatingRuns.filter(run => floatingRunSide(run) === 'left')
  const rightRuns = floatingRuns.filter(run => floatingRunSide(run) === 'right')
  const centeredRuns = floatingRuns.filter(run => floatingRunSide(run) === 'center')

  if (centeredRuns.length > 0 || (leftRuns.length === 0 && rightRuns.length === 0)) return null

  const textHeight = estimateParagraphTextHeight(block, textRuns)
  const anchorHeight = Math.max(
    textHeight,
    ...floatingRuns.map(run =>
      run.heightPt
      + (run.placement?.distanceTopPt ?? 0)
      + (run.placement?.distanceBottomPt ?? 0),
    ),
  )
  const leftWidth = leftRuns.length > 0 ? Math.max(...leftRuns.map(floatingRunColumnWidth)) : 0
  const rightWidth = rightRuns.length > 0 ? Math.max(...rightRuns.map(floatingRunColumnWidth)) : 0
  const visualTopOffset = floatingRuns.length > 0
    ? floatingRuns.reduce((sum, run) => sum + ((run.placement?.distanceTopPt ?? 0) + (run.placement?.yOffsetPt ?? 0)), 0) / floatingRuns.length
    : 0
  const textTopOffset = Math.max(0, Math.min(18, visualTopOffset + ((anchorHeight - textHeight) / 2)))

  return wrapParagraphDecorations(block, {
    id: block.blockId,
    margin,
    columns: [
      ...(leftWidth > 0
        ? [{
            width: leftWidth,
            stack: leftRuns.map(run => anchoredColumnRunNode(run, 'left', options)),
          }]
        : []),
      {
        width: '*',
        stack: [{
          ...baseParagraph,
          margin: [0, textTopOffset, 0, 0],
        }],
      },
      ...(rightWidth > 0
        ? [{
            width: rightWidth,
            stack: rightRuns.map(run => anchoredColumnRunNode(run, 'right', options)),
          }]
        : []),
    ],
    columnGap: 0,
    unbreakable: !!(block.keepLines || (block.widowControl && estimateParagraphHeight(block) < ((options?.pageHeight ?? 720) * 0.72))),
    pageBreak: block.pageBreakBefore ? 'before' : undefined,
  }, margin, options)
}

function composeFloatingParagraphNode(
  block: WordParagraphBlock,
  flowNode: Record<string, unknown> | null,
  floatingRuns: Array<WordImageRun | WordObjectRun>,
  margin: number[],
  options: PdfRenderOptions | undefined,
  availableWidth: number,
) {
  if (floatingRuns.length === 0) {
    return flowNode
      ? wrapParagraphDecorations(block, flowNode, margin, { ...options, availableWidth })
      : undefined
  }

  const anchorHeight = Math.max(
    estimateParagraphHeight(block),
    ...floatingRuns.map(run =>
      run.heightPt
      + (run.placement?.distanceTopPt ?? 0)
      + (run.placement?.distanceBottomPt ?? 0)
    ),
  )

  const behindRuns = floatingRuns.filter(run => run.placement?.behindText)
  const frontRuns = floatingRuns.filter(run => !run.placement?.behindText)
  const baseFlowNode = flowNode ?? {
    text: ' ',
    opacity: 0,
    fontSize: 1,
    margin: [0, 0, 0, Math.max(12, anchorHeight)],
  }

  return wrapParagraphDecorations(block, {
    id: block.blockId,
    margin,
    stack: [
      ...behindRuns.map(run => floatingRunToPdfmakeNode(run, options, availableWidth, anchorHeight, false)),
      ...frontRuns.map(run => floatingRunToPdfmakeNode(run, options, availableWidth, anchorHeight, false)),
      baseFlowNode,
    ],
    unbreakable: !!(block.keepLines || (block.widowControl && estimateParagraphHeight(block) < ((options?.pageHeight ?? 720) * 0.72))),
    pageBreak: block.pageBreakBefore ? 'before' : undefined,
  }, margin, { ...options, availableWidth })
}

function wrapParagraphDecorations(
  block: WordParagraphBlock,
  node: Record<string, unknown>,
  margin: number[],
  options?: PdfRenderOptions,
) {
  const availableWidth = Math.max(0, options?.availableWidth ?? 520)
  const shouldKeepTogether = !!(block.keepLines || (block.widowControl && estimateParagraphHeight(block) < ((options?.pageHeight ?? 720) * 0.72)))

  if (!block.borderTop && !block.borderBottom) return node

  const stack: Record<string, unknown>[] = []

  if (block.borderTop) {
    stack.push({
      canvas: [{
        type: 'line',
        x1: 0,
        y1: 0,
        x2: availableWidth,
        y2: 0,
        lineWidth: block.borderTop.widthPt,
        lineColor: block.borderTop.color,
      }],
      margin: [0, 0, 0, block.borderTop.spacePt ?? 3],
    })
  }

  stack.push({ ...node, margin: [0, 0, 0, 0] })

  if (block.borderBottom) {
    stack.push({
      canvas: [{
        type: 'line',
        x1: 0,
        y1: 0,
        x2: availableWidth,
        y2: 0,
        lineWidth: block.borderBottom.widthPt,
        lineColor: block.borderBottom.color,
      }],
      margin: [0, block.borderBottom.spacePt ?? 3, 0, 0],
    })
  }

  return {
    id: block.blockId,
    headlineLevel: block.headingLevel,
    stack,
    margin,
    unbreakable: shouldKeepTogether,
    pageBreak: block.pageBreakBefore ? 'before' : undefined,
  }
}

function paragraphToPdfmake(
  block: WordParagraphBlock,
  options?: PdfRenderOptions,
) {
  const baseMarginLeft = Math.max(0, (block.indentLeftPt ?? 0) + (block.list ? block.list.level * 18 : 0))
  const spacingBefore = options?.insideTableCell ? 0 : (block.spacingBeforePt ?? 0)
  const spacingAfter = options?.insideTableCell ? 0 : (block.spacingAfterPt ?? 8)
  const textRuns = block.runs.filter((run): run is WordTextRun => run.type === 'text')
  const imageRuns = block.runs.filter((run): run is WordImageRun => run.type === 'image')
  const objectRuns = block.runs.filter((run): run is WordObjectRun => run.type === 'object')
  const floatingRuns = [...imageRuns, ...objectRuns].filter((run): run is WordImageRun | WordObjectRun => !!run.placement)
  const inlineImages = imageRuns.filter(run => !run.placement)
  const inlineObjects = objectRuns.filter(run => !run.placement)
  const floatingLeftReserve = Math.max(
    0,
    ...floatingRuns
      .filter(run => floatingRunSide(run) === 'left')
      .map(floatingRunWrapReserve),
  )
  const floatingRightReserve = Math.max(
    0,
    ...floatingRuns
      .filter(run => floatingRunSide(run) === 'right')
      .map(floatingRunWrapReserve),
  )
  const margin = [
    baseMarginLeft + floatingLeftReserve,
    spacingBefore,
    (block.indentRightPt ?? 0) + floatingRightReserve,
    spacingAfter,
  ]
  const availableWidth = Math.max(120, (options?.availableWidth ?? 520) - margin[0] - margin[2])
  const { left: leftTextRuns, right: rightTextRuns, foundTab } = splitTextRunsAtFirstTab(textRuns)

  const fallbackHeadingSize = block.headingLevel
    ? [20, 16, 13, 12][block.headingLevel - 1]
    : undefined
  const detectedFontSize = detectedParagraphFontSize(block, textRuns, options?.fontRegistry)
  const detectedFontFamily = textRuns.find(run => run.fontFamily)?.fontFamily
  const resolvedFontSize = textRuns.length === 0 && block.headingLevel
    ? Math.max(detectedFontSize, fallbackHeadingSize ?? detectedFontSize)
    : detectedFontSize
  const resolvedLineHeight = resolvedParagraphLineHeight(block, textRuns, options)

  const baseParagraph: Record<string, unknown> = {
    id: block.blockId,
    text: textRunsToPdfmakeText({
      ...block,
      runs: foundTab
        ? leftTextRuns
        : textRuns,
    }, options),
    margin,
    alignment: block.alignment,
    lineHeight: resolvedLineHeight,
    fontSize: resolvedFontSize,
    font: resolvePdfFontFamily(detectedFontFamily, options?.fontRegistry),
    bold: block.headingLevel ? true : undefined,
    headlineLevel: options?.containerKind === 'body' ? block.headingLevel : undefined,
    unbreakable: !!(block.keepLines || (block.widowControl && estimateParagraphHeight(block) < ((options?.pageHeight ?? 720) * 0.72))),
    pageBreak: block.type === 'paragraph' && block.pageBreakBefore ? 'before' : undefined,
  }

  const anchoredColumnsNode = inlineImages.length === 0 && inlineObjects.length === 0
    ? composeAnchoredColumnsParagraphNode(block, baseParagraph, textRuns, floatingRuns, margin, options)
    : null

  if (anchoredColumnsNode) return anchoredColumnsNode

  if (block.rightTabStopPt && foundTab) {
    return composeFloatingParagraphNode(block, {
      id: block.blockId,
      margin,
      columns: [
        {
          width: '*',
          stack: [{ ...baseParagraph, margin: [0, 0, 0, 0] }],
        },
        {
          width: 'auto',
          text: rightTextRuns.map(run => ({
            text: displayRunText(run, options?.currentPage, options?.pageCount),
            bold: run.bold,
            italics: run.italics,
            decoration: run.underline ? 'underline' : undefined,
            color: run.color,
            fontSize: effectivePdfRunFontSize(run, options?.fontRegistry),
            font: resolvePdfFontFamily(run.fontFamily, options?.fontRegistry),
          })),
          alignment: 'right',
          margin: [12, 0, 0, 0],
        },
      ],
    }, floatingRuns, margin, options, availableWidth)
  }

  if (inlineImages.length === 0 && inlineObjects.length === 0) {
    return composeFloatingParagraphNode(block, baseParagraph, floatingRuns, margin, options, availableWidth)
  }

  const imageNodes = inlineImages.map(image => ({
    ...imageRunToPdfmakeNode(image),
    alignment: block.alignment,
  }))
  const objectNodes = inlineObjects.map(objectRun => ({
    ...objectRunToPdfmakeNode(objectRun, options),
    alignment: block.alignment,
  }))

  if (textRuns.length === 0) {
    return composeFloatingParagraphNode(block, {
      id: block.blockId,
      margin,
      stack: [...imageNodes, ...objectNodes],
      unbreakable: true,
    }, floatingRuns, margin, options, availableWidth)
  }

  return composeFloatingParagraphNode(block, {
    id: block.blockId,
    margin,
    stack: [
      { ...baseParagraph, margin: [0, 0, 0, 0] },
      ...imageNodes,
      ...objectNodes,
    ],
    unbreakable: true,
  }, floatingRuns, margin, options, availableWidth)
}

function tableCellToPdfmake(cell: WordTableCellBlock, options?: PdfRenderOptions) {
  const content = blocksToPdfmake(cell.blocks, { ...options, insideTableCell: true })
  const cellNode: Record<string, unknown> = {
    stack: content.length > 0 ? content : [{ text: '' }],
    fillColor: cell.backgroundColor,
  }

  if (cell.colSpan && cell.colSpan > 1) cellNode.colSpan = cell.colSpan
  return cellNode
}

function tableToPdfmake(block: WordTableBlock, options?: PdfRenderOptions) {
  const visibleColumnCount = Math.max(
    ...block.rows.map(row => row.cells.reduce((count, cell) => count + (cell.colSpan === 0 ? 0 : (cell.colSpan ?? 1)), 0)),
    1,
  )

  const widths = Array.from({ length: visibleColumnCount }, (_, index) => {
    const firstDefinedWidth = block.rows
      .map(row => row.cells[index]?.widthPt)
      .find((value): value is number => typeof value === 'number' && value > 0)
    return firstDefinedWidth ?? '*'
  })

  const body = block.rows.map(row => row.cells.map(cell => tableCellToPdfmake(cell, options)))

  return {
    id: block.blockId,
    table: {
      widths,
      body,
    },
    unbreakable: block.rows.length <= 3,
    layout: {
      hLineColor: () => '#D1D5DB',
      vLineColor: () => '#D1D5DB',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 4, 0, 8],
  }
}

function blocksToPdfmake(
  blocks: WordBlock[],
  options?: PdfRenderOptions,
) {
  const nodes: Record<string, unknown>[] = []

  for (const block of blocks) {
    if (block.type === 'pageBreak') {
      nodes.push({ text: '', pageBreak: 'before' })
      continue
    }
    if (block.type === 'table') {
      nodes.push(tableToPdfmake(block, options))
      continue
    }
    const paragraphNode = paragraphToPdfmake(block, options)
    if (paragraphNode) nodes.push(paragraphNode)
  }

  return nodes
}

function estimateParagraphHeight(block: WordParagraphBlock, options?: PdfRenderOptions) {
  const textRuns = block.runs.filter((run): run is WordTextRun => run.type === 'text')
  const imageRuns = block.runs.filter((run): run is WordImageRun => run.type === 'image')
  const objectRuns = block.runs.filter((run): run is WordObjectRun => run.type === 'object')
  const textHeight = estimateParagraphTextHeight(block, textRuns, options)
  const imageHeight = imageRuns.length > 0 ? Math.max(...imageRuns.map(run => run.heightPt)) : 0
  const objectHeight = objectRuns.length > 0 ? Math.max(...objectRuns.map(run => run.heightPt)) : 0
  const floatingHeight = Math.max(
    0,
    ...[...imageRuns, ...objectRuns]
      .filter((run): run is WordImageRun | WordObjectRun => !!run.placement)
      .map(run =>
        run.heightPt
        + (run.placement?.distanceTopPt ?? 0)
        + (run.placement?.distanceBottomPt ?? 0)
        + Math.max(0, run.placement?.yOffsetPt ?? 0),
      ),
  )
  const borderHeight =
    (block.borderTop ? block.borderTop.widthPt + (block.borderTop.spacePt ?? 0) : 0)
    + (block.borderBottom ? block.borderBottom.widthPt + (block.borderBottom.spacePt ?? 0) : 0)

  return Math.max(textHeight, imageHeight, objectHeight, floatingHeight)
    + borderHeight
    + (block.spacingBeforePt ?? 0)
    + (block.spacingAfterPt ?? 8)
}

function estimateParagraphTextHeight(
  block: WordParagraphBlock,
  textRuns: WordTextRun[],
  options?: PdfRenderOptions,
) {
  const fontSize = detectedParagraphFontSize(block, textRuns, options?.fontRegistry)
  const lineHeight = resolvedParagraphLineHeight(block, textRuns, options)
  const text = textRuns.map(run => displayRunText(run)).join('')
  const explicitLines = text.split('\n').length
  const estimatedWrappedLines = Math.max(1, Math.ceil(text.length / 80))
  return fontSize * lineHeight * Math.max(explicitLines, estimatedWrappedLines)
}

function estimateTableHeight(block: WordTableBlock, options?: PdfRenderOptions): number {
  return block.rows.reduce((sum, row) => {
    const rowHeight = Math.max(
      ...row.cells
        .filter(cell => cell.colSpan !== 0)
        .map(cell => estimateBlocksHeight(cell.blocks, options) + 12),
      24,
    )
    return sum + rowHeight
  }, 12)
}

function estimateBlocksHeight(blocks: WordBlock[], options?: PdfRenderOptions): number {
  return blocks.reduce((sum, block) => {
    if (block.type === 'paragraph') return sum + estimateParagraphHeight(block, options)
    if (block.type === 'table') return sum + estimateTableHeight(block, options)
    return sum + 12
  }, 0)
}

function documentSectionsWordCount(sections: WordDocumentSection[]) {
  return sections.reduce((sum, section) => {
    const headerBlocks = [
      ...section.header.defaultBlocks,
      ...section.header.firstBlocks,
      ...section.header.evenBlocks,
    ]
    const footerBlocks = [
      ...section.footer.defaultBlocks,
      ...section.footer.firstBlocks,
      ...section.footer.evenBlocks,
    ]
    return sum + countWords([...headerBlocks, ...section.blocks, ...footerBlocks])
  }, 0)
}

function documentSectionsHaveImages(sections: WordDocumentSection[]) {
  return sections.some(section => {
    const headerBlocks = [
      ...section.header.defaultBlocks,
      ...section.header.firstBlocks,
      ...section.header.evenBlocks,
    ]
    const footerBlocks = [
      ...section.footer.defaultBlocks,
      ...section.footer.firstBlocks,
      ...section.footer.evenBlocks,
    ]
    return [...headerBlocks, ...section.blocks, ...footerBlocks].some(blockHasImages)
  })
}

function sectionBodyAvailableWidth(section: WordDocumentSection) {
  return Math.max(120, section.page.widthPt - section.page.marginLeftPt - section.page.marginRightPt)
}

function sectionBodyAvailableHeight(section: WordDocumentSection) {
  return Math.max(120, section.page.heightPt - section.page.marginTopPt - section.page.marginBottomPt)
}

function collectKeepNextBlockIds(sections: WordDocumentSection[]) {
  const ids = new Set<string>()
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type === 'paragraph' && block.keepNext) ids.add(block.blockId)
    }
  }
  return ids
}

function createWordPageBreakBefore(sections: WordDocumentSection[]) {
  const keepNextBlockIds = collectKeepNextBlockIds(sections)
  return (
    currentNode: { id?: string; headlineLevel?: number; pageNumbers?: number[] },
    helpers: {
      getFollowingNodesOnPage(): Array<{ headlineLevel?: number }>
      getNodesOnNextPage(): Array<{ headlineLevel?: number }>
      getPreviousNodesOnPage(): Array<{ headlineLevel?: number }>
    },
  ) => {
    if (!currentNode.id) return false

    if (keepNextBlockIds.has(currentNode.id)) {
      const followingNodes = helpers.getFollowingNodesOnPage()
      const nextPageNodes = helpers.getNodesOnNextPage()
      if (followingNodes.length === 0 && nextPageNodes.length > 0) return true
    }

    if (currentNode.headlineLevel && helpers.getFollowingNodesOnPage().length === 0 && helpers.getNodesOnNextPage().length > 0) {
      return true
    }

    return false
  }
}

async function buildDocxStructuredDocument(file: File) {
  const bytes = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(bytes)
  const documentXmlText = await zip.file('word/document.xml')?.async('string')
  if (!documentXmlText) {
    throw new Error('This Word file is missing document.xml and cannot be converted.')
  }

  const parser = new DOMParser()
  const documentXml = parser.parseFromString(documentXmlText, 'application/xml')
  const stylesXmlText = await zip.file('word/styles.xml')?.async('string')
  const numberingXmlText = await zip.file('word/numbering.xml')?.async('string')
  const relsXmlText = await zip.file('word/_rels/document.xml.rels')?.async('string')
  const settingsXmlText = await zip.file('word/settings.xml')?.async('string')
  const stylesXml = stylesXmlText ? parser.parseFromString(stylesXmlText, 'application/xml') : null
  const numberingXml = numberingXmlText ? parser.parseFromString(numberingXmlText, 'application/xml') : null
  const relsXml = relsXmlText ? parser.parseFromString(relsXmlText, 'application/xml') : null
  const settingsXml = settingsXmlText ? parser.parseFromString(settingsXmlText, 'application/xml') : null
  const styles = parseStyleMap(stylesXml)
  const numbering = parseNumbering(numberingXml)
  const documentRelationships = parseRelationships(relsXml)
  const settings = parseSettings(settingsXml)

  const warnings = new Set<string>()
  const fontRegistry = await parseEmbeddedFontRegistry(zip, parser, warnings)
  const body = firstDescendant(documentXml, 'body')
  if (!body) {
    throw new Error('This Word file has no body content to convert.')
  }

  if (descendants(documentXml, 'txbxContent').length > 0) {
    warnings.add('Text boxes may simplify in the generated PDF.')
  }
  if (descendants(documentXml, 'commentReference').length > 0) {
    warnings.add('Comments are not included in the PDF export.')
  }
  if (descendants(documentXml, 'footnoteReference').length > 0 || descendants(documentXml, 'endnoteReference').length > 0) {
    warnings.add('Footnotes and endnotes may simplify in the generated PDF.')
  }

  const context: ParseContext = {
    zip,
    parser,
    sourcePath: 'word/document.xml',
    relationships: documentRelationships,
    styles,
    numbering,
    warnings,
    blockCounter: { value: 1 },
  }

  const sections: WordDocumentSection[] = []
  let currentSectionBlocks: WordBlock[] = []

  async function finalizeSection(sectionProperties: Element | null, blocks: WordBlock[]) {
    const resolvedProperties = sectionProperties ?? firstChild(body, 'sectPr')
    const { header, footer } = await parseSectionHeaderFooterSet(
      zip,
      parser,
      resolvedProperties,
      documentRelationships,
      styles,
      numbering,
      warnings,
      context.blockCounter,
      settings.evenAndOddHeaders,
    )

    sections.push({
      page: parsePageSettings(resolvedProperties),
      blocks: [...blocks],
      header,
      footer,
      titlePage: onOff(firstChild(resolvedProperties, 'titlePg')) ?? false,
      evenAndOddHeaders: settings.evenAndOddHeaders,
      breakType: parseSectionBreakType(resolvedProperties),
      pageNumberStart: parsePageNumberStart(resolvedProperties),
    })
  }

  for (const child of childElements(body)) {
    if (child.localName === 'p') {
      const paragraphBlocks = await parseParagraph(child, context)
      currentSectionBlocks.push(...paragraphBlocks)
      const section = firstDescendant(firstChild(child, 'pPr') ?? child, 'sectPr')
      if (section) {
        if (parseSectionBreakType(section) === 'continuous') {
          warnings.add('Continuous Word section breaks were approximated as page-based sections in the PDF export.')
        }
        await finalizeSection(section, currentSectionBlocks)
        currentSectionBlocks = []
      }
    } else if (child.localName === 'tbl') {
      currentSectionBlocks.push(await parseTable(child, context))
    } else if (child.localName === 'sectPr') {
      await finalizeSection(child, currentSectionBlocks)
      currentSectionBlocks = []
    }
  }

  if (currentSectionBlocks.length > 0 || sections.length === 0) {
    await finalizeSection(firstChild(body, 'sectPr'), currentSectionBlocks)
  }

  return {
    source: 'docx-structured',
    sections,
    fontRegistry,
    warnings: [...warnings],
    wordCount: documentSectionsWordCount(sections),
    hasImages: documentSectionsHaveImages(sections),
  } satisfies StructuredWordDocument & { warnings: string[]; wordCount: number; hasImages: boolean }
}

async function mammothFallback(file: File): Promise<WordConversionResult> {
  const bytes = await file.arrayBuffer()
  const result = await mammoth.convertToHtml(
    { arrayBuffer: bytes },
    {
      styleMap: [
        "p[style-name='Heading 1']      => h1:fresh",
        "p[style-name='Heading 2']      => h2:fresh",
        "p[style-name='Heading 3']      => h3:fresh",
        "p[style-name='Heading 4']      => h4:fresh",
        "p[style-name='Title']          => h1.doc-title:fresh",
        "p[style-name='Subtitle']       => p.doc-subtitle:fresh",
        "p[style-name='Caption']        => p.caption:fresh",
        "r[style-name='Strong']         => strong",
        "r[style-name='Emphasis']       => em",
        "p[style-name='List Paragraph'] => li:fresh",
      ],
      convertImage: mammoth.images.imgElement(image =>
        image.read('base64').then(data => ({
          src: `data:${image.contentType};base64,${data}`,
          style: 'max-width: 100%; height: auto;',
        }))
      ),
    },
  )

  const previewHtml = result.value
  const warnings = result.messages
    .filter(message => message.type === 'warning')
    .map(message => message.message)

  warnings.unshift('Legacy Word compatibility mode was used, so complex layout may simplify compared with modern .docx export.')

  return {
    previewHtml,
    warnings,
    hasImages: previewHtml.includes('<img'),
    wordCount: (previewHtml.match(/\b[\w'-]+\b/g) ?? []).length,
    pageCountEstimate: Math.max(1, Math.ceil(((previewHtml.match(/\b[\w'-]+\b/g) ?? []).length) / 320)),
    document: {
      source: 'html-fallback',
      html: previewHtml,
    },
  }
}

function looksLikeZip(bytes: Uint8Array) {
  return bytes[0] === 0x50 && bytes[1] === 0x4B
}

function looksLikeRtf(bytes: Uint8Array) {
  const prefix = new TextDecoder('latin1').decode(bytes.slice(0, 32))
  return prefix.trimStart().startsWith('{\\rtf')
}

function decodeRtfToHtml(bytes: Uint8Array) {
  const raw = new TextDecoder('latin1').decode(bytes)
    .replace(/\{\\fonttbl[\s\S]*?\}\s*/g, ' ')
    .replace(/\{\\colortbl[\s\S]*?\}\s*/g, ' ')
    .replace(/\{\\stylesheet[\s\S]*?\}\s*/g, ' ')
  const text = raw
    .replace(/\\par[d]?/g, '\n\n')
    .replace(/\\tab/g, '    ')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\u-?\d+\??/g, ' ')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function extractPlainTextFromBinary(bytes: Uint8Array) {
  const utf16Chars: string[] = []
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const codePoint = bytes[index] | (bytes[index + 1] << 8)
    if (codePoint === 9 || codePoint === 10 || codePoint === 13 || (codePoint >= 32 && codePoint <= 0xFFFD)) {
      utf16Chars.push(String.fromCharCode(codePoint))
    }
  }

  const utf16Text = utf16Chars.join('')
  const asciiText = new TextDecoder('latin1').decode(bytes)
  const combined = `${utf16Text}\n${asciiText}`
  const candidates = combined
    .replace(/\x00/g, ' ')
    .match(/[A-Za-z0-9][^\x00]{3,120}/g)
    ?.map(fragment => fragment.replace(/\s+/g, ' ').trim())
    .filter(fragment => /[A-Za-z]{3}/.test(fragment))
    ?? []

  return Array.from(new Set(candidates)).join('\n\n')
}

async function legacyWordFallback(file: File, bytes: Uint8Array): Promise<WordConversionResult> {
  if (looksLikeRtf(bytes)) {
    const html = decodeRtfToHtml(bytes)
    return {
      previewHtml: html,
      warnings: ['Legacy RTF-based Word compatibility mode was used, so complex formatting may simplify compared with modern .docx export.'],
      hasImages: html.includes('<img'),
      wordCount: (html.match(/\b[\w'-]+\b/g) ?? []).length,
      pageCountEstimate: Math.max(1, Math.ceil(((html.match(/\b[\w'-]+\b/g) ?? []).length) / 320)),
      document: {
        source: 'html-fallback',
        html,
      },
    }
  }

  try {
    const cfbModule = await import('cfb')
    const CFB = (cfbModule.default ?? cfbModule) as {
      read(input: Uint8Array, options: { type: string }): { FileIndex?: Array<{ name: string; content?: Uint8Array }> }
    }
    const container = CFB.read(bytes, { type: 'buffer' })
    const streams = container.FileIndex ?? []
    const wordStream = streams.find(stream => stream.name === 'WordDocument' && stream.content)
    const tableStream = streams.find(stream => (stream.name === '1Table' || stream.name === '0Table') && stream.content)
    const extractedText = extractPlainTextFromBinary(wordStream?.content ?? tableStream?.content ?? bytes)
    if (extractedText.trim()) {
      const html = extractedText
        .split(/\n{2,}/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
        .join('')

      return {
        previewHtml: html,
        warnings: ['Legacy binary .doc compatibility mode was used. Text was recovered, but advanced formatting may simplify compared with modern .docx export.'],
        hasImages: false,
        wordCount: (extractedText.match(/\b[\w'-]+\b/g) ?? []).length,
        pageCountEstimate: Math.max(1, Math.ceil(((extractedText.match(/\b[\w'-]+\b/g) ?? []).length) / 320)),
        document: {
          source: 'html-fallback',
          html,
        },
      }
    }
  } catch {
    // Fall through to Mammoth compatibility path.
  }

  return mammothFallback(file)
}

export async function wordToHTML(file: File): Promise<WordConversionResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  try {
    if (!looksLikeZip(bytes)) {
      return legacyWordFallback(file, bytes)
    }

    const structured = await buildDocxStructuredDocument(file)
    const previewHtml = buildPreviewHtml(structured)
    const pageBreaks = structured.sections.reduce(
      (sum, section) => sum + section.blocks.filter(block => block.type === 'pageBreak').length,
      0,
    )

    return {
      previewHtml,
      warnings: structured.warnings,
      hasImages: structured.hasImages,
      wordCount: structured.wordCount,
      pageCountEstimate: Math.max(1, pageBreaks + structured.sections.length, Math.ceil(structured.wordCount / 420)),
      document: structured,
    }
  } catch {
    if (!looksLikeZip(bytes)) {
      return legacyWordFallback(file, bytes)
    }
    return mammothFallback(file)
  }
}

function maxHeaderFooterHeight(headerFooter: WordHeaderFooterSet) {
  return Math.max(
    estimateBlocksHeight(headerFooter.defaultBlocks, { containerKind: 'header' }),
    estimateBlocksHeight(headerFooter.firstBlocks, { containerKind: 'header' }),
    estimateBlocksHeight(headerFooter.evenBlocks, { containerKind: 'header' }),
    0,
  )
}

function sanitizeHeaderFooterPdfNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeHeaderFooterPdfNode)
  }

  if (!value || typeof value !== 'object') return value

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !['id', 'headlineLevel', 'pageBreak', 'unbreakable'].includes(key))
    .map(([key, childValue]) => [key, sanitizeHeaderFooterPdfNode(childValue)] as const)

  return Object.fromEntries(entries)
}

function buildSectionHeaderFooterNode(
  section: WordDocumentSection,
  kind: 'header' | 'footer',
  currentPage: number,
  pageCount: number,
  fontRegistry: WordPdfFontRegistry,
) {
  const headerFooter = kind === 'header' ? section.header : section.footer
  const blocks = resolveSectionHeaderFooterBlocks(
    headerFooter,
    currentPage,
    section.titlePage,
    section.evenAndOddHeaders,
  )

  if (blocks.length === 0) return undefined

  return {
    stack: sanitizeHeaderFooterPdfNode(blocksToPdfmake(blocks, {
      currentPage,
      pageCount,
      availableWidth: sectionBodyAvailableWidth(section),
      pageHeight: sectionBodyAvailableHeight(section),
      fontRegistry,
      containerKind: kind,
    })) as Record<string, unknown>[],
    margin: kind === 'header'
      ? [section.page.marginLeftPt, Math.max(0, section.page.headerDistancePt), section.page.marginRightPt, 0]
      : [section.page.marginLeftPt, 0, section.page.marginRightPt, Math.max(0, section.page.footerDistancePt)],
  }
}

function shouldInlineSectionHeaderFooter(
  document: StructuredWordDocument,
  section: WordDocumentSection,
  kind: 'header' | 'footer',
) {
  if (document.sections.length !== 1) return false
  if (countWords(section.blocks) > 250) return false

  const headerFooter = kind === 'header' ? section.header : section.footer
  const blocks = resolveSectionHeaderFooterBlocks(
    headerFooter,
    1,
    section.titlePage,
    section.evenAndOddHeaders,
  )

  return blocks.some(block => {
    if (block.type !== 'paragraph') return false
    return block.runs.some(run => run.type !== 'text')
  })
}

function buildPdfmakeSections(document: StructuredWordDocument) {
  return document.sections.map(section => {
    const headerHeight = maxHeaderFooterHeight(section.header)
    const footerHeight = maxHeaderFooterHeight(section.footer)
    const inlineHeader = shouldInlineSectionHeaderFooter(document, section, 'header')
    const inlineFooter = shouldInlineSectionHeaderFooter(document, section, 'footer')
    const firstPageHeaderBlocks = inlineHeader
      ? resolveSectionHeaderFooterBlocks(section.header, 1, section.titlePage, section.evenAndOddHeaders)
      : []
    const firstPageFooterBlocks = inlineFooter
      ? resolveSectionHeaderFooterBlocks(section.footer, 1, section.titlePage, section.evenAndOddHeaders)
      : []

    return {
      section: {
        stack: [
          ...(inlineHeader
            ? sanitizeHeaderFooterPdfNode(blocksToPdfmake(firstPageHeaderBlocks, {
                availableWidth: sectionBodyAvailableWidth(section),
                pageHeight: sectionBodyAvailableHeight(section),
                fontRegistry: document.fontRegistry,
                containerKind: 'header',
              })) as Record<string, unknown>[]
            : []),
          ...blocksToPdfmake(section.blocks, {
            availableWidth: sectionBodyAvailableWidth(section),
            pageHeight: sectionBodyAvailableHeight(section),
            fontRegistry: document.fontRegistry,
            containerKind: 'body',
          }),
          ...(inlineFooter
            ? sanitizeHeaderFooterPdfNode(blocksToPdfmake(firstPageFooterBlocks, {
                availableWidth: sectionBodyAvailableWidth(section),
                pageHeight: sectionBodyAvailableHeight(section),
                fontRegistry: document.fontRegistry,
                containerKind: 'footer',
              })) as Record<string, unknown>[]
            : []),
        ],
      },
      pageSize: {
        width: section.page.widthPt,
        height: section.page.heightPt,
      },
      pageOrientation: section.page.orientation,
      pageMargins: [
        section.page.marginLeftPt,
        inlineHeader
          ? section.page.marginTopPt
          : Math.max(section.page.marginTopPt, section.page.headerDistancePt + headerHeight + 16),
        section.page.marginRightPt,
        inlineFooter
          ? section.page.marginBottomPt
          : Math.max(section.page.marginBottomPt, section.page.footerDistancePt + footerHeight + 12),
      ],
      header: inlineHeader
        ? undefined
        : (currentPage: number, pageCount: number) => buildSectionHeaderFooterNode(section, 'header', currentPage, pageCount, document.fontRegistry),
      footer: inlineFooter
        ? undefined
        : (currentPage: number, pageCount: number) => buildSectionHeaderFooterNode(section, 'footer', currentPage, pageCount, document.fontRegistry),
    }
  })
}

async function fallbackHtmlToPdfBlob(html: string, title: string): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Word to PDF export is only available in the browser')
  }

  const [pdfMakeModule, pdfFontsModule, htmlToPdfmakeModule] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
    import('html-to-pdfmake'),
  ])

  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as unknown as PdfMakeLike
  const pdfFonts = (pdfFontsModule.default ?? pdfFontsModule) as Record<string, string>
  const htmlToPdfmake = (htmlToPdfmakeModule.default ?? htmlToPdfmakeModule) as (
    markup: string,
    options: Record<string, unknown>
  ) => unknown

  await configurePdfMakeFonts(pdfMake, pdfFonts)

  const content = htmlToPdfmake(html, {
    window,
    tableAutoSize: true,
    removeExtraBlanks: true,
  })

  return pdfMake.createPdf({
    info: {
      title,
      author: 'Doclair',
      subject: 'Word to PDF conversion',
    },
    pageSize: 'A4',
    pageMargins: [48, 56, 48, 56],
    defaultStyle: {
      font: 'Carlito',
      fontSize: 11,
      lineHeight: 1.4,
      color: '#111111',
    },
    content,
  }).getBlob()
}

export async function wordDocumentToPdfBlob(
  document: StructuredWordDocument | HtmlFallbackDocument,
  title: string,
): Promise<Blob> {
  if (document.source === 'html-fallback') {
    return fallbackHtmlToPdfBlob(document.html, title)
  }

  if (typeof window === 'undefined') {
    throw new Error('Word to PDF export is only available in the browser')
  }

  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ])

  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as unknown as PdfMakeLike
  const pdfFonts = (pdfFontsModule.default ?? pdfFontsModule) as Record<string, string>
  console.time?.('word-to-pdf:configure-fonts')
  await configurePdfMakeFonts(pdfMake, pdfFonts, document.fontRegistry)
  console.timeEnd?.('word-to-pdf:configure-fonts')
  console.time?.('word-to-pdf:build-sections')
  const content = buildPdfmakeSections(document)
  console.timeEnd?.('word-to-pdf:build-sections')
  console.time?.('word-to-pdf:create-pdf')
  const definition = {
    info: {
      title,
      author: 'Doclair',
      subject: 'Word to PDF conversion',
    },
    pageBreakBefore: createWordPageBreakBefore(document.sections),
    defaultStyle: {
      font: 'Carlito',
      fontSize: 11,
      lineHeight: 1.35,
      color: '#111111',
    },
    content,
  }

  const timeoutMs = document.sections.length === 1 && countWords(document.sections[0]?.blocks ?? []) <= 250
    ? 15000
    : 30000

  const blob = await Promise.race([
    pdfMake.createPdf(definition).getBlob(),
    new Promise<Blob>((_, reject) => {
      window.setTimeout(() => reject(new Error('word-to-pdf-structured-timeout')), timeoutMs)
    }),
  ])
  console.timeEnd?.('word-to-pdf:create-pdf')
  return blob
}
