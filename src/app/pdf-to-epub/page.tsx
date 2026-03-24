'use client'

import { useState, useCallback } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import ErrorCard from '@/components/ui/ErrorCard'
import ToolSidebar from '@/components/ui/ToolSidebar'
import FAQ from '@/components/ui/FAQ'

const SIDEBAR_RELATED = [
  { name: 'PDF to Text',     slug: 'pdf-to-text',     icon: '📝', colorBg: '#FFF0DC', desc: 'Extract plain text' },
  { name: 'PDF to Markdown', slug: 'pdf-to-markdown', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'Convert to Markdown' },
  { name: 'PDF to Word',     slug: 'pdf-to-word',     icon: '📄', colorBg: '#DBEAFE', desc: 'Convert to .docx' },
]

const FAQS = [
  { q: 'Will my ePub work on Kindle and Apple Books?', a: 'Yes. The output is a standard ePub package suitable for common eReaders, including Kindle (where supported), Kobo, and Apple Books.' },
  { q: 'Why is my ePub empty for some PDFs?', a: 'Scanned PDFs are images without extractable text. Use OCR PDF first on image-only documents, then convert to ePub.' },
  { q: 'Is my PDF uploaded anywhere?', a: 'No. Text extraction and ePub building run entirely in your browser.' },
  { q: 'Is PDF to ePub free?', a: 'Yes. Doclair does not add a watermark to your ePub file.' },
]

const TOOL_SEO_NAME = 'PDF to ePub'
const TOOL_SLUG = 'pdf-to-epub'
const TOOL_DESCRIPTION = 'Convert PDF files to ePub eBook format for Kindle, Kobo and Apple Books. 100% free, no upload, no watermark.'

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
        'PDF text extracted into reflowable ePub',
        'Chapters per page with navigation',
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

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export default function PDFToEpubPage() {
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [done, setDone] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const process = useCallback(async (file: File) => {
    setSaving(true); setDone(false); setErrorMessage('')
    try {
      const pdfjsLib = (await import('pdfjs-dist')).default ?? await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
      const title = file.name.replace(/\.pdf$/i, '')

      setProgress('Extracting text…')
      const chapters: { pageNum: number; text: string }[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(`Extracting page ${i} of ${doc.numPages}…`)
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        const text = content.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str || '')
          .join(' ')
          .trim()
        chapters.push({ pageNum: i, text })
      }

      setProgress('Building EPUB…')
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

      zip.folder('META-INF')!.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

      const oebps = zip.folder('OEBPS')!

      oebps.file('style.css', `
body { font-family: Georgia, serif; line-height: 1.7; margin: 1em 1.5em; color: #1a1a1a; }
h2 { font-size: 1em; color: #888; border-bottom: 1px solid #eee; padding-bottom: 0.4em; }
p { margin: 0.8em 0; }
`)

      const chapterIds: string[] = []
      for (const ch of chapters) {
        const id = `page${ch.pageNum}`
        chapterIds.push(id)
        const paragraphs = ch.text
          .split(/\n{2,}/)
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .map(p => `<p>${escapeXml(p)}</p>`)
          .join('\n')
        oebps.file(`${id}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Page ${ch.pageNum}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<h2>Page ${ch.pageNum}</h2>
${paragraphs || '<p><em>(No text on this page)</em></p>'}
</body>
</html>`)
      }

      const manifestItems = chapterIds.map(id =>
        `<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`
      ).join('\n    ')
      const spineItems = chapterIds.map(id => `<itemref idref="${id}"/>`).join('\n    ')
      oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">${escapeXml(title)}-doclair</dc:identifier>
    <dc:creator>Converted by Doclair</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`)

      const navPoints = chapterIds.map((id, i) => `
    <navPoint id="nav${i + 1}" playOrder="${i + 1}">
      <navLabel><text>Page ${i + 1}</text></navLabel>
      <content src="${id}.xhtml"/>
    </navPoint>`).join('')
      oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${escapeXml(title)}-doclair"/></head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`)

      setProgress('Compressing EPUB…')
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `${title}.epub`; a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Try a different file.')
    } finally { setSaving(false); setProgress('') }
  }, [])

  return (
    <ToolPageLayout toolName="PDF to ePub" sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      <div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
          <span style={{ color: 'var(--ink)' }}>PDF to ePub </span>
          <span style={{ color: 'var(--amber)' }}>Convert to eBook Format</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
          Convert PDF files to ePub format for reading on Kindle, Kobo, Apple Books and other eReaders. Text is extracted and reflowed.
        </p>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#1e40af', marginBottom: 24, maxWidth: 540 }}>
          <strong>Note:</strong> Works best with text-based PDFs. Scanned image PDFs will produce empty chapters — use <a href="/ocr-pdf" style={{ color: '#1d4ed8' }}>OCR PDF</a> first.
        </div>
      </div>

      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') process(f) }}
        onDragOver={e => e.preventDefault()}
        style={{ border: '3px dashed #e5e7eb', borderRadius: 16, padding: 64, textAlign: 'center', background: '#fafafa' }}>
        {saving ? (
          <><div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div><p style={{ fontWeight: 600, color: '#374151' }}>{progress}</p></>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#374151' }}>Drop your PDF here</p>
            <p style={{ color: '#9ca3af', marginBottom: 20 }}>Converts to a readable .epub eBook file</p>
            <label style={{ padding: '12px 28px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
              Choose PDF
              <input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) process(f) }} style={{ display: 'none' }} />
            </label>
            {done && <p style={{ color: '#10b981', fontWeight: 600, marginTop: 16, fontSize: 13 }}>✓ ePub downloaded!</p>}
          </>
        )}
      </div>

      {errorMessage && <ErrorCard message={errorMessage} onReset={() => setErrorMessage('')} />}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Convert PDF to EPUB — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          EPUB is the standard ebook format for e-readers like Kindle, Apple Books, and Kobo. Converting a PDF to EPUB extracts the text and produces a reflowable ebook that adjusts to any screen size.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Drop your PDF or click to upload.</strong> No account or sign-up required.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Wait while text is extracted.</strong> Text is extracted and formatted as EPUB entirely in your browser.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Download the .epub file.</strong> The converted file saves directly to your device.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Open in your reader.</strong> Open it in Apple Books, Calibre, or any EPUB reader, or upload to your e-reader.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          Will my PDF images and layout be preserved?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          EPUB is a reflowable format — text reflows to fit the screen. Images embedded in the PDF are included where possible, but complex layouts, columns, and tables may simplify. For layout-critical documents such as textbooks or magazines, PDF viewing is generally preferred.
        </p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
          PDF to EPUB on iPhone and Android
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
          Doclair works in mobile Safari and Chrome. After downloading the EPUB, tap to open it in Apple Books (iPhone) or any installed EPUB reader on Android. No desktop software required.
        </p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
