import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Split a PDF File Free — Extract Pages or Ranges',
  description: 'Split a PDF into separate files or extract specific pages free. No software, no upload — runs entirely in your browser. Works on Windows, Mac and mobile.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-split-a-pdf' },
  openGraph: { title: 'How to Split a PDF File Free', description: 'Extract any page or range from a PDF — free, no upload, no watermark.', url: 'https://doclair.in/blog/how-to-split-a-pdf', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Split a PDF File Free — Extract Pages or Ranges',
  description: 'Split a PDF into separate files or extract specific pages free. Runs entirely in your browser — nothing uploaded to any server.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-split-a-pdf',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-split-a-pdf',
}

const FAQS = [
  { q: 'Does splitting a PDF reduce its quality?', a: 'No. Splitting is a structural operation — it divides the PDF into smaller files without re-encoding any images or text. Every page in the output file is identical to the original at full quality.' },
  { q: 'Will the output files be smaller than the original?', a: 'Yes, proportionally. If a 10-page PDF is 5 MB and you extract pages 1–5, the result will be approximately 2.5 MB. Shared document overhead (fonts, metadata) is duplicated into each output file, so the sum of all parts may be slightly larger than the original.' },
  { q: 'Can I extract a range like pages 3–7 from a 20-page PDF?', a: 'Yes. In the Split PDF tool, choose the "By Range" mode and enter the start and end page numbers. You can extract any contiguous range. For non-contiguous pages, run the tool multiple times or use the merge tool afterwards to assemble the pages you need.' },
  { q: 'What happens to bookmarks and hyperlinks when I split a PDF?', a: 'Bookmarks (a.k.a. outlines) that point to pages within the extracted range are preserved. Links to pages outside the extracted range become dead links. Internal hyperlinks between extracted pages remain functional.' },
  { q: 'Is there a page limit for splitting PDFs on Doclair?', a: 'There is no hard page limit enforced by the server because the tool runs entirely in your browser. The practical limit is your device\'s available RAM. Very large PDFs (500+ pages) may require a few extra seconds to process on older devices.' },
]

export default function SplitPDFArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="split-pdf" title="How to Split a PDF File Free — Extract Pages or Ranges" toolName="Split PDF" readTime="5 min" category="Guide" date="Mar 24, 2026"
        relatedTools={[
          { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', desc: 'Combine multiple PDFs', colorBg: '#FFF0DC' },
          { name: 'Organize Pages', slug: 'organize-pages', icon: '📋', desc: 'Reorder, delete pages', colorBg: '#F3F4F6' },
          { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', desc: 'Reduce file size', colorBg: '#FFF0DC' },
        ]}>

        <p>Not every recipient needs the entire document. A 60-page annual report might contain one invoice on page 14 that your accountant needs. A textbook PDF might have one chapter you want to share with a colleague. A legal contract might include an appendix you want to circulate separately. Splitting a PDF lets you extract exactly what you need — without compressing, converting, or touching the rest of the file.</p>
        <p>You can split any PDF for free at <Link href="/split-pdf">doclair.in/split-pdf</Link> — no software to install, no account to create, and nothing sent to any server. The entire operation runs inside your browser.</p>

        <h2>How to Split a PDF — Step by Step</h2>
        <p>The process takes under a minute from start to finish:</p>
        <ol>
          <li><strong>Open</strong> <Link href="/split-pdf">doclair.in/split-pdf</Link> in any modern browser — Chrome, Firefox, Safari, or Edge.</li>
          <li><strong>Upload your PDF</strong> by dragging it onto the tool area or clicking to browse your files. A page preview loads automatically so you can confirm you have the right document.</li>
          <li><strong>Choose a split mode</strong> — by page range, single page extraction, or split every page into its own file. (See the table below for a full comparison.)</li>
          <li><strong>Enter your page numbers or range</strong> if prompted — for example, type <code>3-7</code> to extract pages 3 through 7.</li>
          <li><strong>Click Split PDF</strong>. Processing happens instantly in your browser.</li>
          <li><strong>Download</strong> the resulting file or files. If you split into multiple parts, they download as a ZIP archive.</li>
        </ol>
        <div className="note">Your PDF never leaves your device. Doclair's Split PDF tool runs entirely in your browser using WebAssembly — the same approach used by professional desktop software, now available without installation.</div>

        <h2>Split Modes: What Each Option Does</h2>
        <p>The Split PDF tool offers three modes depending on what you need:</p>
        <table>
          <thead>
            <tr><th>Mode</th><th>What It Does</th><th>Best For</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>By Range</strong></td><td>Extracts a contiguous block of pages (e.g., pages 5–12) into a new PDF</td><td>Extracting a chapter, section, or invoice from a larger document</td></tr>
            <tr><td><strong>Extract Single Page</strong></td><td>Pulls out one specific page (e.g., page 7) as a standalone PDF</td><td>Sharing a single certificate, receipt, or signed page</td></tr>
            <tr><td><strong>Every Page</strong></td><td>Splits the entire PDF so each page becomes its own individual file</td><td>Batch processing, separating scanned forms, or archiving individual pages</td></tr>
          </tbody>
        </table>
        <p>If you need non-contiguous pages — say pages 2, 5, and 11 — run the extraction twice and then use <Link href="/merge-pdf">Doclair's Merge PDF tool</Link> to combine the extracted pages in any order you like.</p>

        <h2>Split a Large PDF Into Equal Parts</h2>
        <p>Some workflows require breaking a large document into roughly equal chunks — for example, splitting a 100-page report into four 25-page sections for different reviewers. The "By Range" mode handles this cleanly: run the tool four times with ranges 1–25, 26–50, 51–75, and 76–100. Each pass takes only a few seconds.</p>
        <p>Alternatively, if you need to email each section and you are worried about file size, consider <Link href="/compress-pdf">compressing each part</Link> after splitting. A 25-page scanned section that starts at 8 MB might compress to under 2 MB — well within Gmail's 25 MB attachment limit.</p>

        <h2>Split PDF on iPhone or Android</h2>
        <p>No app download is necessary. Open <Link href="/split-pdf">doclair.in/split-pdf</Link> in Chrome or Safari on your phone, upload your PDF from the Files app or your photo library, choose the split mode, and download. The output saves directly to your Downloads folder.</p>
        <p>On iOS, the PDF will open in the share sheet — you can save it to Files, send it via WhatsApp or email, or open it directly in another app. On Android, it lands in the Downloads folder and is immediately accessible from any file manager or document viewer.</p>
        <p>For frequent use on mobile, add Doclair to your home screen. In Safari on iPhone, tap the Share icon, then <em>Add to Home Screen</em>. It opens like a native app with no browser chrome in the way.</p>

        <div className="tip"><strong>When splitting beats compressing:</strong> If you only need part of a document, split first — then share just the relevant pages. This is faster than compressing the entire file and avoids any quality trade-off. A 2-page extraction is inherently smaller and easier to share than an 80-page document at any compression level.</div>

        <h2>After Splitting: What Else You Can Do</h2>
        <p>Splitting is often just the first step in a document workflow. Here are common follow-on tasks Doclair handles in the same browser session:</p>
        <ul>
          <li><strong>Merge extracted pages</strong> in a new order with <Link href="/merge-pdf">Merge PDF</Link></li>
          <li><strong>Compress the extracted section</strong> before emailing with <Link href="/compress-pdf">Compress PDF</Link></li>
          <li><strong>Rotate pages</strong> that scanned sideways with <Link href="/rotate-pdf">Rotate PDF</Link></li>
          <li><strong>Convert the extracted pages to Word</strong> for editing with <Link href="/pdf-to-word">PDF to Word</Link></li>
          <li><strong>Add a password</strong> to a sensitive extracted section with <Link href="/encrypt-pdf">Encrypt PDF</Link></li>
        </ul>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
