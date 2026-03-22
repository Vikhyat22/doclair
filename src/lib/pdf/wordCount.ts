export interface PageStats {
  page:      number
  words:     number
  chars:     number
  charsNoSp: number
}

export interface WordCountResult {
  totalWords:      number
  totalChars:      number
  totalCharsNoSp:  number
  totalParagraphs: number
  totalPages:      number
  pageBreakdown:   PageStats[]
  hasText:         boolean
}

export async function countWords(
  file: File,
  excludeNumbers: boolean,
  ignoreWords: string[],
): Promise<WordCountResult> {
  // Dynamic import — pdfjs-dist uses DOMMatrix at eval time (not available in SSR)
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data:        new Uint8Array(bytes),
    cMapUrl:     `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked:  true,
    useWorkerFetch:  false,
    isEvalSupported: false,
  }).promise

  const total     = pdf.numPages
  const pages: PageStats[] = []
  let totalWords = 0, totalChars = 0, totalCharsNoSp = 0, totalParas = 0

  const ignoreSet = new Set(ignoreWords.map(w => w.toLowerCase().trim()).filter(Boolean))

  for (let i = 1; i <= total; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    let text = content.items
      .filter(item => 'str' in item)
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')

    const paraCount = (text.match(/\n{2,}/g) ?? []).length + 1
    if (excludeNumbers) text = text.replace(/\b\d+([.,]\d+)?\b/g, ' ')
    let words: string[] = Array.from(text.match(/\b[\w'-]+\b/g) ?? [])
    if (ignoreSet.size > 0) words = words.filter(w => !ignoreSet.has(w.toLowerCase()))

    const pageChars = text.length
    const pageCharsNoSp = text.replace(/\s/g, '').length
    pages.push({ page: i, words: words.length, chars: pageChars, charsNoSp: pageCharsNoSp })
    totalWords += words.length; totalChars += pageChars; totalCharsNoSp += pageCharsNoSp; totalParas += paraCount
  }

  return { totalWords, totalChars, totalCharsNoSp, totalParagraphs: totalParas, totalPages: total, pageBreakdown: pages, hasText: totalWords > 0 }
}
