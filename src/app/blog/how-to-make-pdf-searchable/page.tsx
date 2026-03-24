import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Make a Scanned PDF Searchable Free (OCR)',
  description: 'Make any scanned PDF searchable and selectable using OCR. Free, browser-based, no upload. Supports English, Hindi, and 100+ languages.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-make-pdf-searchable' },
  openGraph: { title: 'How to Make a Scanned PDF Searchable Free', description: 'Add OCR text layer to any scanned PDF. Make it searchable and copy-pasteable. Free, no upload.', url: 'https://doclair.in/blog/how-to-make-pdf-searchable', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Make a Scanned PDF Searchable Free (OCR)',
  description: 'Make any scanned PDF searchable and selectable using OCR. Free, browser-based, no upload.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-make-pdf-searchable',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-make-pdf-searchable',
}

const FAQS = [
  { q: 'How accurate is browser-based OCR?', a: 'For clean, high-contrast scans (black text on white paper), Tesseract typically achieves 95–99% character accuracy. Accuracy drops on low-resolution scans, handwriting, or pages with heavy background textures. If the scan was made at 300 DPI or higher, expect excellent results for printed text.' },
  { q: 'Can OCR read Hindi and other Indian scripts?', a: 'Yes. Tesseract supports Devanagari (Hindi, Marathi, Sanskrit), Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi, and Odia, among many others. Select the correct language from the dropdown before running OCR to get the best results.' },
  { q: 'What is the difference between a scanned PDF and a digital PDF?', a: 'A digital PDF is created directly from software — Word, Excel, or a printer driver — and contains real, selectable text. A scanned PDF is a photograph of a document; every page is an image with no underlying text. Ctrl+F finds nothing in scanned PDFs until OCR adds a text layer.' },
  { q: 'Does OCR make the file size larger?', a: 'Slightly. OCR embeds a hidden text layer alongside the existing page images. The text data itself is small — a few kilobytes per page — so a 5 MB scanned PDF might become 5.2–5.5 MB after OCR. The visual appearance of the document does not change.' },
  { q: 'Can I use OCR on a PDF that already has some text?', a: 'Yes, but OCR is most useful on pages that are pure images. If your PDF already has searchable text on most pages and only a few scanned image pages, OCR will still process correctly — the tool analyses each page independently.' },
]

export default function MakePDFSearchableArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="ocr-pdf" title="How to Make a Scanned PDF Searchable Free (OCR)" toolName="OCR PDF" readTime="6 min" category="Guide" date="Mar 24, 2026">

        <p>When you scan a document — an Aadhaar card, a bank statement, a court order — the resulting PDF is essentially a photograph. You cannot press Ctrl+F to search it, you cannot select and copy a line of text, and screen readers cannot read it aloud. The file looks like a document, but to your computer it is just an image. Optical Character Recognition (OCR) fixes this by analysing the image and embedding a hidden, searchable text layer behind the page without altering its appearance.</p>
        <p>The result: a PDF that looks identical to the original scan but behaves like a fully digital document — searchable, selectable, and accessible.</p>

        <h2>How to Make a Scanned PDF Searchable — Step by Step</h2>
        <p>Using <Link href="/ocr-pdf">Doclair's OCR PDF tool</Link>, the process takes under a minute:</p>
        <ol>
          <li><strong>Open</strong> <Link href="/ocr-pdf">doclair.in/ocr-pdf</Link> in any modern browser.</li>
          <li><strong>Upload</strong> your scanned PDF by dragging it onto the page or clicking to browse.</li>
          <li><strong>Select the language</strong> of the text in your document. If the document contains multiple languages, choose the primary one.</li>
          <li><strong>Click Run OCR.</strong> The browser processes each page using Tesseract WebAssembly — no file is sent to any server.</li>
          <li><strong>Download</strong> the searchable PDF. Open it and press Ctrl+F — your text is now fully searchable.</li>
        </ol>
        <div className="note">Everything happens inside your browser. Your document never leaves your device. This matters for confidential documents: medical records, legal filings, and financial statements can all be processed without any privacy risk.</div>

        <h2>What Is OCR and How Does It Work?</h2>
        <p>OCR stands for Optical Character Recognition. The engine analyses each pixel on a page, identifies shapes that correspond to characters, and converts them into machine-readable text. Modern OCR uses a multi-step pipeline: first it corrects the image for skew and noise, then it detects lines of text, then it recognises individual characters using pattern-matching models trained on millions of document samples.</p>
        <p>Doclair uses <strong>Tesseract</strong> — the most widely used open-source OCR engine, originally developed by HP and now maintained by Google — compiled to WebAssembly so it runs directly in the browser at near-native speed. Tesseract has been trained on over 100 scripts and languages and consistently outperforms many proprietary OCR services on clean document scans.</p>

        <h2>Supported Languages</h2>
        <p>Tesseract supports over 100 languages and scripts. Here is a sample of the most commonly used ones available in the tool:</p>
        <table>
          <thead>
            <tr><th>Language</th><th>Script</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr><td>English</td><td>Latin</td><td>Best accuracy; default selection</td></tr>
            <tr><td>Hindi</td><td>Devanagari</td><td>Also covers Marathi and Sanskrit</td></tr>
            <tr><td>Tamil</td><td>Tamil</td><td>Fully supported</td></tr>
            <tr><td>Telugu</td><td>Telugu</td><td>Fully supported</td></tr>
            <tr><td>Bengali</td><td>Bengali</td><td>Covers Bengali and Assamese</td></tr>
            <tr><td>French</td><td>Latin</td><td>Includes accented characters</td></tr>
            <tr><td>German</td><td>Latin</td><td>Includes umlauts (ä, ö, ü)</td></tr>
            <tr><td>Arabic</td><td>Arabic</td><td>Right-to-left; select explicitly</td></tr>
          </tbody>
        </table>
        <p>For documents with mixed-language content — for example, an English form with a Hindi address block — choose the language that covers the majority of the text. OCR accuracy on the minority language will be reduced but the document will still become searchable for both.</p>

        <h2>OCR vs Convert PDF to Text</h2>
        <div className="note"><strong>Important distinction:</strong> OCR and "Extract text from PDF" are not the same operation. OCR reads image pixels and creates a new text layer — it is needed for scanned documents. The <Link href="/pdf-to-text">PDF to Text</Link> tool simply extracts text that already exists inside a digital PDF. If you run PDF to Text on a scanned document, you will get an empty or near-empty result because there is no text layer to extract. Use OCR first, then extract if needed.</div>

        <h2>When OCR Results Are Imperfect</h2>
        <p>OCR accuracy is not always 100%, and the quality of your scan is the single biggest factor. Here are practical tips to get the best results:</p>
        <ul>
          <li><strong>Use high-resolution scans.</strong> 300 DPI is the minimum recommended for OCR. Most modern smartphone scanner apps (Adobe Scan, Microsoft Lens, Google PhotoScan) capture at 300+ DPI by default.</li>
          <li><strong>Ensure strong contrast.</strong> Black text on white paper gives the highest accuracy. Faded ink, coloured paper, or heavy watermarks reduce recognition rates.</li>
          <li><strong>Avoid extreme skew.</strong> A page tilted more than 10–15 degrees can confuse the line-detection stage. Most scanner apps auto-correct skew; if yours does not, straighten the image before generating the PDF.</li>
          <li><strong>Check for compression artefacts.</strong> If the PDF was already heavily compressed before OCR, the image quality may be too low. Try rescanning at a higher quality setting if accuracy is poor.</li>
        </ul>

        <h2>After OCR: Edit the Text</h2>
        <p>Once your PDF has a searchable text layer, you have more options. If you need to actually edit the content — change sentences, fix errors, reformat paragraphs — the next step is to convert the PDF to a Word document. Use <Link href="/pdf-to-word">Doclair's PDF to Word tool</Link> to get a fully editable .docx file from your now-OCR'd PDF. The text layer created by OCR transfers cleanly into the Word conversion, giving you editable output from what was originally just a photograph of a page.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
