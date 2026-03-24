import type { Metadata } from 'next'

export function toolMetadata(
  toolName: string,
  slug: string,
  description: string
): Metadata {
  return {
    title: `${toolName} Online Free — No Upload, No Watermark`,
    description,
    alternates: {
      canonical: `https://doclair.in/${slug}`,
    },
    openGraph: {
      title: `${toolName} Online Free | Doclair`,
      description,
      url: `https://doclair.in/${slug}`,
      type: 'website',
      images: [{ url: `https://doclair.in/og/${slug}.png`, width: 1200, height: 630, alt: `${toolName} — Doclair` }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`https://doclair.in/og/${slug}.png`],
    },
  }
}
