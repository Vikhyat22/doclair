import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to TIFF',
  'pdf-to-tiff',
  'Convert PDF pages to TIFF images free. High resolution up to 600 DPI. No upload, instant.'
)

export default function PdfToTiffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
