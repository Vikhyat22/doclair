import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Add a Watermark to PDF Free — Text or Image',
  description: 'Add DRAFT, CONFIDENTIAL or a custom logo as a watermark to any PDF. Control opacity, position and rotation. Free, no upload, nothing leaves your browser.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-add-watermark-to-pdf' },
  openGraph: { title: 'How to Add a Watermark to PDF Free', description: 'Add text or image watermarks to any PDF. Full opacity and position control. Free, browser-based.', url: 'https://doclair.in/blog/how-to-add-watermark-to-pdf', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Add a Watermark to PDF Free — Text or Image',
  description: 'Add text or image watermarks to any PDF. Full opacity and position control. Free, browser-based.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-add-watermark-to-pdf',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-add-watermark-to-pdf',
}

const FAQS = [
  { q: 'Can I remove a watermark added by Doclair?', a: 'Watermarks added by Doclair are embedded directly into the content layer of each page — they are rendered as part of the page graphics, not stored as a separate annotation or layer. This makes them significantly harder to remove than annotation-based watermarks. Specialist PDF editing software can attempt removal, but for most use cases the watermark is effectively permanent.' },
  { q: 'What opacity should I use for a DRAFT watermark?', a: 'For a DRAFT or CONFIDENTIAL watermark intended to be clearly visible, 30–50% opacity works well — readable at a glance without obscuring the document content. For a subtle branding watermark (a logo behind the text), 10–20% is typical. Proof-of-concept and review copies often use 40–60% so the watermark cannot be cropped or missed.' },
  { q: 'What image formats are supported for image watermarks?', a: 'PNG is recommended because it supports transparency — a PNG logo with a transparent background blends naturally with the document. JPEG is also supported but has no transparency, so a white or coloured background will appear around the image. SVG is not currently supported for watermarks.' },
  { q: 'Can I add a watermark to only specific pages?', a: 'Yes. The tool lets you choose whether to apply the watermark to all pages or to a custom page range. This is useful for documents where only the first page needs a DRAFT stamp, or where you want to watermark a cover page with a logo but leave the appendix pages clean.' },
  { q: 'Does the watermark tool work on mobile?', a: 'Yes. Open doclair.in/add-watermark in Chrome or Safari on any Android or iOS device. The tool is fully functional on mobile — upload from your Files app, configure the watermark, and download. For image watermarks, you can select a PNG from your photo library or files storage.' },
]

export default function AddWatermarkToPDFArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="add-watermark" title="How to Add a Watermark to PDF Free — Text or Image" toolName="Add Watermark" readTime="5 min" category="Guide" date="Mar 24, 2026">

        <p>Watermarks serve a range of practical purposes: marking a document as a draft before final approval, labelling copies as CONFIDENTIAL, branding client-facing reports with a company logo, or adding a COPY stamp to prevent unofficial reproductions from being mistaken for originals. Whatever the reason, adding a watermark to a PDF should take seconds — not require a paid subscription or an installed application.</p>
        <p>Doclair's <Link href="/add-watermark">Add Watermark tool</Link> handles both text and image watermarks, gives you full control over opacity, position, and rotation, and processes everything in your browser. Nothing is uploaded. Nothing is stored.</p>

        <h2>How to Add a Watermark to PDF — Step by Step</h2>
        <ol>
          <li><strong>Open</strong> <Link href="/add-watermark">doclair.in/add-watermark</Link> in any browser.</li>
          <li><strong>Upload</strong> your PDF by dragging it onto the page or clicking to browse.</li>
          <li><strong>Choose watermark type:</strong> Text (type any word or phrase) or Image (upload a PNG or JPEG logo).</li>
          <li><strong>Configure appearance:</strong> Set the font size or image size, choose opacity, set the rotation angle, and pick a position (centre, tiled, or corner).</li>
          <li><strong>Select pages:</strong> Apply to all pages, or enter a custom range (e.g., 1–5).</li>
          <li><strong>Click Apply Watermark</strong> and download your watermarked PDF instantly.</li>
        </ol>
        <div className="note">All processing happens in your browser using PDF-lib and Canvas APIs. Your document never leaves your device — making this safe for confidential contracts, legal documents, and client materials.</div>

        <h2>Text Watermark vs Image Watermark</h2>
        <p>Both watermark types are fully supported, but they suit different use cases. Here is how they compare:</p>
        <table>
          <thead>
            <tr><th>Feature</th><th>Text Watermark</th><th>Image Watermark</th></tr>
          </thead>
          <tbody>
            <tr><td>Best for</td><td>DRAFT, CONFIDENTIAL, COPY, review labels</td><td>Company logos, signatures, branded stamps</td></tr>
            <tr><td>Custom content</td><td>Any text, any font size</td><td>Any PNG/JPEG image</td></tr>
            <tr><td>Transparency support</td><td>Yes — via opacity slider</td><td>Yes — PNG alpha channel preserved</td></tr>
            <tr><td>Rotation</td><td>0–360 degrees</td><td>0–360 degrees</td></tr>
            <tr><td>Tiled across page</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Font control</td><td>Size and colour</td><td>Not applicable</td></tr>
          </tbody>
        </table>
        <p>For most business documents, a diagonal text watermark at 45 degrees is the most recognisable and effective choice. For branded client deliverables, a centred logo watermark at low opacity is more professional.</p>

        <h2>Preset Watermarks: DRAFT, CONFIDENTIAL, COPY</h2>
        <p>For the most common watermark labels, the tool provides one-click presets. Selecting <strong>DRAFT</strong>, <strong>CONFIDENTIAL</strong>, or <strong>COPY</strong> automatically sets the text, font size, diagonal rotation, and a sensible default opacity. You can then adjust any of these settings if needed, or use the preset as-is for a quick stamp.</p>
        <p>These presets follow common document management conventions — DRAFT in grey for internal review copies, CONFIDENTIAL in red for restricted distribution, and COPY in blue for acknowledgement copies that should not be confused with originals. Each preset can be applied to all pages or a selected range in one click.</p>

        <h2>Opacity and Rotation Tips</h2>
        <div className="tip"><strong>Opacity guide by use case:</strong> Use <strong>10–20%</strong> for a subtle background logo that should not distract from content. Use <strong>30–50%</strong> for a DRAFT or CONFIDENTIAL label that must be clearly visible but still readable through. Use <strong>60–80%</strong> for a hard VOID or SAMPLE stamp where obscuring the content is intentional. For diagonal text watermarks (45°), 35–45% opacity is the sweet spot — visible enough to be unmissable, light enough that the document text remains easy to read.</div>
        <p>Rotation affects how authoritative the watermark looks. A perfectly horizontal watermark can look like part of the document design and may be overlooked. A 30–45 degree diagonal crosses both the text and white space of most page layouts, making it hard to ignore and harder to crop out in a screenshot.</p>

        <h2>Is the Watermark Permanent?</h2>
        <div className="note"><strong>The watermark is embedded in the content layer</strong> — it is rendered directly into each page's graphics stream, the same layer as the text and images on the page. It is not stored as a PDF annotation or an overlay layer that can be toggled off in a PDF viewer. This is intentional: annotation-based watermarks can be removed by simply deleting the annotation in any PDF editor. Content-layer watermarks cannot be cleanly removed without specialist software and visible degradation to the surrounding page.</div>
        <p>If you need to produce a clean copy later, keep the original unwatermarked PDF. The watermarked version should be treated as a distribution copy, not an archival original.</p>

        <h2>Related Tools</h2>
        <p>After watermarking, you may want to <Link href="/protect-pdf">password-protect the PDF</Link> to prevent editing or printing — useful when distributing CONFIDENTIAL copies to external parties. If the document needs to be split before watermarking (for example, to watermark only the appendix), use the <Link href="/split-pdf">Split PDF tool</Link> first, watermark the relevant section, then <Link href="/merge-pdf">merge</Link> it back.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
