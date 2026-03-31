import { extractStructuredPDF } from './extractStructured'

export interface ExtractTextResult {
  text: string
  pageCount: number
  wordCount: number
  charCount: number
  hasText: boolean
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<ExtractTextResult> {
  const structured = await extractStructuredPDF(file, onProgress)

  const pages = structured.pages.map(page =>
    page.lines
      .map(line => line.text)
      .join('\n')
      .trim(),
  )

  const fullText = pages.join('\n\n--- Page Break ---\n\n')
  const words = fullText.match(/\b\w+\b/g) ?? []

  return {
    text: fullText,
    pageCount: structured.pageCount,
    wordCount: words.length,
    charCount: fullText.length,
    hasText: fullText.trim().length > 0,
  }
}
