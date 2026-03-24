'use client'

import { useState, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const JSON_LD = {
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
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Is my PowerPoint file uploaded to a server?', acceptedAnswer: { '@type': 'Answer', text: 'Never. The conversion happens entirely in your browser using JavaScript. Your .pptx file is never uploaded to any server.' } },
        { '@type': 'Question', name: 'Will my slide images and design be preserved?', acceptedAnswer: { '@type': 'Answer', text: 'Doclair extracts text content from each slide and recreates a clean PDF. Images and complex design elements from the original theme are not preserved. For pixel-perfect output, use PowerPoint\'s built-in "Export to PDF" feature.' } },
        { '@type': 'Question', name: 'What file formats are supported?', acceptedAnswer: { '@type': 'Answer', text: 'The tool supports .pptx (PowerPoint 2007 and later) format. Legacy .ppt files are not currently supported.' } },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'PowerPoint to PDF', item: 'https://doclair.in/ppt-to-pdf' },
      ],
    },
  ],
}

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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 200px)', padding: '40px 16px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1px', marginBottom: 8 }}>PowerPoint to PDF</h1>
          <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 12 }}>
            Convert .pptx files to PDF. Text and structure extracted — all in your browser, nothing uploaded.
          </p>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#1e40af', marginBottom: 28, maxWidth: 560 }}>
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
        </div>
      </main>
      <Footer />
    </>
  )
}
