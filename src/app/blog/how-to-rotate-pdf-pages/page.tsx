import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Rotate PDF Pages Free — Fix Upside-Down or Sideways Pages',
  description: 'Rotate one page, a range, or all pages in a PDF. Fix upside-down scans or sideways pages and save permanently. Free, no upload, works in your browser.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-rotate-pdf-pages' },
  openGraph: { title: 'How to Rotate PDF Pages Free', description: 'Fix sideways or upside-down PDF pages permanently. Rotate any page 90° or 180°. Free, no upload.', url: 'https://doclair.in/blog/how-to-rotate-pdf-pages', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Rotate PDF Pages Free — Fix Upside-Down or Sideways Pages',
  description: 'Rotate one page, a range, or all pages in a PDF. Fix upside-down scans or sideways pages and save permanently.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-rotate-pdf-pages',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-rotate-pdf-pages',
}

const FAQS = [
  { q: 'Will the rotation be saved permanently?', a: 'Yes. Unlike rotating in a PDF viewer — which only changes how the file looks on screen — Doclair writes the new orientation directly into the file. When you download and reopen the PDF, the pages will appear correctly rotated in any viewer, on any device.' },
  { q: 'Can I rotate just one page without affecting the rest?', a: 'Absolutely. Select only the page or pages you want to fix, choose your rotation direction, and apply. Pages you did not select remain untouched. This is useful for mixed-orientation documents where some pages are landscape and others are portrait.' },
  { q: 'Why did my scan come out upside down?', a: 'Mobile scanning apps sometimes misread the orientation sensor, especially when scanning on a flat surface. The camera assumes you are holding the phone upright, but if the document is placed in a particular direction, the resulting scan ends up rotated 90° or 180°. A quick 180° rotation fixes this instantly.' },
  { q: 'Does rotating a PDF reduce quality?', a: 'No. PDF rotation is a lossless operation — it updates the rotation metadata stored in the file without re-encoding any image data. Your text remains sharp and your images are pixel-perfect after rotation.' },
  { q: 'Can I rotate a password-protected PDF?', a: 'You need to remove the password first. Use the Remove Password tool at doclair.in/remove-password, then rotate the pages, and re-apply encryption afterwards using the Encrypt PDF tool if needed.' },
]

export default function RotatePDFArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="rotate-pdf" title="How to Rotate PDF Pages Free — Fix Upside-Down or Sideways Pages" toolName="Rotate PDF" readTime="4 min" category="Guide" date="Mar 24, 2026"
        relatedTools={[
          { name: 'Organize Pages', slug: 'organize-pages', icon: '📋', desc: 'Reorder, delete pages', colorBg: '#F3F4F6' },
          { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', desc: 'Combine multiple PDFs', colorBg: '#FFF0DC' },
          { name: 'Split PDF', slug: 'split-pdf', icon: '✂️', desc: 'Extract pages by range', colorBg: '#FEE2E2' },
        ]}
      >

        <p>You open a scanned document and half the pages are sideways. A spreadsheet exported to PDF is in landscape when you need portrait. A mobile scan came out upside down. These orientation problems are frustrating, but they are completely fixable — for free, in your browser, without any software — using <Link href="/rotate-pdf">Doclair's Rotate PDF tool</Link>.</p>
        <p>Pages end up in the wrong orientation for several reasons: mobile scanning apps misread the device sensor, documents are photographed at an angle, spreadsheets are exported in landscape by default, or a PDF is assembled from pages of different orientations. Whatever caused it, rotation is a lossless fix that takes under a minute.</p>

        <h2>How to Rotate PDF Pages — Step by Step</h2>
        <p>Open <Link href="/rotate-pdf">doclair.in/rotate-pdf</Link> and follow these steps:</p>
        <ol>
          <li><strong>Upload your PDF</strong> — drag it onto the tool or click to browse. Your file stays on your device throughout.</li>
          <li><strong>Select pages</strong> — click individual page thumbnails to select specific pages, or use "Select All" to rotate the entire document at once.</li>
          <li><strong>Choose rotation direction</strong> — 90° clockwise, 90° counter-clockwise, or 180°. A live preview updates immediately so you can confirm before saving.</li>
          <li><strong>Apply and download</strong> — click Rotate, then download your corrected PDF. The rotation is written permanently into the file.</li>
        </ol>
        <div className="note">The rotation is saved into the PDF file itself — not just the viewer. Every app and device that opens your downloaded file will show the correct orientation without any additional steps.</div>

        <h2>Rotate All Pages vs Specific Pages</h2>
        <div className="tip">If every page in the document needs fixing, click "Select All" before applying rotation — it is faster than clicking each thumbnail individually. For mixed-orientation documents, hold Ctrl (or Cmd on Mac) while clicking to select a non-contiguous range of pages, then rotate just that selection.</div>
        <p>A common scenario is a long report where the main text is portrait but embedded charts are landscape. In that case, you might want to rotate only the chart pages 90° so they are easier to read without tilting your head, while leaving the text pages untouched.</p>

        <h2>Permanent vs View-Only Rotation</h2>
        <div className="note">Most PDF viewers let you rotate pages on screen, but that rotation is temporary — it resets the next time someone opens the file. Doclair writes the rotation permanently into the file structure using the PDF page dictionary's <code>/Rotate</code> key. The result is a proper, standards-compliant PDF that any viewer will display correctly.</div>

        <h2>When to Use Each Rotation Direction</h2>
        <p>Choosing the right rotation depends on how the page is currently oriented versus how you need it to appear:</p>
        <table>
          <thead>
            <tr>
              <th>Rotation</th>
              <th>Degrees Turned</th>
              <th>Best Used When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>90° Clockwise</td>
              <td>Turns right</td>
              <td>Page is rotated 90° to the left — content appears on its left side</td>
            </tr>
            <tr>
              <td>90° Counter-Clockwise</td>
              <td>Turns left</td>
              <td>Page is rotated 90° to the right — content appears on its right side</td>
            </tr>
            <tr>
              <td>180°</td>
              <td>Flips upside down</td>
              <td>Page is completely inverted — upside-down scans from mobile apps</td>
            </tr>
          </tbody>
        </table>
        <p>If you are unsure which direction to choose, use the live preview in the tool — it updates instantly so you can try both 90° options and pick whichever looks correct before downloading.</p>

        <h2>Fix Rotation in Scanned Documents</h2>
        <p>Scanned PDFs often have two problems at once: the page is rotated, and the text is not machine-readable because it is stored as an image. Rotating the page fixes the visual orientation, but if you also need to search, copy, or edit the text, you should run the file through <Link href="/ocr-pdf">OCR PDF</Link> after rotating. OCR converts the image-based text into real, selectable text while preserving the corrected orientation.</p>
        <p>A practical workflow for a badly scanned multi-page document: rotate all pages to the correct orientation first, then run OCR to make the text searchable. Both tools work entirely in your browser with no file uploads.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
