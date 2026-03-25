import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Compress an Image Free — Reduce File Size Without Losing Quality',
  description: 'Compress JPG, PNG and WebP images without visible quality loss. Free, browser-based — files never uploaded to a server. Works on all devices.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-compress-image-free' },
  openGraph: { title: 'How to Compress an Image Free', description: 'Reduce JPG, PNG and WebP image size without visible quality loss. Free, no upload, browser-based.', url: 'https://doclair.in/blog/how-to-compress-image-free', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Compress an Image Free — Reduce File Size Without Losing Quality',
  description: 'Compress JPG, PNG and WebP images without visible quality loss. Free, browser-based — files never uploaded to a server. Works on all devices.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-compress-image-free',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-compress-image-free',
}

const FAQS = [
  { q: 'Will compression make my image look blurry?', a: 'At moderate compression levels, the difference is typically invisible to the human eye — especially on screen. The tool reduces file size by discarding colour data that your eye cannot distinguish, not by blurring edges or reducing sharpness. At maximum compression, very high-detail images may show slight quality loss, but this is usually only visible when zooming in closely.' },
  { q: 'What image formats does the tool support?', a: 'The Compress Image tool supports JPG (JPEG), PNG, and WebP. These three formats cover the vast majority of images used in documents, portals, and everyday sharing. HEIC photos from iPhones are automatically converted to JPG before compression.' },
  { q: 'How do I compress an image to a specific file size, like under 200 KB?', a: 'Use the quality slider to reduce the compression level gradually and watch the estimated output size update in real time. For photos, a quality setting of 70–80% typically brings a 2–3 MB image well under 300 KB while maintaining good visual quality. For government portal requirements of 100–200 KB, try 60–70% quality.' },
  { q: 'Is it safe to compress personal photos using this tool?', a: 'Yes. The Compress Image tool runs entirely in your browser — your images are processed locally and never sent to any server. This makes it safe to compress photos of IDs, medical documents, or any other personal images.' },
  { q: 'Can I compress multiple images at once?', a: 'Yes. You can select multiple files in the upload dialog to batch compress them in one go. All images are processed in your browser simultaneously and download as individual compressed files, preserving their original filenames with a size indicator appended.' },
]

export default function CompressImageArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="compress-image" title="How to Compress an Image Free — Reduce File Size Without Losing Quality" toolName="Compress Image" readTime="5 min" category="Guide" date="Mar 24, 2026"
        relatedTools={[
          { name: 'JPG → PDF', slug: 'jpg-to-pdf', icon: '🖼️', desc: 'Convert images to PDF', colorBg: '#F3F4F6' },
          { name: 'Remove Background', slug: 'remove-background', icon: '🎨', desc: 'Clear image backgrounds', colorBg: '#EDE9FE' },
          { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', desc: 'Reduce PDF file size', colorBg: '#FFF0DC' },
        ]}
      >

        <p>Large images slow down websites, bounce back from email inboxes, fail to upload on government portals, and clog up WhatsApp storage. A photo taken on a modern smartphone is typically 3–8 MB — far too large for most submission portals, which cap uploads at 200 KB to 1 MB. Compressing an image reduces its file size by 60–90% while keeping the image looking virtually identical on screen.</p>
        <p>Unlike desktop software that requires installation, <Link href="/compress-image">Doclair's Compress Image tool</Link> runs entirely in your browser. There is nothing to install, no account to create, and your photos never leave your device — making it equally suitable for compressing personal ID photos, medical images, and everyday pictures.</p>

        <h2>How to Compress an Image Free — Step by Step</h2>
        <p>The process is straightforward and takes under 30 seconds:</p>
        <ol>
          <li><strong>Open</strong> <Link href="/compress-image">doclair.in/compress-image</Link> in any browser — Chrome, Safari, Firefox, or Edge.</li>
          <li><strong>Upload</strong> your image by dragging it onto the upload area, or click to browse and select one or more files.</li>
          <li><strong>Adjust quality</strong> using the slider. The estimated compressed size updates in real time as you move it — aim for the smallest size that still looks good for your purpose.</li>
          <li><strong>Choose output format</strong> if you want to convert (for example, PNG to WebP for smaller files).</li>
          <li><strong>Click Compress</strong> and download your optimised image instantly — no watermark, no sign-up.</li>
        </ol>
        <div className="note">Your images are never uploaded to a server. All compression is performed locally in your browser using the Canvas API and modern image codecs, which means the tool works even without an internet connection once the page has loaded.</div>

        <h2>Typical Compression Rates by Image Type</h2>
        <p>How much a file shrinks depends on the image content, format, and quality settings. Here are realistic benchmarks:</p>
        <table>
          <thead>
            <tr>
              <th>Image Type</th>
              <th>Original Format</th>
              <th>Typical Reduction</th>
              <th>Example: 4 MB → </th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Smartphone photo (outdoors)</td><td>JPG</td><td>60–80%</td><td>0.8–1.6 MB</td></tr>
            <tr><td>Screenshot (text-heavy)</td><td>PNG</td><td>40–60%</td><td>1.6–2.4 MB</td></tr>
            <tr><td>Logo / graphic with transparency</td><td>PNG</td><td>20–40%</td><td>2.4–3.2 MB</td></tr>
            <tr><td>Profile or ID photo</td><td>JPG</td><td>70–85%</td><td>0.6–1.2 MB</td></tr>
            <tr><td>Already compressed web image</td><td>JPG / WebP</td><td>5–15%</td><td>3.4–3.8 MB</td></tr>
          </tbody>
        </table>
        <p>If an image barely compresses, it was already optimised — often by the platform you downloaded it from. In that case, converting to WebP format usually gives the biggest additional saving.</p>

        <h2>JPG vs PNG vs WebP: Which Format Is Smallest?</h2>
        <p>Choosing the right format matters as much as compression level:</p>
        <ul>
          <li><strong>JPG</strong> is best for photographs and images with gradients. It achieves very small file sizes but does not support transparent backgrounds. Use JPG for profile photos, scanned documents, and any photographic image.</li>
          <li><strong>PNG</strong> is best for logos, screenshots, diagrams, and images that require a transparent background. PNG uses lossless compression — meaning no image data is thrown away — so files tend to be larger than JPG for photographs but sharper for graphics with flat colours and hard edges.</li>
          <li><strong>WebP</strong> is a modern format developed by Google that outperforms both JPG and PNG in most cases. A WebP file is typically 25–35% smaller than an equivalent JPG at the same visual quality. All modern browsers and Android devices support WebP. Use it when file size is the priority and the destination accepts modern formats.</li>
        </ul>
        <p>For government portal submissions that specifically request JPG, stick with JPG. For everything else, WebP is the most efficient choice.</p>

        <h2>Compress Images for WhatsApp Without Quality Loss</h2>
        <div className="tip">WhatsApp automatically recompresses images you send, often reducing quality significantly. To send a high-quality image without WhatsApp's automatic recompression, share it as a <strong>document</strong> rather than a photo. First compress your image to under 1 MB using the Compress Image tool, then in WhatsApp tap the attachment icon and choose <em>Document</em> instead of <em>Gallery</em>. The recipient gets the full-quality file without any additional compression by WhatsApp.</div>

        <h2>Bulk Compress for Portal Uploads</h2>
        <p>Government portals in India — including DigiLocker, NEET, JEE Main, CUET, and various state government services — impose strict file size limits, often between 100 KB and 500 KB per image. Uploading a raw smartphone photo will almost always be rejected.</p>
        <p>With Doclair's batch compression, you can select all required documents at once — passport photo, signature scan, mark sheet photo, ID proof — and compress them in a single operation. Set the quality to around 70% for photographs and 80% for scanned documents, then download all compressed images. Most portal submissions will pass without needing further adjustment.</p>
        <p>If a portal also specifies maximum dimensions (for example, "200x230 pixels for passport photo"), check whether your image meets the size requirement after compression. If the dimensions are too large, use a dedicated image resizing step before or after compression.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
