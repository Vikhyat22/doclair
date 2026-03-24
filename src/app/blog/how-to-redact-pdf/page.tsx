import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Redact a PDF Free — Permanently Black Out Sensitive Text',
  description: 'Permanently redact names, addresses, Aadhaar numbers, and other sensitive data from PDFs. Free, browser-based — nothing is uploaded to a server.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-redact-pdf' },
  openGraph: { title: 'How to Redact a PDF Free', description: 'Permanently black out sensitive information in any PDF. Free, browser-based, nothing uploaded.', url: 'https://doclair.in/blog/how-to-redact-pdf', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Redact a PDF Free — Permanently Black Out Sensitive Text',
  description: 'Permanently redact names, addresses, Aadhaar numbers, and other sensitive data from PDFs. Free, browser-based — nothing is uploaded to a server.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-24',
  dateModified: '2026-03-24',
  url: 'https://doclair.in/blog/how-to-redact-pdf',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-redact-pdf',
}

const FAQS = [
  { q: 'Is PDF redaction permanent using Doclair?', a: 'Yes. Doclair\'s redaction tool permanently removes the underlying text or image data beneath each black box. The redacted content cannot be recovered by selecting text, copying, or using any PDF viewer. This is true redaction — not a cosmetic overlay.' },
  { q: 'Can I redact a scanned PDF?', a: 'Yes. For scanned PDFs — which are essentially images — the redaction tool draws a permanent black rectangle over the selected area of the image. Since the document is image-based, there is no hidden text underneath to begin with, so the result is equally secure.' },
  { q: 'What is the difference between redaction and a black highlight?', a: 'A black highlight (or black annotation box) sits on top of the text as a visual layer — the original text remains in the file and can be revealed by removing the annotation or copying the text. True redaction removes the underlying content entirely. Always use a proper redaction tool for sensitive documents.' },
  { q: 'Can I undo a redaction after saving?', a: 'No — and that is intentional. Once you download the redacted PDF and close the tool, the original data is permanently gone from that file. If you may need to undo, keep a copy of the original file in a secure location before redacting.' },
  { q: 'Do I need to create an account to redact a PDF?', a: 'No account, no sign-up, and no payment is required. Open the tool, upload your PDF, draw redaction boxes, and download — entirely free, with your file never leaving your device.' },
]

export default function RedactPDFArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="redact-pdf" title="How to Redact a PDF Free — Permanently Black Out Sensitive Text" toolName="Redact PDF" readTime="5 min" category="Guide" date="Mar 24, 2026">

        <p>Sharing a document that contains someone's Aadhaar number, PAN card details, home address, or salary information carries real risk — even when you only intend to share a portion of it. Redaction is the process of permanently removing that sensitive content from a PDF before you share it. HR teams use it to anonymise CVs, lawyers use it to protect client details, and individuals use it before submitting documents to portals or forwarding them over WhatsApp.</p>
        <p>The critical word is <strong>permanently</strong>. Many people cover sensitive text with a black rectangle drawn in a PDF viewer, not realising that the original text is still in the file and can be copied out in seconds. A proper redaction tool removes the content itself. <Link href="/redact-pdf">Doclair's Redact PDF tool</Link> does this entirely in your browser — your file never reaches a server.</p>

        <h2>How to Redact a PDF — Step by Step</h2>
        <p>The process takes under two minutes for most documents:</p>
        <ol>
          <li><strong>Open</strong> <Link href="/redact-pdf">doclair.in/redact-pdf</Link> in any browser — no account needed.</li>
          <li><strong>Upload</strong> your PDF by dragging it onto the upload area or clicking to browse.</li>
          <li><strong>Navigate</strong> to the page containing sensitive content using the page controls.</li>
          <li><strong>Draw redaction boxes</strong> by clicking and dragging over the text or images you want to remove. You can add as many boxes as needed across as many pages as needed.</li>
          <li><strong>Apply redactions</strong> — the tool permanently removes the content beneath each box.</li>
          <li><strong>Download</strong> the redacted PDF. The file saves to your device with a clean filename.</li>
        </ol>
        <div className="note">All processing happens locally in your browser. Your PDF is never uploaded to any server, which makes this approach safe even for the most sensitive documents — legal contracts, medical records, and government IDs.</div>

        <h2>Permanent Redaction vs Black Highlight</h2>
        <p>This distinction is critical and frequently misunderstood. A <strong>black highlight or annotation box</strong> placed over text in a standard PDF viewer (such as Adobe Acrobat Reader's Comment tools, Preview on Mac, or Google Docs) is a visual layer only. The original text remains in the PDF's data structure. Anyone can:</p>
        <ul>
          <li>Select all text and paste it into a text editor to read the hidden content</li>
          <li>Open the annotation panel and delete the black box</li>
          <li>Use a PDF parsing script to extract all text regardless of visual overlays</li>
        </ul>
        <p><strong>True redaction</strong> replaces the content itself with empty data or a black rectangle that is baked into the page. There is nothing underneath to recover. Always use a dedicated redaction tool — never a highlighter or annotation box — when privacy matters.</p>

        <h2>What to Redact by Document Type</h2>
        <table>
          <thead>
            <tr>
              <th>Document Type</th>
              <th>What to Redact Before Sharing</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Bank Statement</td><td>Account number, IFSC code, transaction amounts, branch address</td></tr>
            <tr><td>Aadhaar Card</td><td>Full 12-digit number (keep only last 4 digits if reference needed), address, date of birth</td></tr>
            <tr><td>PAN Card Copy</td><td>Full PAN number (mask middle digits), father's name, date of birth</td></tr>
            <tr><td>Medical Report</td><td>Patient ID, diagnosis notes, doctor's signature, referring physician contact</td></tr>
            <tr><td>Salary Slip</td><td>Exact salary figures, employee code, bank account details</td></tr>
            <tr><td>Legal Contract</td><td>Personal addresses, phone numbers, signature blocks, pricing terms</td></tr>
            <tr><td>HR / CV Document</td><td>Candidate's personal email, phone number, home address when sharing anonymised profiles</td></tr>
          </tbody>
        </table>

        <h2>Redact on Mobile</h2>
        <p>No app required. Open <Link href="/redact-pdf">doclair.in/redact-pdf</Link> in Chrome or Safari on your Android or iPhone. The tool is fully touch-friendly — tap and drag to draw redaction boxes on any page. Once you apply and download, the file saves to your Downloads folder or Files app. If you share PDFs frequently on your phone, add Doclair to your home screen for one-tap access: in Safari, tap Share, then <em>Add to Home Screen</em>.</p>

        <h2>After Redacting: Protect Your PDF</h2>
        <p>Redaction removes sensitive content from view, but the resulting file can still be opened and edited by anyone who receives it. For an extra layer of security — especially for documents you store or email — consider encrypting the PDF with a password after redacting. <Link href="/encrypt-pdf">Doclair's Encrypt PDF tool</Link> lets you set an open password so only intended recipients can view the file, and an edit password to prevent further modifications.</p>
        <p>The two-step workflow — redact first, then encrypt — gives you both content-level privacy and access control, which is best practice for sharing sensitive documents over email or WhatsApp.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
