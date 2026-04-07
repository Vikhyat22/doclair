import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/_next/',
          '/api/',
          '/sw.js',
          '/*?ref=',
          '/*?q=',
          '/*?utm_source=',
          '/*?utm_medium=',
          '/*?utm_campaign=',
          '/*?utm_term=',
          '/*?utm_content=',
        ],
      },
    ],
    sitemap: 'https://doclair.in/sitemap.xml',
  }
}
