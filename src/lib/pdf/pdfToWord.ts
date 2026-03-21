import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
} from 'docx'

export interface PdfToWordResult {
  blob:      Blob
  pageCount: number
  wordCount: number
  warnings:  string[]
}

export async function pdfToWord(
  file:        File,
  onProgress?: (current: number, total: number) => void
): Promise<PdfToWordResult> {
  // Dynamic import — pdfjs uses DOMMatrix at eval time
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const bytes = await file.arrayBuffer()
  const pdf   = await pdfjsLib.getDocument({
    data:            bytes,
    cMapUrl:         `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked:      true,
    useWorkerFetch:  false,
    isEvalSupported: false,
  }).promise

  const totalPages     = pdf.numPages
  const allParagraphs: Paragraph[] = []
  const warnings: string[] = []
  let totalWordCount = 0

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum - 1, totalPages)

    const page        = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const viewport    = page.getViewport({ scale: 1 })
    const pageHeight  = viewport.height

    // Group text items into lines by y-position (items within 3pt = same line)
    const lines = new Map<number, Array<{ str: string; x: number }>>()

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const transform = (item as { transform: number[] }).transform
      const y = Math.round((pageHeight - transform[5]) / 3) * 3
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y)!.push({ str: item.str, x: transform[4] })
    }

    // Sort lines top-to-bottom, items left-to-right within each line
    const sortedLines = Array.from(lines.entries())
      .sort(([a], [b]) => a - b)
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map(i => i.str)
          .join(' ')
          .trim()
      )
      .filter(Boolean)

    for (const line of sortedLines) {
      totalWordCount += line.split(/\s+/).filter(Boolean).length

      const isShort      = line.length < 80
      const isAllCaps    = line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line)
      const isTitleStart = /^[A-Z]/.test(line)
      const noEndPunct   = !/[.!?,;:]$/.test(line)

      if (isShort && isAllCaps && noEndPunct) {
        allParagraphs.push(new Paragraph({
          heading:  HeadingLevel.HEADING_1,
          children: [new TextRun({ text: line, bold: true })],
          spacing:  { before: 240, after: 120 },
        }))
      } else if (isShort && isTitleStart && noEndPunct && line.length < 50) {
        allParagraphs.push(new Paragraph({
          heading:  HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line })],
          spacing:  { before: 200, after: 80 },
        }))
      } else {
        allParagraphs.push(new Paragraph({
          children: [new TextRun({ text: line })],
          spacing:  { before: 0, after: 100 },
        }))
      }
    }

    // Page break between pages (not after last)
    if (pageNum < totalPages) {
      allParagraphs.push(new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
      }))
    }

    onProgress?.(pageNum, totalPages)
  }

  if (allParagraphs.length === 0 || totalWordCount === 0) {
    warnings.push(
      'No text found in PDF. This may be a scanned document. ' +
      'Run OCR PDF first to add a searchable text layer.'
    )
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: allParagraphs.length > 0
        ? allParagraphs
        : [new Paragraph({
            children: [new TextRun({
              text: 'No text content found. If this is a scanned PDF, ' +
                    'use the OCR PDF tool first.',
            })],
          })],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const blob   = new Blob([buffer as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  return { blob, pageCount: totalPages, wordCount: totalWordCount, warnings }
}
