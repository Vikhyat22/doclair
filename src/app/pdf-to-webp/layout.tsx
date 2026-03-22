import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to WebP',
  'pdf-to-webp',
  'Convert PDF pages to WebP images free. 72-300 DPI. Smaller than JPEG. No upload, instant.'
)

export default function PdfToWebpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
