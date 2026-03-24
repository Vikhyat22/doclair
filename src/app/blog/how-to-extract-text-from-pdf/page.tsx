import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Extract Text From PDF Free — Copy Any PDF Content',
  description: 'Extract all text from any PDF free. Download as .txt file or copy to clipboard. Works on scanned PDFs too (with OCR). No software needed.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-extract-text-from-pdf' },
  openGraph: { title: 'How to Extract Text From PDF Free', description: 'Extract all text from any PDF — copy to clipboard or download as .txt. Works on scanned PDFs with OCR.', url: 'https://doclair.in/blog/how-to-extract-text-from-pdf', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Extract Text From a PDF Free',
  description: 'Extract all text from any PDF free. Download as .txt file or copy to clipboard. Works on scanned PDFs too (with OCR). No software needed.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-22',
  dateModified: '2026-03-22',
  url: 'https://doclair.in/blog/how-to-extract-text-from-pdf',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-extract-text-from-pdf',
}

const FAQS = [
  { q: 'Can I extract text from a scanned PDF?', a: 'Yes, but scanned PDFs need OCR first. Use Doclair\'s OCR PDF tool at doclair.in/ocr-pdf to add a searchable text layer to your scanned document, then use PDF to Text to extract the text. The OCR runs in your browser using Tesseract.js.' },
  { q: 'What is the difference between PDF to Text and PDF to Word?', a: 'PDF to Text extracts raw, unformatted text — useful for data processing, analysis, and feeding into other tools. PDF to Word preserves formatting, tables, and structure in an editable .docx file. Use PDF to Text for raw content, PDF to Word for editing.' },
  { q: 'Why can\'t I select text in some PDFs?', a: 'Scanned PDFs are images — they have no text layer. Some PDFs also have text selection disabled via owner permissions. For scanned PDFs, OCR is required. For permission-locked PDFs, extracting via the content stream (as Doclair does) bypasses the selection restriction.' },
  { q: 'Does Doclair support extracting text in Hindi and other Indian languages?', a: 'Yes. Doclair\'s OCR PDF tool supports Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Malayalam, Kannada, and 20+ other Indian languages via Tesseract.js. Select the correct language before running OCR for best accuracy.' },
  { q: 'Is there a page limit for text extraction?', a: 'No. Doclair processes all pages in the PDF — there is no per-page or per-document limit. Large PDFs (100+ pages) may take a minute or two to process depending on your device speed.' },
]

export default function ExtractTextArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="pdf-to-text" title="How to Extract Text From a PDF Free" toolName="PDF to Text" readTime="5 min" category="Guide">

        <p>Whether you need to copy content from a locked PDF, extract data for a spreadsheet, or get text from a scanned document, <Link href="/pdf-to-text">Doclair's PDF to Text tool</Link> pulls all the text out of any PDF — free, in your browser, with no file size limit.</p>

        <h2>When Do You Need to Extract Text From a PDF?</h2>
        <p>Text extraction from PDFs comes up in more situations than you might expect:</p>
        <ul>
          <li><strong>Copying content from a locked PDF</strong> — some PDFs disable text selection via permissions, but their content stream is still accessible</li>
          <li><strong>Data extraction</strong> — pulling numbers or lists from a PDF into Excel or Google Sheets</li>
          <li><strong>Translation</strong> — copying text from a PDF to translate it in Google Translate or DeepL</li>
          <li><strong>Contract review</strong> — searching for specific clauses in a long legal document</li>
          <li><strong>Research and analysis</strong> — processing multiple PDFs for keywords or content analysis</li>
          <li><strong>Accessibility</strong> — extracting text to read it in a screen reader or adjust formatting for readability</li>
        </ul>

        <h2>How to Extract Text From PDF Free — Step by Step</h2>
        <ol>
          <li><strong>Go to</strong> <Link href="/pdf-to-text">doclair.in/pdf-to-text</Link>.</li>
          <li><strong>Upload your PDF</strong> — drop it onto the page or click to browse.</li>
          <li><strong>The tool extracts all text</strong> from every page automatically — no configuration needed.</li>
          <li><strong>Preview the text</strong> in the browser — scroll through to verify the extraction looks correct.</li>
          <li><strong>Click Download .txt</strong> to save as a plain text file, or <strong>Copy to clipboard</strong> to paste the text directly.</li>
        </ol>
        <div className="note">The extraction reads the PDF's native text layer — it is fast (typically 2–5 seconds for a 50-page document) and accurate. Text, headings, bullet points, and table content are all extracted.</div>

        <h2>Extracting Text From a Scanned PDF</h2>
        <p>Scanned PDFs are photographs of pages — they contain no actual text data, only pixels. To extract text from a scanned PDF, you first need to run OCR (Optical Character Recognition) to add a text layer.</p>
        <p>Here is the full workflow:</p>
        <ol>
          <li>Go to <Link href="/ocr-pdf">doclair.in/ocr-pdf</Link>.</li>
          <li>Upload your scanned PDF and select the document language (English, Hindi, etc.).</li>
          <li>Run OCR — the tool processes each page and adds an invisible text layer.</li>
          <li>Download the searchable PDF.</li>
          <li>Go to <Link href="/pdf-to-text">doclair.in/pdf-to-text</Link> and upload the OCR-processed PDF.</li>
          <li>Extract and download the text.</li>
        </ol>
        <p>The entire OCR process runs in your browser using Tesseract.js — an open-source OCR engine trusted by developers worldwide. Your scanned document is never uploaded to any server.</p>

        <h2>Extract Text From PDF in Hindi and Indian Languages</h2>
        <p>Doclair's OCR tool supports 20+ Indian languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, and more. When running OCR on a document in one of these languages, select the correct language from the dropdown for best accuracy.</p>
        <p>After OCR, the extracted text retains the original script (Devanagari, Tamil script, Telugu script, etc.) — you can paste it into Word, Google Docs, or any Unicode-compatible application.</p>

        <h2>Why Can't You Select Text in Some PDFs?</h2>
        <p>There are two common reasons a PDF won't let you select text:</p>
        <ul>
          <li><strong>Scanned PDF:</strong> The page is an image, not text. OCR is the solution.</li>
          <li><strong>Permissions-locked PDF:</strong> The document owner set an Owner Password disabling text selection. Doclair's PDF to Text tool reads the content stream directly, bypassing the selection restriction — so extraction works even on these PDFs.</li>
        </ul>

        <h2>PDF to Text vs PDF to Word — Which Should You Use?</h2>
        <p><strong>Use PDF to Text</strong> when you need raw content: copying paragraphs, extracting data, feeding text into an AI tool, or translating content. The output is plain text with no formatting.</p>
        <p><strong>Use <Link href="/pdf-to-word">PDF to Word</Link></strong> when you need to edit the document — preserve tables, headings, and layout in an editable .docx file that you can modify in Word or Google Docs. PDF to Word is slower and more complex but maintains document structure.</p>
        <p>For quick data extraction and analysis, PDF to Text is faster and more reliable. For document editing, PDF to Word is the better choice.</p>

        <h2>Extract Text From Multiple PDFs</h2>
        <p>Need to extract text from several PDFs? If you need all the text in one file, <Link href="/merge-pdf">merge the PDFs first</Link> into a single document, then run PDF to Text on the merged file. This gives you all the text from all documents in one .txt file, with page breaks preserved between the original documents.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
