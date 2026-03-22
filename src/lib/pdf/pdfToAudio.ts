'use client'

export interface PageText {
  pageNum: number
  text:    string
  words:   string[]
}

export interface PDFTextContent {
  pages:      PageText[]
  totalWords: number
  language:   string
}

export async function extractPDFText(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PDFTextContent> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data:       bytes,
    cMapUrl:    'https://unpkg.com/pdfjs-dist/cmaps/',
    cMapPacked: true,
  }).promise

  const total = pdf.numPages
  const pages: PageText[] = []
  let totalWords = 0

  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total)
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()

    const text = (content.items as Array<{ str?: string }>)
      .filter(item => 'str' in item && typeof item.str === 'string')
      .map(item => item.str as string)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    const words = text.split(/\s+/).filter(Boolean)
    totalWords += words.length
    pages.push({ pageNum: i, text, words })
  }

  const fullText = pages.map(p => p.text).join(' ')
  const language = detectLanguage(fullText)

  return { pages, totalWords, language }
}

function detectLanguage(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'
  return 'en-IN'
}
