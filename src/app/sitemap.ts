import { MetadataRoute } from 'next'
import { TOOLS } from '@/constants/tools'

export default function sitemap(): MetadataRoute.Sitemap {
  const toolUrls = TOOLS.map(tool => ({
    url: `https://doclair.in/${tool.slug}`,
    lastModified: new Date('2026-03-23'),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  const blogUrls = [
    { url: 'https://doclair.in/blog/how-to-compress-pdf-file',             lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: 'https://doclair.in/blog/how-to-merge-pdf-files-free',          lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: 'https://doclair.in/blog/how-to-convert-word-to-pdf',           lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: 'https://doclair.in/blog/best-free-pdf-editor-no-watermark',    lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: 'https://doclair.in/blog/how-to-remove-background-from-image',  lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: 'https://doclair.in/blog/how-to-compress-pdf-on-iphone',        lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: 'https://doclair.in/blog/how-to-protect-pdf-with-password',     lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: 'https://doclair.in/blog/how-to-extract-text-from-pdf',         lastModified: new Date('2026-03-22'), changeFrequency: 'monthly' as const, priority: 0.8 },
  ]

  return [
    { url: 'https://doclair.in', lastModified: new Date('2026-03-23'), changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://doclair.in/tools', lastModified: new Date('2026-03-23'), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://doclair.in/faqs', lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://doclair.in/install-app', lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://doclair.in/blog', lastModified: new Date('2026-03-22'), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://doclair.in/about', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: 'https://doclair.in/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: 'https://doclair.in/contact', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: 'https://doclair.in/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ...toolUrls,
    ...blogUrls,
  ]
}
