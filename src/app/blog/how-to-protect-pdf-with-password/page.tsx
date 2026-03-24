import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleLayout from '../_components/ArticleLayout'
import FAQ from '@/components/ui/FAQ'

export const metadata: Metadata = {
  title: 'How to Password Protect a PDF Free — AES-256 Encryption',
  description: 'Add password protection to any PDF free. AES-256 encryption — bank-level security. No software needed. Works on Windows, Mac, iPhone and Android.',
  alternates: { canonical: 'https://doclair.in/blog/how-to-protect-pdf-with-password' },
  openGraph: { title: 'How to Password Protect a PDF Free', description: 'AES-256 encrypted PDF passwords — bank-level security, runs entirely in your browser.', url: 'https://doclair.in/blog/how-to-protect-pdf-with-password', type: 'article' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Password Protect a PDF Free — AES-256 Encryption',
  description: 'Add password protection to any PDF free. AES-256 encryption — bank-level security. No software needed. Works on Windows, Mac, iPhone and Android.',
  author: { '@type': 'Organization', name: 'Doclair' },
  publisher: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
  datePublished: '2026-03-22',
  dateModified: '2026-03-22',
  url: 'https://doclair.in/blog/how-to-protect-pdf-with-password',
  mainEntityOfPage: 'https://doclair.in/blog/how-to-protect-pdf-with-password',
}

const FAQS = [
  { q: 'What encryption standard does Doclair use?', a: 'Doclair uses AES-256-bit encryption — the same standard used by banks, the US military, and government systems worldwide. It is the strongest encryption available for PDF files.' },
  { q: 'What happens if I forget the password?', a: 'There is no recovery option — by design. AES-256 encryption is effectively unbreakable without the password. Store your password in a password manager (like Bitwarden, which is free and open-source) rather than writing it down.' },
  { q: 'Will the encrypted PDF open in Adobe Acrobat and other readers?', a: 'Yes. Doclair produces standard AES-256 encrypted PDFs that open in all major PDF readers including Adobe Acrobat Reader, Foxit Reader, Chrome PDF viewer, macOS Preview, and iOS/Android built-in PDF readers.' },
  { q: 'Is the password encryption done on a server?', a: 'No. Password encryption runs entirely in your browser using pdf-lib. Your PDF and the password you set are never transmitted to any server — the encryption happens locally on your device.' },
  { q: 'Can I protect a PDF so it cannot be printed or copied?', a: 'Yes. Doclair\'s Encrypt PDF tool lets you set an Owner Password with specific permissions: you can restrict printing, text copying, editing, and form filling independently. The recipient can open the PDF with their user password but cannot perform the restricted actions.' },
]

export default function ProtectPDFArticle() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ArticleLayout toolSlug="encrypt-pdf" title="How to Password Protect a PDF Free — AES-256 Encryption" toolName="Encrypt PDF" readTime="6 min" category="Guide">

        <p>Sensitive documents shared via email — salary slips, bank statements, contracts, Aadhaar copies — travel through multiple servers before reaching the recipient. A password-protected PDF ensures that even if the email is intercepted, the document is unreadable without the correct password. <Link href="/encrypt-pdf">Doclair's Encrypt PDF tool</Link> adds AES-256 encryption to any PDF, free, without uploading anything to a server.</p>

        <h2>Why Password Protect a PDF?</h2>
        <p>Email is not encrypted end-to-end by default. When you email a PDF, it passes through your email server, potentially multiple relay servers, and the recipient's email server — any of which could be compromised. A password-encrypted PDF is unreadable even if intercepted.</p>
        <p>Common use cases where password protection matters:</p>
        <ul>
          <li><strong>Salary slips emailed to banks or lenders:</strong> Financial documents should never travel unprotected</li>
          <li><strong>Aadhaar and PAN card copies:</strong> Identity documents sent to landlords, employers, or service providers</li>
          <li><strong>Business proposals and contracts:</strong> Confidential commercial documents shared with clients</li>
          <li><strong>Medical reports:</strong> Health information that should only be accessible to the intended recipient</li>
          <li><strong>Bank statements for visa applications:</strong> Financial records sent to embassies and visa consultants</li>
          <li><strong>ITR and tax documents:</strong> Sent to CAs, banks, or government bodies</li>
        </ul>

        <h2>How to Password Protect a PDF Free — Step by Step</h2>
        <ol>
          <li><strong>Go to</strong> <Link href="/encrypt-pdf">doclair.in/encrypt-pdf</Link>.</li>
          <li><strong>Upload your PDF</strong> — drop it onto the page or click to browse.</li>
          <li><strong>Enter a User Password</strong> — this is the password the recipient needs to open the file. Use at least 12 characters.</li>
          <li><strong>(Optional) Enter an Owner Password</strong> — this controls what the recipient can do with the PDF: print, copy text, or edit.</li>
          <li><strong>Set permissions</strong> if needed — you can block printing, block text copying, or restrict editing.</li>
          <li><strong>Click Encrypt PDF</strong> — the browser applies AES-256 encryption locally.</li>
          <li><strong>Download the protected PDF</strong> — share it via email, WhatsApp, or any channel.</li>
        </ol>
        <div className="tip">Share the password separately from the PDF — via a phone call, SMS, or a different messaging app. Never include the password in the same email as the protected file.</div>

        <h2>What Is AES-256 Encryption?</h2>
        <p>AES (Advanced Encryption Standard) with a 256-bit key is the gold standard for data encryption. It is used by banks, military intelligence, and government systems to protect the most sensitive data. With current computing technology, cracking AES-256 by brute force would take longer than the age of the universe — it is effectively unbreakable as long as the password itself is not guessed.</p>
        <p>The important caveat: AES-256 only protects against brute force attacks. A weak password like "12345" or your name can still be guessed. The encryption is only as strong as the password you choose.</p>

        <h2>How to Create a Strong PDF Password</h2>
        <p>A strong password has three qualities: <strong>length</strong> (12+ characters), <strong>complexity</strong> (mix of letters, numbers, symbols), and <strong>unpredictability</strong> (not based on personal information).</p>
        <ul>
          <li><strong>Passphrase method:</strong> "Mango!Rains@Mumbai2026" — easy to remember, hard to guess</li>
          <li><strong>Random string:</strong> Use a password manager to generate something like "xK9#mW2@qP7!" — impossible to guess but needs to be stored</li>
          <li><strong>Avoid:</strong> Birthdays, names, simple sequences (123456, abcdef), the word "password"</li>
        </ul>

        <h2>User Password vs Owner Password</h2>
        <p>PDF encryption supports two types of passwords with different purposes:</p>
        <ul>
          <li><strong>User Password (Open Password):</strong> Required to open and view the PDF. Without this password, the file cannot be opened at all.</li>
          <li><strong>Owner Password (Permissions Password):</strong> Controls what an opened PDF can do — allows you to restrict printing, text selection, content copying, and editing. The recipient can open the file with the user password but cannot perform restricted actions.</li>
        </ul>
        <p>For most use cases — protecting a salary slip or ID scan from unauthorised access — only the User Password is needed. If you want to allow viewing but block copying the text content (for a proprietary report or legal document), set an Owner Password with copying disabled.</p>

        <h2>How to Remove a PDF Password</h2>
        <p>If you later need to remove password protection — for example, to compress the file or merge it with other PDFs — use <Link href="/remove-password">Doclair's Remove Password tool</Link>. You will need to enter the original User Password to unlock the file. The decrypted PDF can then be processed like any normal PDF.</p>

        <FAQ faqs={FAQS} />
      </ArticleLayout>
    </>
  )
}
