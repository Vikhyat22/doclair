import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to PNG',
  'pdf-to-png',
  'Convert PDF pages to PNG images free. 72-600 DPI. Lossless quality. No upload, instant.'
)

export default function PdfToPngLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
