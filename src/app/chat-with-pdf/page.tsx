'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { extractTextFromPDF } from '@/lib/pdf/extractText'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DropZone from '@/components/ui/DropZone'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

interface Message {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  timestamp: Date
}

const FAQS = [
  { q: 'Do I need an API key to use Chat with PDF?', a: 'No — Claude AI is built into Doclair. Just upload your PDF and start asking questions. No account, no API key, no subscription required.' },
  { q: 'Is my PDF content sent to a server?', a: 'Your PDF file itself never leaves your device. Text is extracted locally in your browser using pdfjs-dist. Only your question and the extracted text are sent to Claude to generate an answer.' },
  { q: 'What types of questions work best?', a: 'Questions about specific facts, summaries, definitions, dates, names, and obligations work best. For example: "What is the termination clause?" or "List all dates mentioned" or "Summarise section 3".' },
  { q: 'Does it work on scanned PDFs?', a: 'Scanned PDFs have no text layer, so Chat with PDF cannot extract text from them. Use the OCR PDF tool first to add a text layer, then re-upload the OCR\'d PDF here.' },
  { q: 'How long can the PDF be?', a: 'There is no page limit. However, only the first 50,000 characters of extracted text are sent to Claude per question. For very long documents, ask about specific sections for best results.' },
  { q: 'Can it answer in Hindi or other Indian languages?', a: 'Yes — ask your question in any language and Claude will respond in the same language. Hindi, Tamil, Telugu, Kannada, Marathi and all other major languages are supported.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'Chat with PDF — Doclair', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (browser-based)', url: 'https://doclair.in/chat-with-pdf', description: 'Ask questions about any PDF using Claude AI. No API key needed.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' } },
    { '@type': 'FAQPage', mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
}

const BREADCRUMB = {
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',          item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',         item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'Chat with PDF', item: 'https://doclair.in/chat-with-pdf' },
  ],
}

const SUGGESTIONS = [
  'Summarise this document',
  'What are the key points?',
  'List all dates and deadlines',
  'What action items are mentioned?',
]

function formatBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '15px', color: 'var(--ink)', margin: '14px 0 6px' }}>{line.slice(3)}</h3>
        if (line.startsWith('### ')) return <h4 key={i} style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: '13px', color: 'var(--ink)', margin: '10px 0 4px' }}>{line.slice(4)}</h4>
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <div key={i} style={{ display: 'flex', gap: '8px', margin: '3px 0', fontSize: '14px', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        )
        if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />
        return <p key={i} style={{ fontSize: '14px', lineHeight: 1.7, margin: '3px 0' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      })}
    </>
  )
}

export default function ChatWithPdfPage() {
  const [file, setFile]                 = useState<File | null>(null)
  const [extractedText, setExtracted]   = useState<string | null>(null)
  const [extracting, setExtracting]     = useState(false)
  const [extractPage, setExtractPage]   = useState(0)
  const [extractTotal, setExtractTotal] = useState(0)
  const [pageCount, setPageCount]       = useState(0)
  const [wordCount, setWordCount]       = useState(0)
  const [messages, setMessages]         = useState<Message[]>([])
  const [inputText, setInputText]       = useState('')
  const [isThinking, setIsThinking]     = useState(false)
  const [chatError, setChatError]       = useState<string | null>(null)
  const messagesEndRef                  = useRef<HTMLDivElement>(null)
  const textareaRef                     = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleReset = useCallback(() => {
    setFile(null); setExtracted(null); setExtracting(false)
    setExtractPage(0); setExtractTotal(0); setPageCount(0); setWordCount(0)
    setMessages([]); setInputText(''); setIsThinking(false); setChatError(null)
  }, [])

  const addFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f); setExtracted(null); setMessages([]); setExtracting(true)
    setExtractPage(0); setExtractTotal(0); setChatError(null)
    try {
      const res = await extractTextFromPDF(f, (page, total) => {
        setExtractPage(page); setExtractTotal(total)
      })
      setExtracted(res.text); setPageCount(res.pageCount); setWordCount(res.wordCount)
    } catch {
      setChatError('Failed to extract text from this PDF.')
    } finally {
      setExtracting(false)
    }
  }, [])

  async function sendMessage(question: string) {
    if (!question.trim() || !extractedText || isThinking) return
    setChatError(null)
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsThinking(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText, question: question.trim() }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.answer, timestamp: new Date() }])
    } catch {
      setChatError('Something went wrong. Please try again.')
    } finally {
      setIsThinking(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputText) }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const hasChatReady = !!extractedText && !extracting

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'PDF to Word',  slug: 'pdf-to-word', icon: '📝', colorBg: '#DCFCE7', desc: 'Export as editable Word doc' },
        { name: 'Extract Text', slug: 'pdf-to-text', icon: '📄', colorBg: '#FFF0DC', desc: 'Download as plain text file' },
      ]}
      relatedTools={[
        { name: 'AI Summarizer',    slug: 'ai-summarizer',   icon: '✨', colorBg: '#EDE9FE' },
        { name: 'OCR PDF',          slug: 'ocr-pdf',         icon: '🤖', colorBg: '#DBEAFE' },
        { name: 'PDF Word Counter', slug: 'pdf-word-counter', icon: '🔢', colorBg: '#FFF0DC' },
        { name: 'Redact PDF',       slug: 'redact-pdf',      icon: '⬛', colorBg: '#F1F5F9' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="Chat with PDF" toolSlug="chat-with-pdf" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }} />

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>✦ Claude AI Built-In</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono)', fontSize: '11px', fontWeight: 500 }}>🔒 Files Stay On Device</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(30px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>Chat with PDF </span>
          <span style={{ color: 'var(--amber)' }}>Ask Your Document Anything</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Upload any PDF and ask questions in plain language. Get instant answers powered by Claude AI. No API key needed. Files never leave your device.
        </p>
      </div>

      {/* Upload */}
      {!file && !extracting && (
        <DropZone onFilesAdded={addFile} accept=".pdf" maxFiles={1} maxSizeMB={50} currentCount={0} icon="💬" label="Drop your PDF here" subLabel="or click to browse — max 50 MB" />
      )}

      {/* Extracting */}
      {extracting && (
        <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '20px', color: 'white', marginBottom: '8px' }}>Reading document…</div>
          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Page {extractPage} of {extractTotal}</div>
        </div>
      )}

      {/* Extraction error */}
      {chatError && !hasChatReady && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '14px', color: '#991B1B' }}>{chatError}</div>
        </div>
      )}

      {/* Chat UI */}
      {hasChatReady && file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File card */}
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✅</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: '#166534', opacity: 0.7, marginTop: '2px' }}>
                {pageCount} pages · ~{wordCount.toLocaleString()} words · {formatBytes(file.size)} · Ask anything below
              </div>
            </div>
            <button onClick={handleReset} style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: '#166534', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              Try another PDF
            </button>
          </div>

          {/* Long doc notice */}
          {extractedText && extractedText.length > 50000 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: '#92400E', lineHeight: 1.6 }}>
                ⚠ Long document — only the first 50,000 characters are sent to Claude per question. Ask about specific sections for best results.
              </div>
            </div>
          )}

          {/* Chat box */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '300px', maxHeight: '480px' }}>
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em' }}>SUGGESTED QUESTIONS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => sendMessage(s)} style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '12px', color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: '100px', padding: '7px 14px', background: 'white', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FFF7ED' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
                  <div style={{ maxWidth: '85%', padding: '12px 16px', background: msg.role === 'user' ? 'var(--ink)' : 'white', border: msg.role === 'user' ? 'none' : '1px solid var(--border)', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px' }}>
                    {msg.role === 'user'
                      ? <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.92)', whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                      : <div style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--ink)' }}><MarkdownContent text={msg.content} /></div>
                    }
                  </div>
                  <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '10px', color: 'var(--muted)', padding: '0 4px' }}>{formatTime(msg.timestamp)}</div>
                </div>
              ))}

              {isThinking && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <div style={{ padding: '14px 18px', background: 'white', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px' }}>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--amber)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>Claude is reading your document…</div>
                  </div>
                </div>
              )}

              {chatError && messages.length > 0 && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '13px', color: '#991B1B' }}>{chatError}</div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-end', background: '#FAFAFA' }}>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this PDF…"
                rows={1}
                disabled={isThinking}
                style={{ flex: 1, resize: 'none', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 14px', fontFamily: 'var(--font-dm-sans)', fontSize: '14px', outline: 'none', lineHeight: 1.5, background: 'white', overflow: 'hidden', transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = 'var(--amber)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
              <button
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isThinking}
                style={{ width: '44px', height: '44px', borderRadius: '12px', border: 'none', background: inputText.trim() && !isThinking ? 'var(--amber)' : '#E5E7EB', color: inputText.trim() && !isThinking ? 'var(--ink)' : '#9CA3AF', cursor: inputText.trim() && !isThinking ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, transition: 'all 0.15s' }}
              >↑</button>
            </div>
          </div>

          {/* Privacy note */}
          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.7 }}>
            🔒 Your PDF is processed locally. Only your question and extracted text are sent to Claude — the PDF file itself never leaves your device.
          </div>
        </div>
      )}

      {/* SEO */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>How to Chat with a PDF Using AI — Free</h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Doclair&apos;s Chat with PDF tool lets you have a conversation with any document. Claude AI reads your PDF and answers questions instantly — no API key, no account, no upload required.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {['Upload your PDF by dropping it into the upload area or clicking to browse.', 'Text is extracted from your document directly in your browser — no file upload to any server.', 'Ask any question about the document using natural language. Claude responds instantly.'].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', color: 'white', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--ink)', opacity: 0.65 }}>{step}</p>
            </div>
          ))}
        </div>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px', marginTop: '28px' }}>What questions can you ask about a PDF?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          You can ask anything: &quot;Summarise this contract&quot;, &quot;What are the payment terms?&quot;, &quot;List all parties mentioned&quot;, &quot;What is the termination clause?&quot;, &quot;Are there any deadlines?&quot;, &quot;What does section 4 say?&quot;. Claude understands context and answers follow-up questions.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Chat with PDF vs reading — when AI saves time</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>For long contracts, research papers, and annual reports — where you need a specific answer without reading 50 pages — Chat with PDF is dramatically faster. Ask the exact question you need answered rather than scanning every page.</p>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Works on contracts, research papers, reports</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Chat with PDF works on any text-based PDF: legal contracts, academic papers, financial reports, government documents, insurance policies, and manuals. For scanned documents, run OCR PDF first.</p>
      </div>

      <FAQ faqs={FAQS} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>
    </ToolPageLayout>
  )
}
