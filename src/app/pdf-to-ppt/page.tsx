'use client'

import { useState, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

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
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 200px)', padding: '40px 16px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1px', marginBottom: 8 }}>PDF to PowerPoint</h1>
          <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 12 }}>
            Convert PDF to .pptx — each page becomes a slide with the full page as an image. Edit freely in PowerPoint.
          </p>
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#92400e', marginBottom: 28, maxWidth: 540 }}>
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
        </div>
      </main>
      <Footer />
    </>
  )
}
