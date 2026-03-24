'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

const FAQS = [
  { q: 'How does PDF to PowerPoint work?', a: 'Each PDF page is rendered as a high-resolution image and placed on its own slide. You can edit layout and add content in PowerPoint.' },
  { q: 'Will text be editable in PowerPoint?', a: 'Text on slides is part of the page image. For selectable text, use PDF to Text or PDF to Word on doclair.in first.' },
  { q: 'Are files uploaded to a server?', a: 'No. Rendering and PPTX creation run entirely in your browser.' },
  { q: 'Is PDF to PowerPoint free?', a: 'Yes. Doclair does not add a watermark to your presentation file.' },
]

const TOOL_SEO_NAME = 'PDF to PowerPoint'
const TOOL_SLUG = 'pdf-to-ppt'
const TOOL_DESCRIPTION = 'Convert PDF to PowerPoint PPTX free online. Each PDF page becomes an editable slide. No upload, no watermark, files stay in your browser.'

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
        'One PDF page per slide as high-res image',
        'Custom slide size from first page aspect ratio',
        'Browser-only conversion',
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

const sidebar = (
  <ToolSidebar
    reverseActions={[
      { name: 'PowerPoint → PDF', slug: 'ppt-to-pdf', icon: '📊', colorBg: '#D1FAE5', desc: 'Convert slides back to PDF' },
    ]}
    relatedTools={[
      { name: 'PDF → Text', slug: 'pdf-to-text', icon: '📝', colorBg: '#D1FAE5', desc: 'Extract all text from PDF' },
      { name: 'PDF → Word', slug: 'pdf-to-word', icon: '📝', colorBg: '#FFF0DC', desc: 'Convert PDF to editable Word' },
      { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#FFF0DC', desc: 'Reduce file size safely' },
      { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', colorBg: '#FFF0DC', desc: 'Combine multiple PDFs' },
    ]}
  />
)

export default function PdfToPptPage() {
  const [progress, setProgress] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [pageCount, setPageCount] = useState(0)

  const process = useCallback(async (file: File) => {
    setSaving(true); setDone(false); setProgress('')
    try {
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
      setPageCount(doc.numPages)

      // Render all pages as base64 images
      setProgress('Rendering pages…')
      const slideImages: { data: string; w: number; h: number }[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(`Rendering page ${i} of ${doc.numPages}…`)
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 2 }) // high res for good PPTX quality
        const canvas = document.createElement('canvas')
        canvas.width = vp.width; canvas.height = vp.height
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page.render as any)({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        // Get base64 without data:image/jpeg;base64, prefix
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        const base64 = dataUrl.split(',')[1]
        slideImages.push({ data: base64, w: vp.width, h: vp.height })
      }

      setProgress('Building PowerPoint…')
      const PptxGenJS = (await import('pptxgenjs')).default
      const pptx = new PptxGenJS()

      // Use aspect ratio of first page
      const first = slideImages[0]
      const aspectW = 10  // inches
      const aspectH = (first.h / first.w) * aspectW
      pptx.defineLayout({ name: 'CUSTOM', width: aspectW, height: aspectH })
      pptx.layout = 'CUSTOM'

      for (const si of slideImages) {
        const slide = pptx.addSlide()
        slide.addImage({
          data: `image/jpeg;base64,${si.data}`,
          x: 0, y: 0,
          w: aspectW, h: aspectH,
          sizing: { type: 'contain', w: aspectW, h: aspectH },
        })
      }

      setProgress('Saving PPTX…')
      const name = file.name.replace(/\.pdf$/i, '') || 'presentation'
      await pptx.writeFile({ fileName: `${name}.pptx` })
      setDone(true)
    } catch (err) {
      setProgress(`Error: ${(err as Error).message}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <ToolPageLayout toolName="PDF to PowerPoint" sidebar={sidebar}>
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
          <span style={{ color: 'var(--ink)' }}>PDF to PowerPoint </span>
          <span style={{ color: 'var(--amber)' }}>Online Free</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Convert PDF pages to a PowerPoint presentation — each page becomes a slide. All processing happens in your browser.
        </p>
      </div>

      <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#92400e', maxWidth: 540 }}>
        <strong>How it works:</strong> Each PDF page is rendered as a high-resolution image and placed on its own slide. Text remains as an image — for text extraction, use <a href="/pdf-to-text" style={{ color: '#b45309' }}>PDF to Text</a>.
      </div>

      {!saving && !done && (
        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') process(f) }}
          onDragOver={e => e.preventDefault()}
          style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 72, textAlign: 'center', background: '#fafafa' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</p>
          <p style={{ color: '#9ca3af', marginBottom: 24 }}>Each page → one PowerPoint slide</p>
          <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Choose PDF
            <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
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
            Downloaded — {pageCount} pages → {pageCount} slides
          </p>
          <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Convert Another
            <input type="file" accept="application/pdf" onChange={e => { setDone(false); const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* SEO Content */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px', marginBottom: '16px' }}>How to Convert PDF to PowerPoint — Free</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.8, color: 'var(--ink)', opacity: 0.8 }}>
          <li>Drop your PDF or click to browse.</li>
          <li>Wait while each page is rendered at high resolution.</li>
          <li>Your .pptx file downloads automatically with one slide per page.</li>
        </ol>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '28px', marginBottom: '10px' }}>Will the text be editable in PowerPoint?</h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Each slide contains the PDF page as a high-resolution image. Text is part of the image and not separately selectable. For editable text, use PDF to Word or PDF to Text first.
        </p>

        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '28px', marginBottom: '10px' }}>PDF to PowerPoint on iPhone and Android</h3>
        <p style={{ lineHeight: 1.7, color: 'var(--ink)', opacity: 0.75 }}>
          Works in Safari and Chrome on mobile. The PPTX file downloads to your Files app and can be opened directly in the Microsoft PowerPoint app.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
