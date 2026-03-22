import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Markdown to PDF',
  'markdown-to-pdf',
  'Convert .md files or pasted Markdown to a clean formatted PDF. Supports tables, code blocks, headings. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
