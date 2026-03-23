import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Add Pages to PDF',
  'add-pages-to-pdf',
  'Insert pages from another PDF into your document at any position. Pick a page range, choose where to insert. 100% free, no upload, no watermark.'
)

export default function AddPagesToPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
