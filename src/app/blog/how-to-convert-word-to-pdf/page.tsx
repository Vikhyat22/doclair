import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Convert Word to PDF Free — Keep Formatting',
  description: 'Convert .docx or .doc files to PDF without Microsoft Word. Free online converter — formatting, fonts and tables preserved. Works on all devices.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-convert-word-to-pdf' },
  openGraph: { title: 'How to Convert Word to PDF Free', description: 'Convert .docx to PDF with formatting intact. No Word needed, works in your browser.', url: 'https://doclair.in/blog/how-to-convert-word-to-pdf', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Convert Word to PDF Free — Preserve All Formatting',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-22',
  dateModified: '2026-03-22',
}

const FAQS = [
  { q: 'Can I convert Word to PDF without installing Microsoft Word?', a: 'Yes. Doclair\'s Word to PDF tool at doclair.in/word-to-pdf converts .docx files entirely in your browser using mammoth.js — a document conversion library. No Microsoft Office, no Google account, no installation required.' },
  { q: 'Will my formatting be preserved after conversion?', a: 'Standard formatting — headings, bold/italic, tables, bullet lists, and inline images — is preserved. Complex elements like multi-column layouts, custom fonts not available on the system, and SmartArt may need adjustment after conversion.' },
  { q: 'Can I convert a .doc file (older Word format)?', a: 'Doclair supports both .docx and .doc formats. If your file is a .doc, rename it or re-save it as .docx in Word or LibreOffice first for best results.' },
  { q: 'Is my Word document uploaded to a server?', a: 'No. The conversion runs entirely in your browser. Your .docx file is never transmitted to any server — Doclair processes it locally using JavaScript.' },
  { q: 'How do I convert a Word document to PDF on a Mac?', a: 'Open doclair.in/word-to-pdf in Chrome or Safari on your Mac. Drag your .docx file onto the page. When the browser print dialog opens, choose "Save as PDF" from the PDF dropdown in the bottom left. This works without any software installation.' },
]

export default function WordToPDFArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="word-to-pdf" title="How to Convert Word to PDF Free — Preserve All Formatting" toolName="Word to PDF" readTime="5 min" category="Guide">

        <p>Converting a Word document to PDF ensures it looks identical on every device and operating system — no more formatting shifts when the recipient opens it in a different version of Word, LibreOffice, or Google Docs. <Link href="/word-to-pdf">Doclair's Word to PDF converter</Link> does this entirely in your browser, with no software needed and no file upload.</p>

        <h2>Why Convert Word Documents to PDF?</h2>
        <p>PDF is the professional standard for sharing documents because it is a fixed-layout format — the document looks exactly as you designed it, regardless of the reader's operating system, screen size, or installed fonts. Word documents, by contrast, are flow documents: they reflow and reformat based on the viewer's software version, default font settings, and page margins.</p>
        <p>In practice, this matters constantly:</p>
        <ul>
          <li><strong>Job portals in India</strong> (Naukri, LinkedIn, Internshala) recommend PDF for CV uploads to avoid formatting issues</li>
          <li><strong>Government application portals</strong> almost universally require PDF, not Word</li>
          <li><strong>Client and business submissions</strong> — contracts, proposals, invoices — should always be PDF</li>
          <li><strong>College and university applications</strong> require PDFs for statement of purpose, certificates, and ID documents</li>
          <li><strong>Legal documents</strong> must be in PDF to preserve formatting as-is for archiving and signing</li>
        </ul>

        <h2>How to Convert Word to PDF Free — Step by Step</h2>
        <ol>
          <li><strong>Go to</strong> <Link href="/word-to-pdf">doclair.in/word-to-pdf</Link>.</li>
          <li><strong>Drop your .docx file</strong> onto the upload area or click to browse.</li>
          <li><strong>Review the preview</strong> — the tool renders a preview of your document converted to HTML.</li>
          <li><strong>Click Save as PDF</strong> — the browser's print dialog opens with your document ready to print.</li>
          <li><strong>Select "Save as PDF"</strong> as the destination (on Windows: Microsoft Print to PDF; on Mac: PDF button in the bottom left; on Chrome: "Save as PDF" in the Destination dropdown).</li>
          <li><strong>Click Save</strong> — your PDF is saved to your computer.</li>
        </ol>
        <div className="note">No Microsoft Word installation is required. The conversion runs entirely in your browser using mammoth.js, an open-source document conversion library.</div>

        <h2>Convert a Word CV to PDF Free</h2>
        <p>Converting a CV or resume from Word to PDF is one of the most common tasks. Recruiters receive your CV in PDF and it looks exactly as you designed it — same fonts, same spacing, same column layout. Upload your .docx CV to <Link href="/word-to-pdf">doclair.in/word-to-pdf</Link>, preview it, and save the PDF. The whole process takes under a minute.</p>
        <p>If your CV uses custom fonts (like Calibri or Garamond), those will be embedded in the PDF during conversion so the recipient sees the correct fonts even if they do not have them installed.</p>

        <h2>What Gets Preserved in the Conversion?</h2>
        <ul>
          <li>Headings (H1, H2, H3) and paragraph styles ✓</li>
          <li>Bold, italic, and underline formatting ✓</li>
          <li>Tables with borders and cell formatting ✓</li>
          <li>Images embedded in the document ✓</li>
          <li>Bullet lists and numbered lists ✓</li>
          <li>Hyperlinks ✓</li>
          <li>Text colours and highlights ✓</li>
        </ul>
        <p><strong>Limitations:</strong> Complex multi-column layouts (using Word's column feature), SmartArt graphics, and WordArt text effects may not convert perfectly. For these, the best approach is to open the file in LibreOffice Writer and export as PDF directly — LibreOffice's PDF export is more complete than browser-based conversion.</p>

        <h2>Convert Word to PDF on iPhone</h2>
        <p>Open <Link href="/word-to-pdf">doclair.in/word-to-pdf</Link> in Safari on your iPhone. Tap the upload area and select your .docx file from the Files app or iCloud Drive. When the print dialog appears, tap the Share button on the preview page, then choose <em>Save to Files</em> to save the PDF to your iPhone storage.</p>

        <h2>Convert Word to PDF on Mac (Without Word)</h2>
        <p>On a Mac without Microsoft Office, Doclair works in both Chrome and Safari. Drag your .docx file onto the page. When the browser print dialog opens, click the PDF dropdown in the bottom left corner and select <em>Save as PDF</em>. Choose a location and save. The PDF is ready.</p>
        <p>Alternatively, macOS has a built-in feature: right-click any .docx file in Finder → Quick Actions → Create PDF. This uses the system's built-in document conversion (which is excellent on modern Macs) and requires no browser or additional software.</p>

        <h2>After Converting: Check and Compress</h2>
        <p>After converting, open the PDF and check that formatting looks correct. If the file is large (because the Word document contained high-resolution images), run it through <Link href="/compress-pdf">Doclair's Compress PDF tool</Link> to reduce the size before sharing.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
