'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { getPdfImageBaseName } from '@/lib/image/pdfToImages'

interface ExtractedImage {
  id: string
  dataUrl: string
  width: number
  height: number
  pageIndex: number
  format: string
}

const IDENTITY_TRANSFORM: number[] = [1, 0, 0, 1, 0, 0]

function round(value: number, precision = 2) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function multiplyTransforms(left: readonly number[], right: readonly number[]) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ] as const
}

function applyTransform(matrix: readonly number[], x: number, y: number) {
  return [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ] as const
}

function paintPdfImageDataToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  kind: number,
  data: Uint8Array | Uint8ClampedArray,
) {
  const imageData = ctx.createImageData(width, height)

  if (kind === 3 && data.length === width * height * 4) {
    imageData.data.set(data)
  } else if (kind === 2 && data.length === width * height * 3) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      imageData.data[pixel * 4] = data[pixel * 3]
      imageData.data[pixel * 4 + 1] = data[pixel * 3 + 1]
      imageData.data[pixel * 4 + 2] = data[pixel * 3 + 2]
      imageData.data[pixel * 4 + 3] = 255
    }
  } else if (kind === 1) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const byte = data[Math.floor(pixel / 8)]
      const bit = (byte >> (7 - (pixel % 8))) & 1
      const value = bit ? 255 : 0
      imageData.data[pixel * 4] = value
      imageData.data[pixel * 4 + 1] = value
      imageData.data[pixel * 4 + 2] = value
      imageData.data[pixel * 4 + 3] = 255
    }
  } else {
    return false
  }

  ctx.putImageData(imageData, 0, 0)
  return true
}

function drawPdfBitmapToCanvas(
  ctx: CanvasRenderingContext2D,
  bitmap: unknown,
  width: number,
  height: number,
) {
  if (
    typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap
    || typeof HTMLCanvasElement !== 'undefined' && bitmap instanceof HTMLCanvasElement
    || typeof HTMLImageElement !== 'undefined' && bitmap instanceof HTMLImageElement
    || typeof OffscreenCanvas !== 'undefined' && bitmap instanceof OffscreenCanvas
  ) {
    ctx.drawImage(bitmap, 0, 0, width, height)
    return true
  }

  return false
}

function rasterizePdfImageToDataUrl(image: unknown) {
  if (!image || typeof image !== 'object') return null

  const candidate = image as {
    width?: number
    height?: number
    kind?: number
    data?: Uint8Array | Uint8ClampedArray
    bitmap?: unknown
  }

  const width = Math.round(candidate.width ?? 0)
  const height = Math.round(candidate.height ?? 0)
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const drewBitmap = candidate.bitmap
    ? drawPdfBitmapToCanvas(ctx, candidate.bitmap, width, height)
    : false
  const drewRaw = !drewBitmap && candidate.data && typeof candidate.kind === 'number'
    ? paintPdfImageDataToCanvas(ctx, width, height, candidate.kind, candidate.data)
    : false

  if (!drewBitmap && !drewRaw) return null
  return canvas.toDataURL('image/png')
}

function toViewportBounds(
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  matrix: readonly number[],
) {
  const corners = [
    viewport.convertToViewportPoint(...applyTransform(matrix, 0, 0)),
    viewport.convertToViewportPoint(...applyTransform(matrix, 1, 0)),
    viewport.convertToViewportPoint(...applyTransform(matrix, 0, 1)),
    viewport.convertToViewportPoint(...applyTransform(matrix, 1, 1)),
  ]

  const xs = corners.map(([x]) => x)
  const ys = corners.map(([, y]) => y)

  return {
    x: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

function buildExtractedImage(
  image: unknown,
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  matrix: readonly number[],
  pageIndex: number,
) {
  const dataUrl = rasterizePdfImageToDataUrl(image)
  if (!dataUrl) return null

  const bounds = toViewportBounds(viewport, matrix)
  const candidate = image as { width?: number; height?: number }
  const width = Math.round(candidate.width ?? 0)
  const height = Math.round(candidate.height ?? 0)

  if (width < 20 || height < 20) return null
  if (bounds.width < 10 || bounds.height < 10) return null

  return {
    id: crypto.randomUUID(),
    dataUrl,
    width,
    height,
    pageIndex,
    format: 'PNG',
    signature: `${pageIndex}:${round(bounds.x, 1)}:${round(bounds.top, 1)}:${round(bounds.width, 1)}:${round(bounds.height, 1)}:${width}:${height}`,
  }
}

async function extractPageImages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfjsLib: any,
  pageIndex: number,
) {
  const operatorList = await page.getOperatorList()
  const extracted: Array<ExtractedImage & { signature: string }> = []
  const seen = new Set<string>()
  const stack: number[][] = []
  const objectCache = new Map<string, Promise<unknown | null>>()
  let currentTransform: number[] = [...IDENTITY_TRANSFORM]

  const pushImage = (imageObject: unknown, matrix: readonly number[]) => {
    const image = buildExtractedImage(imageObject, viewport, matrix, pageIndex)
    if (!image || seen.has(image.signature)) return
    seen.add(image.signature)
    extracted.push(image)
  }

  const resolveObject = async (name: string) => {
    if (!objectCache.has(name)) {
      objectCache.set(name, new Promise(resolve => {
        let settled = false
        const finish = (value: unknown | null) => {
          if (settled) return
          settled = true
          resolve(value)
        }

        try {
          if (page.objs?.has?.(name)) return finish(page.objs.get(name))
          if (page.commonObjs?.has?.(name)) return finish(page.commonObjs.get(name))
        } catch {
          return finish(null)
        }

        try {
          page.objs?.get?.(name, finish)
          page.commonObjs?.get?.(name, finish)
        } catch {
          return finish(null)
        }

        setTimeout(() => finish(null), 1500)
      }))
    }

    return objectCache.get(name) ?? null
  }

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const fn = operatorList.fnArray[index]
    const args = operatorList.argsArray[index]

    if (fn === pdfjsLib.OPS.save) {
      stack.push([...currentTransform])
      continue
    }

    if (fn === pdfjsLib.OPS.restore) {
      currentTransform = stack.pop() ?? [...IDENTITY_TRANSFORM]
      continue
    }

    if (fn === pdfjsLib.OPS.transform && Array.isArray(args)) {
      currentTransform = [...multiplyTransforms(currentTransform, args as number[])]
      continue
    }

    if (fn === pdfjsLib.OPS.paintImageXObject) {
      const name = args?.[0]
      if (typeof name === 'string') pushImage(await resolveObject(name), currentTransform)
      continue
    }

    if (fn === pdfjsLib.OPS.paintInlineImageXObject) {
      pushImage(args?.[0], currentTransform)
      continue
    }

    if (fn === pdfjsLib.OPS.paintImageXObjectRepeat) {
      const name = args?.[0]
      const scaleX = args?.[1]
      const scaleY = args?.[2]
      const positions = args?.[3]
      if (typeof name !== 'string' || typeof scaleX !== 'number' || typeof scaleY !== 'number' || !Array.isArray(positions)) {
        continue
      }

      const imageObject = await resolveObject(name)
      for (let positionIndex = 0; positionIndex < positions.length; positionIndex += 2) {
        const repeatTransform = [scaleX, 0, 0, scaleY, positions[positionIndex], positions[positionIndex + 1]]
        pushImage(imageObject, multiplyTransforms(currentTransform, repeatTransform))
      }
      continue
    }

    if (fn === pdfjsLib.OPS.paintInlineImageXObjectGroup) {
      const imageObject = args?.[0]
      const map = args?.[1]
      if (!Array.isArray(map)) continue
      for (const entry of map) {
        if (!Array.isArray(entry?.transform)) continue
        pushImage(imageObject, multiplyTransforms(currentTransform, entry.transform))
      }
    }
  }

  return extracted.map(({ signature, ...image }) => {
    void signature
    return image
  })
}

const FAQS = [
  { q: 'Are my PDF files uploaded to a server?', a: 'No. Doclair scans your PDF for embedded images using PDF.js in your browser. Nothing is sent to a server.' },
  { q: 'What image formats can I download?', a: 'Raster images embedded in the PDF are extracted and offered as PNG downloads. You can download them one by one or as a ZIP archive.' },
  { q: 'Will every PDF have extractable images?', a: 'Only embedded raster images appear. Vector graphics or text rendered as paths may not show as separate image files.' },
  { q: 'Is this tool free?', a: 'Yes. Doclair is free to use with no watermark on extracted images.' },
]

const TOOL_SEO_NAME = 'Extract Images from PDF'
const TOOL_SLUG = 'extract-images-pdf'
const TOOL_DESCRIPTION = 'Extract all images from a PDF file online free. Download as ZIP or individually. No upload, no watermark, files stay in your browser.'

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: `${TOOL_SEO_NAME} — Doclair`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: `https://doclair.in/${TOOL_SLUG}`,
      description: TOOL_DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Extract embedded raster images',
        'PNG downloads per image',
        'Runs locally in the browser',
        'No watermark',
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: TOOL_SEO_NAME, item: `https://doclair.in/${TOOL_SLUG}` },
  ],
}

export default function ExtractImagesPDFPage() {
  const [images, setImages] = useState<ExtractedImage[]>([])
  const [loading, setLoading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState('')

  const extractImages = useCallback(async (file: File) => {
    setLoading(true)
    setImages([])
    setError(null)
    setPdfName(file.name.replace(/\.pdf$/i, ''))
    const extracted: ExtractedImage[] = []

    try {
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise

      for (let pi = 1; pi <= doc.numPages; pi++) {
        setProgress(`Scanning page ${pi} of ${doc.numPages}…`)
        const page = await doc.getPage(pi)
        const viewport = page.getViewport({ scale: 1 })
        extracted.push(...await extractPageImages(page, viewport, pdfjsLib, pi - 1))
      }

      if (extracted.length === 0) {
        setError('No images found in this PDF. The PDF may use vector graphics instead of raster images.')
      }
      setImages(extracted)
    } catch (err) {
      setError(`Failed to process PDF: ${(err as Error).message}`)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [])

  const handleFile = (file: File) => {
    if (file.type === 'application/pdf') extractImages(file)
  }

  const getImageFilename = (img: ExtractedImage, idx: number) =>
    `${getPdfImageBaseName(pdfName || 'image')}-page-${String(img.pageIndex + 1).padStart(2, '0')}-image-${String(idx + 1).padStart(3, '0')}.png`

  const downloadImage = (img: ExtractedImage, idx: number) => {
    const a = document.createElement('a')
    a.href = img.dataUrl
    a.download = getImageFilename(img, idx)
    a.click()
  }

  const downloadAll = async () => {
    if (!images.length) return
    setDownloadingAll(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (let i = 0; i < images.length; i++) {
        const response = await fetch(images[i].dataUrl)
        const blob = await response.blob()
        zip.file(getImageFilename(images[i], i), blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${getPdfImageBaseName(pdfName || 'images')}-extracted-images.zip`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } finally {
      setDownloadingAll(false)
    }
  }

  const hasImages = images.length > 0

  const sidebar = (
    <ToolSidebar relatedTools={[
      { name: 'PDF → JPG', slug: 'pdf-to-jpg', icon: '🖼️', colorBg: '#FFF0DC', desc: 'Export PDF pages as images' },
      { name: 'PDF → PNG', slug: 'pdf-to-png', icon: '🖼️', colorBg: '#D1FAE5', desc: 'Export PDF pages as PNG' },
      { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size safely' },
      { name: 'PDFs to ZIP', slug: 'pdfs-to-zip', icon: '🗜️', colorBg: '#D1FAE5', desc: 'Bundle PDFs into one ZIP' },
      { name: 'OCR PDF', slug: 'ocr-pdf', icon: '👁️', colorBg: '#EDE9FE', desc: 'Make scanned text searchable' },
    ]} />
  )

  return (
    <ToolPageLayout toolName="Extract Images from PDF" sidebar={sidebar}>

{/* Tool Header Card */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Extract Images from PDF </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Extract all embedded images from any PDF. Download as PNG — no upload, no watermark, entirely browser-based.
        </p>
      </div>

      {/* Drop zone */}
      {!hasImages && !loading && (
        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 80, textAlign: 'center', background: '#fafafa', cursor: 'pointer' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</p>
          <p style={{ color: '#9ca3af', marginBottom: 24 }}>or</p>
          <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Choose PDF
            <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
          </label>
          {error && <p style={{ color: '#ef4444', marginTop: 20, fontSize: 14 }}>{error}</p>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#374151' }}>{progress || 'Processing…'}</p>
        </div>
      )}

      {/* Results */}
      {hasImages && !loading && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>
              Found {images.length} image{images.length !== 1 ? 's' : ''}
            </h2>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                New PDF
                <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
              </label>
              <button
                onClick={downloadAll}
                disabled={downloadingAll}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 14, cursor: downloadingAll ? 'wait' : 'pointer', opacity: downloadingAll ? 0.75 : 1 }}
              >
                {downloadingAll ? 'Preparing ZIP…' : 'Download ZIP'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {images.map((img, idx) => (
              <div key={img.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ background: '#f3f4f6', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.dataUrl} alt={`Image ${idx + 1}`}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Page {img.pageIndex + 1} · {img.width}×{img.height}px · {img.format}
                  </p>
                  <button onClick={() => downloadImage(img, idx)} style={{
                    width: '100%', padding: '7px 0', borderRadius: 8, border: '1px solid #e5e7eb',
                    background: '#f9fafb', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>
                    Download PNG
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.5px', marginBottom: '24px' }}>
          How to Extract Images from a PDF — Free
        </h2>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.8, color: 'var(--ink)', opacity: 0.8 }}>
          <li>Drop your PDF into the upload area or click to browse.</li>
          <li>Wait while the tool scans each page for embedded images.</li>
          <li>Preview the extracted images in the grid.</li>
          <li>Click <strong>Download PNG</strong> to save individual images, or <strong>Download ZIP</strong> to get the full extracted set in one archive.</li>
        </ol>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '32px', marginBottom: '12px' }}>
          What types of images can be extracted?
        </h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Embedded raster images (JPEG, PNG, grayscale bitmaps) are extracted. Vector graphics drawn in the PDF using paths or SVG shapes are not separate image objects and won&apos;t appear.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '32px', marginBottom: '12px' }}>
          Why are no images found in my PDF?
        </h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          If the PDF was created by scanning without embedded raster objects, or uses only vector graphics, no images will appear. For scanned PDFs, use <a href="/ocr-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>OCR PDF</a> to extract the text content instead.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
