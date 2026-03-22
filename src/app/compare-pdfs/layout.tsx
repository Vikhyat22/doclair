import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Compare PDFs',
  'compare-pdfs',
  'Compare two PDF files side by side or with overlay blend. Synchronized scrolling. Spot differences instantly. Free, no upload, no watermark.'
)

export default function ComparePdfsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
