import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — Doclair',
  description: 'Everything you need to know about Doclair — privacy, security, how browser-based processing works, and more.',
  alternates: { canonical: 'https://doclair.in/faqs' },
  openGraph: {
    title: 'Frequently Asked Questions — Doclair',
    description: 'Everything you need to know about Doclair — privacy, security, how browser-based processing works, and more.',
    url: 'https://doclair.in/faqs',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frequently Asked Questions — Doclair',
    description: 'Everything you need to know about Doclair — privacy, security, how browser-based processing works, and more.',
  },
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Are my PDF files private and secure?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All processing happens in your browser. Files never leave your device. No server, no storage, no access to your content.' } },
    { '@type': 'Question', name: 'Do you store or collect my PDF files?', acceptedAnswer: { '@type': 'Answer', text: 'No. Files exist only in your browser\'s memory while processing. They are cleared when you close the tab.' } },
    { '@type': 'Question', name: 'How does browser-based PDF processing work?', acceptedAnswer: { '@type': 'Answer', text: 'JavaScript libraries run in your browser tab. When you drop a file, it is loaded into browser memory and processed locally. No network request is made for the file.' } },
    { '@type': 'Question', name: 'Is Doclair really free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All 70+ tools are free forever with no daily limits.' } },
  ]
}

function Section({ title, faqs }: { title: string; faqs: { q: string; a: string }[] }) {
  return (
    <section style={{ marginBottom: '56px' }}>
      <h2 style={{
        fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '24px',
        color: 'var(--ink)', marginBottom: '24px', paddingBottom: '16px',
        borderBottom: '1px solid var(--border)',
      }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {faqs.map((faq, i) => (
          <div key={i}>
            <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>{faq.q}</h3>
            <p style={{ fontSize: '15px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function FAQsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <Navbar />
      <div style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '800px' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>// FAQ</div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-2px', color: 'var(--ink)', marginBottom: '16px', lineHeight: 1.05 }}>Frequently Asked Questions</h1>
          <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, marginBottom: '56px', lineHeight: 1.6 }}>Everything you need to know about Doclair and how browser-based document processing works.</p>

          <Section title="Privacy &amp; Security" faqs={[
            { q: 'Are my PDF files private and secure?', a: 'Yes. All processing happens in your browser. Files never leave your device. No server, no storage, no access to your content.' },
            { q: 'Do you store or collect my PDF files?', a: "No. Files exist only in your browser's memory while processing. They are cleared when you close the tab." },
            { q: 'Can you see my files even if you wanted to?', a: 'No. The architecture makes it technically impossible. Files never leave your device.' },
            { q: 'Do you use cookies or track my activity?', a: 'We use Google Analytics and Microsoft Clarity for anonymous page view and usage statistics. No file content or personal data is collected, and we do not use advertising trackers.' },
            { q: 'Is my data shared with advertisers?', a: 'No. We do not use advertising networks. Doclair is sustained through direct tool sponsorships only.' },
          ]} />

          <Section title="How It Works" faqs={[
            { q: 'How does browser-based PDF processing work?', a: 'JavaScript libraries (pdf-lib, pdf.js) run in your browser tab. When you drop a file, it is loaded into browser memory and processed locally. No network request is made for the file.' },
            { q: 'What file size limits are there?', a: 'No artificial limits. Your device memory is the only constraint. Most modern devices handle PDFs up to several hundred megabytes.' },
            { q: 'What browsers are supported?', a: 'All modern browsers — Chrome, Firefox, Safari, Edge. Latest version recommended for best performance.' },
            { q: 'What happens if I close the browser during processing?', a: 'Processing stops and data clears. Your original file is untouched. Simply reload and start again.' },
            { q: 'Can I use Doclair offline?', a: 'Yes. Install Doclair as a PWA (see Install App page). After first load, all tools work without internet.' },
          ]} />

          <Section title="Tools &amp; Features" faqs={[
            { q: 'Is Doclair really free?', a: 'Yes. All 70+ tools are free forever with no daily limits.' },
            { q: 'Do any tools add a watermark?', a: 'No tool on Doclair ever adds a watermark to any output file.' },
            { q: 'Do I need to create an account?', a: 'No account, no email, no sign-up of any kind is required.' },
            { q: 'Can I use Doclair for commercial purposes?', a: 'Yes. Free for personal and commercial use, no restrictions.' },
            { q: 'Are the AI tools private too?', a: 'Yes. For AI tools, only extracted text (not the file itself) is sent to our API. The PDF file never leaves your device.' },
          ]} />

          <Section title="Business" faqs={[
            { q: 'How does Doclair make money if it is free?', a: 'We sustain through carefully selected direct sponsorships. Tool makers pay for sidebar placement. No AdSense, no data selling.' },
            { q: 'Are there any premium or paid tiers?', a: 'Currently entirely free. A Pro tier for larger files and batch processing is planned for later in 2026.' },
            { q: 'How can I advertise or sponsor Doclair?', a: 'Contact us at our contact page for sponsorship slot availability.' },
          ]} />
        </div>
      </div>
      <Footer />
    </>
  )
}
