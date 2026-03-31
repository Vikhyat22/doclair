'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'Is my PowerPoint file uploaded to a server?', a: 'Never. The conversion happens entirely in your browser using JavaScript. Your .pptx file is never uploaded to any server.' },
  { q: 'Will my slide images and design be preserved?', a: "Doclair preserves common slide backgrounds, text boxes, and simple shapes like rectangles and circles. Complex animations, SmartArt, and advanced PowerPoint-only effects can still simplify. For fully pixel-perfect output, use PowerPoint's built-in Export to PDF feature." },
  { q: 'What file formats are supported?', a: 'The tool supports .pptx (PowerPoint 2007 and later) format. Legacy .ppt files are not currently supported.' },
  { q: 'Can I convert PowerPoint to PDF on iPhone or Android?', a: 'Yes. Doclair works in Safari and Chrome on mobile. Upload your .pptx from the Files app and download the PDF directly.' },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PowerPoint to PDF — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/ppt-to-pdf',
      description: 'Convert PowerPoint PPTX files to PDF online free. Common slide backgrounds, text boxes, and simple shapes are preserved locally in your browser. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Backgrounds, text boxes, and simple shapes preserved',
        'Slide-by-slide PDF recreation in the browser',
        'Browser-only conversion, no upload',
        'No watermark',
      ],
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
    { '@type': 'ListItem', position: 3, name: 'PowerPoint to PDF', item: 'https://doclair.in/ppt-to-pdf' },
  ],
}

const sidebar = (
  <ToolSidebar
    relatedTools={[
      { name: 'PDF → PowerPoint', slug: 'pdf-to-ppt', icon: '📊', colorBg: '#D1FAE5', desc: 'Convert PDF pages to slides' },
      { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size safely' },
      { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', colorBg: '#FFF0DC', desc: 'Combine multiple PDFs' },
      { name: 'PDF to Text', slug: 'pdf-to-text', icon: '📝', colorBg: '#D1FAE5', desc: 'Extract all text from PDF' },
    ]}
  />
)

// PPTX is a ZIP. We parse core slide XML for solid backgrounds, simple shapes,
// and positioned text boxes so the exported PDF stays much closer to the source deck.

interface SlideTextParagraph {
  text: string
  fontSize: number
  color?: string
  bold: boolean
  align: 'left' | 'center'
}

interface SlideShape {
  kind: 'rect' | 'ellipse' | 'text'
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth: number
  verticalAlign: 'top' | 'center'
  insetLeft: number
  insetTop: number
  insetRight: number
  insetBottom: number
  paragraphs: SlideTextParagraph[]
}

interface Slide {
  index: number
  title: string
  body: string[]
  width: number
  height: number
  background?: string
  shapes: SlideShape[]
}

function parseHexColor(element?: Element | null): string | undefined {
  const solid = element?.querySelector('solidFill')
  const srgb = solid?.querySelector('srgbClr')
  return srgb?.getAttribute('val') ?? undefined
}

function emuAttr(element: Element | null | undefined, attr: string, fallback = 0) {
  return Number(element?.getAttribute(attr) ?? fallback)
}

function pointsFromEmu(value: number) {
  return value / 12700
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function paragraphFromNode(node: Element): SlideTextParagraph | null {
  const text = normalizeText(Array.from(node.querySelectorAll('t')).map(t => t.textContent || '').join(' '))
  if (!text) return null

  const paragraphProps = node.querySelector(':scope > pPr')
  const runProps = node.querySelector('rPr, endParaRPr')
  const color = parseHexColor(runProps)
  const fontSize = Number(runProps?.getAttribute('sz') ?? 1800) / 100
  const bold = runProps?.getAttribute('b') === '1'
  const align = paragraphProps?.getAttribute('algn') === 'ctr' ? 'center' : 'left'

  return { text, fontSize, color, bold, align }
}

function shapeFromNode(node: Element): SlideShape | null {
  const transform = node.querySelector('spPr xfrm')
  if (!transform) return null

  const off = transform.querySelector('off')
  const ext = transform.querySelector('ext')
  if (!off || !ext) return null

  const geometry = node.querySelector('spPr prstGeom')
  const preset = geometry?.getAttribute('prst') ?? 'rect'
  const shapeKind: SlideShape['kind'] = preset === 'ellipse' ? 'ellipse' : 'rect'

  const shapeProps = node.querySelector('spPr')
  const line = shapeProps?.querySelector('ln')
  const bodyProps = node.querySelector('txBody bodyPr')
  const paragraphs = Array.from(node.querySelectorAll('txBody p'))
    .map(paragraph => paragraphFromNode(paragraph))
    .filter((paragraph): paragraph is SlideTextParagraph => Boolean(paragraph))

  return {
    kind: paragraphs.length > 0 && !parseHexColor(shapeProps) && !parseHexColor(line) ? 'text' : shapeKind,
    x: emuAttr(off, 'x'),
    y: emuAttr(off, 'y'),
    width: emuAttr(ext, 'cx'),
    height: emuAttr(ext, 'cy'),
    fill: parseHexColor(shapeProps),
    stroke: parseHexColor(line),
    strokeWidth: Math.max(0.75, pointsFromEmu(emuAttr(line, 'w', 12700))),
    verticalAlign: bodyProps?.getAttribute('anchor') === 'ctr' ? 'center' : 'top',
    insetLeft: emuAttr(bodyProps, 'lIns', 91440),
    insetTop: emuAttr(bodyProps, 'tIns', 45720),
    insetRight: emuAttr(bodyProps, 'rIns', 91440),
    insetBottom: emuAttr(bodyProps, 'bIns', 45720),
    paragraphs,
  }
}

async function parsePptx(file: File): Promise<Slide[]> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slides: Slide[] = []
  const parser = new DOMParser()

  const presentationXml = await zip.files['ppt/presentation.xml']?.async('string')
  const presentationDoc = presentationXml ? parser.parseFromString(presentationXml, 'text/xml') : null
  const slideSize = presentationDoc?.querySelector('sldSz')
  const slideWidth = Number(slideSize?.getAttribute('cx') ?? 12192000)
  const slideHeight = Number(slideSize?.getAttribute('cy') ?? 6858000)

  // Find slide XML files (ppt/slides/slide1.xml, slide2.xml, ...)
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)![0])
      const nb = parseInt(b.match(/\d+/)![0])
      return na - nb
    })

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string')
    const doc = parser.parseFromString(xml, 'text/xml')
    const shapes = Array.from(doc.querySelectorAll('spTree > sp'))
      .map(shape => shapeFromNode(shape))
      .filter((shape): shape is SlideShape => Boolean(shape))
      .sort((left, right) => (left.y === right.y ? left.x - right.x : left.y - right.y))

    const textParagraphs = shapes
      .flatMap(shape => shape.paragraphs.map(paragraph => ({ paragraph, y: shape.y })))
      .sort((left, right) => left.y - right.y)
      .map(item => item.paragraph.text)

    slides.push({
      index: i + 1,
      title: textParagraphs[0] ?? '',
      body: textParagraphs.slice(1),
      width: slideWidth,
      height: slideHeight,
      background: parseHexColor(doc.querySelector('bgPr')),
      shapes,
    })
  }
  return slides
}

function hexToRgb(hex?: string) {
  const value = (hex ?? '').replace('#', '').trim()
  if (value.length !== 6) return null
  const parsed = Number.parseInt(value, 16)
  if (Number.isNaN(parsed)) return null
  return {
    r: ((parsed >> 16) & 255) / 255,
    g: ((parsed >> 8) & 255) / 255,
    b: (parsed & 255) / 255,
  }
}

function wrapText(text: string, measure: (value: string) => number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (measure(next) <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

export default function PptToPdfPage() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [progress, setProgress] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [fileName, setFileName] = useState('')

  const process = useCallback(async (file: File) => {
    setSaving(true); setDone(false); setSlides([])
    setFileName(file.name.replace(/\.(pptx?|ppt)$/i, ''))
    try {
      setProgress('Parsing PowerPoint…')
      const parsedSlides = await parsePptx(file)
      setSlides(parsedSlides)
      setProgress('Generating PDF…')

      const { PDFDocument, StandardFonts, rgb } = await import('@cantoo/pdf-lib')
      const out = await PDFDocument.create()
      const fontBold = await out.embedFont(StandardFonts.HelveticaBold)
      const fontReg  = await out.embedFont(StandardFonts.Helvetica)

      for (const slide of parsedSlides) {
        const W = 960
        const H = Math.round(W * (slide.height / slide.width))
        const scaleX = W / slide.width
        const scaleY = H / slide.height
        const page = out.addPage([W, H])

        const background = hexToRgb(slide.background ?? 'FFFFFF')
        if (background) {
          page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(background.r, background.g, background.b) })
        }

        for (const shape of slide.shapes) {
          const x = shape.x * scaleX
          const y = H - (shape.y + shape.height) * scaleY
          const width = shape.width * scaleX
          const height = shape.height * scaleY
          const fill = hexToRgb(shape.fill)
          const stroke = hexToRgb(shape.stroke)

          if (shape.kind === 'rect' && (fill || stroke)) {
            page.drawRectangle({
              x,
              y,
              width,
              height,
              color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
              borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
              borderWidth: stroke ? Math.max(0.75, shape.strokeWidth * Math.min(scaleX, scaleY)) : 0,
            })
          }

          if (shape.kind === 'ellipse' && (fill || stroke)) {
            page.drawEllipse({
              x: x + width / 2,
              y: y + height / 2,
              xScale: width / 2,
              yScale: height / 2,
              color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
              borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
              borderWidth: stroke ? Math.max(0.75, shape.strokeWidth * Math.min(scaleX, scaleY)) : 0,
            })
          }

          if (shape.paragraphs.length === 0) continue

          const insetLeft = Math.max(6, shape.insetLeft * scaleX)
          const insetTop = Math.max(6, shape.insetTop * scaleY)
          const insetRight = Math.max(6, shape.insetRight * scaleX)
          const insetBottom = Math.max(6, shape.insetBottom * scaleY)
          const textWidth = Math.max(12, width - insetLeft - insetRight)
          const textHeightLimit = Math.max(12, height - insetTop - insetBottom)

          const renderedParagraphs = shape.paragraphs.map(paragraph => {
            const font = paragraph.bold ? fontBold : fontReg
            // PPTX text sizes are already points (stored as 1/100 pt in XML),
            // and our PDF page coordinates are also point-based.
            let fontSize = Math.max(9, paragraph.fontSize)
            let lineHeight = fontSize * 1.15
            let lines = wrapText(paragraph.text, value => font.widthOfTextAtSize(value, fontSize), textWidth)

            // Fit single text-box paragraphs back into their intended bounds.
            if (shape.paragraphs.length === 1) {
              while (fontSize > 9 && lines.length * lineHeight > textHeightLimit) {
                fontSize -= 0.5
                lineHeight = fontSize * 1.15
                lines = wrapText(paragraph.text, value => font.widthOfTextAtSize(value, fontSize), textWidth)
              }
            }

            return {
              ...paragraph,
              font,
              fontSize,
              lines,
              lineHeight,
            }
          })

          const textHeight = renderedParagraphs.reduce((sum, paragraph, index) => (
            sum + paragraph.lines.length * paragraph.lineHeight + (index < renderedParagraphs.length - 1 ? paragraph.fontSize * 0.35 : 0)
          ), 0)

          let cursorY = y + height - insetTop - renderedParagraphs[0].fontSize
          if (shape.verticalAlign === 'center') {
            cursorY = y + (height + textHeight) / 2 - renderedParagraphs[0].fontSize
          }

          for (const paragraph of renderedParagraphs) {
            const color = hexToRgb(paragraph.color ?? '111827') ?? { r: 0.07, g: 0.09, b: 0.16 }
            for (const line of paragraph.lines) {
              const lineWidth = paragraph.font.widthOfTextAtSize(line, paragraph.fontSize)
              const textX = paragraph.align === 'center'
                ? x + (width - lineWidth) / 2
                : x + insetLeft
              page.drawText(line, {
                x: textX,
                y: cursorY,
                size: paragraph.fontSize,
                font: paragraph.font,
                color: rgb(color.r, color.g, color.b),
              })
              cursorY -= paragraph.lineHeight
            }
            cursorY -= paragraph.fontSize * 0.35
          }
        }

        page.drawText(String(slide.index), {
          x: W - 18 - fontReg.widthOfTextAtSize(String(slide.index), 9),
          y: 8,
          size: 9,
          font: fontReg,
          color: rgb(0.7, 0.7, 0.7),
        })
      }

      const bytes = await out.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `${file.name.replace(/\.(pptx?|ppt)$/i, '')}.pdf`; a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err) {
      console.error(err)
      setProgress(`Error: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <ToolPageLayout toolName="PowerPoint to PDF" sidebar={sidebar}>

{/* Tool Header Card */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>PowerPoint to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Convert .pptx slides to PDF in your browser. Common slide backgrounds, text boxes, and simple shapes stay much closer to the original deck — no upload, no watermark.
        </p>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#1e40af', maxWidth: 560 }}>
        <strong>Note:</strong> Solid-fill backgrounds, text boxes, and basic shapes are preserved. Heavy animations, SmartArt, and advanced PowerPoint-only effects can still simplify.
      </div>

      {!saving && !done && (
        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) process(f) }}
          onDragOver={e => e.preventDefault()}
          style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 72, textAlign: 'center', background: '#fafafa', cursor: 'pointer' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your .pptx file here</p>
          <p style={{ color: '#9ca3af', marginBottom: 24 }}>Supports .pptx format</p>
          <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Choose .pptx
            <input type="file" accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {saving && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>{progress}</p>
        </div>
      )}

      {done && !saving && (
        <div style={{ textAlign: 'center', padding: 48, border: '2px solid #d1fae5', borderRadius: 16, background: '#f0fdf4' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: 18, color: '#166534', marginBottom: 16 }}>
            PDF downloaded — {slides.length} slides converted
          </p>
          <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Convert Another
            <input type="file" accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={e => { setDone(false); const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {slides.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#374151' }}>Preview — {slides.length} slides from &ldquo;{fileName}&rdquo;</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {slides.slice(0, 8).map(s => (
              <div key={s.index} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', background: '#fff' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginRight: 12 }}>Slide {s.index}</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>{s.title || '(no title)'}</span>
                {s.body.length > 0 && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{s.body.slice(0, 2).join(' · ')}{s.body.length > 2 ? ` +${s.body.length - 2} more` : ''}</p>}
              </div>
            ))}
            {slides.length > 8 && <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>+{slides.length - 8} more slides</p>}
          </div>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', marginBottom: '16px' }}>How to Convert PowerPoint to PDF — Free</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.8, color: 'var(--ink)', opacity: 0.8 }}>
          <li>Drop your .pptx file or click to browse.</li>
          <li>Wait while the browser parses each slide and generates the PDF.</li>
          <li>A download starts automatically when ready. No sign-up or installation needed.</li>
        </ol>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '28px', marginBottom: '10px' }}>What content is preserved?</h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Text boxes, solid slide backgrounds, and common shapes like rectangles and circles are reproduced directly from the slide XML. Each slide becomes one PDF page with its original positioning kept as closely as possible in the browser.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '28px', marginBottom: '10px' }}>Why use browser-based conversion?</h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Your PowerPoint file never leaves your device. No cloud service can access your presentation content — ideal for confidential business slides, client proposals, or internal documents.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
