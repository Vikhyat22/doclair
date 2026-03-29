import mammoth from 'mammoth'

export interface WordConversionResult {
  html:      string
  warnings:  string[]
  hasImages: boolean
  wordCount: number
}

interface PdfMakeLike {
  addVirtualFileSystem(vfs: Record<string, string>): void
  createPdf(definition: unknown): {
    getBlob(): Promise<Blob>
  }
}

export async function wordToHTML(file: File): Promise<WordConversionResult> {
  const bytes  = await file.arrayBuffer()
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
          src:   `data:${image.contentType};base64,${data}`,
          style: 'max-width: 100%; height: auto;',
        }))
      ),
    }
  )

  const html      = result.value
  const warnings  = result.messages
    .filter(m => m.type === 'warning')
    .map(m => m.message)
  const wordCount = (html.match(/\b\w+\b/g) ?? []).length

  return {
    html,
    warnings,
    hasImages: html.includes('<img'),
    wordCount,
  }
}

export async function wordHtmlToPdfBlob(html: string, title: string): Promise<Blob> {
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

  pdfMake.addVirtualFileSystem(pdfFonts)

  const content = htmlToPdfmake(html, {
    window,
    tableAutoSize: true,
    removeExtraBlanks: true,
    defaultStyles: {
      body: { fontSize: 11, lineHeight: 1.5, color: '#111111' },
      p: { margin: [0, 0, 0, 10] },
      h1: { fontSize: 22, bold: true, margin: [0, 10, 0, 8] },
      h2: { fontSize: 18, bold: true, margin: [0, 10, 0, 6] },
      h3: { fontSize: 15, bold: true, margin: [0, 10, 0, 4] },
      h4: { fontSize: 13, bold: true, margin: [0, 8, 0, 4] },
      table: { margin: [0, 8, 0, 12] },
      th: { bold: true, fillColor: '#F5F5F5' },
      td: { margin: [0, 4, 0, 4] },
      ul: { margin: [0, 6, 0, 10] },
      ol: { margin: [0, 6, 0, 10] },
      li: { margin: [0, 2, 0, 2] },
      img: { margin: [0, 8, 0, 8] },
      a: { color: '#111111', decoration: 'underline' },
    },
  })

  const docDefinition = {
    info: {
      title,
      author: 'Doclair',
      subject: 'Word to PDF conversion',
    },
    pageSize: 'A4',
    pageMargins: [48, 56, 48, 56],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.5,
      color: '#111111',
    },
    content,
  }

  return pdfMake.createPdf(docDefinition).getBlob()
}
