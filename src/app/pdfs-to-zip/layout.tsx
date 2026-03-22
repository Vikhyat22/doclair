import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDFs to ZIP',
  'pdfs-to-zip',
  'Bundle multiple PDF files into a single ZIP archive for easy sharing and download. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
