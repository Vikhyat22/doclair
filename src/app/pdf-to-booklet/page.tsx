'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ErrorCard from '@/components/ui/ErrorCard'
import ToolSidebar from '@/components/ui/ToolSidebar'
import FAQ from '@/components/ui/FAQ'
import { rgb } from '@cantoo/pdf-lib'

const SIDEBAR_RELATED = [
  { name: 'Cut PDF',          slug: 'cut-pdf',          icon: '✂️', colorBg: '#DBEAFE', desc: 'Split pages in half' },
  { name: 'PDF Imposition',   slug: 'pdf-imposition',   icon: '📐', colorBg: '#FFF0DC', desc: 'N-up layout' },
  { name: 'Organize Pages',   slug: 'organize-pages',   icon: '📋', colorBg: '#EDE9FE', desc: 'Reorder PDF pages' },
]

type SheetSize = 'A4' | 'Letter'

// Booklet imposition order: for N sheets, the page order on each sheet is:
// Sheet 1 front: [N, 1], Sheet 1 back: [2, N-1]
// Sheet 2 front: [N-2, 3], Sheet 2 back: [4, N-3] ...
function bookletOrder(total: number): [number, number][] {
  // total must be multiple of 4 — pad with blank pages
  const padded = Math.ceil(total / 4) * 4
  const pages = Array.from({ length: padded }, (_, i) => i) // 0-indexed; >= total = blank
  const sheets: [number, number][] = []
  let l = 0, r = padded - 1
  while (l < r) {
    sheets.push([r, l])     // front left = last, front right = first
    l++; r--
    sheets.push([l, r])     // back left = second, back right = second-to-last
    l++; r--
  }
  return sheets
}

const FAQS = [
  { q: 'What is booklet order for printing?', a: 'Pages are rearranged so that when you print double-sided, fold, and saddle-stitch, the page order reads correctly like a small book.' },
  { q: 'Does my PDF need a multiple-of-4 page count?', a: 'Doclair pads with blank pages if needed so imposition always works. For best results, start with a page count that is a multiple of 4.' },
  { q: 'Are files uploaded to a server?', a: 'No. Your PDF is processed with pdf-lib and PDF.js entirely in your browser.' },
  { q: 'Is PDF to booklet free?', a: 'Yes. There is no watermark added to the downloaded booklet PDF.' },
]

const TOOL_SEO_NAME = 'PDF to Booklet'
const TOOL_SLUG = 'pdf-to-booklet'
const TOOL_DESCRIPTION = 'Rearrange PDF pages in booklet order for saddle-stitch printing. 100% free, no upload, no watermark.'

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
        'Saddle-stitch booklet page order',
        'A4 or US Letter landscape output',
        'Browser-based processing',
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

export default function PDFToBookletPage() {
  const [sheetSize, setSheetSize] = useState<SheetSize>('A4')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const process = useCallback(async (file: File) => {
    setSaving(true); setDone(false); setErrorMessage('')
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const src = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
      const total = src.numPages

      // Render source pages to images
      const pageImgs: (string | null)[] = [] // null = blank
      for (let i = 1; i <= total; i++) {
        const page = await src.getPage(i)
        const vp = page.getViewport({ scale: 1.5 })
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page.render as any)({ canvasContext: c.getContext('2d'), viewport: vp }).promise
        pageImgs.push(c.toDataURL('image/jpeg', 0.88))
      }

      // Sheet dimensions: landscape for booklet printing
      const SIZES: Record<SheetSize, [number, number]> = { A4: [842, 595], Letter: [792, 612] }
      const [sheetW, sheetH] = SIZES[sheetSize]
      const margin = 10
      const cellW = (sheetW - margin * 3) / 2
      const cellH = sheetH - margin * 2

      const out = await PDFDocument.create()
      const order = bookletOrder(total)

      for (const [leftIdx, rightIdx] of order) {
        const sheet = out.addPage([sheetW, sheetH])

        const drawCell = async (idx: number, x: number) => {
          if (idx >= total) return // blank page
          const imgEl = new Image()
          await new Promise<void>(r => { imgEl.onload = () => r(); imgEl.src = pageImgs[idx]! })
          const buf = await new Promise<ArrayBuffer>(r => {
            const oc = document.createElement('canvas'); oc.width = imgEl.naturalWidth; oc.height = imgEl.naturalHeight
            oc.getContext('2d')!.drawImage(imgEl, 0, 0)
            oc.toBlob(async b => r(await b!.arrayBuffer()), 'image/jpeg', 0.88)
          })
          const pdfImg = await out.embedJpg(buf)
          const ratio = pdfImg.width / pdfImg.height
          let dw = cellW, dh = cellH
          if (cellW / cellH > ratio) dw = cellH * ratio; else dh = cellW / ratio
          const dx = x + (cellW - dw) / 2
          const dy = margin + (cellH - dh) / 2
          sheet.drawImage(pdfImg, { x: dx, y: dy, width: dw, height: dh })
        }

        await drawCell(leftIdx, margin)
        await drawCell(rightIdx, margin * 2 + cellW)

        // Center fold line
        sheet.drawLine({ start: { x: sheetW / 2, y: 0 }, end: { x: sheetW / 2, y: sheetH }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
        // Page numbers
        const font = await out.embedFont('Helvetica' as unknown as Parameters<typeof out.embedFont>[0])
        const leftPg = leftIdx < total ? String(leftIdx + 1) : ''
        const rightPg = rightIdx < total ? String(rightIdx + 1) : ''
        if (leftPg) sheet.drawText(leftPg, { x: margin + 4, y: 4, size: 7, font, color: rgb(0.6, 0.6, 0.6) })
        if (rightPg) sheet.drawText(rightPg, { x: margin * 2 + cellW + 4, y: 4, size: 7, font, color: rgb(0.6, 0.6, 0.6) })
      }

      const bytes = await out.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = file.name.replace(/\.pdf$/i, '-booklet.pdf'); a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Try a different file.')
    } finally { setSaving(false) }
  }, [sheetSize])

  return (
    <ToolPageLayout toolName="PDF to Booklet" sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}>
<div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to Booklet </span>
          <span style={{ color: 'var(--amber)' }}>Saddle-Stitch Print Order</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '24px' }}>
          Rearrange pages into booklet (saddle-stitch) order. Print double-sided, fold in half, and staple to create a booklet.
        </p>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#1e40af', marginBottom: 24, maxWidth: 560 }}>
          <strong>Tip:</strong> For best results, use a PDF with a page count that&apos;s a multiple of 4. Pages will be padded with blanks if needed.
        </div>
      </div>

      {/* Sheet size */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Output sheet size</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['A4', 'Letter'] as SheetSize[]).map(s => (
            <button key={s} onClick={() => setSheetSize(s)} style={{
              padding: '8px 20px', borderRadius: 8, border: '1.5px solid',
              borderColor: sheetSize === s ? '#F59E0B' : '#e5e7eb',
              background: sheetSize === s ? '#FFF8EC' : '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>{s} landscape</button>
          ))}
        </div>
      </div>

      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') process(f) }}
        onDragOver={e => e.preventDefault()}
        style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 64, textAlign: 'center', background: '#fafafa' }}>
        {saving ? (
          <><div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div><p style={{ fontWeight: 600, color: '#374151' }}>Creating booklet…</p></>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#374151' }}>Drop PDF here</p>
            <p style={{ color: '#9ca3af', marginBottom: 20 }}>Pages reordered for folded booklet printing on {sheetSize}</p>
            <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
              Choose PDF
              <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
            </label>
            {done && <p style={{ color: '#10b981', fontWeight: 600, marginTop: 16, fontSize: 13 }}>✓ Booklet PDF downloaded!</p>}
          </>
        )}
      </div>

      {errorMessage && <ErrorCard message={errorMessage} onReset={() => setErrorMessage('')} />}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Create a PDF Booklet — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          PDF booklet layout (also called saddle-stitch or signature layout) reorders pages so that when printed double-sided and folded, they read in the correct order. Doclair handles all the reordering automatically.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your PDF into the upload area.</strong> No account needed.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose paper size.</strong> Select A4 or Letter and your preferred orientation.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Convert to Booklet.</strong> The PDF is reordered for booklet printing.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Print double-sided and fold.</strong> Flip on short edge and fold in the middle to create your booklet.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          What is booklet printing?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Booklet printing reorders pages so that 4 document pages fit on a single sheet of paper. For example, a 12-page document becomes 3 sheets — pages 12, 1, 2, 11 on sheet one; pages 10, 3, 4, 9 on sheet two; and so on. Fold and staple the result to create a professional booklet.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          PDF Booklet on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile Safari and Chrome. Upload your PDF from the Files app and download the booklet-ready PDF to print from a nearby printer or send to a print shop.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
