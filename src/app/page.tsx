import type { Metadata } from 'next'
import HomePageClient from './HomePageClient'
import { TOOLS } from '@/constants/tools'
import { HOME_FAQS } from '@/constants/faqs'

export const metadata: Metadata = {
  title: 'Doclair — Free Online PDF & Document Tools | No Upload, No Watermark',
  description:
    '70+ free browser-based PDF, image & document tools. Merge, split, compress, convert, sign & more — all running privately in your browser. No upload, no watermark, no sign-up. Forever free.',
  alternates: { canonical: 'https://doclair.in' },
  openGraph: {
    title: 'Doclair — Free Online PDF & Document Tools',
    description: '70+ free PDF tools that run privately in your browser. No upload, no watermark, no sign-up.',
    url: 'https://doclair.in',
    siteName: 'Doclair',
    type: 'website',
    locale: 'en_IN',
    images: [{ url: 'https://doclair.in/og-image.png', width: 1200, height: 630, alt: 'Doclair — Free PDF Tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Doclair — Free Online PDF & Document Tools',
    description: '70+ free PDF tools that run privately in your browser. No upload, no watermark.',
    images: ['https://doclair.in/og-image.png'],
  },
}



export default function HomePage() {
  // Build ItemList JSON-LD for all tools
  const toolItemList = {
    '@type': 'ItemList',
    name: 'Free Online PDF & Document Tools',
    itemListElement: TOOLS.map((tool, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: tool.name,
      url: `https://doclair.in/${tool.slug}`,
    })),
  }

  // Build FAQPage JSON-LD
  const faqJsonLd = {
    '@type': 'FAQPage',
    mainEntity: HOME_FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [toolItemList, faqJsonLd],
        }) }}
      />
      <HomePageClient />
    </>
  )
}
