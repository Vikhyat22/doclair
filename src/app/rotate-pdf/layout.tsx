import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Rotate PDF',
  'rotate-pdf',
  'Rotate PDF pages 90°, 180° or 270° free. Rotate individual pages or entire document. Visual preview. No upload, no watermark.'
)

export default function RotatePDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
