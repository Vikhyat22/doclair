import { MetadataRoute } from 'next'
import { TOOLS } from '@/constants/tools'
import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function getBlogSlugs(): string[] {
  const blogDir = join(process.cwd(), 'src', 'app', 'blog')
  try {
    return readdirSync(blogDir).filter(entry => {
      if (entry.startsWith('_') || entry.startsWith('[')) return false
      const entryPath = join(blogDir, entry)
      return statSync(entryPath).isDirectory()
    })
  } catch {
    return []
  }
}

function getLastModified(...paths: string[]): Date {
  const mtimes = paths
    .filter(path => existsSync(path))
    .map(path => statSync(path).mtime)
    .filter(date => !Number.isNaN(date.getTime()))

  if (mtimes.length === 0) return new Date('2026-03-24')

  return new Date(Math.max(...mtimes.map(date => date.getTime())))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const toolUrls = TOOLS.map(tool => ({
    url: `https://doclair.in/${tool.slug}`,
    lastModified: getLastModified(
      join(process.cwd(), 'src', 'app', tool.slug, 'layout.tsx'),
      join(process.cwd(), 'src', 'app', tool.slug, 'page.tsx'),
    ),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  const blogSlugs = getBlogSlugs()
  const blogUrls = blogSlugs.map(slug => ({
    url: `https://doclair.in/blog/${slug}`,
    lastModified: getLastModified(
      join(process.cwd(), 'src', 'app', 'blog', slug, 'page.tsx'),
      join(process.cwd(), 'src', 'app', 'blog', slug),
    ),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    { url: 'https://doclair.in', lastModified: new Date('2026-03-24'), changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://doclair.in/tools', lastModified: new Date('2026-03-24'), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://doclair.in/faqs', lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://doclair.in/install-app', lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://doclair.in/blog', lastModified: new Date('2026-03-24'), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://doclair.in/about', lastModified: new Date('2026-03-24'), changeFrequency: 'yearly', priority: 0.5 },
    { url: 'https://doclair.in/privacy', lastModified: new Date('2026-03-24'), changeFrequency: 'yearly', priority: 0.4 },
    { url: 'https://doclair.in/contact', lastModified: new Date('2026-03-24'), changeFrequency: 'yearly', priority: 0.4 },
    { url: 'https://doclair.in/terms', lastModified: new Date('2026-03-24'), changeFrequency: 'yearly', priority: 0.3 },
    ...toolUrls,
    ...blogUrls,
  ]
}
