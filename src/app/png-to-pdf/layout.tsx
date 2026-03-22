import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PNG to PDF',
  'png-to-pdf',
  'Convert PNG images to PDF free. Drag to reorder, choose page size. No upload, no watermark, instant.'
)

export default function PngToPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
