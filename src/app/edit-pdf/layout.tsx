import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Edit PDF Text + Sign',
  'edit-pdf',
  'Edit existing PDF text for text-based files, search and replace across PDF pages, export simple edits through direct PDF rewrite when safe, run OCR for scanned PDFs, add clipboard images, quick date or stamp inserts, rotatable images or signatures, whiteout erase areas, and keep everything in your browser. No upload, no watermark.'
)

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Edit PDF Text + Sign — Doclair',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/edit-pdf',
      description: 'Edit existing PDF text for text-based files, search and replace across PDF pages, export simple edits through direct PDF rewrite when safe, run OCR for scanned PDFs, add clipboard images, quick date or stamp inserts, rotatable images or signatures, whiteout erase areas, and keep everything in your browser. No upload, no watermark.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'Edit PDF Text + Sign', item: 'https://doclair.in/edit-pdf' },
      ],
    },
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {children}
    </>
  )
}
