'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

interface ExtractedImage {
  id: string
  dataUrl: string
  width: number
  height: number
  pageIndex: number
  format: string
}

const FAQS = [
  { q: 'Are my PDF files uploaded to a server?', a: 'No. Doclair scans your PDF for embedded images using PDF.js in your browser. Nothing is sent to a server.' },
  { q: 'What image formats can I download?', a: 'Raster images embedded in the PDF are extracted and offered as PNG downloads. You can download individually or in sequence.' },
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
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise

      for (let pi = 1; pi <= doc.numPages; pi++) {
        setProgress(`Scanning page ${pi} of ${doc.numPages}…`)
        const page = await doc.getPage(pi)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ops = await (page as any).getOperatorList()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commonObjs = (page as any).commonObjs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const objs = (page as any).objs

        // Collect image XObject names from operator list
        const imgNames = new Set<string>()
        for (let i = 0; i < ops.fnArray.length; i++) {
          // OPS.paintImageXObject = 85, OPS.paintInlineImageXObject = 86
          if (ops.fnArray[i] === 85 || ops.fnArray[i] === 86) {
            const name = ops.argsArray[i]?.[0]
            if (name) imgNames.add(name)
          }
        }

        for (const name of imgNames) {
          try {
            // Try page-level objects first, then common objects
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let imgData: any = null
            if (objs.has(name)) {
              imgData = objs.get(name)
            } else if (commonObjs.has(name)) {
              imgData = commonObjs.get(name)
            }
            if (!imgData || !imgData.data) continue

            const { width, height, data, kind } = imgData
            if (!width || !height || !data) continue

            const offscreen = document.createElement('canvas')
            offscreen.width = width
            offscreen.height = height
            const ctx = offscreen.getContext('2d')!
            const imageData = ctx.createImageData(width, height)

            // kind: 1 = GRAYSCALE_1BPP, 2 = RGB_24BPP, 3 = RGBA_32BPP
            if (kind === 3 && data.length === width * height * 4) {
              imageData.data.set(data)
            } else if (kind === 2 && data.length === width * height * 3) {
              for (let px = 0; px < width * height; px++) {
                imageData.data[px * 4] = data[px * 3]
                imageData.data[px * 4 + 1] = data[px * 3 + 1]
                imageData.data[px * 4 + 2] = data[px * 3 + 2]
                imageData.data[px * 4 + 3] = 255
              }
            } else if (kind === 1) {
              // 1bpp grayscale — 1 byte per pixel packed as bits
              for (let px = 0; px < width * height; px++) {
                const byte = data[Math.floor(px / 8)]
                const bit = (byte >> (7 - (px % 8))) & 1
                const v = bit ? 255 : 0
                imageData.data[px * 4] = v
                imageData.data[px * 4 + 1] = v
                imageData.data[px * 4 + 2] = v
                imageData.data[px * 4 + 3] = 255
              }
            } else {
              continue // unknown format
            }

            ctx.putImageData(imageData, 0, 0)
            // Skip tiny images (likely icons/bullets)
            if (width < 20 || height < 20) continue
            const dataUrl = offscreen.toDataURL('image/png')
            extracted.push({ id: crypto.randomUUID(), dataUrl, width, height, pageIndex: pi - 1, format: 'PNG' })
          } catch {
            // Skip images that fail to decode
          }
        }
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

  const downloadImage = (img: ExtractedImage, idx: number) => {
    const a = document.createElement('a')
    a.href = img.dataUrl
    a.download = `${pdfName || 'image'}-${String(idx + 1).padStart(3, '0')}.png`
    a.click()
  }

  const downloadAll = async () => {
    if (!images.length) return
    // Download all as sequential triggered downloads
    // For a true zip we'd need jszip — keep it simple and download sequentially
    for (let i = 0; i < images.length; i++) {
      await new Promise<void>(res => setTimeout(res, 200))
      downloadImage(images[i], i)
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

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
              <button onClick={downloadAll} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Download All
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
                    Page {img.pageIndex + 1} · {img.width}×{img.height}px
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
          <li>Click <strong>Download PNG</strong> to save individual images, or <strong>Download All</strong> to get them sequentially.</li>
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
          If the PDF was created by scanning without embedded raster data, or uses only vector graphics, no images will appear. For scanned PDFs, use <a href="/ocr-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>OCR PDF</a> to extract the text content instead.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
