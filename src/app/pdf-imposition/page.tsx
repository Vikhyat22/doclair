'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ToolSidebar from '@/components/ui/ToolSidebar'

const SIDEBAR_RELATED = [
  { name: 'PDF to Booklet', slug: 'pdf-to-booklet', icon: '📚', colorBg: '#FFF0DC', desc: 'Booklet layout' },
  { name: 'Cut PDF',        slug: 'cut-pdf',        icon: '✂️', colorBg: '#DBEAFE', desc: 'Split pages in half' },
  { name: 'Crop PDF',       slug: 'crop-pdf',       icon: '🖼',  colorBg: '#EDE9FE', desc: 'Trim page margins' },
]

type NUp = '2' | '4' | '6' | '9'
type PageSize = 'A4' | 'Letter'

const NUP_CONFIG: Record<NUp, { cols: number; rows: number }> = {
  '2': { cols: 2, rows: 1 },
  '4': { cols: 2, rows: 2 },
  '6': { cols: 3, rows: 2 },
  '9': { cols: 3, rows: 3 },
}
const PAGE_SIZES: Record<PageSize, [number, number]> = {
  A4: [595, 842],
  Letter: [612, 792],
}

export default function PDFImpositionPage() {
  const [nup, setNup] = useState<NUp>('2')
  const [pageSize, setPageSize] = useState<PageSize>('A4')
  const [landscape, setLandscape] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const process = useCallback(async (file: File) => {
    setSaving(true)
    try {
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

      const src = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
      const { cols, rows } = NUP_CONFIG[nup]
      const nPerSheet = cols * rows

      // Render all source pages to images at consistent scale
      const scale = 1.5
      const pageImgs: string[] = []
      for (let i = 1; i <= src.numPages; i++) {
        const page = await src.getPage(i)
        const vp = page.getViewport({ scale })
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page.render as any)({ canvasContext: c.getContext('2d'), viewport: vp }).promise
        pageImgs.push(c.toDataURL('image/jpeg', 0.88))
      }

      let [sheetW, sheetH] = PAGE_SIZES[pageSize]
      if (landscape) [sheetW, sheetH] = [sheetH, sheetW]
      const margin = 12
      const cellW = (sheetW - margin * (cols + 1)) / cols
      const cellH = (sheetH - margin * (rows + 1)) / rows

      const out = await PDFDocument.create()
      let pageIdx = 0
      while (pageIdx < pageImgs.length) {
        const sheet = out.addPage([sheetW, sheetH])
        for (let slot = 0; slot < nPerSheet && pageIdx < pageImgs.length; slot++, pageIdx++) {
          const col = slot % cols
          const row = Math.floor(slot / cols)
          const imgEl = new Image()
          await new Promise<void>(r => { imgEl.onload = () => r(); imgEl.src = pageImgs[pageIdx] })
          const buf = await new Promise<ArrayBuffer>(r => {
            const oc = document.createElement('canvas'); oc.width = imgEl.naturalWidth; oc.height = imgEl.naturalHeight
            oc.getContext('2d')!.drawImage(imgEl, 0, 0)
            oc.toBlob(async b => r(await b!.arrayBuffer()), 'image/jpeg', 0.88)
          })
          const pdfImg = await out.embedJpg(buf)
          // Fit image into cell preserving aspect ratio
          const imgRatio = pdfImg.width / pdfImg.height
          let dw = cellW, dh = cellH
          if (cellW / cellH > imgRatio) { dw = cellH * imgRatio } else { dh = cellW / imgRatio }
          const dx = margin + col * (cellW + margin) + (cellW - dw) / 2
          // PDF y is from bottom
          const dy = sheetH - margin - (row + 1) * (cellH + margin) + margin + (cellH - dh) / 2
          sheet.drawImage(pdfImg, { x: dx, y: dy, width: dw, height: dh })
        }
      }

      const bytes = await out.save()
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = file.name.replace(/\.pdf$/i, `-${nup}up.pdf`); a.click()
      URL.revokeObjectURL(url)
    } finally { setSaving(false) }
  }, [nup, pageSize, landscape])

  const handleFile = (file: File) => { setPdfFile(file); process(file) }

  return (
    <ToolPageLayout toolName="PDF Imposition" sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF Imposition </span>
          <span style={{ color: 'var(--amber)' }}>N-Up Print Layout</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '24px' }}>
          Arrange multiple PDF pages on a single sheet — 2-up, 4-up, 6-up, or 9-up layouts for efficient printing.
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Pages per sheet</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['2', '4', '6', '9'] as NUp[]).map(n => (
              <button key={n} onClick={() => setNup(n)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: nup === n ? '#F59E0B' : '#e5e7eb',
                background: nup === n ? '#FFF8EC' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>{n}-up</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Sheet size</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['A4', 'Letter'] as PageSize[]).map(s => (
              <button key={s} onClick={() => setPageSize(s)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: pageSize === s ? '#F59E0B' : '#e5e7eb',
                background: pageSize === s ? '#FFF8EC' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Orientation</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[false, true].map(l => (
              <button key={String(l)} onClick={() => setLandscape(l)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: landscape === l ? '#F59E0B' : '#e5e7eb',
                background: landscape === l ? '#FFF8EC' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>{l ? 'Landscape' : 'Portrait'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f) }}
        onDragOver={e => e.preventDefault()}
        style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 64, textAlign: 'center', background: '#fafafa', cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p style={{ fontWeight: 600, color: '#374151' }}>Processing imposition…</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📐</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#374151' }}>Drop PDF here to impose</p>
            <p style={{ color: '#9ca3af', marginBottom: 20 }}>Will create a {nup}-up layout on {pageSize} {landscape ? 'landscape' : 'portrait'}</p>
            <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
              Choose PDF
              <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
            </label>
            {pdfFile && <p style={{ color: '#10b981', fontWeight: 600, marginTop: 12, fontSize: 13 }}>✓ Done! Check your downloads.</p>}
          </>
        )}
      </div>
    </ToolPageLayout>
  )
}
