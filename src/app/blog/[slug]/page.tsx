import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const ARTICLES: Record<string, {
  title: string
  desc: string
  toolSlug: string
  toolName: string
  content: string[]
}> = {
  'how-to-reduce-pdf-size': {
    title: 'How to Reduce PDF File Size (Free, No Quality Loss)',
    desc: 'Compress your PDF files without losing quality using free browser-based tools.',
    toolSlug: 'compress-pdf',
    toolName: 'Compress PDF',
    content: [
      'Large PDF files can be difficult to share via email or upload to online forms. Fortunately, you can reduce PDF file size without noticeable quality loss — and you don\'t need to pay for Adobe Acrobat or install any software.',
      'Doclair\'s Compress PDF tool runs entirely in your browser. Your file never leaves your device, making it completely safe for confidential documents.',
      'Step 1: Open the Compress PDF tool on Doclair and drag your file into the upload area.',
      'Step 2: Select your compression level. Higher compression reduces file size more but may slightly reduce image quality.',
      'Step 3: Click "Compress PDF" and wait a few seconds while your browser processes the file.',
      'Step 4: Download your compressed PDF. The file size reduction is typically 40–70% for PDFs with embedded images.',
      'Why does PDF file size get so large? PDFs grow large primarily because of embedded images, fonts, and metadata. High-resolution photos embedded in a PDF are the most common culprit.',
      'What about quality? For text-heavy PDFs, compression is lossless — you won\'t notice any difference. For image-heavy PDFs, choose a balanced compression level to maintain readability.',
      'Can I compress PDFs on my phone? Yes. Doclair works in mobile browsers on iPhone and Android. No app required.',
    ]
  },
  'how-to-merge-pdf-files-free': {
    title: 'How to Merge PDF Files for Free',
    desc: 'Combine multiple PDF documents into one file without uploading to any server.',
    toolSlug: 'merge-pdf',
    toolName: 'Merge PDF',
    content: [
      'Merging multiple PDF files into a single document is one of the most common document tasks. Whether you\'re combining chapters, reports, or scanned pages, Doclair makes it instant and free.',
      'Unlike most online PDF tools, Doclair processes your files entirely in your browser. Nothing is uploaded to any server — your files stay on your device.',
      'Step 1: Navigate to the Merge PDF tool and click "Choose PDF Files" or drag your files into the drop zone.',
      'Step 2: Reorder your files by dragging them up or down in the list. The final PDF will follow this exact order.',
      'Step 3: Click "Merge PDFs" and your browser will combine the documents.',
      'Step 4: Click "Download" to save your merged PDF. No watermark is added.',
      'How many files can I merge? Up to 50 PDF files per merge, limited only by your device\'s memory.',
      'Can I merge PDFs on mobile? Yes. Doclair works in Safari on iPhone and Chrome on Android.',
      'Is it safe for confidential documents? Absolutely. Since no upload occurs, even sensitive legal or medical documents can be safely merged.',
    ]
  },
  'how-to-convert-word-to-pdf': {
    title: 'How to Convert Word to PDF (Without Microsoft Office)',
    desc: 'Convert .docx files to PDF format instantly in your browser.',
    toolSlug: 'word-to-pdf',
    toolName: 'Word to PDF',
    content: [
      'Converting a Word document to PDF is essential when you need to share a document that looks exactly the same on every device.',
      'You don\'t need Microsoft Office or Adobe Acrobat to convert Word files to PDF. Doclair\'s Word to PDF tool handles this conversion entirely in your browser.',
      'Step 1: Open the Word to PDF tool and drag your .docx file into the upload area.',
      'Step 2: Click "Convert to PDF" — the browser processes the file locally.',
      'Step 3: Download your PDF. The formatting, fonts, and images are preserved.',
      'What Word features are supported? Most standard formatting including headings, bold/italic text, tables, and embedded images is supported.',
      'What about file privacy? Your Word document never leaves your device.',
      'Can I convert on iPhone? Yes. iOS Files app can pick .docx files, and Doclair handles the conversion in mobile Safari.',
    ]
  },
  'best-free-pdf-editor-no-watermark': {
    title: 'Best Free PDF Editor With No Watermark',
    desc: 'Edit, annotate, and modify PDFs without paying for Adobe Acrobat.',
    toolSlug: 'edit-pdf',
    toolName: 'Edit PDF',
    content: [
      'Most "free" PDF editors add a watermark to your documents unless you pay for a subscription. Doclair is genuinely free — no watermarks, ever, on any tool.',
      'What can Doclair\'s Edit PDF tool do? Add text boxes anywhere on the page, draw shapes and lines, add digital signatures, highlight and annotate text, and insert stamps or images.',
      'Step 1: Open the Edit PDF tool and upload your PDF.',
      'Step 2: Use the toolbar to select editing modes — text, shapes, highlight, or signature.',
      'Step 3: Click on the PDF to add annotations. Drag to reposition them.',
      'Step 4: Download your edited PDF. No watermark is added.',
      'Why does Adobe Acrobat cost so much? Adobe dominates the professional market and charges premium prices accordingly.',
      'Is the editing permanent? Yes. The annotations are flattened into the PDF when you download.',
    ]
  },
  'how-to-remove-background-from-image': {
    title: 'How to Remove Background from an Image (AI, Free)',
    desc: 'Remove image backgrounds instantly using AI running in your browser.',
    toolSlug: 'remove-background',
    toolName: 'Remove Background',
    content: [
      'Background removal used to require Photoshop or expensive online services. Today, AI can remove backgrounds from images in seconds — and Doclair does it entirely in your browser.',
      'Doclair uses an ONNX-based AI model that runs locally on your device using WebAssembly. No image is ever sent to a server.',
      'Step 1: Open the Remove Background tool and upload your image (JPG, PNG, or WebP).',
      'Step 2: Wait a few seconds while the AI model processes your image in the browser.',
      'Step 3: Preview the result with the background removed.',
      'Step 4: Download the transparent PNG. Use it in presentations, product photos, or any creative project.',
      'What image types work best? The AI works best on images with clear subject-background contrast — portraits, product photos, and objects on simple backgrounds.',
      'How private is this? Since the AI runs locally in your browser, your images never leave your device.',
    ]
  },
  'how-to-compress-pdf-on-iphone': {
    title: 'How to Compress a PDF on iPhone',
    desc: 'Reduce PDF size on iPhone without installing any app.',
    toolSlug: 'compress-pdf',
    toolName: 'Compress PDF',
    content: [
      'Sharing large PDFs on an iPhone can be frustrating — email size limits, slow uploads, and storage concerns all make file size a real problem.',
      'Doclair is a Progressive Web App (PWA) that works in mobile Safari without any installation required.',
      'Step 1: Open Safari on your iPhone and go to Doclair\'s Compress PDF tool.',
      'Step 2: Tap the upload area. iOS will show you the Files app picker — navigate to your PDF.',
      'Step 3: Select your compression level and tap "Compress PDF".',
      'Step 4: Tap "Download" and choose where to save the compressed file.',
      'Can I install Doclair on my iPhone home screen? Yes. Tap the Share button in Safari, then tap "Add to Home Screen".',
      'Does this work on iPad? Yes. The process is identical on iPad with Safari.',
    ]
  },
  'how-to-protect-pdf-with-password': {
    title: 'How to Protect a PDF with a Password',
    desc: 'Add password protection to your PDF files for free.',
    toolSlug: 'encrypt-pdf',
    toolName: 'Encrypt PDF',
    content: [
      'Password-protecting a PDF prevents unauthorized access to sensitive documents.',
      'Doclair\'s Encrypt PDF tool uses AES-256 encryption — the same standard used by banks and governments.',
      'Step 1: Open the Encrypt PDF tool and upload the PDF you want to protect.',
      'Step 2: Enter a strong password. A combination of letters, numbers, and symbols is recommended.',
      'Step 3: Optionally set permissions — restrict printing, copying text, or editing.',
      'Step 4: Click "Encrypt PDF" and download the password-protected file.',
      'What encryption standard is used? AES-256-bit encryption, which is industry standard.',
      'What if I forget the password? There is no recovery mechanism. Store your password safely.',
      'Will the encrypted PDF work in Adobe Reader? Yes. Compatible with all major PDF viewers.',
    ]
  },
  'how-to-extract-text-from-pdf': {
    title: 'How to Extract Text from a PDF (With & Without OCR)',
    desc: 'Get the text content from any PDF, including scanned documents.',
    toolSlug: 'pdf-to-text',
    toolName: 'PDF to Text',
    content: [
      'Extracting text from a PDF is useful for searching, copying content, or processing the data programmatically.',
      'Text-based PDFs have selectable text built in. Scanned PDFs are images — they require OCR to extract text.',
      'For text-based PDFs: Use Doclair\'s PDF to Text tool. Upload your PDF, click Convert, and download the extracted text.',
      'For scanned PDFs: Use Doclair\'s OCR PDF tool. It uses Tesseract.js — an open-source OCR engine running in your browser.',
      'Step 1: Identify your PDF type. Try selecting text in the PDF viewer — if you can select individual words, it\'s text-based.',
      'Step 2: Choose the right tool — PDF to Text for native PDFs, OCR PDF for scanned documents.',
      'Step 3: Upload your file and process it.',
      'Step 4: Download the extracted text or copy it directly.',
      'How accurate is OCR? For clearly scanned documents in English, accuracy is typically 95–99%.',
      'What languages does OCR support? Doclair\'s OCR supports 100+ languages via Tesseract.js.',
    ]
  },
}

export function generateStaticParams() {
  return Object.keys(ARTICLES).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = ARTICLES[slug]
  if (!article) return {}
  return {
    title: article.title,
    description: article.desc,
    alternates: { canonical: `https://doclair.in/blog/${slug}` },
  }
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = ARTICLES[slug]
  if (!article) notFound()

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.desc,
    url: `https://doclair.in/blog/${slug}`,
    author: { '@type': 'Organization', name: 'Doclair' },
    publisher: { '@type': 'Organization', name: 'Doclair' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Navbar />
      <article style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '720px' }}>
          <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '32px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>← Back to Blog</Link>

          <div style={{ background: '#FFF0DC', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.7 }}>Try the tool mentioned in this article:</span>
            <Link href={`/${article.toolSlug}`} style={{
              background: 'var(--ink)', color: 'white', padding: '8px 18px', borderRadius: '100px',
              fontSize: '13px', fontWeight: 500, textDecoration: 'none',
            }}>{article.toolName} →</Link>
          </div>

          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(26px,3vw,40px)', letterSpacing: '-1px', color: 'var(--ink)', marginBottom: '32px', lineHeight: 1.15 }}>{article.title}</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {article.content.map((para, i) => (
              <p key={i} style={{ fontSize: '16px', lineHeight: 1.75, color: 'var(--ink)', opacity: para.startsWith('Step') ? 1 : 0.75 }}>
                {para.startsWith('Step') ? (
                  <><strong style={{ opacity: 1, color: 'var(--ink)' }}>{para.split(':')[0]}:</strong>{para.substring(para.indexOf(':') + 1)}</>
                ) : para}
              </p>
            ))}
          </div>

          <div style={{ background: 'var(--ink)', borderRadius: '14px', padding: '24px 28px', marginTop: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'white', marginBottom: '4px' }}>Try {article.toolName} for Free</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>No upload. No watermark. Works in your browser.</div>
            </div>
            <Link href={`/${article.toolSlug}`} style={{
              background: 'var(--amber)', color: 'var(--ink)', padding: '12px 24px', borderRadius: '100px',
              fontSize: '14px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>Open Tool →</Link>
          </div>
        </div>
      </article>
      <Footer />
    </>
  )
}
