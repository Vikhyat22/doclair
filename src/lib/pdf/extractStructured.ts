export interface StructuredLine {
  y: number
  text: string
  cells: string[]
}

export interface StructuredPage {
  page: number
  lines: StructuredLine[]
  wordCount: number
}

export interface StructuredPDF {
  pageCount: number
  totalWords: number
  pages: StructuredPage[]
  metadata: {
    title?: string
    author?: string
    subject?: string
  }
}

interface PositionedItem {
  text: string
  x: number
  width: number
}

interface PdfMetadataInfo {
  Title?: string
  Author?: string
  Subject?: string
}

const LINE_BUCKET_SIZE = 3
const MIN_COLUMN_GAP = 24

export async function extractStructuredPDF(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<StructuredPDF> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const bytes = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: bytes,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise

  const meta = await pdf.getMetadata().catch(() => ({ info: {} as PdfMetadataInfo }))
  const info = (meta as { info?: PdfMetadataInfo }).info ?? {}
  const totalPages = pdf.numPages
  const pages: StructuredPage[] = []
  let totalWords = 0

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum - 1, totalPages)

    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })
    const pageHeight = viewport.height
    const groupedLines = new Map<number, PositionedItem[]>()

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue

      const transform = item.transform as number[]
      const x = transform[4]
      const y = Math.round((pageHeight - transform[5]) / LINE_BUCKET_SIZE) * LINE_BUCKET_SIZE
      const width =
        typeof item.width === 'number' && item.width > 0
          ? item.width
          : Math.max(item.str.length * 5, 8)

      if (!groupedLines.has(y)) groupedLines.set(y, [])
      groupedLines.get(y)!.push({
        text: item.str.trim(),
        x,
        width,
      })
    }

    const lines = Array.from(groupedLines.entries())
      .sort(([a], [b]) => a - b)
      .map(([y, items]) => {
        const sortedItems = [...items].sort((a, b) => a.x - b.x)
        const cells: string[] = []
        let currentCell = ''
        let previousEndX: number | null = null

        for (const positioned of sortedItems) {
          const gap = previousEndX === null ? 0 : positioned.x - previousEndX
          const columnBreak = previousEndX !== null && gap > Math.max(MIN_COLUMN_GAP, positioned.width * 0.75)

          if (columnBreak && currentCell.trim()) {
            cells.push(currentCell.trim())
            currentCell = positioned.text
          } else {
            currentCell += currentCell ? ` ${positioned.text}` : positioned.text
          }

          previousEndX = positioned.x + positioned.width
        }

        if (currentCell.trim()) cells.push(currentCell.trim())

        return {
          y,
          text: cells.join(' ').trim(),
          cells,
        }
      })
      .filter(line => line.text.length > 0)

    const pageText = lines.map(line => line.text).join(' ')
    const wordCount = (pageText.match(/\b\w+\b/g) ?? []).length
    totalWords += wordCount

    pages.push({
      page: pageNum,
      lines,
      wordCount,
    })

    onProgress?.(pageNum, totalPages)
  }

  return {
    pageCount: totalPages,
    totalWords,
    pages,
    metadata: {
      title: info.Title || undefined,
      author: info.Author || undefined,
      subject: info.Subject || undefined,
    },
  }
}
