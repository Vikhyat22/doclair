import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to JPG',
  'pdf-to-jpg',
  'Convert PDF pages to JPG, PNG or WebP images free. Up to 600 DPI. No upload, no watermark. Works offline.'
)

export default function PDFToJPGLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
