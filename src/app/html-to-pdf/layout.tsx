import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'HTML to PDF',
  'html-to-pdf',
  'Convert any webpage or HTML code to a PDF. Paste a URL or HTML and save as PDF. 100% free, no upload.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
