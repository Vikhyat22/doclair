import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Convert JPG to PDF Free — Merge Multiple Images',
  description: 'Turn one or more JPG images into a PDF in seconds. Merge photos into one document, control page size. Free, no upload, works on all devices.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-convert-jpg-to-pdf' },
  openGraph: { title: 'How to Convert JPG to PDF Free', description: 'Combine multiple JPG images into a single PDF. Free, no upload, no watermark.', url: 'https://doclair.in/blog/how-to-convert-jpg-to-pdf', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Convert JPG to PDF Free — Merge Multiple Images',
  description: 'Turn one or more JPG images into a PDF in seconds. Merge photos into one document, control page size. Free, no upload, works on all devices.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-convert-jpg-to-pdf',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-convert-jpg-to-pdf',
}

const FAQS = [
  { q: 'Will converting JPG to PDF reduce image quality?', a: 'No. Doclair embeds your images at full resolution inside the PDF. There is no re-compression of the original JPG data unless you explicitly choose a lower quality setting. The resulting PDF will look identical to your original photo.' },
  { q: 'Can I combine multiple JPG images into one PDF?', a: 'Yes — that is one of the most common uses. Upload as many images as you like, drag them into the order you want, and click Convert. Every image becomes a separate page in the final PDF.' },
  { q: 'How do I convert HEIC photos from my iPhone to PDF?', a: 'iPhones capture photos in HEIC format by default. Doclair\'s JPG to PDF tool accepts HEIC files directly. Alternatively, you can change your iPhone camera setting to Most Compatible (Settings → Camera → Formats) so photos are saved as JPG from the start.' },
  { q: 'Why is my PDF file so large after converting JPG images?', a: 'High-resolution phone photos (12–50 MP) produce large PDFs because the full image data is embedded. After converting, run the file through the <a href="/compress-pdf">Compress PDF tool</a> to reduce the size by 50–70% with minimal visible quality loss.' },
  { q: 'Does converting to PDF work on iPhone and Android?', a: 'Yes. Open doclair.in/jpg-to-pdf in Chrome or Safari on your phone. The tool runs entirely in the browser — no app download needed. Tap to select images from your Photos library, reorder them, convert, and save the PDF to your Files app.' },
]

export default function JPGToPDFArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="jpg-to-pdf" title="How to Convert JPG to PDF Free — Merge Multiple Images" toolName="JPG to PDF" readTime="5 min" category="Guide" date="Mar 24, 2026"
        relatedTools={[
          { name: 'PDF → JPG', slug: 'pdf-to-jpg', icon: '🖼️', desc: 'Extract PDF pages as images', colorBg: '#F3F4F6' },
          { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', desc: 'Reduce file size', colorBg: '#FFF0DC' },
          { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', desc: 'Combine multiple PDFs', colorBg: '#FFF0DC' },
        ]}>

        <p>Whether you need to submit scanned documents to a government portal, email a photo as a professional attachment, or bundle a stack of receipts into one tidy file, converting JPG images to PDF is one of the most common document tasks. The good news: you do not need Photoshop, Acrobat, or any desktop software. <Link href="/jpg-to-pdf">Doclair's JPG to PDF tool</Link> does it free, instantly, and entirely in your browser — nothing is uploaded to any server.</p>

        <p>Common scenarios where you need a JPG-to-PDF conversion include: submitting scanned Aadhaar or PAN cards to a portal that only accepts PDF, sending a multi-page handwritten assignment as a single document, collecting multiple photos of receipts into one expense report, or creating a photo album PDF to share with family.</p>

        <h2>How to Convert JPG to PDF — Step by Step</h2>
        <p>The process takes under a minute with <Link href="/jpg-to-pdf">doclair.in/jpg-to-pdf</Link>:</p>
        <ol>
          <li><strong>Open</strong> <Link href="/jpg-to-pdf">doclair.in/jpg-to-pdf</Link> in any browser — no sign-up required.</li>
          <li><strong>Upload</strong> your images by dragging them onto the page or clicking to browse. You can select multiple files at once.</li>
          <li><strong>Reorder</strong> the images by dragging the thumbnails into the sequence you want — each image becomes one page.</li>
          <li><strong>Choose page size</strong> (A4, Letter, or fit-to-image) and orientation (portrait or landscape).</li>
          <li><strong>Click Convert to PDF</strong> and download your file immediately — no watermark, no email required.</li>
        </ol>
        <div className="note">All processing happens locally in your browser. Your photos are never uploaded to any server, making this completely safe for sensitive documents like ID cards, medical records, and financial papers.</div>

        <h2>Supported Image Formats</h2>
        <p>While JPG is the most common format, Doclair supports a range of image types so you do not have to convert files before converting to PDF. Here is a summary of formats and where to find each dedicated tool:</p>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Common Source</th>
              <th>Tool</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>JPG / JPEG</td><td>Phone photos, scanned docs, web images</td><td><Link href="/jpg-to-pdf">JPG to PDF</Link></td></tr>
            <tr><td>PNG</td><td>Screenshots, graphics with transparency</td><td><Link href="/jpg-to-pdf">JPG to PDF</Link> (accepts PNG)</td></tr>
            <tr><td>WebP</td><td>Images downloaded from websites</td><td><Link href="/jpg-to-pdf">JPG to PDF</Link> (accepts WebP)</td></tr>
            <tr><td>HEIC / HEIF</td><td>iPhone and iPad default photo format</td><td><Link href="/jpg-to-pdf">JPG to PDF</Link> (accepts HEIC)</td></tr>
            <tr><td>SVG</td><td>Vector logos and illustrations</td><td><Link href="/jpg-to-pdf">JPG to PDF</Link> (accepts SVG)</td></tr>
            <tr><td>TIFF</td><td>Professional scans, archival images</td><td><Link href="/jpg-to-pdf">JPG to PDF</Link> (accepts TIFF)</td></tr>
          </tbody>
        </table>
        <div className="tip">If you receive a HEIC file from an iPhone user and your device cannot open it, upload it directly — the tool converts it seamlessly without any intermediate step.</div>

        <h2>Merge Multiple Images Into One PDF</h2>
        <p>One of the most valuable features of a JPG-to-PDF converter is merging multiple images into a single multi-page PDF. This is especially useful for:</p>
        <ul>
          <li>Bundling front and back scans of a document (ID card, driving licence) into one file</li>
          <li>Submitting multiple pages of a handwritten form as a single attachment</li>
          <li>Combining photos from multiple events into a shared photo book</li>
          <li>Consolidating a month of expense receipts into one PDF for accounting</li>
        </ul>
        <p>After uploading, the thumbnails are displayed in a grid. <strong>Drag and drop</strong> any thumbnail to reorder the pages before converting. If you forgot to add an image, click the "Add more files" button — the new image is appended at the end and can then be dragged into position.</p>

        <h2>Page Size and Orientation Tips</h2>
        <p>Choosing the right page size makes the resulting PDF look intentional rather than haphazard:</p>
        <ul>
          <li><strong>Fit to image:</strong> Each page is exactly the size of the image. Best for photos where you want no white borders. The result looks like a photo album.</li>
          <li><strong>A4 portrait:</strong> The standard paper size used across India and most of the world. Choose this when the PDF will be printed or submitted to a government portal. Images are scaled to fill the page while preserving aspect ratio.</li>
          <li><strong>Letter (8.5 × 11 in):</strong> The North American standard. Use this only if you are submitting to US-based services or printing on Letter-size paper.</li>
          <li><strong>Landscape orientation:</strong> Flip to landscape when your images are wider than they are tall — panoramic photos, spreadsheet screenshots, or presentation slides look much better in landscape.</li>
        </ul>

        <h2>Convert JPG to PDF on iPhone or Android</h2>
        <p>Doclair works identically on mobile — no app download, no account. Open <Link href="/jpg-to-pdf">doclair.in/jpg-to-pdf</Link> in Chrome on Android or Safari on iPhone. Tap the upload area to access your Photos library or Files app. Select one or multiple images, arrange them, and tap Convert.</p>
        <p>On iPhone, the resulting PDF saves to your iCloud Drive Downloads folder automatically. On Android, it goes to your Downloads folder and is immediately accessible from your file manager. If you use Doclair regularly on your phone, add the site to your home screen — in Safari, tap the Share icon then "Add to Home Screen" for an app-like experience.</p>
        <p>If you are working with HEIC photos directly off your iPhone camera roll, they are supported without any extra conversion step — the tool reads HEIC natively and embeds the image as a standard JPEG inside the PDF.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
