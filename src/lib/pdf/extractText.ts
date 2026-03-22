export interface ExtractTextResult {
  text:      string
  pageCount: number
  wordCount: number
  charCount: number
  hasText:   boolean
}

export async function extractTextFromPDF(
  file:        File,
  onProgress?: (page: number, total: number) => void,
): Promise<ExtractTextResult> {
  // Dynamic import — pdfjs-dist uses DOMMatrix at eval time (not available in SSR)
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data:            bytes,
    cMapUrl:         `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked:      true,
    useWorkerFetch:  false,
    isEvalSupported: false,
  }).promise

  const total       = pdf.numPages
  const pages: string[] = []

  for (let i = 1; i <= total; i++) {
    onProgress?.(i - 1, total)

    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()

    const pageText = content.items
      .filter(item => 'str' in item)
      .map(item    => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    pages.push(pageText)
    onProgress?.(i, total)
  }

  const fullText = pages.join('\n\n--- Page Break ---\n\n')
  const words    = fullText.match(/\b\w+\b/g) ?? []

  return {
    text:      fullText,
    pageCount: total,
    wordCount: words.length,
    charCount: fullText.length,
    hasText:   fullText.trim().length > 0,
  }
}
