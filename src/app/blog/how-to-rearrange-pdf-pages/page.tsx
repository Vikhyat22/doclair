import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Rearrange PDF Pages Free — Drag to Reorder Instantly',
  description: 'Reorder, rotate, or delete pages in any PDF by dragging thumbnails. Free, browser-based, no upload. Works on desktop and mobile.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-rearrange-pdf-pages' },
  openGraph: { title: 'How to Rearrange PDF Pages Free', description: 'Drag PDF pages to reorder them. Delete or rotate individual pages too. Free, browser-based.', url: 'https://doclair.in/blog/how-to-rearrange-pdf-pages', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Rearrange PDF Pages Free — Drag to Reorder Instantly',
  description: 'Reorder, rotate, or delete pages in any PDF by dragging thumbnails. Free, browser-based, no upload.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-rearrange-pdf-pages',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-rearrange-pdf-pages',
}

const FAQS = [
  { q: 'Does rearranging PDF pages change the file content?', a: 'Only the page order changes. All text, images, annotations, and hyperlinks within each page are preserved exactly as they were. The tool reorders the pages as complete units — nothing inside a page is altered.' },
  { q: 'Can I undo a page reorder after downloading?', a: 'Not automatically — once you download, the file is saved with the new order. If you need to revert, keep the original file before you start. You can always re-open the original in the Organize Pages tool and reorder again.' },
  { q: 'Is there a limit on the number of pages I can reorder?', a: 'There is no hard page-count limit. In practice, very large PDFs — say 200+ pages — may take a few seconds to render thumbnails depending on your device. On a modern phone or laptop, documents up to 100 pages load quickly.' },
  { q: 'Can I rearrange pages in a password-protected PDF?', a: 'You need to remove the password first. Use the Remove Password tool at doclair.in/remove-password, then open the unlocked file in Organize Pages. After reordering, you can re-encrypt it with the Encrypt PDF tool if needed.' },
  { q: 'Can I rearrange and compress in the same workflow?', a: 'Yes — just run them as two separate steps. Reorder your pages first using the Organize Pages tool, download the result, then open that file in the Compress PDF tool. Each tool is instant, so the two-step process takes under a minute total.' },
]

export default function RearrangePDFPagesArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="organize-pages" title="How to Rearrange PDF Pages Free — Drag to Reorder Instantly" toolName="Organize Pages" readTime="4 min" category="Guide" date="Mar 24, 2026"
        relatedTools={[
          { name: 'Split PDF', slug: 'split-pdf', icon: '✂️', desc: 'Extract pages by range', colorBg: '#FEE2E2' },
          { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔀', desc: 'Combine multiple PDFs', colorBg: '#FFF0DC' },
          { name: 'Remove Pages', slug: 'remove-pages-from-pdf', icon: '🗑️', desc: 'Delete specific pages', colorBg: '#F3F4F6' },
        ]}
      >

        <p>PDFs rarely arrive in the right order. A contract gets scanned upside down on page 4. A report has its appendix before the introduction. You merge two documents and the pages interleave incorrectly. Rearranging PDF pages used to require Adobe Acrobat or a subscription service — now you can drag thumbnails to any order you like, directly in your browser, for free.</p>
        <p>The most common scenarios where page reordering saves time: reordering scanned multi-page documents, moving a signature page to the end of a contract, reorganising a presentation before sharing, and fixing page sequence after merging PDFs from different sources.</p>

        <h2>How to Rearrange PDF Pages — Step by Step</h2>
        <p>Using <Link href="/organize-pages">Doclair's Organize Pages tool</Link>, the process takes about 30 seconds:</p>
        <ol>
          <li><strong>Open</strong> <Link href="/organize-pages">doclair.in/organize-pages</Link> in any browser — no sign-up needed.</li>
          <li><strong>Upload</strong> your PDF by dragging it onto the page or clicking to browse your files.</li>
          <li><strong>View thumbnails</strong> — every page appears as a visual thumbnail so you can see exactly what each page contains.</li>
          <li><strong>Drag pages</strong> to the desired position. On mobile, use a long-press and drag. The order updates instantly as you move pages.</li>
          <li><strong>Rotate or delete</strong> any page using the controls that appear on each thumbnail — rotate 90° clockwise or anticlockwise, or click the trash icon to remove a page entirely.</li>
          <li><strong>Click Save &amp; Download</strong> to export the reorganised PDF. The file downloads immediately with no watermark.</li>
        </ol>
        <div className="note">Your PDF is never uploaded to any server. All processing — thumbnail rendering, page reordering, rotation, deletion — happens entirely in your browser. Confidential documents stay on your device.</div>

        <h2>Reorder, Rotate, and Delete in One Session</h2>
        <div className="tip">You do not need to run separate tools for reordering, rotating, and deleting. The Organize Pages tool lets you do all three in a single session before downloading. Drag page 5 to position 2, rotate page 7 by 180°, and delete the blank last page — all at once, then download the final PDF in one go.</div>

        <h2>Which Tool to Use for Which Task</h2>
        <p>Page organisation tasks in PDFs overlap slightly — here is a quick guide to picking the right tool:</p>
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Best Tool</th>
              <th>When to Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Change page order</td>
              <td><Link href="/organize-pages">Organize Pages</Link></td>
              <td>You want to keep all pages but in a different sequence</td>
            </tr>
            <tr>
              <td>Remove specific pages</td>
              <td><Link href="/organize-pages">Organize Pages</Link></td>
              <td>Delete one or a few pages while keeping the rest together</td>
            </tr>
            <tr>
              <td>Break a PDF into separate files</td>
              <td><Link href="/split-pdf">Split PDF</Link></td>
              <td>You need pages as individual files or in multiple smaller PDFs</td>
            </tr>
            <tr>
              <td>Extract a page range as a new file</td>
              <td><Link href="/split-pdf">Split PDF</Link></td>
              <td>You need pages 5–12 as a standalone document</td>
            </tr>
            <tr>
              <td>Rotate all pages at once</td>
              <td><Link href="/organize-pages">Organize Pages</Link></td>
              <td>Scanned document where every page is sideways</td>
            </tr>
          </tbody>
        </table>

        <h2>Rearrange PDF Pages on Mobile</h2>
        <p>The tool works on any phone — Android or iPhone — without installing an app. Open <Link href="/organize-pages">doclair.in/organize-pages</Link> in Chrome or Safari, upload your PDF from the Files app, and long-press a thumbnail to start dragging it to a new position. The drag-and-drop interface is optimised for touch screens.</p>
        <p>On a smaller screen, thumbnails stack in a tighter grid, but you can pinch to zoom into any thumbnail if you need to confirm which page is which before moving it. This is especially useful when reordering dense text documents where pages look similar at a small size.</p>
        <p>For frequent use on mobile, add Doclair to your home screen. In Safari on iPhone, tap the Share icon then <em>Add to Home Screen</em>. On Chrome for Android, tap the three-dot menu and choose <em>Add to Home screen</em>. The site opens like a native app without browser chrome.</p>

        <h2>After Reordering: Reduce the File Size</h2>
        <p>If you received a large scanned PDF and reordered its pages, the output file may still be bulky. Run it through <Link href="/compress-pdf">Doclair's Compress PDF tool</Link> after downloading — most scanned documents shrink by 50–70% with no visible quality loss. This is useful when you need to email the reorganised file or upload it to a government portal with a strict file size limit.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
