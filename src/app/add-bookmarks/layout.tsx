import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Add Bookmarks to PDF',
  'add-bookmarks',
  'Add clickable bookmarks that appear in the PDF reader sidebar. Create a table of contents for long documents. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
