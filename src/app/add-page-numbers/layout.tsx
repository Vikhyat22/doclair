import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Add Page Numbers to PDF',
  'add-page-numbers',
  'Add page numbers to PDF free. Choose position, format, starting number and page range. No upload, no watermark.'
)

export default function AddPageNumbersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
