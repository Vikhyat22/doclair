import { createWorker } from 'tesseract.js'
import { PDFDocument } from '@cantoo/pdf-lib'

export type OcrOutputMode = 'searchable-pdf' | 'text-file'

export interface OcrResult {
  mode:       OcrOutputMode
  blob:       Blob
  pageCount:  number
  textLength: number
  language:   string
}

// Indian languages first (Doclair India focus), then alphabetical
export const OCR_LANGUAGES = [
  { code: 'hin', name: 'Hindi' },
  { code: 'ben', name: 'Bengali' },
  { code: 'tam', name: 'Tamil' },
  { code: 'tel', name: 'Telugu' },
  { code: 'mar', name: 'Marathi' },
  { code: 'guj', name: 'Gujarati' },
  { code: 'kan', name: 'Kannada' },
  { code: 'mal', name: 'Malayalam' },
  { code: 'pan', name: 'Punjabi' },
  { code: 'urd', name: 'Urdu' },
  { code: 'ara', name: 'Arabic' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'nld', name: 'Dutch' },
  { code: 'eng', name: 'English' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'pol', name: 'Polish' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'spa', name: 'Spanish' },
  { code: 'tha', name: 'Thai' },
  { code: 'tur', name: 'Turkish' },
  { code: 'vie', name: 'Vietnamese' },
]

export async function ocrPDF(
  file:        File,
  language:    string,
  outputMode:  OcrOutputMode,
  onProgress?: (page: number, total: number, status: string) => void,
): Promise<OcrResult> {
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

  const totalPages = pdf.numPages

  onProgress?.(0, totalPages, 'Loading OCR engine…')

  const worker = await createWorker(language, 1, {
    workerPath: 'https://unpkg.com/tesseract.js/dist/worker.min.js',
    langPath:   'https://tessdata.projectnaptha.com/4.0.0',
    corePath:   'https://unpkg.com/tesseract.js-core/tesseract-core.wasm.js',
    logger:     () => {},
  })

  const allText:   string[]                         = []
  const pageTexts: { text: string; hocr: string }[] = []

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(i - 1, totalPages, `Processing page ${i} of ${totalPages}…`)

    const page     = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })  // ~144 DPI

    const canvas   = document.createElement('canvas')
    canvas.width   = viewport.width
    canvas.height  = viewport.height
    const ctx      = canvas.getContext('2d')!

    // pdfjs v5: BOTH canvas AND canvasContext required in RenderParameters
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      intent: 'print',
    }).promise

    const { data } = await worker.recognize(canvas)
    allText.push(data.text)
    pageTexts.push({ text: data.text, hocr: data.hocr ?? '' })

    // Release GPU memory after each page
    canvas.width  = 0
    canvas.height = 0
  }

  await worker.terminate()
  onProgress?.(totalPages, totalPages, 'Finalising…')

  const combinedText = allText.join('\n\n--- Page Break ---\n\n')

  // ── Plain text output ────────────────────────────────────────────
  if (outputMode === 'text-file') {
    const blob = new Blob([combinedText], { type: 'text/plain' })
    return { mode: 'text-file', blob, pageCount: totalPages, textLength: combinedText.length, language }
  }

  // ── Searchable PDF output ────────────────────────────────────────
  onProgress?.(totalPages, totalPages, 'Building searchable PDF…')

  const srcDoc = await PDFDocument.load(bytes)
  const outDoc = await PDFDocument.create()

  for (let i = 0; i < totalPages; i++) {
    const [copiedPage] = await outDoc.copyPages(srcDoc, [i])
    outDoc.addPage(copiedPage)

    const page             = outDoc.getPages()[i]
    const { width, height } = page.getSize()
    const text             = pageTexts[i]?.text ?? ''
    const lines            = text.split('\n').filter(l => l.trim())
    const lineH            = lines.length > 0 ? height / lines.length : 16

    lines.forEach((line, li) => {
      try {
        page.drawText(line.trim(), {
          x:        0,
          y:        height - (li + 1) * lineH,
          size:     Math.max(6, lineH * 0.9),
          opacity:  0.001,
          maxWidth: width,
        })
      } catch { /* skip lines with unsupported characters */ }
    })
  }

  const pdfBytes = await outDoc.save()
  const blob     = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
  return { mode: 'searchable-pdf', blob, pageCount: totalPages, textLength: combinedText.length, language }
}
