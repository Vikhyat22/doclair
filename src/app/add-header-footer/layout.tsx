import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Add Header & Footer to PDF',
  'add-header-footer',
  'Insert custom text, page numbers, or dates in the header and footer of every PDF page. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
