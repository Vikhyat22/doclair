'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import ErrorCard from '@/components/ui/ErrorCard'
import { extractPDFText, type PDFTextContent } from '@/lib/pdf/pdfToAudio'

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
const SIDEBAR_RELATED = [
  { name: 'PDF to Text',   slug: 'pdf-to-text',   icon: '📝', colorBg: '#FFF0DC', desc: 'Extract plain text' },
  { name: 'OCR PDF',       slug: 'ocr-pdf',       icon: '🔍', colorBg: '#EDE9FE', desc: 'Make scanned PDFs readable' },
  { name: 'Chat with PDF', slug: 'chat-with-pdf', icon: '💬', colorBg: '#DBEAFE', desc: 'Ask questions about PDF' },
  { name: 'AI Summariser', slug: 'ai-summarizer', icon: '🤖', colorBg: '#D1FAE5', desc: 'Get a quick summary' },
]
const SIDEBAR_REVERSE = [
  { name: 'PDF to Text', slug: 'pdf-to-text', icon: '📝', colorBg: '#FFF0DC', desc: 'Extract text first' },
  { name: 'OCR PDF',     slug: 'ocr-pdf',     icon: '🔍', colorBg: '#EDE9FE', desc: 'Scanned PDF? Run OCR first' },
]

/* ── FAQs ────────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'Does it work on scanned PDFs?',
    a: 'Scanned PDFs are images with no text layer. Run OCR PDF first to make the document searchable, then use PDF to Audio to listen to it.' },
  { q: 'Can I download the audio file?',
    a: 'Audio export is available in Chrome on desktop. The tool attempts to capture the speech synthesis output — if your browser does not support it, you can still listen live in any browser at no cost.' },
  { q: 'Which browser has the best voice quality?',
    a: 'Chrome on desktop has the widest voice selection including high-quality Indian English voices. Safari on iPhone also works very well. Firefox has a more limited voice library.' },
  { q: 'Can it read in Hindi?',
    a: 'Yes. Upload a Hindi PDF and the tool automatically detects Devanagari script and selects a Hindi voice. Tamil, Telugu, and Bengali PDFs are also auto-detected.' },
  { q: 'Can I adjust the reading speed?',
    a: 'Yes — choose 0.5×, 0.75×, 1×, 1.25×, 1.5×, or 2×. Use 0.75× for dense academic content and 1.5× for light reading or revision.' },
  { q: 'Does my PDF get uploaded anywhere?',
    a: 'Never. Text extraction runs in your browser using PDF.js. Speech synthesis uses your browser\'s built-in engine. No data leaves your device at any point.' },
]

const TOOL_SEO_NAME = 'PDF to Audio'
const TOOL_SLUG = 'pdf-to-audio'
const TOOL_DESCRIPTION = 'Convert PDF text to spoken audio using text-to-speech. Listen to your documents on the go. 100% free, no upload.'

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
        'Text-to-speech from PDF in the browser',
        'Adjustable reading speed and voice selection',
        'No file upload to servers',
        'Free to use',
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

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const rank = (v: SpeechSynthesisVoice) => {
      if (v.lang === 'en-IN') return 0
      if (v.lang === 'hi-IN') return 1
      if (v.lang.startsWith('en')) return 2
      if (v.lang.endsWith('-IN')) return 3
      return 4
    }
    return rank(a) - rank(b)
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function PDFToAudioPage() {
  /* ── File / extraction ───────────────────────────────────────────────── */
  const [file, setFile]                       = useState<File | null>(null)
  const [content, setContent]                 = useState<PDFTextContent | null>(null)
  const [extracting, setExtracting]           = useState(false)
  const [extractProgress, setExtractProgress] = useState({ page: 0, total: 0 })
  const [extractError, setExtractError]       = useState<string | null>(null)
  const [errorMessage, setErrorMessage]       = useState('')

  /* ── Playback ────────────────────────────────────────────────────────── */
  const [isPlaying, setIsPlaying]             = useState(false)
  const [isPaused, setIsPaused]               = useState(false)
  const [currentPage, setCurrentPage]         = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [rate, setRate]                       = useState(1)
  const [voice, setVoice]                     = useState<SpeechSynthesisVoice | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  /* ── Export ──────────────────────────────────────────────────────────── */
  const [exporting, setExporting]             = useState(false)
  const [exportError, setExportError]         = useState<string | null>(null)

  /* ── UI ──────────────────────────────────────────────────────────────── */
  const [showNotice, setShowNotice]           = useState(true)

  /* ── Refs ────────────────────────────────────────────────────────────── */
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const wordRefs     = useRef<(HTMLSpanElement | null)[]>([])
  const rateRef      = useRef(rate)
  const voiceRef     = useRef<SpeechSynthesisVoice | null>(voice)
  const contentRef   = useRef<PDFTextContent | null>(null)

  useEffect(() => { rateRef.current = rate }, [rate])
  useEffect(() => { voiceRef.current = voice }, [voice])
  useEffect(() => { contentRef.current = content }, [content])

  /* ── Load voices ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const loadVoices = () => {
      const voices = sortVoices(window.speechSynthesis.getVoices())
      setAvailableVoices(voices)
      setVoice(prev => {
        if (prev) return prev
        return voices.find(v => v.lang === 'en-IN')
          ?? voices.find(v => v.lang.startsWith('en'))
          ?? voices[0]
          ?? null
      })
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { window.speechSynthesis.cancel() }
  }, [])

  /* ── Auto-scroll highlighted word into view ──────────────────────────── */
  useEffect(() => {
    const el = wordRefs.current[currentWordIndex]
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentWordIndex, currentPage])

  useEffect(() => { wordRefs.current = [] }, [currentPage])

  /* ── File upload → extract ───────────────────────────────────────────── */
  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    window.speechSynthesis.cancel()
    setFile(f)
    setContent(null)
    setExtractError(null)
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentPage(0)
    setCurrentWordIndex(0)
    setExtracting(true)
    try {
      const result = await extractPDFText(f, (page, total) =>
        setExtractProgress({ page, total })
      )
      if (result.totalWords === 0) {
        const msg = 'No text found in this PDF. Try running OCR PDF first if it is a scanned document.'
        setExtractError(msg); setErrorMessage(msg)
        setFile(null)
        return
      }
      setContent(result)
      // Auto-select voice for detected language
      const langVoice = sortVoices(window.speechSynthesis.getVoices())
        .find(v => v.lang === result.language)
      if (langVoice) setVoice(langVoice)
    } catch {
      const msg = 'Failed to read PDF. The file may be corrupted or password-protected.'
      setExtractError(msg); setErrorMessage(msg)
      setFile(null)
    } finally {
      setExtracting(false)
    }
  }, [])

  /* ── Core speak function ─────────────────────────────────────────────── */
  const speakPage = useCallback((pageIdx: number, startWord = 0) => {
    const c = contentRef.current
    if (!c) return
    window.speechSynthesis.cancel()

    const page  = c.pages[pageIdx]
    const words = page.words.slice(startWord)
    const text  = words.join(' ')

    if (!text.trim()) {
      if (pageIdx < c.pages.length - 1) {
        setCurrentPage(pageIdx + 1)
        setCurrentWordIndex(0)
        speakPage(pageIdx + 1, 0)
      }
      return
    }

    const utt       = new SpeechSynthesisUtterance(text)
    utt.rate        = rateRef.current
    utt.voice       = voiceRef.current
    utt.lang        = c.language

    utt.onboundary  = (ev) => {
      if (ev.name !== 'word') return
      const before = text.slice(0, ev.charIndex).split(/\s+/).filter(Boolean).length
      setCurrentWordIndex(startWord + before)
    }

    utt.onend = () => {
      const cur = contentRef.current
      if (!cur) return
      if (pageIdx < cur.pages.length - 1) {
        setCurrentPage(pageIdx + 1)
        setCurrentWordIndex(0)
        speakPage(pageIdx + 1, 0)
      } else {
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentPage(0)
        setCurrentWordIndex(0)
      }
    }

    utt.onerror = (ev) => {
      if (ev.error === 'interrupted' || ev.error === 'canceled') return
      setIsPlaying(false)
    }

    utteranceRef.current = utt
    window.speechSynthesis.speak(utt)
    setIsPlaying(true)
    setIsPaused(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Playback controls ───────────────────────────────────────────────── */
  const handlePlay = useCallback(() => {
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false) }
    else speakPage(currentPage, currentWordIndex)
  }, [isPaused, currentPage, currentWordIndex, speakPage])

  const handlePause  = useCallback(() => { window.speechSynthesis.pause(); setIsPaused(true) }, [])
  const handleStop   = useCallback(() => { window.speechSynthesis.cancel(); setIsPlaying(false); setIsPaused(false) }, [])

  const handlePrevPage = useCallback(() => {
    const prev = Math.max(0, currentPage - 1)
    setCurrentPage(prev); setCurrentWordIndex(0)
    if (isPlaying) speakPage(prev, 0)
  }, [currentPage, isPlaying, speakPage])

  const handleNextPage = useCallback(() => {
    if (!content) return
    const next = Math.min(content.pages.length - 1, currentPage + 1)
    setCurrentPage(next); setCurrentWordIndex(0)
    if (isPlaying) speakPage(next, 0)
  }, [content, currentPage, isPlaying, speakPage])

  const handleFirstPage = useCallback(() => {
    setCurrentPage(0); setCurrentWordIndex(0)
    if (isPlaying) speakPage(0, 0)
  }, [isPlaying, speakPage])

  const handleLastPage = useCallback(() => {
    if (!content) return
    const last = content.pages.length - 1
    setCurrentPage(last); setCurrentWordIndex(0)
    if (isPlaying) speakPage(last, 0)
  }, [content, isPlaying, speakPage])

  const jumpToWord = useCallback((idx: number) => {
    setCurrentWordIndex(idx)
    if (isPlaying || isPaused) speakPage(currentPage, idx)
  }, [currentPage, isPlaying, isPaused, speakPage])

  const handleRateChange = useCallback((newRate: number) => {
    setRate(newRate)
    rateRef.current = newRate
    if (isPlaying && !isPaused) speakPage(currentPage, currentWordIndex)
  }, [isPlaying, isPaused, currentPage, currentWordIndex, speakPage])

  const handleVoiceChange = useCallback((name: string) => {
    const v = availableVoices.find(v => v.name === name) ?? null
    setVoice(v)
    voiceRef.current = v
    if (isPlaying && !isPaused) speakPage(currentPage, currentWordIndex)
  }, [availableVoices, isPlaying, isPaused, currentPage, currentWordIndex, speakPage])

  /* ── Audio export ────────────────────────────────────────────────────── */
  const handleExport = useCallback(async () => {
    if (!content || !file) return
    setExporting(true); setExportError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtxClass = (window.AudioContext || (window as any).webkitAudioContext) as (typeof AudioContext | undefined)
      if (!AudioCtxClass) throw new Error('no AudioContext')
      const audioContext  = new AudioCtxClass()
      const destination   = audioContext.createMediaStreamDestination()
      const recorder      = new MediaRecorder(destination.stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/wav' })
          const url  = URL.createObjectURL(blob)
          const a    = Object.assign(document.createElement('a'), { href: url, download: file.name.replace(/\.pdf$/i, '.wav') })
          a.click()
          setTimeout(() => URL.revokeObjectURL(url), 5000)
          resolve()
        }
        recorder.onerror = () => reject(new Error('recorder error'))
        recorder.start(100)

        const allText  = content.pages.map(p => p.text).join('\n\n')
        const utt      = new SpeechSynthesisUtterance(allText)
        utt.rate       = rate; utt.voice = voice; utt.lang = content.language
        utt.onend      = () => recorder.stop()
        utt.onerror    = () => reject(new Error('speech error'))
        utteranceRef.current = utt
        window.speechSynthesis.speak(utt)
      })
    } catch {
      setExportError('Audio export is not supported in this browser. Use Chrome on desktop for audio export. You can still listen live in any browser.')
    } finally {
      setExporting(false)
    }
  }, [content, file, rate, voice])

  /* ── Reset ───────────────────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    window.speechSynthesis.cancel()
    setFile(null); setContent(null); setIsPlaying(false); setIsPaused(false)
    setCurrentPage(0); setCurrentWordIndex(0); setExtractError(null); setErrorMessage('')
  }, [])

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const currentPageData = content?.pages[currentPage]
  const totalPages      = content?.pages.length ?? 0
  const wordsOnPage     = currentPageData?.words.length ?? 0
  const estMin          = content ? Math.round(content.totalWords / 150) : 0
  const overallPct      = content
    ? Math.round((content.pages.slice(0, currentPage).reduce((s, p) => s + p.words.length, 0) + currentWordIndex) / Math.max(content.totalWords, 1) * 100)
    : 0

  const btnBase: React.CSSProperties = { width: '38px', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }

  const sidebar = <ToolSidebar relatedTools={SIDEBAR_RELATED} reverseActions={SIDEBAR_REVERSE} />

  return (
    <ToolPageLayout toolName="PDF to Audio" sidebar={sidebar}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 42px)', letterSpacing: '-1px', lineHeight: 1.05, margin: 0 }}>
            <span style={{ color: 'var(--ink)' }}>PDF to Audio</span>
            {' '}<span style={{ color: 'var(--amber)' }}>with Live Highlighting</span>
          </h1>
          <span style={{ padding: '3px 9px', borderRadius: '100px', background: '#EDE9FE', color: '#5B21B6', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, flexShrink: 0 }}>AI</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', margin: 0 }}>
          Listen to any PDF with live word highlighting — follow every word as it is spoken. Free, no upload, runs entirely in your browser.
        </p>
      </div>

      {/* Browser notice */}
      {showNotice && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#FFFBEB', borderLeft: '3px solid var(--amber)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px' }}>
          <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--ink)', lineHeight: 1.6, flex: 1, margin: 0 }}>
            <strong>Best experience:</strong> Chrome or Edge on desktop · Safari on iPhone also works · Firefox has limited voice selection
          </p>
          <button onClick={() => setShowNotice(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* ── STEP 1 — Upload ─────────────────────────────────────────────── */}
      {!content && !extracting && (
        <>
          <DropZone onFilesAdded={handleFile} accept=".pdf" label="Drop your PDF here" subLabel="Supports text-based PDFs · For scanned PDFs, run OCR first" icon="🎧" maxFiles={1} />
          {extractError && <ErrorCard message={errorMessage || 'Something went wrong.'} onReset={handleReset} />}
        </>
      )}

      {/* ── STEP 2 — Extracting ─────────────────────────────────────────── */}
      {extracting && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '8px' }}>
            Reading page {extractProgress.page} of {extractProgress.total}…
          </div>
          <div style={{ width: '240px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '16px auto 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--amber)', borderRadius: '2px', width: `${extractProgress.total ? (extractProgress.page / extractProgress.total) * 100 : 0}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* ── STEP 3 — Player ─────────────────────────────────────────────── */}
      {content && (
        <div>
          {/* Doc info */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>{file?.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>
                {content.totalWords.toLocaleString()} words · {totalPages}p · ~{estMin} min at 1×
              </div>
            </div>
            <button onClick={() => { setFile(null); setContent(null); setIsPlaying(false); window.speechSynthesis.cancel() }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
              Change file
            </button>
          </div>

          {/* Overall progress bar */}
          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', marginBottom: '18px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--amber)', borderRadius: '2px', width: `${overallPct}%`, transition: 'width 0.4s' }} />
          </div>

          {/* Controls */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', marginBottom: '18px' }}>

            {/* Row 1 — transport + speed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={handleFirstPage} title="First page" style={btnBase}>⏮</button>
                <button onClick={handlePrevPage}  title="Previous page" style={btnBase}>◀</button>

                {/* Play / Pause big button */}
                <button
                  onClick={isPlaying && !isPaused ? handlePause : handlePlay}
                  style={{ width: '48px', height: '48px', borderRadius: '10px', border: 'none', background: 'var(--ink)', color: 'white', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  {isPlaying && !isPaused ? '⏸' : '▶'}
                </button>

                {(isPlaying || isPaused) && (
                  <button onClick={handleStop} title="Stop" style={btnBase}>⏹</button>
                )}

                <button onClick={handleNextPage}  title="Next page" style={btnBase}>▶</button>
                <button onClick={handleLastPage}  title="Last page" style={btnBase}>⏭</button>
              </div>

              <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '12px', color: 'var(--muted)' }}>
                Page {currentPage + 1} / {totalPages}
              </div>

              <div style={{ flex: 1 }} />

              {/* Speed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--muted)' }}>Speed:</span>
                {SPEED_OPTIONS.map(s => (
                  <button key={s} onClick={() => handleRateChange(s)} style={{ padding: '4px 9px', borderRadius: '100px', border: `1px solid ${rate === s ? 'var(--amber)' : 'var(--border)'}`, background: rate === s ? 'var(--amber)' : 'transparent', color: rate === s ? 'white' : 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', flexShrink: 0 }}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2 — word count + voice */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--muted)' }}>
                Word {Math.min(currentWordIndex + 1, wordsOnPage)} / {wordsOnPage} on this page
              </div>
              <div style={{ flex: 1 }} />
              {availableVoices.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--muted)', flexShrink: 0 }}>Voice:</span>
                  <select
                    value={voice?.name ?? ''}
                    onChange={e => handleVoiceChange(e.target.value)}
                    style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink)', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', maxWidth: '200px' }}
                  >
                    {availableVoices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Page tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '10px', scrollbarWidth: 'none' }}>
            {content.pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentPage(idx); setCurrentWordIndex(0); if (isPlaying) speakPage(idx, 0) }}
                style={{ padding: '5px 12px', borderRadius: '8px', border: `1px solid ${currentPage === idx ? 'var(--amber)' : 'var(--border)'}`, background: currentPage === idx ? '#FFF0DC' : 'white', color: currentPage === idx ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', fontWeight: currentPage === idx ? 700 : 400, flexShrink: 0, transition: 'all 0.15s' }}
              >
                p{idx + 1}
              </button>
            ))}
          </div>

          {/* ── Text panel — LIVE WORD HIGHLIGHTING ──────────────────── */}
          <div
            style={{ height: '320px', overflowY: 'auto', background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '15px', lineHeight: 1.85, color: 'var(--muted)', marginBottom: '20px' }}
          >
            {currentPageData?.words.map((word, idx) => {
              const isHighlighted = idx === currentWordIndex && (isPlaying || isPaused)
              return (
                <span
                  key={idx}
                  ref={el => { wordRefs.current[idx] = el }}
                  onClick={() => jumpToWord(idx)}
                  title="Click to jump here"
                  style={{
                    background:   isHighlighted ? 'var(--amber-light)' : 'transparent',
                    color:        isHighlighted ? 'var(--ink)' : undefined,
                    borderRadius: '3px',
                    padding:      '1px 3px',
                    fontWeight:   isHighlighted ? 600 : 400,
                    cursor:       'pointer',
                    transition:   'background 0.1s ease',
                    display:      'inline',
                  }}
                >
                  {word}{' '}
                </span>
              )
            })}
            {(!currentPageData || currentPageData.words.length === 0) && (
              <span style={{ fontStyle: 'italic', opacity: 0.5 }}>This page appears to be empty.</span>
            )}
          </div>

          {/* Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ padding: '12px 22px', borderRadius: '10px', border: 'none', background: exporting ? 'var(--border)' : 'var(--ink)', color: 'white', cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {exporting ? '⏳ Exporting…' : '⬇ Download Audio'}
            </button>
            <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: '11px', color: 'var(--muted)', opacity: 0.7 }}>Chrome desktop recommended for export</span>
          </div>

          {exportError && (
            <div style={{ marginTop: '14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6 }}>
              {exportError}
            </div>
          )}
        </div>
      )}

      {/* ── SEO content ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.5px', color: 'var(--ink)', marginBottom: '14px' }}>
          How to Listen to a PDF as Audio — Free
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.7, maxWidth: '680px', marginBottom: '32px' }}>
          Doclair's PDF to Audio tool uses your browser's built-in speech synthesis engine — no server, no upload, no account. Upload a text-based PDF, press play, and every word highlights in real time as it is spoken.
        </p>

        {[
          { heading: 'Live word highlighting — follow along as you listen', body: 'Most PDF-to-audio tools read text and leave you guessing where the reader is. Doclair highlights each word in amber as it is spoken — click any word to jump directly to that position. This is the same technology used in premium apps like Speechify and Natural Reader, available here for free.' },
          { heading: 'PDF to Audio for students — study smarter', body: 'Listen to NCERT textbooks, study materials, and notes hands-free while commuting, exercising, or doing housework. Set speed to 1.5× to cover more material in less time. Indian English voice is prioritised by default so pronunciation matches what you hear in class.' },
          { heading: 'Accessibility — PDF reading for visual impairments', body: 'Screen readers read entire pages linearly. Doclair\'s PDF to Audio gives sighted users with reading difficulties, dyslexia, or eye strain a focused reading companion — the amber highlight draws the eye exactly to the right word, reducing cognitive load compared to plain text-to-speech.' },
          { heading: 'Supported languages — Hindi, Tamil, Telugu and more', body: 'The tool automatically detects Devanagari (Hindi, Marathi), Tamil, Telugu, and Bengali scripts and selects the appropriate voice. Indian English (en-IN) is the default for Latin-script content. Voice availability depends on your browser — Chrome on desktop has the widest selection including Google\'s high-quality neural voices.' },
        ].map(({ heading, body }) => (
          <div key={heading} style={{ marginBottom: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '8px' }}>{heading}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.7, maxWidth: '680px', margin: 0 }}>{body}</p>
          </div>
        ))}

        <FAQ faqs={FAQS} />
      </div>

    </ToolPageLayout>
  )
}
