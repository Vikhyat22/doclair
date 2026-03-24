import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Blog — PDF Tips, Guides & Free Tool Tutorials | Doclair',
  description: 'Step-by-step guides for compressing, merging, converting and protecting PDF files. All tools are free, browser-based, and require no sign-up.',
  alternates: { canonical: 'https://doclair.in/blog' },
}

const ARTICLES = [
  {
    slug: 'how-to-compress-pdf-file',
    title: 'How to Compress PDF File Free — Reduce Size Instantly',
    desc: 'Reduce PDF size by 30–70% in your browser. No software needed. Works on Windows, Mac, iPhone and Android.',
    category: 'Guide',
    readTime: '6 min',
    tool: 'compress-pdf',
  },
  {
    slug: 'how-to-merge-pdf-files-free',
    title: 'How to Merge PDF Files Free — No Watermark',
    desc: 'Combine up to 50 PDFs into one file. Drag to reorder pages. Free, no sign-up, files stay on your device.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'merge-pdf',
  },
  {
    slug: 'how-to-convert-word-to-pdf',
    title: 'How to Convert Word to PDF Free — Keep Formatting',
    desc: 'Convert .docx files to PDF without Microsoft Office. Formatting, tables, and images preserved.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'word-to-pdf',
  },
  {
    slug: 'how-to-extract-text-from-pdf',
    title: 'How to Extract Text From PDF Free',
    desc: 'Get all text from any PDF — including scanned documents with OCR. Copy to clipboard or download as .txt.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'pdf-to-text',
  },
  {
    slug: 'how-to-protect-pdf-with-password',
    title: 'How to Password Protect a PDF Free — AES-256',
    desc: 'Bank-level AES-256 encryption for your PDFs. Free, runs in your browser, nothing uploaded.',
    category: 'Guide',
    readTime: '6 min',
    tool: 'encrypt-pdf',
  },
  {
    slug: 'how-to-remove-background-from-image',
    title: 'How to Remove Background From Image Free (AI)',
    desc: 'AI-powered background removal — transparent PNG output. Works on photos, product images, and logos.',
    category: 'Guide',
    readTime: '6 min',
    tool: 'remove-background',
  },
  {
    slug: 'how-to-split-a-pdf',
    title: 'How to Split a PDF File Free — Extract Pages or Ranges',
    desc: 'Extract any page or range from a PDF instantly. No software, no upload — runs entirely in your browser.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'split-pdf',
  },
  {
    slug: 'how-to-convert-pdf-to-word',
    title: 'How to Convert PDF to Word Free — Get an Editable .docx',
    desc: 'Convert any PDF to an editable Word document. Headings, tables, and paragraphs preserved. Nothing uploaded.',
    category: 'Guide',
    readTime: '6 min',
    tool: 'pdf-to-word',
  },
  {
    slug: 'how-to-convert-jpg-to-pdf',
    title: 'How to Convert JPG to PDF Free — Merge Multiple Images',
    desc: 'Turn one or more JPG images into a PDF in seconds. Merge photos into one document. Free, no upload.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'jpg-to-pdf',
  },
  {
    slug: 'how-to-convert-pdf-to-jpg',
    title: 'How to Convert PDF to JPG Free — Extract All Pages as Images',
    desc: 'Convert every page of a PDF to a high-quality JPG image. Download all pages as a ZIP. Free, browser-based.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'pdf-to-jpg',
  },
  {
    slug: 'how-to-delete-pages-from-pdf',
    title: 'How to Delete Pages From PDF Free — Remove Any Page Instantly',
    desc: 'Remove unwanted pages from any PDF free. Visual page selector — click pages to delete, then download.',
    category: 'Guide',
    readTime: '4 min',
    tool: 'remove-pages-from-pdf',
  },
  {
    slug: 'how-to-sign-pdf-free',
    title: 'How to Sign a PDF Free — Add Your Signature Without Printing',
    desc: 'Sign any PDF digitally without printing it. Draw, type or upload your signature. Free, no account needed.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'sign-pdf',
  },
  {
    slug: 'how-to-make-pdf-searchable',
    title: 'How to Make a Scanned PDF Searchable Free (OCR)',
    desc: 'Add an OCR text layer to any scanned PDF. Make it searchable, selectable, and copy-pasteable. Free, no upload.',
    category: 'Guide',
    readTime: '6 min',
    tool: 'ocr-pdf',
  },
  {
    slug: 'how-to-add-watermark-to-pdf',
    title: 'How to Add a Watermark to PDF Free — Text or Image',
    desc: 'Add DRAFT, CONFIDENTIAL or a custom logo watermark to any PDF. Control opacity and position. Free.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'add-watermark',
  },
  {
    slug: 'how-to-remove-password-from-pdf',
    title: 'How to Remove Password From PDF Free — Unlock Instantly',
    desc: 'Enter the password once, get an unlocked PDF. Works on bank statements, payslips, and government docs.',
    category: 'Guide',
    readTime: '4 min',
    tool: 'remove-password',
  },
  {
    slug: 'how-to-sign-pdf-on-iphone',
    title: 'How to Sign a PDF on iPhone Free — No App Download',
    desc: 'Sign any PDF in Safari without installing anything. Draw with your finger or Apple Pencil.',
    category: 'Tutorial',
    readTime: '4 min',
    tool: 'sign-pdf',
  },
  {
    slug: 'how-to-rotate-pdf-pages',
    title: 'How to Rotate PDF Pages Free — Fix Upside-Down or Sideways Pages',
    desc: 'Fix sideways scans or landscape pages permanently. Rotate one page or all pages. Free, no upload.',
    category: 'Guide',
    readTime: '4 min',
    tool: 'rotate-pdf',
  },
  {
    slug: 'how-to-translate-pdf',
    title: 'How to Translate a PDF Free — AI-Powered, 30+ Languages',
    desc: 'AI-powered PDF translation into English, Hindi, Spanish, French, and 30+ more languages. Free.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'translate-pdf',
  },
  {
    slug: 'how-to-redact-pdf',
    title: 'How to Redact a PDF Free — Permanently Black Out Sensitive Text',
    desc: 'Permanently remove Aadhaar numbers, addresses, and confidential data from PDFs. Nothing uploaded.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'redact-pdf',
  },
  {
    slug: 'how-to-compress-image-free',
    title: 'How to Compress an Image Free — Reduce File Size Without Losing Quality',
    desc: 'Compress JPG, PNG and WebP images for WhatsApp, email, and government portals. Free, no upload.',
    category: 'Guide',
    readTime: '5 min',
    tool: 'compress-image',
  },
  {
    slug: 'how-to-rearrange-pdf-pages',
    title: 'How to Rearrange PDF Pages Free — Drag to Reorder Instantly',
    desc: 'Drag thumbnails to reorder, rotate, or delete pages in any PDF. One session, one download.',
    category: 'Guide',
    readTime: '4 min',
    tool: 'organize-pages',
  },
  {
    slug: 'how-to-convert-pdf-to-excel',
    title: 'How to Convert PDF to Excel Free — Extract Tables Without Software',
    desc: 'Free workarounds to get PDF tables into Excel — no paid tools needed. Step-by-step methods.',
    category: 'Guide',
    readTime: '6 min',
    tool: 'pdf-to-word',
  },
  {
    slug: 'how-to-compress-pdf-on-iphone',
    title: 'How to Compress PDF on iPhone — No App Needed',
    desc: 'Compress PDFs in Safari without any app download. Save compressed files to the Files app instantly.',
    category: 'Tutorial',
    readTime: '5 min',
    tool: 'compress-pdf',
  },
  {
    slug: 'best-free-pdf-editor-no-watermark',
    title: 'Best Free PDF Editor With No Watermark (2026)',
    desc: 'Honest comparison of the top free PDF tools in 2026 — which add watermarks and which don\'t.',
    category: 'Comparison',
    readTime: '7 min',
    tool: 'compress-pdf',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Guide: '#FFF0DC',
  Tutorial: '#DCFCE7',
  Comparison: '#EFF6FF',
}

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <div style={{ padding: '64px 0 96px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner">
          <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>// guides & tutorials</div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-2px', color: 'var(--ink)', marginBottom: '16px', lineHeight: 1.05 }}>Blog</h1>
          <p style={{ fontSize: '17px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, marginBottom: '48px', maxWidth: '560px', lineHeight: 1.6 }}>Step-by-step guides for working with PDF files and images. All tools referenced are free and browser-based — no software needed.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }} className="blog-grid">
            {ARTICLES.map(a => (
              <Link key={a.slug} href={`/blog/${a.slug}`} className="blog-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <span style={{ background: CATEGORY_COLORS[a.category] || '#F3F4F6', color: 'var(--ink)', fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', letterSpacing: '0.06em', flexShrink: 0 }}>{a.category}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>{a.readTime} read</span>
                </div>
                <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--ink)', marginBottom: '10px', lineHeight: 1.35 }}>{a.title}</h2>
                <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.6, lineHeight: 1.65, marginBottom: '16px' }}>{a.desc}</p>
                <div style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 500 }}>Read article →</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
      <style>{`
        .blog-card { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 26px; text-decoration: none; display: block; transition: all 0.18s; }
        .blog-card:hover { box-shadow: 0 6px 24px rgba(26,22,18,0.09); transform: translateY(-1px); border-color: rgba(26,22,18,0.15); }
        @media (max-width: 599px) { .blog-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}
