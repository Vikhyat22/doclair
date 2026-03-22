'use client'

export async function pdfToMarkdown(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const bytes  = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({ data: bytes }).promise
  const total  = pdf.numPages
  const parts: string[] = []

  for (let i = 1; i <= total; i++) {
    onProgress?.(i - 1, total)
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines: string[] = []
    let lastY = -1

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const y = Math.round((item as any).transform[5])
      if (lastY !== -1 && Math.abs(y - lastY) > 5) lines.push('')
      lines.push(item.str)
      lastY = y
    }

    // Heuristic: short ALL_CAPS lines → heading
    const mdLines = lines.map(line => {
      if (!line.trim()) return ''
      const clean = line.trim()
      if (
        clean === clean.toUpperCase() &&
        clean.length < 60 &&
        clean.length > 2 &&
        !/^\d/.test(clean)
      ) {
        return `## ${clean}`
      }
      return clean
    })

    if (total > 1) {
      parts.push(`<!-- Page ${i} -->\n`)
    }
    parts.push(mdLines.join('\n'))
    if (i < total) parts.push(`\n\n---\n\n`)
    onProgress?.(i, total)
  }

  return parts.join('').trim()
}
