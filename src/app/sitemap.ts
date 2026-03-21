import { MetadataRoute } from 'next'
import { TOOLS } from '@/constants/tools'

export default function sitemap(): MetadataRoute.Sitemap {
  const toolUrls = TOOLS.map(tool => ({
    url: `https://doclair.com/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  const blogSlugs = [
    'how-to-reduce-pdf-size',
    'how-to-merge-pdf-files-free',
    'how-to-convert-word-to-pdf',
    'best-free-pdf-editor-no-watermark',
    'how-to-remove-background-from-image',
    'how-to-compress-pdf-on-iphone',
    'how-to-protect-pdf-with-password',
    'how-to-extract-text-from-pdf',
  ]

  const blogUrls = blogSlugs.map(slug => ({
    url: `https://doclair.com/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    { url: 'https://doclair.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://doclair.com/tools', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://doclair.com/faqs', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://doclair.com/install-app', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://doclair.com/blog', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://doclair.com/about', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: 'https://doclair.com/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: 'https://doclair.com/contact', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: 'https://doclair.com/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ...toolUrls,
    ...blogUrls,
  ]
}
