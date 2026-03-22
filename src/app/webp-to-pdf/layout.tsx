import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'WebP to PDF',
  'webp-to-pdf',
  'Convert WebP images to PDF free. Drag to reorder. No upload, no watermark.'
)

export default function WebpToPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
