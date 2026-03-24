'use client'

import { useState, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch',
  'Russian', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese',
  'Korean', 'Arabic', 'Hindi', 'Bengali', 'Turkish', 'Polish',
  'Ukrainian', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Hebrew', 'Thai', 'Vietnamese', 'Indonesian', 'Malay',
]

interface PageResult {
  pageNum: number
  original: string
  translated: string
}

export default function TranslatePDFPage() {
  const [targetLang, setTargetLang] = useState('Spanish')
  const [pages, setPages] = useState<PageResult[]>([])
  const [progress, setProgress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'translated' | 'side-by-side'>('translated')
  const [pdfName, setPdfName] = useState('')

  const process = useCallback(async (file: File) => {
    setLoading(true); setError(null); setPages([]); setPdfName(file.name.replace(/\.pdf$/i, ''))
    const results: PageResult[] = []
    try {
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise

      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(`Translating page ${i} of ${doc.numPages}…`)
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const original = content.items.map((item: any) => item.str || '').join(' ').trim()
        if (!original) { results.push({ pageNum: i, original: '', translated: '' }); continue }

        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: original, targetLanguage: targetLang, pageNum: i }),
        })
        if (!res.ok) {
          const e = await res.json()
          throw new Error(e.error || `HTTP ${res.status}`)
        }
        const { translated } = await res.json()
        results.push({ pageNum: i, original, translated })
        setPages([...results])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false); setProgress('')
    }
  }, [targetLang])

  const downloadTxt = () => {
    const content = pages.map(p => `=== Page ${p.pageNum} ===\n${p.translated}`).join('\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${pdfName}-${targetLang.toLowerCase()}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const hasResults = pages.length > 0

  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 200px)', padding: '40px 16px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1px', marginBottom: 8 }}>Translate PDF</h1>
          <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 32 }}>
            Translate PDF documents into any language using AI. Text is extracted in your browser and translated via our AI API.
          </p>

          {/* Config */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 28 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Translate to</label>
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, minWidth: 200 }}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            {hasResults && (
              <div style={{ display: 'flex', gap: 8 }}>
                {(['translated', 'side-by-side'] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: '10px 16px', borderRadius: 10, border: '1.5px solid',
                    borderColor: viewMode === m ? '#F59E0B' : '#e5e7eb',
                    background: viewMode === m ? '#FFF8EC' : '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  }}>{m.replace('-', ' ')}</button>
                ))}
                <button onClick={downloadTxt} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Download TXT
                </button>
              </div>
            )}
          </div>

          {/* Upload */}
          {!loading && !hasResults && (
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') process(f) }}
              onDragOver={e => e.preventDefault()}
              style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 80, textAlign: 'center', background: '#fafafa', cursor: 'pointer' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
              <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</p>
              <p style={{ color: '#9ca3af', marginBottom: 24 }}>Will be translated to {targetLang}</p>
              <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Choose PDF
                <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
              </label>
              {error && <p style={{ color: '#ef4444', marginTop: 20, fontSize: 14 }}>{error}</p>}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#374151', marginBottom: 8 }}>Translating…</p>
              <p style={{ color: '#6b7280', fontSize: 14 }}>{progress}</p>
              {pages.length > 0 && <p style={{ color: '#10b981', fontSize: 13, marginTop: 8 }}>✓ {pages.length} pages done so far</p>}
            </div>
          )}

          {/* Results */}
          {hasResults && !loading && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>{pages.length} pages translated to {targetLang}</h2>
                <label style={{ padding: '8px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  New PDF
                  <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
                </label>
              </div>
              {error && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>⚠️ {error}</p>}
              {pages.map(p => (
                <div key={p.pageNum} style={{ marginBottom: 24, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: '#f9fafb', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    Page {p.pageNum}
                  </div>
                  {viewMode === 'side-by-side' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      <div style={{ padding: 16, borderRight: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Original</p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{p.original || '(No text)'}</p>
                      </div>
                      <div style={{ padding: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{targetLang}</p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{p.translated || '(No text)'}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 16 }}>
                      <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{p.translated || '(No text on this page)'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
