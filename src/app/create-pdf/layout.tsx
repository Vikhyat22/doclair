import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Create PDF',
  'create-pdf',
  'Create a new PDF from scratch using a rich text editor. Add headings, paragraphs and lists. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
