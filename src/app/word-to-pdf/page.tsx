'use client'

import { useState, useCallback, useRef } from 'react'
import { PDFDocument, StandardFonts, type PDFFont } from '@cantoo/pdf-lib'
import { toPng } from 'html-to-image'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { wordDocumentToPdfBlob, wordToHTML } from '@/lib/pdf/wordToPdf'
import type { WordConversionResult } from '@/lib/pdf/wordToPdf'

type ConvertState = 'idle' | 'converting' | 'preview' | 'error'

const FAQS = [
  { q: 'Will my Word formatting be preserved when converting?', a: 'For modern .docx files, Doclair reads the Word document structure directly in your browser, preserving page size, margins, headings, lists, tables, images, and page breaks much more closely than a generic HTML export. Some advanced Office-only effects can still simplify.' },
  { q: 'Do I need Microsoft Word installed?', a: 'No. Doclair converts Word documents locally in your browser. No Microsoft Word, Google Docs, or desktop Office software is required.' },
  { q: 'Can I convert .doc as well as .docx files?', a: 'Yes. Modern .docx files use the highest-fidelity conversion path. Legacy .doc files fall back to a compatibility conversion path, which can simplify complex formatting more than .docx.' },
  { q: 'Is there a file size limit?', a: 'The maximum file size is 50 MB. Most Word documents are well under 10 MB, so this limit is rarely a concern.' },
  { q: 'Are my Word documents uploaded to a server?', a: 'Never. Doclair converts your document entirely in your browser. Your file is never transmitted to any server.' },
  { q: 'Can I convert a Word CV to PDF free?', a: 'Yes. This is one of the most common uses. Upload your .docx CV, review the preview to confirm formatting, then click "Save as PDF" to download a professional PDF version.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Word to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/word-to-pdf',
      description: 'Convert Word .docx and .doc to PDF free online. Page settings, headings, lists, tables, images, and page breaks preserved locally in your browser. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Word to PDF', item: 'https://doclair.in/word-to-pdf' },
      ],
    },
  ],
}

const PREVIEW_CONTENT_CSS = `
  @font-face {
    font-family: 'DoclairArimo';
    src: url('/editor-fonts/Arimo-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'DoclairArimo';
    src: url('/editor-fonts/Arimo-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'DoclairTinos';
    src: url('/editor-fonts/Tinos-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'DoclairTinos';
    src: url('/editor-fonts/Tinos-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'DoclairCousine';
    src: url('/editor-fonts/Cousine-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'DoclairLibreBaskerville';
    src: url('/editor-fonts/LibreBaskerville-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'DoclairLibreBaskerville';
    src: url('/editor-fonts/LibreBaskerville-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  #word-preview-content h1 { font-size: 20pt; font-weight: bold; margin: 16pt 0 8pt; }
  #word-preview-content h2 { font-size: 16pt; font-weight: bold; margin: 12pt 0 6pt; }
  #word-preview-content h3 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt; }
  #word-preview-content p  { margin: 0 0 8pt; }
  #word-preview-content table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  #word-preview-content td, #word-preview-content th { border: 1px solid #ccc; padding: 4pt 8pt; }
  #word-preview-content th { background: #f5f5f5; font-weight: bold; }
  #word-preview-content ul, #word-preview-content ol { margin: 8pt 0; padding-left: 24pt; }
  #word-preview-content img { max-width: 100%; height: auto; margin: 8pt 0; }
  #word-preview-content .caption { font-size: 10pt; color: #666; font-style: italic; }
  #word-preview-content .docx-page-break { border-top: 1px dashed #d1d5db; margin: 24pt 0; }
`

async function previewElementToPdfBlob(
  previewElement: HTMLElement,
  conversionResult: WordConversionResult,
) {
  const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1))
  let pngDataUrl: string

  try {
    pngDataUrl = await toPng(previewElement, {
      cacheBust: true,
      pixelRatio: scale,
      backgroundColor: '#FFFFFF',
      skipFonts: false,
    })
  } catch {
    throw new Error('Failed to rasterize Word preview')
  }

  const pdfDoc = await PDFDocument.create()
  const pageSettings = conversionResult.document.source === 'docx-structured'
    ? conversionResult.document.sections[0]?.page
    : null
  const pageWidthPt = pageSettings?.widthPt ?? 595.28
  const pageHeightPt = pageSettings?.heightPt ?? 841.89
  const pngImage = await pdfDoc.embedPng(pngDataUrl)
  const embeddedWidthPx = pngImage.width
  const embeddedHeightPx = pngImage.height
  const scaledHeightPt = (embeddedHeightPx / embeddedWidthPx) * pageWidthPt
  const pageCount = Math.max(1, Math.ceil(scaledHeightPt / pageHeightPt))

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt])
    page.drawImage(pngImage, {
      x: 0,
      y: pageHeightPt - scaledHeightPt + (pageIndex * pageHeightPt),
      width: pageWidthPt,
      height: scaledHeightPt,
    })
  }

  const bytes = await pdfDoc.save()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type: 'application/pdf' })
}

async function docxPreviewToPdfBlob(
  file: File,
  conversionResult: WordConversionResult,
) {
  function collectTextBlocks(pageElement: HTMLElement) {
    const selector = 'p, li, td, th, h1, h2, h3, h4, h5, h6'
    const pageRect = pageElement.getBoundingClientRect()

    return Array.from(pageElement.querySelectorAll<HTMLElement>(selector))
      .filter(element => {
        const text = element.innerText || element.textContent || ''
        if (!text.trim()) return false
        return !Array.from(element.querySelectorAll<HTMLElement>(selector))
          .some(child => child !== element && !!(child.innerText || child.textContent || '').trim())
      })
      .map(element => {
        const rect = element.getBoundingClientRect()
        const computed = window.getComputedStyle(element)
        return {
          text: (element.innerText || element.textContent || '')
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
          x: rect.left - pageRect.left,
          y: rect.top - pageRect.top,
          width: rect.width,
          height: rect.height,
          fontSizePx: Number.parseFloat(computed.fontSize) || 16,
          lineHeightPx: Number.parseFloat(computed.lineHeight) || ((Number.parseFloat(computed.fontSize) || 16) * 1.2),
          fontFamily: computed.fontFamily,
          fontWeight: computed.fontWeight,
          fontStyle: computed.fontStyle,
          textAlign: computed.textAlign,
        }
      })
      .filter(block => block.text.length > 0 && block.width > 0 && block.height > 0)
  }

  async function collectImageOverlays(pageElement: HTMLElement, pixelRatio: number) {
    const pageRect = pageElement.getBoundingClientRect()
    const imageElements = Array.from(pageElement.querySelectorAll<HTMLImageElement>('img'))
      .filter(element => {
        const rect = element.getBoundingClientRect()
        const computed = window.getComputedStyle(element)
        return rect.width > 0
          && rect.height > 0
          && computed.display !== 'none'
          && computed.visibility !== 'hidden'
          && (Number.parseFloat(computed.opacity) || 1) > 0
      })

    const overlays = await Promise.all(imageElements.map(async element => {
      const rect = element.getBoundingClientRect()
      const computed = window.getComputedStyle(element)
      let dataUrl = ''

      try {
        dataUrl = await toPng(element, {
          cacheBust: true,
          pixelRatio: Math.max(2, Math.min(4, pixelRatio)),
          backgroundColor: 'rgba(0,0,0,0)',
          skipFonts: true,
        })
      } catch {
        const src = element.currentSrc || element.src || ''
        if (/^data:image\/(?:png|jpe?g);base64,/i.test(src)) {
          dataUrl = src
        }
      }

      if (!dataUrl) {
        return null
      }

      return {
        element,
        dataUrl,
        x: rect.left - pageRect.left,
        y: rect.top - pageRect.top,
        width: rect.width,
        height: rect.height,
        opacity: Math.min(1, Math.max(0, Number.parseFloat(computed.opacity) || 1)),
      }
    }))

    return overlays.filter((overlay): overlay is NonNullable<typeof overlay> => !!overlay)
  }

  function hideCapturedImages(overlays: Array<{
    element: HTMLElement
  }>) {
    const previousState = overlays.map(({ element }) => ({
      element,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
    }))

    overlays.forEach(({ element }) => {
      element.style.visibility = 'hidden'
      element.style.opacity = '0'
    })

    return () => {
      previousState.forEach(({ element, visibility, opacity }) => {
        element.style.visibility = visibility
        element.style.opacity = opacity
      })
    }
  }

  function resolveStructuredHeaderFooterBlocks(
    blocks: {
      defaultBlocks: unknown[]
      firstBlocks: unknown[]
      evenBlocks: unknown[]
    },
    pageNumber: number,
    titlePage: boolean,
    evenAndOddHeaders: boolean,
  ) {
    if (titlePage && pageNumber === 1 && blocks.firstBlocks.length > 0) return blocks.firstBlocks
    if (evenAndOddHeaders && pageNumber % 2 === 0 && blocks.evenBlocks.length > 0) return blocks.evenBlocks
    return blocks.defaultBlocks
  }

  function collectStructuredHeaderImageOverlays(
    pageNumber: number,
    pageWidthPt: number,
    pageHeightPt: number,
  ) {
    const document = conversionResult.document
    if (document.source !== 'docx-structured') return []

    const section = document.sections[Math.min(pageNumber - 1, document.sections.length - 1)]
    if (!section) return []

    const page = section.page
    const paragraphBlocks = resolveStructuredHeaderFooterBlocks(
      section.header,
      pageNumber,
      section.titlePage,
      section.evenAndOddHeaders,
    )

    const resolveHorizontal = (run: {
      widthPt: number
      placement?: {
        xOffsetPt: number
        distanceLeftPt: number
        distanceRightPt: number
        horizontalAlignment?: 'left' | 'center' | 'right'
        horizontalRelativeTo?: string
      }
    }) => {
      const placement = run.placement
      if (!placement) return null

      const relativeTo = placement.horizontalRelativeTo ?? 'margin'
      const rangeStart = relativeTo === 'page'
        ? 0
        : page.marginLeftPt
      const rangeWidth = relativeTo === 'page'
        ? pageWidthPt
        : Math.max(0, pageWidthPt - page.marginLeftPt - page.marginRightPt)

      if (placement.horizontalAlignment === 'right') {
        return rangeStart + rangeWidth - run.widthPt + placement.xOffsetPt
      }
      if (placement.horizontalAlignment === 'center') {
        return rangeStart + ((rangeWidth - run.widthPt) / 2) + placement.xOffsetPt
      }
      return rangeStart + placement.xOffsetPt
    }

    const resolveVertical = (run: {
      heightPt: number
      placement?: {
        yOffsetPt: number
        distanceTopPt: number
        distanceBottomPt: number
        verticalAlignment?: 'top' | 'center' | 'bottom'
        verticalRelativeTo?: string
      }
    }) => {
      const placement = run.placement
      if (!placement) return null

      const relativeTo = placement.verticalRelativeTo ?? 'page'
      const rangeStart = relativeTo === 'margin'
        ? page.marginTopPt
        : Math.max(0, Math.min(page.marginTopPt * 0.4, page.headerDistancePt * 0.35))
      const rangeHeight = relativeTo === 'margin'
        ? Math.max(0, pageHeightPt - page.marginTopPt - page.marginBottomPt)
        : pageHeightPt

      if (placement.verticalAlignment === 'bottom') {
        return rangeStart + rangeHeight - run.heightPt - placement.distanceBottomPt + placement.yOffsetPt
      }
      if (placement.verticalAlignment === 'center') {
        return rangeStart + ((rangeHeight - run.heightPt) / 2) + placement.yOffsetPt
      }
      return rangeStart + placement.distanceTopPt + placement.yOffsetPt
    }

    return paragraphBlocks.flatMap(block => {
      if (!block || typeof block !== 'object' || !('type' in block) || block.type !== 'paragraph' || !('runs' in block) || !Array.isArray(block.runs)) {
        return []
      }

      return block.runs.flatMap(run => {
        if (!run || typeof run !== 'object' || !('type' in run) || run.type !== 'image' || !('placement' in run) || !run.placement) {
          return []
        }

        const x = resolveHorizontal(run)
        const y = resolveVertical(run)
        if (x === null || y === null) return []

        return [{
          dataUrl: run.dataUrl,
          x,
          y,
          width: run.widthPt,
          height: run.heightPt,
          opacity: 1,
        }]
      })
    })
  }

  async function resolvePdfTextFont(pdfDoc: PDFDocument, cache: Map<string, PDFFont>, block: {
    fontFamily: string
    fontWeight: string
    fontStyle: string
  }) {
    const family = block.fontFamily.toLowerCase()
    const isBold = /^(bold|[6-9]00)$/.test(block.fontWeight)
    const isItalic = block.fontStyle.includes('italic')
    let standardFont = StandardFonts.Helvetica

    if (family.includes('courier') || family.includes('mono') || family.includes('cousine')) {
      standardFont = isBold && isItalic
        ? StandardFonts.CourierBoldOblique
        : isBold
          ? StandardFonts.CourierBold
          : isItalic
            ? StandardFonts.CourierOblique
            : StandardFonts.Courier
    } else if (
      family.includes('times')
      || family.includes('georgia')
      || family.includes('garamond')
      || family.includes('palatino')
      || family.includes('bookman')
      || family.includes('baskerville')
      || family.includes('tinos')
    ) {
      standardFont = isBold && isItalic
        ? StandardFonts.TimesRomanBoldItalic
        : isBold
          ? StandardFonts.TimesRomanBold
          : isItalic
            ? StandardFonts.TimesRomanItalic
            : StandardFonts.TimesRoman
    } else {
      standardFont = isBold && isItalic
        ? StandardFonts.HelveticaBoldOblique
        : isBold
          ? StandardFonts.HelveticaBold
          : isItalic
            ? StandardFonts.HelveticaOblique
            : StandardFonts.Helvetica
    }

    if (!cache.has(standardFont)) {
      cache.set(standardFont, await pdfDoc.embedFont(standardFont))
    }

    return cache.get(standardFont) as PDFFont
  }

  const { renderAsync } = await import('docx-preview')
  const renderHost = document.createElement('div')
  renderHost.style.position = 'fixed'
  renderHost.style.left = '-20000px'
  renderHost.style.top = '0'
  renderHost.style.background = '#FFFFFF'
  renderHost.style.zIndex = '-1'
  renderHost.style.padding = '0'
  renderHost.style.margin = '0'
  const renderFonts = document.createElement('style')
  renderFonts.textContent = `
    @font-face {
      font-family: 'Bookman Old Style';
      src: url('/editor-fonts/LibreBaskerville-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Bookman Old Style';
      src: url('/editor-fonts/LibreBaskerville-Bold.ttf') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Times New Roman';
      src: url('/editor-fonts/Tinos-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Times New Roman';
      src: url('/editor-fonts/Tinos-Bold.ttf') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Arial';
      src: url('/editor-fonts/Arimo-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Arial';
      src: url('/editor-fonts/Arimo-Bold.ttf') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
  `
  renderHost.appendChild(renderFonts)
  document.body.appendChild(renderHost)

  try {
    const buffer = await file.arrayBuffer()
    await renderAsync(buffer, renderHost, renderHost, {
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: true,
      ignoreFonts: false,
      debug: false,
    })

    const images = Array.from(renderHost.querySelectorAll('img'))
    await Promise.all(images.map(image => {
      if (image.complete) return Promise.resolve()
      return new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })
    }))
    if ('fonts' in document) {
      await (document.fonts as FontFaceSet).ready.catch(() => undefined)
    }
    await new Promise(resolve => window.requestAnimationFrame(() => resolve(undefined)))
    await new Promise(resolve => window.requestAnimationFrame(() => resolve(undefined)))

    const pageElements = Array.from(renderHost.querySelectorAll('section.docx')) as HTMLElement[]
    const captureTargets = pageElements.length > 0 ? pageElements : [renderHost]
    const scale = Math.max(3, Math.ceil(window.devicePixelRatio || 1))
    const pdfDoc = await PDFDocument.create()
    const standardFontCache = new Map<string, PDFFont>()
    const firstPageSettings = conversionResult.document.source === 'docx-structured'
      ? conversionResult.document.sections[0]?.page
      : null

    for (const [pageIndex, pageElement] of captureTargets.entries()) {
      const imageOverlays = await collectImageOverlays(pageElement, scale)
      const restoreImages = hideCapturedImages(imageOverlays)
      let pngDataUrl = ''

      try {
        pngDataUrl = await toPng(pageElement, {
          cacheBust: true,
          pixelRatio: scale,
          backgroundColor: '#FFFFFF',
          skipFonts: false,
        })
      } finally {
        restoreImages()
      }

      const pngImage = await pdfDoc.embedPng(pngDataUrl)
      const rect = pageElement.getBoundingClientRect()
      const pageWidthPt = firstPageSettings?.widthPt ?? 595.28
      const pageHeightPt = firstPageSettings?.heightPt ?? (pageWidthPt * (rect.height / Math.max(rect.width, 1)))
      const page = pdfDoc.addPage([pageWidthPt, pageHeightPt])
      const scaleX = pageWidthPt / Math.max(rect.width, 1)
      const scaleY = pageHeightPt / Math.max(rect.height, 1)
      const textBlocks = collectTextBlocks(pageElement)
      const headerImageOverlays = imageOverlays.some(overlay => overlay.y < rect.height * 0.25)
        ? []
        : collectStructuredHeaderImageOverlays(pageIndex + 1, pageWidthPt, pageHeightPt)

      for (const block of textBlocks) {
        const font = await resolvePdfTextFont(pdfDoc, standardFontCache, block)
        const fontSizePt = Math.max(7, block.fontSizePx * 0.75)
        const lineHeightPt = Math.max(fontSizePt * 1.1, block.lineHeightPx * 0.75)
        const lines = block.text.split(/\n+/).map(line => line.trim()).filter(Boolean)
        const baseX = block.x * scaleX
        const baseYTop = block.y * scaleY
        const blockWidthPt = block.width * scaleX

        lines.forEach((line, lineIndex) => {
          const textWidth = font.widthOfTextAtSize(line, fontSizePt)
          let x = baseX
          if (block.textAlign === 'center') {
            x = baseX + Math.max(0, (blockWidthPt - textWidth) / 2)
          } else if (block.textAlign === 'right' || block.textAlign === 'end') {
            x = baseX + Math.max(0, blockWidthPt - textWidth)
          }
          const y = pageHeightPt - baseYTop - fontSizePt - (lineIndex * lineHeightPt)
          page.drawText(line, {
            x,
            y,
            size: fontSizePt,
            font,
            lineHeight: lineHeightPt,
          })
        })
      }

      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pageWidthPt,
        height: pageHeightPt,
      })

      for (const overlay of imageOverlays) {
        const overlayImage = overlay.dataUrl.startsWith('data:image/jpeg') || overlay.dataUrl.startsWith('data:image/jpg')
          ? await pdfDoc.embedJpg(overlay.dataUrl)
          : await pdfDoc.embedPng(overlay.dataUrl)
        page.drawImage(overlayImage, {
          x: overlay.x * scaleX,
          y: pageHeightPt - ((overlay.y + overlay.height) * scaleY),
          width: overlay.width * scaleX,
          height: overlay.height * scaleY,
          opacity: overlay.opacity,
        })
      }

      for (const overlay of headerImageOverlays) {
        const overlayImage = overlay.dataUrl.startsWith('data:image/jpeg') || overlay.dataUrl.startsWith('data:image/jpg')
          ? await pdfDoc.embedJpg(overlay.dataUrl)
          : await pdfDoc.embedPng(overlay.dataUrl)
        page.drawImage(overlayImage, {
          x: overlay.x,
          y: pageHeightPt - overlay.y - overlay.height,
          width: overlay.width,
          height: overlay.height,
          opacity: overlay.opacity,
        })
      }
    }

    const bytes = await pdfDoc.save()
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    return new Blob([copy], { type: 'application/pdf' })
  } finally {
    renderHost.remove()
  }
}

export default function WordToPDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [conversionResult, setConversionResult] = useState<WordConversionResult | null>(null)
  const [toolState, setToolState] = useState<ConvertState>('idle')
  const [showWarnings, setShowWarnings] = useState(false)
  const [convertStatus, setConvertStatus] = useState('')
  const [savingPdf, setSavingPdf] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const previewPaperRef = useRef<HTMLDivElement | null>(null)

  async function handleConvert(f?: File) {
    const target = f ?? file
    if (!target) return
    setToolState('converting')
    setConvertStatus('Reading document…')

    try {
      await new Promise(r => setTimeout(r, 100))
      setConvertStatus('Reading Word layout…')
      const result = await wordToHTML(target)
      setConvertStatus('Building preview and PDF model…')
      await new Promise(r => setTimeout(r, 50))
      setConversionResult(result)
      setToolState('preview')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message)
      setToolState('error')
    }
  }

  const addFile = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setConversionResult(null)
    setToolState('idle')
    setShowWarnings(false)
    handleConvert(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSaveAsPDF() {
    if (!conversionResult || savingPdf) return
    const docName = file?.name.replace(/\.(doc|docx)$/i, '') ?? 'document'
    setSavingPdf(true)
    setErrorMessage('')

    try {
      let blob: Blob
      try {
        blob = await Promise.race([
          wordDocumentToPdfBlob(conversionResult.document, docName),
          new Promise<Blob>((_, reject) => {
            window.setTimeout(() => reject(new Error('word-to-pdf-render-timeout')), 25000)
          }),
        ])
      } catch (error) {
        if (file && /\.docx$/i.test(file.name)) {
          try {
            blob = await docxPreviewToPdfBlob(file, conversionResult)
          } catch {
            if (!previewPaperRef.current) throw error
            blob = await previewElementToPdfBlob(previewPaperRef.current, conversionResult)
          }
        } else {
          if (!previewPaperRef.current) throw error
          blob = await previewElementToPdfBlob(previewPaperRef.current, conversionResult)
        }
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${docName}.pdf`
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      window.setTimeout(() => {
        URL.revokeObjectURL(url)
        anchor.remove()
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF from document'
      setErrorMessage(message)
    } finally {
      setSavingPdf(false)
    }
  }

  function handleReset() {
    setFile(null)
    setConversionResult(null)
    setToolState('idle')
    setShowWarnings(false)
    setErrorMessage('')
  }

  const estimatedPages = conversionResult?.pageCountEstimate ?? 0

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'PDF to Word',  slug: 'pdf-to-word',  icon: '📝', colorBg: '#DBEAFE', desc: 'Extract editable Word text' },
        { name: 'Edit PDF',     slug: 'edit-pdf',     icon: '✍️', colorBg: '#DBEAFE', desc: 'Add text, annotations' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',        slug: 'merge-pdf',        icon: '🔀', colorBg: '#DCFCE7', desc: 'Combine multiple PDFs' },
        { name: 'Compress PDF',     slug: 'compress-pdf',     icon: '📦', colorBg: '#DCFCE7', desc: 'Reduce file size' },
        { name: 'Excel to PDF',     slug: 'excel-to-pdf',     icon: '📊', colorBg: '#EDE9FE', desc: 'Convert spreadsheets' },
        { name: 'PDF to Word',      slug: 'pdf-to-word',      icon: '📝', colorBg: '#FEE2E2', desc: 'Extract editable text' },
        { name: 'Add Page Numbers', slug: 'add-page-numbers', icon: '🔢', colorBg: '#FFF0DC', desc: 'Number your pages' },
      ]}
      blogPost={{ slug: 'how-to-convert-word-to-pdf', title: 'How to Convert Word to PDF Free — Keep Formatting' }}
    />
  )

  return (
    <ToolPageLayout toolName="Word to PDF" sidebar={sidebar}>
{/* Tool Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>📝 .doc + .docx</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px',
        }}>
          <span style={{ color: 'var(--ink)' }}>Word to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Convert Documents Securely</span>
        </h1>
        <p style={{
          fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65,
          maxWidth: '520px', marginTop: '12px', lineHeight: 1.6,
        }}>
          Convert .docx and .doc files to PDF free. Page settings, headings, lists, tables, images, and page breaks are preserved locally in your browser. No upload, no watermark.
        </p>
      </div>

      {/* State: idle */}
      {toolState === 'idle' && (
        <DropZone
          onFilesAdded={addFile}
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-word"
          maxFiles={1}
          maxSizeMB={50}
          currentCount={0}
          icon="📝"
          label="Drop Word file here"
          subLabel="or click to browse — .doc and .docx, max 50 MB"
        />
      )}

      {/* State: converting */}
      {toolState === 'converting' && (
        <div style={{
          background: 'var(--ink)', borderRadius: '16px', padding: '56px 32px', textAlign: 'center',
        }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
          <div style={{
            width: '56px', height: '56px', border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--amber)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 24px',
          }} />
          <div style={{
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: '24px', color: 'white', marginBottom: '6px',
          }}>Converting your document…</div>
          <div style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
          }}>{convertStatus}</div>
        </div>
      )}

      {/* State: error */}
      {toolState === 'error' && <ErrorCard message={errorMessage} onReset={handleReset} />}

      {/* State: preview */}
      {toolState === 'preview' && conversionResult && (
        <>
          <style>{PREVIEW_CONTENT_CSS}</style>

          {/* Warnings panel */}
          {conversionResult.warnings.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px 16px' }}>
              <button
                onClick={() => setShowWarnings(!showWarnings)}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                  ⚠️ {conversionResult.warnings.length} formatting note{conversionResult.warnings.length > 1 ? 's' : ''}
                </span>
                <span style={{ color: '#92400E', fontSize: '12px' }}>{showWarnings ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {showWarnings && (
                <ul style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '12px', color: '#92400E', opacity: 0.85 }}>
                  {conversionResult.warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Preview panel */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>// Document Preview</div>
              <div style={{
                fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '10px',
                color: 'var(--muted)',
              }}>
                ~{estimatedPages} page{estimatedPages !== 1 ? 's' : ''} · {conversionResult.wordCount.toLocaleString()} words
              </div>
            </div>
            {/* Paper simulation */}
            <div style={{ padding: '16px', background: '#F9FAFB', maxHeight: '600px', overflowY: 'auto' }}>
              <div style={{
                background: 'white',
                borderRadius: '4px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                padding: '48px',
                maxWidth: '680px',
                margin: '0 auto',
              }} ref={previewPaperRef}>
                <div
                  id="word-preview-content"
                  dangerouslySetInnerHTML={{ __html: conversionResult.previewHtml }}
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: '12pt',
                    lineHeight: 1.6,
                    color: '#111',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleSaveAsPDF}
              disabled={savingPdf}
              style={{
                background: 'var(--ink)', color: 'white', padding: '16px 24px',
                borderRadius: '100px', fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 700, fontSize: '17px', border: 'none', cursor: savingPdf ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s', opacity: savingPdf ? 0.75 : 1,
              }}
              onMouseEnter={e => !savingPdf && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {savingPdf ? 'Building PDF…' : 'Save as PDF →'}
            </button>
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px',
              padding: '10px 14px', fontSize: '12px', color: '#92400E', lineHeight: 1.5,
            }}>
              Doclair generates the PDF directly in your browser and downloads it without opening the print dialog.
            </div>
            {errorMessage && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
                padding: '10px 14px', fontSize: '12px', color: '#B91C1C', lineHeight: 1.5,
              }}>
                {errorMessage}
              </div>
            )}
            <button
              onClick={handleReset}
              style={{
                padding: '12px 24px', borderRadius: '100px', border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-syne), Syne, sans-serif',
                fontWeight: 600, fontSize: '14px', color: 'var(--ink)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)' }}
            >
              Convert another file →
            </button>
          </div>
        </>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Convert Word to PDF Free Online
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Converting your Word document to PDF is instant and completely free with Doclair. No software to install, no account required.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            'Drop your .docx or .doc file into the upload area.',
            'Doclair reads the Word structure locally and shows a live preview of the PDF-ready layout.',
            'Review the preview to confirm headings, lists, tables, images, and page breaks.',
            'Click <strong>Save as PDF →</strong> to download the generated PDF directly, without opening the browser print dialog.',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white',
                fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
              }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }} dangerouslySetInnerHTML={{ __html: step }} />
            </div>
          ))}
        </div>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '28px' }}>
          Why convert Word documents to PDF?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          PDFs preserve layout and fonts perfectly across all devices and operating systems. Word documents can appear differently depending on the viewer&apos;s Office version. Converting to PDF ensures your CV, report, or contract looks exactly as you intended.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Will my formatting be preserved?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          For .docx files, yes in most practical cases. Doclair now reads Word page settings, paragraphs, run styling, numbering, tables, embedded images, and page breaks directly from the document package instead of flattening everything into generic HTML first. Legacy .doc files still use a compatibility path, so modern .docx remains the best choice for highest fidelity.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Convert a Word CV or resume to PDF free
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair is ideal for job applications. Upload your .docx CV, confirm the preview, and download a professional PDF ready to email to recruiters. No account, no watermark, no cost.
        </p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
