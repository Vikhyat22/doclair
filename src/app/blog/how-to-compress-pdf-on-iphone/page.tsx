import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Compress PDF on iPhone Free (No App Needed)',
  description: 'Compress a PDF on iPhone without downloading any app. Works in Safari. Reduce PDF size for email, WhatsApp and government portals. Free, instant.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-compress-pdf-on-iphone' },
  openGraph: { title: 'How to Compress PDF on iPhone Free', description: 'Reduce PDF size on iPhone without any app — works in Safari, saves to Files app.', url: 'https://doclair.in/blog/how-to-compress-pdf-on-iphone', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Compress PDF on iPhone — No App Download Needed',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-22',
  dateModified: '2026-03-22',
}

const FAQS = [
  { q: 'Does this work on older iPhones?', a: 'Yes. Doclair works on any iPhone running iOS 14 or later in Safari. Older iPhones may process larger PDFs more slowly due to limited RAM, but the tool itself is fully compatible.' },
  { q: 'Where does the compressed file save on iPhone?', a: 'The file saves to your Downloads folder in the Files app (under On My iPhone → Downloads). From there, you can share it via Mail, WhatsApp, AirDrop, or upload it to any portal.' },
  { q: 'Can I compress a PDF received on WhatsApp on iPhone?', a: 'Yes. Long-press the PDF in WhatsApp → Share → Save to Files. Then open Doclair in Safari, upload the PDF from Files, compress, and download the smaller version. Share it back via WhatsApp.' },
  { q: 'Does adding Doclair to the Home Screen cost anything?', a: 'No. Adding Doclair to your iPhone Home Screen (via Safari\'s Add to Home Screen option) is free and simply creates a shortcut. It opens the website in full-screen mode without Safari\'s navigation bar, making it feel like a native app.' },
  { q: 'Does compressing a PDF on iPhone affect the text quality?', a: 'No. PDF text is stored as vectors — it remains perfectly sharp at any compression level. Only embedded images lose a small amount of detail at Maximum compression, which is usually unnoticeable for scanned documents and completely acceptable for sharing.' },
]

export default function CompressPDFiPhoneArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout title="How to Compress PDF on iPhone — No App Download Needed" toolName="Compress PDF" readTime="5 min" category="Tutorial">

        <p>iPhones are excellent at scanning documents, but the resulting PDFs are often too large for email, government portals, and WhatsApp. Scanner apps like Microsoft Lens, Adobe Scan, and the built-in Notes scanner produce high-resolution scans — typically 5–15 MB per document — which exceed limits everywhere. Here is how to compress them in under a minute without downloading any app.</p>

        <h2>Why iPhones Produce Large PDFs</h2>
        <p>Modern iPhone cameras have extremely high resolution sensors. When you scan a document using the Notes app, Files app, or any third-party scanner, the scan is captured at the camera's native resolution — often resulting in 3–8 MB per page. A two-page salary slip scanned this way can easily be 10–15 MB, while a 10-page bank statement can reach 60–80 MB.</p>
        <p>Government portals in India typically allow 1–5 MB per upload. Gmail's attachment limit is 25 MB. Most college admission portals accept 2 MB maximum. Compression brings these scans within acceptable limits.</p>

        <h2>How to Compress PDF on iPhone Using Safari</h2>
        <ol>
          <li><strong>Open Safari</strong> on your iPhone and go to <Link href="/compress-pdf">doclair.in/compress-pdf</Link>.</li>
          <li><strong>Tap the upload area</strong> — Safari will show the Files app picker.</li>
          <li><strong>Navigate to your PDF</strong> — it might be in Downloads, On My iPhone, or iCloud Drive depending on where it was saved.</li>
          <li><strong>Select your PDF</strong> — the file name and size appear in the tool.</li>
          <li><strong>Choose your compression level:</strong> Standard for most documents, Maximum for scanned PDFs that need to be under 1 MB.</li>
          <li><strong>Tap Compress PDF</strong> — the browser processes the file in 10–30 seconds.</li>
          <li><strong>Tap Download</strong> — the compressed file saves to your Downloads folder in the Files app.</li>
        </ol>
        <div className="note">Doclair is a Progressive Web App (PWA). This means it works like a native app in Safari — no App Store download, no permissions, no storage except the downloaded file.</div>

        <h2>Add Doclair to Your iPhone Home Screen</h2>
        <p>If you compress PDFs regularly, add Doclair to your iPhone Home Screen for one-tap access:</p>
        <ol>
          <li>Open <Link href="/">doclair.in</Link> in Safari.</li>
          <li>Tap the <strong>Share button</strong> (the square with an arrow pointing up).</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Name it "Doclair" and tap <strong>Add</strong>.</li>
        </ol>
        <p>It appears on your Home Screen like a regular app icon. Tapping it opens Doclair in full-screen mode — no Safari navigation bar — making it feel exactly like a native app.</p>

        <h2>Compress a PDF Scanned With iPhone Notes App</h2>
        <p>The Notes app's built-in scanner produces good quality scans but large file sizes. After scanning, the PDF is saved in iCloud Drive or On My iPhone. To compress it:</p>
        <ul>
          <li>Open the note in Notes → tap the scan → tap Share → Save to Files → choose a location</li>
          <li>Then open Doclair, upload from that location, compress, and download</li>
        </ul>
        <p>Alternatively, after scanning in Notes, tap the three-dot menu on the scan → Select All → tap Share → Save to Files — then compress in Doclair.</p>

        <h2>Common iPhone PDF Tasks for Indian Users</h2>
        <ul>
          <li><strong>Digilocker upload:</strong> Documents must typically be under 5 MB. Scan → compress to 1–2 MB → upload.</li>
          <li><strong>NEET/JEE/UPSC portals:</strong> Photo and document uploads are usually capped at 500 KB – 2 MB. Maximum compression brings most scans within this range.</li>
          <li><strong>College admission portals:</strong> Most NIT/IIT/state university portals accept PDFs up to 2 MB per document.</li>
          <li><strong>WhatsApp document sharing:</strong> Smaller PDFs send faster on slow mobile connections and use less of the recipient's storage.</li>
          <li><strong>Email via Gmail app:</strong> Gmail on iPhone has a 25 MB attachment limit — a compressed document easily fits.</li>
        </ul>

        <h2>What if the Compressed File is Still Too Large?</h2>
        <p>If Maximum compression still leaves the file above the portal's limit, the document contains very high-resolution photographs. In that case:</p>
        <ol>
          <li>Use <Link href="/split-pdf">Doclair's Split PDF tool</Link> to split the document into individual pages.</li>
          <li>Compress each page individually with Maximum compression.</li>
          <li>If a single page is still too large, the scan resolution is unusually high — rescan the document at a lower resolution setting in your scanner app (most apps have a quality setting).</li>
        </ol>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
