'use client'

export interface PDFPageJSON {
  page:      number
  text:      string
  wordCount: number
  lines:     string[]
}

export interface PDFDocJSON {
  filename:   string
  pageCount:  number
  totalWords: number
  pages:      PDFPageJSON[]
  metadata: {
    title?:   string
    author?:  string
    subject?: string
  }
}

export async function pdfToJSON(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PDFDocJSON> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const bytes  = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({ data: bytes }).promise
  const total  = pdf.numPages
  const pages: PDFPageJSON[] = []
  let totalWords = 0

  // Get metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = await pdf.getMetadata().catch(() => ({ info: {} })) as any
  const info = meta?.info ?? {}

  for (let i = 1; i <= total; i++) {
    onProgress?.(i - 1, total)
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines: string[] = []
    let lastY       = -1
    let currentLine = ''

    for (const item of content.items) {
      if (!('str' in item)) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const y = Math.round((item as any).transform[5])
      if (lastY !== -1 && Math.abs(y - lastY) > 3) {
        if (currentLine.trim()) lines.push(currentLine.trim())
        currentLine = ''
      }
      currentLine += item.str + ' '
      lastY = y
    }
    if (currentLine.trim()) lines.push(currentLine.trim())

    const text  = lines.join(' ')
    const words = (text.match(/\b\w+\b/g) ?? []).length
    totalWords += words
    pages.push({ page: i, text, wordCount: words, lines })
    onProgress?.(i, total)
  }

  return {
    filename:   file.name,
    pageCount:  total,
    totalWords,
    pages,
    metadata: {
      title:   info.Title   || undefined,
      author:  info.Author  || undefined,
      subject: info.Subject || undefined,
    },
  }
}
