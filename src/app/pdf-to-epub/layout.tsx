import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to ePub',
  'pdf-to-epub',
  'Convert PDF files to ePub eBook format for Kindle, Kobo and Apple Books. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
