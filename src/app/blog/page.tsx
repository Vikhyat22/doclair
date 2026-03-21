import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Blog — PDF Tips, Guides & Tutorials',
  description: 'Learn how to use PDF tools, tips for document management, and guides for common PDF tasks.',
  alternates: { canonical: 'https://doclair.com/blog' },
}

const ARTICLES = [
  { slug: 'how-to-reduce-pdf-size', title: 'How to Reduce PDF File Size (Free, No Quality Loss)', desc: 'Compress your PDF files without losing quality using free browser-based tools.', date: 'Mar 2026' },
  { slug: 'how-to-merge-pdf-files-free', title: 'How to Merge PDF Files for Free', desc: 'Combine multiple PDF documents into one file without uploading to any server.', date: 'Mar 2026' },
  { slug: 'how-to-convert-word-to-pdf', title: 'How to Convert Word to PDF (Without Microsoft Office)', desc: 'Convert .docx files to PDF format instantly in your browser.', date: 'Mar 2026' },
  { slug: 'best-free-pdf-editor-no-watermark', title: 'Best Free PDF Editor With No Watermark', desc: 'Edit, annotate, and modify PDFs without paying for Adobe Acrobat.', date: 'Mar 2026' },
  { slug: 'how-to-remove-background-from-image', title: 'How to Remove Background from an Image (AI, Free)', desc: 'Remove image backgrounds instantly using AI running in your browser.', date: 'Mar 2026' },
  { slug: 'how-to-compress-pdf-on-iphone', title: 'How to Compress a PDF on iPhone', desc: "Reduce PDF size on iPhone without installing any app.", date: 'Mar 2026' },
  { slug: 'how-to-protect-pdf-with-password', title: 'How to Protect a PDF with a Password', desc: 'Add password protection to your PDF files for free.', date: 'Mar 2026' },
  { slug: 'how-to-extract-text-from-pdf', title: 'How to Extract Text from a PDF (With & Without OCR)', desc: 'Get the text content from any PDF, including scanned documents.', date: 'Mar 2026' },
]

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <div style={{ padding: '64px 0 80px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner">
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>// guides</div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-2px', color: 'var(--ink)', marginBottom: '16px', lineHeight: 1.05 }}>Blog</h1>
          <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, marginBottom: '48px', lineHeight: 1.6 }}>PDF tips, guides, and tutorials for everyone.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }} className="blog-grid">
            {ARTICLES.map(a => (
              <Link key={a.slug} href={`/blog/${a.slug}`} className="blog-card">
                <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>{a.date}</div>
                <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ink)', marginBottom: '10px', lineHeight: 1.3 }}>{a.title}</h2>
                <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.6, lineHeight: 1.6 }}>{a.desc}</p>
                <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--amber)', fontWeight: 500 }}>Read guide →</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
      <style>{`
        .blog-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 28px;
          text-decoration: none;
          display: block;
          transition: all 0.18s;
        }
        .blog-card:hover {
          box-shadow: 0 4px 20px rgba(26,22,18,0.08);
        }
        @media (max-width: 599px) { .blog-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}
