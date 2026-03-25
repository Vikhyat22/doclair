import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Convert PDF to JPG Free — Extract All Pages as Images',
  description: 'Convert every page of a PDF to a high-quality JPG image free. No upload, no watermark, works in your browser. Choose resolution and download as a ZIP.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-convert-pdf-to-jpg' },
  openGraph: { title: 'How to Convert PDF to JPG Free', description: 'Extract PDF pages as high-quality JPG images. Free, browser-based, no upload.', url: 'https://doclair.in/blog/how-to-convert-pdf-to-jpg', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Convert PDF to JPG Free — Extract All Pages as Images',
  description: 'Convert every page of a PDF to a high-quality JPG image free. No upload, no watermark, works in your browser. Choose resolution and download as a ZIP.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-convert-pdf-to-jpg',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-convert-pdf-to-jpg',
}

const FAQS = [
  { q: 'What resolution (DPI) will the exported JPG images be?', a: 'By default the tool exports at 150 DPI, which is sharp enough for screen viewing and social media. For print-quality images you can increase this to 300 DPI. Higher DPI produces larger file sizes — a single A4 page at 300 DPI is typically 2–5 MB as a JPG.' },
  { q: 'Can I convert only specific pages instead of all pages?', a: 'Yes. Before converting, you can select a page range (for example, pages 2–5) or click individual page thumbnails to include only the pages you want. The remaining pages are ignored and will not appear in the download.' },
  { q: 'Why does the JPG have a white background where the PDF was transparent?', a: 'JPG does not support transparency — any transparent areas in the PDF (such as a logo on a clear background) will be filled with white. If you need to preserve transparency, use the PDF to PNG tool at <a href="/pdf-to-png">doclair.in/pdf-to-png</a> instead, which supports an alpha channel.' },
  { q: 'How do I download all the images at once?', a: 'When you convert a multi-page PDF, Doclair automatically packages all the extracted JPG images into a single ZIP file for download. Click "Download All as ZIP" to get every page image in one go. You can also download individual pages by clicking on a specific thumbnail.' },
  { q: 'Is it safe to convert confidential PDFs — like bank statements or medical reports?', a: 'Yes. Doclair runs entirely in your browser using WebAssembly — your PDF is never sent to any server. The conversion happens locally on your device, so sensitive documents remain completely private.' },
]

export default function PDFToJPGArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="pdf-to-jpg" title="How to Convert PDF to JPG Free — Extract All Pages as Images" toolName="PDF to JPG" readTime="5 min" category="Guide" date="Mar 24, 2026"
        relatedTools={[
          { name: 'JPG → PDF', slug: 'jpg-to-pdf', icon: '🖼️', desc: 'Convert images to PDF', colorBg: '#F3F4F6' },
          { name: 'Compress Image', slug: 'compress-image', icon: '🗜️', desc: 'Reduce image file size', colorBg: '#F3F4F6' },
          { name: 'PDF → PNG', slug: 'pdf-to-png', icon: '🖼️', desc: 'Export pages as PNG', colorBg: '#EDE9FE' },
        ]}>

        <p>Sometimes a PDF is the wrong format. You want to post a page on Instagram, attach a single slide to a WhatsApp message, generate a preview thumbnail for a website, or import a chart into a presentation — and none of those workflows accept a PDF directly. Converting a PDF to JPG images unlocks every one of these use cases instantly.</p>

        <p><Link href="/pdf-to-jpg">Doclair's PDF to JPG tool</Link> extracts every page of a PDF as a high-quality JPEG image, entirely in your browser. No file is uploaded anywhere, no watermark is added, and no account is needed. You can download a single page or all pages as a ZIP file in one click.</p>

        <h2>How to Convert PDF to JPG — Step by Step</h2>
        <p>The entire conversion takes under 30 seconds for most documents:</p>
        <ol>
          <li><strong>Open</strong> <Link href="/pdf-to-jpg">doclair.in/pdf-to-jpg</Link> in any browser on desktop or mobile.</li>
          <li><strong>Upload</strong> your PDF by dragging it onto the drop zone or clicking to browse your files.</li>
          <li><strong>Preview</strong> the page thumbnails that appear — each page of the PDF is shown as a preview.</li>
          <li><strong>Select pages</strong> if you only need specific ones, or leave all pages selected to convert everything.</li>
          <li><strong>Choose quality:</strong> Standard (150 DPI) for screen and sharing, High (300 DPI) for print-quality output.</li>
          <li><strong>Click Convert</strong> and download individual pages or all pages as a ZIP archive.</li>
        </ol>
        <div className="note">Your PDF never leaves your device. All rendering is done locally using PDF.js and Canvas — the same rendering engine that powers Firefox's built-in PDF viewer, trusted by hundreds of millions of users worldwide.</div>

        <h2>Choose the Right Output Format</h2>
        <p>JPG is the most compatible image format but it is not always the best choice. Here is a comparison to help you decide which format suits your use case:</p>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Transparency</th>
              <th>File Size</th>
              <th>Best For</th>
              <th>Tool</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>JPG</td>
              <td>No (white background)</td>
              <td>Small</td>
              <td>Photos, social media, thumbnails, email attachments</td>
              <td><Link href="/pdf-to-jpg">PDF to JPG</Link></td>
            </tr>
            <tr>
              <td>PNG</td>
              <td>Yes (alpha channel)</td>
              <td>Medium–Large</td>
              <td>Logos, diagrams, graphics with transparent backgrounds</td>
              <td><Link href="/pdf-to-png">PDF to PNG</Link></td>
            </tr>
            <tr>
              <td>WebP</td>
              <td>Yes</td>
              <td>Smallest</td>
              <td>Web pages, modern browsers, bandwidth-sensitive contexts</td>
              <td><Link href="/pdf-to-webp">PDF to WebP</Link></td>
            </tr>
          </tbody>
        </table>
        <div className="tip">If you are exporting slides or diagrams that contain logos or charts on white backgrounds, JPG is fine and produces the smallest files. If any element has a transparent background (common in design files and branded documents), use PNG to avoid ugly white fills.</div>

        <h2>Extract a Single Page vs All Pages</h2>
        <p>Not every use case requires converting the entire PDF. Here is when each approach makes sense:</p>
        <ul>
          <li><strong>Single page:</strong> You need the cover page as a thumbnail for a website, or one chart from a 40-page report to paste into a slide deck. Click the specific thumbnail to download just that page as a JPG.</li>
          <li><strong>Page range:</strong> You need pages 3–7 from a report but not the appendix. Enter the range before converting — only those pages are processed and downloaded.</li>
          <li><strong>All pages:</strong> You are archiving a scanned document as individual image files, or you need every slide from a presentation exported as separate images. Use "Download All as ZIP" to get everything in one file.</li>
        </ul>
        <p>When downloading a ZIP of all pages, files are named sequentially — <code>page-01.jpg</code>, <code>page-02.jpg</code>, and so on — so they sort correctly in any file manager or image viewer.</p>

        <h2>Use Cases: Social Media, Presentations, and Thumbnails</h2>
        <p>PDF-to-image conversion solves a range of practical problems across different platforms:</p>
        <ul>
          <li><strong>Social media:</strong> Instagram, LinkedIn, and X (Twitter) do not accept PDF uploads. Convert your PDF presentation or infographic pages to JPG and upload them as image posts or carousel slides.</li>
          <li><strong>Presentations:</strong> Google Slides and PowerPoint both allow you to insert images but not embed PDFs. Convert the relevant PDF page to JPG and insert it as an image. It renders crisp at any zoom level.</li>
          <li><strong>Thumbnail generation:</strong> Websites that list downloadable PDF files often show the first page as a preview thumbnail. Export page 1 at 150 DPI, resize to your thumbnail dimensions, and upload it alongside the PDF.</li>
          <li><strong>Email previews:</strong> When sending a PDF report, attach both the PDF and a JPG of the cover page. Recipients see the content at a glance in their email preview without opening the PDF.</li>
          <li><strong>WhatsApp and messaging:</strong> Sharing a single page of information is far easier as an image — recipients see it inline without downloading a PDF viewer. Convert just the relevant page and send it as a photo.</li>
        </ul>
        <p>For documents where you need to share the content as a browsable image sequence — such as a company policy handbook or a product catalogue — convert all pages to JPG and import them into a Google Photos album or Canva presentation for easy sharing with anyone who has the link.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
