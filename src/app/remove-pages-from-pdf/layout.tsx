import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Remove Pages from PDF',
  'remove-pages-from-pdf',
  'Delete specific pages from a PDF with a visual thumbnail picker. Select multiple pages and remove them instantly. 100% free, no upload, no watermark.'
)

export default function RemovePagesFromPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
