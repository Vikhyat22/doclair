import { prepareRichTextHtmlForPdf } from '@/lib/pdf/richTextHtml'

type PdfMakeLike = {
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

type HtmlToPdfmakeResult = unknown[] | {
  content: unknown[]
  images?: Record<string, string>
}

export type RichTextPdfPageSize = 'A4' | 'Letter'
export type RichTextPdfOrientation = 'portrait' | 'landscape'

export interface RichTextToPdfOptions {
  html: string
  title: string
  pageSize: RichTextPdfPageSize
  pageOrientation: RichTextPdfOrientation
}

const PAGE_DIMENSIONS: Record<RichTextPdfPageSize, { width: number, height: number }> = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
}

function getPageDimensions(pageSize: RichTextPdfPageSize, pageOrientation: RichTextPdfOrientation) {
  const base = PAGE_DIMENSIONS[pageSize]
  return pageOrientation === 'portrait'
    ? base
    : { width: base.height, height: base.width }
}

export async function richTextToPdfBlob({
  html,
  title,
  pageSize,
  pageOrientation,
}: RichTextToPdfOptions): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Create PDF export is only available in the browser')
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
    options?: Record<string, unknown>
  ) => unknown

  pdfMake.addVirtualFileSystem(pdfFonts)
  pdfMake.fonts = {
    ...pdfMake.fonts,
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  }

  const preparedHtml = await prepareRichTextHtmlForPdf(html)
  const converted = htmlToPdfmake(preparedHtml, {
    window,
    defaultStyles: {
      a: { color: '#B45309', decoration: 'underline' },
      blockquote: { italics: true, margin: [12, 10, 0, 10] },
      h1: { fontSize: 24, bold: true, margin: [0, 0, 0, 12] },
      h2: { fontSize: 18, bold: true, margin: [0, 20, 0, 8] },
      h3: { fontSize: 15, bold: true, margin: [0, 16, 0, 6] },
      img: { margin: [0, 12, 0, 12] },
      li: { margin: [0, 2, 0, 2] },
      ol: { margin: [0, 6, 0, 8] },
      p: { margin: [0, 6, 0, 6] },
      pre: { margin: [0, 8, 0, 8] },
      table: { margin: [0, 12, 0, 12] },
      td: { margin: [0, 4, 0, 4] },
      th: { bold: true, fillColor: '#F3F4F6', margin: [0, 4, 0, 4] },
      ul: { margin: [0, 6, 0, 8] },
    },
    ignoreStyles: ['font-family'],
    imagesByReference: true,
    removeExtraBlanks: true,
    removeTagClasses: true,
    tableAutoSize: true,
  })
  const contentResult = converted as HtmlToPdfmakeResult
  const content = Array.isArray(contentResult) ? contentResult : contentResult.content
  const images = Array.isArray(contentResult) ? undefined : contentResult.images

  const { width, height } = getPageDimensions(pageSize, pageOrientation)

  return pdfMake.createPdf({
    info: {
      title,
      author: 'Doclair',
      subject: 'Create PDF export',
    },
    pageSize: { width, height },
    pageMargins: [72, 72, 72, 72],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 12,
      lineHeight: 1.45,
      color: '#111111',
    },
    images,
    content: Array.isArray(content) ? content : [content],
  }).getBlob()
}
