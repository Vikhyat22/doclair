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
    },
  }
}
