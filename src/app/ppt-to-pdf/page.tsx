'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'Is my PowerPoint file uploaded to a server?', a: 'Never. The conversion happens entirely in your browser using JavaScript. Your .pptx file is never uploaded to any server.' },
  { q: 'Will my slide images and design be preserved?', a: "Doclair extracts text content from each slide and recreates a clean PDF. Images and complex design elements from the original theme are not preserved. For pixel-perfect output, use PowerPoint's built-in Export to PDF feature." },
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
      description: 'Convert PowerPoint PPTX files to PDF online free. Text and structure extracted. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Text and structure extracted per slide',
        'Amber header bar with slide numbers',
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

// PPTX is a ZIP. We parse slides via JSZip + DOMParser to extract text and build a basic PDF.
// Each slide becomes a page with text rendered in pdf-lib.

interface Slide {
  index: number
  title: string
  body: string[]
}

async function parsePptx(file: File): Promise<Slide[]> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slides: Slide[] = []

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
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    // Extract all text runs
    const textNodes = doc.querySelectorAll('r > t, t')
    const allText: string[] = []
    textNodes.forEach(t => { if (t.textContent?.trim()) allText.push(t.textContent.trim()) })

    // Heuristic: first non-empty paragraph is title
    const paragraphs = doc.querySelectorAll('p')
    let title = ''
    const body: string[] = []
    let foundTitle = false
    paragraphs.forEach(p => {
      const text = Array.from(p.querySelectorAll('t')).map(t => t.textContent || '').join('').trim()
      if (!text) return
      if (!foundTitle) { title = text; foundTitle = true }
      else body.push(text)
    })

    slides.push({ index: i + 1, title, body })
  }
  return slides
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

      // 16:9 slide dimensions (pts)
      const W = 960, H = 540

      for (const slide of parsedSlides) {
        const page = out.addPage([W, H])
        // Background
        page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) })
        // Amber header bar
        page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: rgb(0.96, 0.62, 0.04) })
        // Slide number
        page.drawText(String(slide.index), { x: W - 32, y: 12, size: 11, font: fontReg, color: rgb(0.7, 0.7, 0.7) })
        // Title
        if (slide.title) {
          const titleSize = 32
          const maxTitleWidth = W - 80
          let title = slide.title
          while (fontBold.widthOfTextAtSize(title, titleSize) > maxTitleWidth && title.length > 10) {
            title = title.slice(0, -4) + '…'
          }
          page.drawText(title, { x: 40, y: H - 80, size: titleSize, font: fontBold, color: rgb(0.1, 0.09, 0.07) })
        }
        // Horizontal rule
        page.drawLine({ start: { x: 40, y: H - 100 }, end: { x: W - 40, y: H - 100 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
        // Body text
        let yPos = H - 130
        for (const line of slide.body) {
          if (yPos < 40) break
          // Bullet
          page.drawText('•', { x: 40, y: yPos, size: 14, font: fontReg, color: rgb(0.96, 0.62, 0.04) })
          // Wrap text
          const bodySize = 16
          const maxW = W - 100
          let remaining = line
          while (remaining.length > 0) {
            let chunk = remaining
            while (fontReg.widthOfTextAtSize(chunk, bodySize) > maxW && chunk.length > 1) {
              chunk = chunk.slice(0, -1)
            }
            // Try to break at word boundary
            if (chunk.length < remaining.length) {
              const lastSpace = chunk.lastIndexOf(' ')
              if (lastSpace > 0) chunk = chunk.slice(0, lastSpace)
            }
            page.drawText(chunk, { x: 56, y: yPos, size: bodySize, font: fontReg, color: rgb(0.2, 0.2, 0.2) })
            remaining = remaining.slice(chunk.length).trimStart()
            yPos -= 24
          }
          yPos -= 8
        }
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
          <span style={{ color: 'var(--ink)' }}>PowerPoint to PDF </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Convert .pptx slides to PDF in your browser. Text and structure extracted per slide — no upload, no watermark.
        </p>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#1e40af', maxWidth: 560 }}>
        <strong>Note:</strong> Extracts text content. Images and complex formatting from the original slide design are not preserved. For pixel-perfect conversion, use PowerPoint&apos;s built-in Export to PDF.
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
          Text from each slide title and body is extracted and laid out cleanly. Each slide becomes one PDF page with an amber header bar and slide number. Complex backgrounds, images, and theme graphics from the PPTX are not reproduced.
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
