import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

interface RelatedTool {
  name: string
  slug: string
  icon: string
  desc: string
  colorBg: string
}

interface ArticleLayoutProps {
  title: string
  toolSlug: string
  toolName: string
  readTime: string
  category: 'Guide' | 'Tutorial' | 'Comparison'
  date?: string
  relatedTools?: RelatedTool[]
  children: React.ReactNode
}

export default function ArticleLayout({
  title, toolSlug, toolName, readTime, category, date = 'Mar 22, 2026', relatedTools, children,
}: ArticleLayoutProps) {
  return (
    <>
      <Navbar />
      <article style={{ padding: '64px 0 96px', position: 'relative', zIndex: 1 }}>
        <div className="section-inner" style={{ maxWidth: '760px' }}>
          <nav style={{ marginBottom: '32px' }}>
            <Link href="/blog" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>← Blog</Link>
          </nav>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ background: '#FFF0DC', color: 'var(--ink)', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', letterSpacing: '0.06em' }}>{category}</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>{readTime} read</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>{date}</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(26px,3.5vw,44px)', letterSpacing: '-1.5px', lineHeight: 1.1, color: 'var(--ink)', marginBottom: '28px' }}>{title}</h1>
          <div style={{ background: '#FFF0DC', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.7 }}>Try the free tool mentioned in this guide:</span>
            <Link href={`/${toolSlug}`} style={{ background: 'var(--ink)', color: 'white', padding: '9px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>{toolName} →</Link>
          </div>
          <div className="article-body">{children}</div>

          {relatedTools && relatedTools.length > 0 && (
            <div style={{ marginTop: '56px', borderTop: '1px solid var(--border)', paddingTop: '40px' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '18px' }}>// Related Tools</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {relatedTools.map(tool => (
                  <Link key={tool.slug} href={`/${tool.slug}`} className="related-tool-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.18s' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tool.colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{tool.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{tool.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink)', opacity: 0.45, marginTop: '2px', lineHeight: 1.3 }}>{tool.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--ink)', borderRadius: '16px', padding: '28px 32px', marginTop: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: 'white', marginBottom: '4px' }}>Try {toolName} for Free</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>No upload. No watermark. Works entirely in your browser.</div>
            </div>
            <Link href={`/${toolSlug}`} style={{ background: 'var(--amber)', color: 'var(--ink)', padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Open Tool →</Link>
          </div>
        </div>
      </article>
      <Footer />
      <style>{`
        .article-body h2 { font-family: var(--font-syne), Syne, sans-serif; font-weight: 700; font-size: 22px; color: var(--ink); margin: 44px 0 14px; letter-spacing: -0.5px; line-height: 1.3; }
        .article-body h3 { font-family: var(--font-syne), Syne, sans-serif; font-weight: 600; font-size: 17px; color: var(--ink); margin: 28px 0 10px; }
        .article-body p { font-size: 16px; line-height: 1.78; color: var(--ink); opacity: 0.82; margin-bottom: 16px; }
        .article-body ol, .article-body ul { padding-left: 24px; margin-bottom: 16px; }
        .article-body li { font-size: 16px; line-height: 1.7; color: var(--ink); opacity: 0.82; margin-bottom: 6px; }
        .article-body strong { color: var(--ink) !important; opacity: 1 !important; font-weight: 600; }
        .article-body a { color: var(--amber); text-decoration: underline; text-underline-offset: 3px; }
        .article-body .note { background: #F0F9FF; border-left: 3px solid #0EA5E9; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; line-height: 1.6; color: var(--ink); opacity: 0.85; }
        .article-body .tip { background: #FFF8EE; border-left: 3px solid var(--amber); padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; line-height: 1.6; color: var(--ink); opacity: 0.85; }
        .article-body table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
        .article-body th { background: var(--ink); color: white; padding: 10px 14px; text-align: left; font-weight: 600; font-size: 13px; }
        .article-body td { padding: 10px 14px; border-bottom: 1px solid var(--border); color: var(--ink); opacity: 0.8; }
        .article-body tr:last-child td { border-bottom: none; }
        .article-body tr:nth-child(even) td { background: #FAFAFA; }
        .related-tool-card:hover { background: white !important; border-color: var(--amber) !important; transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        @media (max-width: 600px) { .related-tool-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </>
  )
}
